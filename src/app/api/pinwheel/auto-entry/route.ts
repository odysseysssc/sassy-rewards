import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet, getMemberByAccountId } from '@/lib/drip';

// Helper to check if a string looks like a Drip account ID (UUID format)
function isAccountId(identifier: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
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
    const isUUID = isAccountId(wallet);

    console.log('[Auto-Entry] Identifier:', wallet, 'isUUID:', isUUID);

    // Check if this is an account ID or wallet address and verify in Drip
    let member;
    if (isUUID) {
      // It's a Drip account ID - look up directly
      console.log('[Auto-Entry] Looking up by accountId...');
      member = await getMemberByAccountId(wallet);
    } else {
      // It's a wallet address - look up by wallet
      console.log('[Auto-Entry] Looking up by wallet...');
      member = await getMemberByWallet(wallet);
    }

    console.log('[Auto-Entry] Member found:', member ? member.id : 'null');

    if (!member) {
      return NextResponse.json(
        { error: `Account not found in Drip. Identifier: ${wallet.slice(0, 10)}... isUUID: ${isUUID}` },
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
