import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { findUserByEmail, createGritTransaction } from '@/lib/db';
import { awardGritToAccount, awardGritToEmail, findCredentialByEmail, createEmailCredential } from '@/lib/drip';

const GRIT_PER_DOLLAR = 10;

// Verify Shopify webhook signature
function verifyShopifyWebhook(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  const hash = hmac.digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyShopifyWebhook(body, signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid Shopify webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const order = JSON.parse(body);

    // Extract customer email and order total
    const customerEmail = order.customer?.email || order.email;
    const orderTotal = parseFloat(order.total_price || '0');
    const orderId = order.id?.toString() || order.order_number?.toString();

    if (!customerEmail) {
      console.log('No customer email in order');
      return NextResponse.json({ error: 'No customer email' }, { status: 400 });
    }

    if (orderTotal <= 0) {
      console.log('Invalid order total');
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    // Calculate GRIT to award
    const gritAmount = Math.floor(orderTotal * GRIT_PER_DOLLAR);

    console.log(`Processing order for ${customerEmail}: $${orderTotal} = ${gritAmount} GRIT`);

    // Check if user exists in our database
    const user = await findUserByEmail(customerEmail);

    if (user?.drip_account_id) {
      // User exists with Drip account - award GRIT immediately
      const awarded = await awardGritToAccount(user.drip_account_id, gritAmount, `Shopify order ${orderId}`);

      if (awarded) {
        // Record transaction as claimed
        await createGritTransaction(
          customerEmail,
          gritAmount,
          'shopify',
          orderId,
          user.id,
          true
        );

        console.log(`Awarded ${gritAmount} GRIT to ${customerEmail} (account: ${user.drip_account_id})`);
        return NextResponse.json({
          success: true,
          email: customerEmail,
          gritAwarded: gritAmount,
        });
      } else {
        console.error(`Failed to award GRIT to ${customerEmail}`);
        return NextResponse.json({
          success: false,
          error: 'Failed to award GRIT',
        }, { status: 500 });
      }
    }

    // No user in DB with drip_account_id - need to award to email credential
    // Strategy: Create credential if needed, then award GRIT

    console.log(`[Shopify] No user account found, awarding to email credential: ${customerEmail}`);

    // Step 1: Ensure credential exists
    let credential = await findCredentialByEmail(customerEmail);

    if (!credential) {
      console.log(`[Shopify] Creating credential for: ${customerEmail}`);
      try {
        credential = await createEmailCredential(
          customerEmail,
          order.customer?.first_name || customerEmail.split('@')[0]
        );
        console.log(`[Shopify] Credential created:`, JSON.stringify(credential));
      } catch (credError) {
        console.error(`[Shopify] Failed to create credential for ${customerEmail}:`, credError);
      }
    } else {
      console.log(`[Shopify] Found existing credential:`, JSON.stringify(credential));
    }

    // Step 2: Award GRIT (try regardless of credential creation result)
    console.log(`[Shopify] Awarding ${gritAmount} GRIT to ${customerEmail}`);
    const awarded = await awardGritToEmail(customerEmail, gritAmount, `Shopify order ${orderId}`);
    console.log(`[Shopify] Award result: ${awarded}`);

    if (awarded) {
      // Record transaction - mark as claimed since GRIT was actually awarded
      await createGritTransaction(
        customerEmail,
        gritAmount,
        'shopify',
        orderId,
        undefined,
        true  // Mark as claimed since we successfully awarded to Drip
      );

      console.log(`[Shopify] Successfully awarded ${gritAmount} GRIT to ${customerEmail}`);
      return NextResponse.json({
        success: true,
        email: customerEmail,
        gritAwarded: gritAmount,
        message: 'GRIT awarded to email credential',
      });
    }

    // Award failed - record as pending so we can retry later
    console.error(`[Shopify] Failed to award GRIT to ${customerEmail}, recording as pending`);
    await createGritTransaction(
      customerEmail,
      gritAmount,
      'shopify',
      orderId,
      undefined,
      false  // Mark as unclaimed so we can retry
    );

    // Return 500 so Shopify knows it failed and might retry
    return NextResponse.json({
      success: false,
      email: customerEmail,
      pendingGrit: gritAmount,
      error: 'Failed to award GRIT to Drip, recorded as pending',
    }, { status: 500 });

  } catch (error) {
    console.error('Shopify webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
