import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { claimPendingGrit } from '@/lib/db';
import { createEmailCredential, linkCredentialToAccount, getOrCreateDripAccount } from '@/lib/drip';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Email and userId are required' },
        { status: 400 }
      );
    }

    // Get the existing user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already linked to another user
    const { data: existingEmailUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .neq('id', userId)
      .single();

    if (existingEmailUser) {
      return NextResponse.json(
        { error: 'This email is already connected to another account' },
        { status: 409 }
      );
    }

    // Update user with the email
    const { error: updateError } = await supabase
      .from('users')
      .update({ email: email.toLowerCase() })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user email:', updateError);
      return NextResponse.json(
        { error: 'Failed to link email' },
        { status: 500 }
      );
    }

    // Add email as connected credential
    await supabase
      .from('connected_credentials')
      .upsert({
        user_id: userId,
        credential_type: 'email',
        identifier: email.toLowerCase(),
        verified: true,
      }, {
        onConflict: 'credential_type,identifier',
      });

    // Handle Drip integration
    if (user.drip_account_id) {
      // User already has a Drip account - link email credential to it
      try {
        await linkCredentialToAccount('email', email, user.drip_account_id);
        console.log(`Linked email credential ${email} to Drip account ${user.drip_account_id}`);
      } catch (error) {
        console.error('Error creating Drip email credential:', error);
        // Non-fatal - continue
      }
    } else {
      // User doesn't have a Drip account - create one and link email credential
      try {
        const dripAccountId = await getOrCreateDripAccount(email, user.display_name || email.split('@')[0]);
        if (dripAccountId) {
          // Update user with Drip account ID
          await supabase
            .from('users')
            .update({ drip_account_id: dripAccountId })
            .eq('id', userId);

          // Link any existing ghost credentials
          await linkCredentialToAccount('email', email, dripAccountId);
          console.log(`Created/linked Drip account ${dripAccountId} for ${email}`);
        }
      } catch (error) {
        console.error('Error setting up Drip account:', error);
        // Non-fatal - continue
      }
    }

    // Claim any pending GRIT from Shopify
    try {
      const claimedGrit = await claimPendingGrit(email, userId);
      if (claimedGrit > 0) {
        console.log(`Claimed ${claimedGrit} pending GRIT for ${email}`);
      }
    } catch (error) {
      console.error('Error claiming pending GRIT:', error);
      // Non-fatal - continue
    }

    return NextResponse.json({
      success: true,
      message: 'Email linked successfully',
    });
  } catch (error) {
    console.error('Link email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
