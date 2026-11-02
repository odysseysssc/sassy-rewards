import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { findUserByEmail, claimTransaction, unclaimTransaction } from '@/lib/db';
import { awardGritToAccount, awardGritToEmail } from '@/lib/drip';
import { createServerClient } from '@/lib/supabase';
import { getHolderTierForWallets, getLinkedWallets } from '@/lib/holdings';

const GRIT_PER_DOLLAR = 10;

// Verify Shopify webhook signature (HMAC-SHA256 of the raw body, base64)
function verifyShopifyWebhook(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// The rewards user behind an order email: users.email, or a linked email credential.
async function findBuyer(email: string): Promise<{ id: string; drip_account_id?: string | null } | null> {
  const user = await findUserByEmail(email);
  if (user) return user;
  const supabase = createServerClient();
  const { data: cred } = await supabase
    .from('connected_credentials')
    .select('user_id')
    .eq('credential_type', 'email')
    .eq('identifier', email)
    .limit(1);
  if (!cred?.[0]?.user_id) return null;
  const { data: u } = await supabase.from('users').select('id, drip_account_id').eq('id', cred[0].user_id).single();
  return u || null;
}

// GRIT multiplier from the buyer's holder tier (Sassys/Headliner Pass on their linked wallets).
// No account or no linked wallet -> General 1x. Lookup failure -> 1x, flagged in the note.
async function multiplierFor(buyer: { id: string } | null): Promise<{ multiplier: number; label: string }> {
  if (!buyer) return { multiplier: 1, label: 'General 1x' };
  try {
    const result = await getHolderTierForWallets(await getLinkedWallets(buyer.id));
    return { multiplier: result.tier.multiplier, label: `${result.tier.name} ${result.tier.multiplier}x` };
  } catch (error) {
    console.error('[Shopify] holder tier lookup failed:', error instanceof Error ? error.message : error);
    return { multiplier: 1, label: '1x (tier check failed - review)' };
  }
}

async function award(
  email: string,
  buyer: { id: string; drip_account_id?: string | null } | null,
  amount: number,
  note: string
): Promise<{ ok: boolean; userId?: string; error?: string }> {
  if (buyer?.drip_account_id) {
    const ok = await awardGritToAccount(buyer.drip_account_id, amount, note);
    return { ok, userId: buyer.id, error: ok ? undefined : 'Drip award failed' };
  }
  const result = await awardGritToEmail(email, amount, note);
  return { ok: !!result.success, userId: buyer?.id, error: result.error };
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

    const buyer = await findBuyer(customerEmail);
    let gritAmount: number;
    let note: string;

    if (!tx) {
      // New order: apply the buyer's holder-tier multiplier (10 GRIT per $1 x multiplier)
      const { multiplier, label } = await multiplierFor(buyer);
      gritAmount = Math.floor(orderTotal * GRIT_PER_DOLLAR * multiplier);
      note = `Shopify order ${orderId} · ${label}`;

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
    } else {
      // Retry of an order recorded earlier: pay exactly what was recorded
      const { data: existing } = await supabase.from('grit_transactions').select('amount').eq('id', tx.id).single();
      gritAmount = existing?.amount ?? Math.floor(orderTotal * GRIT_PER_DOLLAR);
      note = `Shopify order ${orderId}`;
    }

    // Atomically take ownership of this transaction before paying out.
    if (!tx || !(await claimTransaction(tx.id))) {
      return NextResponse.json({ success: true, duplicate: true, orderId });
    }

    const result = await award(customerEmail, buyer, gritAmount, note);
    if (!result.ok) {
      await unclaimTransaction(tx.id); // leave pending; Shopify retry or next login will pay it
      console.error(`[Shopify] Failed to award GRIT for order ${orderId}: ${result.error}`);
      return NextResponse.json({ success: false, pendingGrit: gritAmount, error: 'Award failed, recorded as pending' }, { status: 500 });
    }

    if (result.userId) {
      await supabase.from('grit_transactions').update({ user_id: result.userId }).eq('id', tx.id);
    }

    return NextResponse.json({ success: true, gritAwarded: gritAmount, note, orderId });
  } catch (error) {
    console.error('Shopify webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
