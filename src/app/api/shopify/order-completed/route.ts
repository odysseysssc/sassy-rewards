import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { findUserByEmail, claimTransaction, unclaimTransaction } from '@/lib/db';
import { awardGritToAccount, awardGritToEmail } from '@/lib/drip';
import { createServerClient } from '@/lib/supabase';

const GRIT_PER_DOLLAR = 10;

// Verify Shopify webhook signature (HMAC-SHA256 of the raw body, base64)
function verifyShopifyWebhook(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function award(email: string, amount: number, orderId: string): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const user = await findUserByEmail(email);
  if (user?.drip_account_id) {
    const ok = await awardGritToAccount(user.drip_account_id, amount, `Shopify order ${orderId}`);
    return { ok, userId: user.id, error: ok ? undefined : 'Drip award failed' };
  }
  const result = await awardGritToEmail(email, amount, `Shopify order ${orderId}`);
  return { ok: !!result.success, error: result.error };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    // Signature is mandatory. Missing secret or header = reject.
    if (!webhookSecret) {
      console.error('[Shopify] SHOPIFY_WEBHOOK_SECRET is not configured; rejecting webhook');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }
    if (!signature || !verifyShopifyWebhook(body, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const order = JSON.parse(body);
    const customerEmail: string | undefined = (order.customer?.email || order.email)?.toLowerCase();
    const orderTotal = parseFloat(order.total_price || '0');
    const orderId: string | undefined = order.id?.toString() || order.order_number?.toString();

    if (!customerEmail) return NextResponse.json({ error: 'No customer email' }, { status: 400 });
    if (!orderId) return NextResponse.json({ error: 'No order id' }, { status: 400 });
    if (!(orderTotal > 0)) return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });

    const gritAmount = Math.floor(orderTotal * GRIT_PER_DOLLAR);
    const supabase = createServerClient();

    // Idempotency: one grit_transactions row per Shopify order.
    let { data: tx } = await supabase
      .from('grit_transactions')
      .select('id, claimed')
      .eq('source', 'shopify')
      .eq('source_reference', orderId)
      .maybeSingle();

    if (tx?.claimed) {
      return NextResponse.json({ success: true, duplicate: true, orderId });
    }

    if (!tx) {
      // Record the order first (unclaimed), then pay. A unique index on
      // (source, source_reference) makes concurrent duplicate deliveries fail here.
      const { data: inserted, error: insertError } = await supabase
        .from('grit_transactions')
        .insert({
          email: customerEmail,
          amount: gritAmount,
          source: 'shopify',
          source_reference: orderId,
          claimed: false,
        })
        .select('id, claimed')
        .single();
      if (insertError) {
        if (insertError.code === '23505') {
          return NextResponse.json({ success: true, duplicate: true, orderId });
        }
        throw insertError;
      }
      tx = inserted;
    }

    // Atomically take ownership of this transaction before paying out.
    if (!tx || !(await claimTransaction(tx.id))) {
      return NextResponse.json({ success: true, duplicate: true, orderId });
    }

    const result = await award(customerEmail, gritAmount, orderId);
    if (!result.ok) {
      await unclaimTransaction(tx.id); // leave pending; Shopify retry or next login will pay it
      console.error(`[Shopify] Failed to award GRIT for order ${orderId}: ${result.error}`);
      return NextResponse.json({ success: false, pendingGrit: gritAmount, error: 'Award failed, recorded as pending' }, { status: 500 });
    }

    if (result.userId) {
      await supabase.from('grit_transactions').update({ user_id: result.userId }).eq('id', tx.id);
    }

    return NextResponse.json({ success: true, gritAwarded: gritAmount, orderId });
  } catch (error) {
    console.error('Shopify webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
