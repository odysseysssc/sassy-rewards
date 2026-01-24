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

    // No user in DB - check if email credential exists in Drip
    const existingCredential = await findCredentialByEmail(customerEmail);

    if (existingCredential) {
      // Credential exists - award GRIT to email credential
      const awarded = await awardGritToEmail(customerEmail, gritAmount, `Shopify order ${orderId}`);

      if (awarded) {
        // Record transaction (unclaimed since no user account yet)
        await createGritTransaction(
          customerEmail,
          gritAmount,
          'shopify',
          orderId,
          undefined,
          false
        );

        console.log(`Awarded ${gritAmount} GRIT to email credential: ${customerEmail}`);
        return NextResponse.json({
          success: true,
          email: customerEmail,
          gritAwarded: gritAmount,
          message: 'GRIT awarded to email credential',
        });
      }
    }

    // No credential exists - create ghost credential and award
    try {
      const newCredential = await createEmailCredential(
        customerEmail,
        order.customer?.first_name || customerEmail.split('@')[0]
      );

      if (newCredential) {
        const awarded = await awardGritToEmail(customerEmail, gritAmount, `Shopify order ${orderId}`);

        // Record transaction
        await createGritTransaction(
          customerEmail,
          gritAmount,
          'shopify',
          orderId,
          undefined,
          false
        );

        console.log(`Created credential and awarded ${gritAmount} GRIT for: ${customerEmail}`);
        return NextResponse.json({
          success: true,
          email: customerEmail,
          gritAwarded: gritAmount,
          message: awarded ? 'Ghost credential created with GRIT' : 'Credential created, GRIT pending',
        });
      }
    } catch (credError) {
      console.error('Error creating credential:', credError);
    }

    // Fallback: Just record the pending GRIT in database
    await createGritTransaction(
      customerEmail,
      gritAmount,
      'shopify',
      orderId,
      undefined,
      false
    );

    console.log(`Recorded pending GRIT for: ${customerEmail} - ${gritAmount} GRIT`);
    return NextResponse.json({
      success: true,
      email: customerEmail,
      pendingGrit: gritAmount,
      message: 'GRIT recorded as pending',
    });

  } catch (error) {
    console.error('Shopify webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
