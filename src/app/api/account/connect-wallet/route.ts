import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet, linkCredentialToAccount, findCredential } from '@/lib/drip';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet } = await request.json();

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const walletLower = wallet.toLowerCase();
    const supabase = createServerClient();

    // Check if this wallet is already linked to another account
    const { data: existingCredential } = await supabase
      .from('connected_credentials')
      .select('user_id')
      .eq('credential_type', 'wallet')
      .eq('identifier', walletLower)
      .single();

    if (existingCredential && existingCredential.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'This wallet is already linked to another account' },
        { status: 400 }
      );
    }

    // Check if wallet exists in Drip (may have ghost GRIT)
    const dripMember = await getMemberByWallet(wallet);

    // Check if wallet is already linked to a DIFFERENT Drip account
    const existingDripCredential = await findCredential('wallet', walletLower);
    if (existingDripCredential?.accountId) {
      // Credential is linked to a Drip account - check if it's this user's
      const userDripId = session.user.dripAccountId;
      if (userDripId && existingDripCredential.accountId !== userDripId) {
        return NextResponse.json(
          { error: 'This wallet is already linked to another Drip account' },
          { status: 400 }
        );
      }
      // If user doesn't have a Drip account yet, they can adopt this one (handled below)
    }

    // Add credential to our DB
    if (!existingCredential) {
      const { error: insertError } = await supabase
        .from('connected_credentials')
        .insert({
          user_id: session.user.id,
          credential_type: 'wallet',
          identifier: walletLower,
          verified: true,
        });

      if (insertError) {
        console.error('Error inserting credential:', insertError);
        return NextResponse.json({ error: 'Failed to link wallet' }, { status: 500 });
      }
    }

    // Get user's current Drip account ID
    let userDripAccountId = session.user.dripAccountId;

    // If user doesn't have a Drip account but the wallet does, adopt that account
    if (!userDripAccountId && dripMember?.id) {
      userDripAccountId = dripMember.id;
      await supabase
        .from('users')
        .update({ drip_account_id: dripMember.id, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
    }

    // Link wallet credential in Drip (transfers any ghost GRIT to user's account)
    if (userDripAccountId) {
      try {
        await linkCredentialToAccount('wallet', walletLower, userDripAccountId);
        console.log(`Linked wallet ${walletLower} to Drip account ${userDripAccountId}`);
      } catch (error) {
        console.error('Error linking wallet in Drip:', error);
        // Non-fatal - credential is still saved in our DB
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Wallet linked successfully',
      dripAccountId: userDripAccountId,
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
