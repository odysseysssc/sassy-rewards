import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet } from '@/lib/drip';

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

    // Check if this wallet is already linked to another account
    const supabase = createServerClient();
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

    // Check if wallet exists in Drip
    const dripMember = await getMemberByWallet(wallet);

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

    // If the user doesn't have a Drip account but the wallet does, link them
    if (dripMember?.id && !session.user.dripAccountId) {
      await supabase
        .from('users')
        .update({ drip_account_id: dripMember.id, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Wallet linked successfully',
      dripAccountId: dripMember?.id,
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
