import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet, getMemberByAccountId } from '@/lib/drip';

// Helper to check if a string is a wallet address (starts with 0x)
// If not a wallet, assume it's a Drip account ID
function isWalletAddress(identifier: string): boolean {
  return identifier.startsWith('0x');
}

// GET - Check auto-entry status for a wallet/accountId
export async function GET(request: NextRequest) {
  const identifier = request.nextUrl.searchParams.get('wallet');

  if (!identifier) {
    return NextResponse.json(
      { error: 'Wallet address or account ID is required' },
      { status: 400 }
    );
  }

  const identifierLower = identifier.toLowerCase();
  const supabase = createServerClient();

  const { data } = await supabase
    .from('pinwheel_auto_entries')
    .select('enabled')
    .eq('wallet_address', identifierLower)
    .single();

  return NextResponse.json({
    enabled: data?.enabled ?? false,
  });
}

// POST - Toggle auto-entry for a wallet/accountId
export async function POST(request: NextRequest) {
  try {
    const { wallet, enabled } = await request.json();

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address or account ID is required' },
        { status: 400 }
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    const identifierLower = wallet.toLowerCase();
    const isWallet = isWalletAddress(wallet);

    // Check if this is a wallet address or account ID and verify in Drip
    let member;
    if (isWallet) {
      member = await getMemberByWallet(wallet);
    } else {
      member = await getMemberByAccountId(wallet);
    }

    if (!member) {
      return NextResponse.json(
        { error: 'Account not found in Drip. You must have a Drip account to enable auto-entry.' },
        { status: 404 }
      );
    }

    const supabase = createServerClient();

    // Upsert the auto-entry record (wallet_address column stores either wallet or accountId)
    const { error } = await supabase
      .from('pinwheel_auto_entries')
      .upsert(
        {
          wallet_address: identifierLower,
          enabled,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'wallet_address',
        }
      );

    if (error) {
      console.error('Error updating auto-entry:', error);
      return NextResponse.json(
        { error: 'Failed to update auto-entry setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      enabled,
      message: enabled
        ? 'Auto-entry enabled! You will be automatically entered daily at 7:55pm UTC.'
        : 'Auto-entry disabled.',
    });
  } catch (error) {
    console.error('Error in auto-entry toggle:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
