import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet } from '@/lib/drip';

// GET - Check auto-entry status for a wallet
export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  const walletLower = wallet.toLowerCase();
  const supabase = createServerClient();

  const { data } = await supabase
    .from('pinwheel_auto_entries')
    .select('enabled')
    .eq('wallet_address', walletLower)
    .single();

  return NextResponse.json({
    enabled: data?.enabled ?? false,
  });
}

// POST - Toggle auto-entry for a wallet
export async function POST(request: NextRequest) {
  try {
    const { wallet, enabled } = await request.json();

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    const walletLower = wallet.toLowerCase();

    // Verify wallet exists in Drip before allowing auto-entry
    const member = await getMemberByWallet(wallet);
    if (!member) {
      return NextResponse.json(
        { error: 'Wallet not found in Drip. You must have a Drip account to enable auto-entry.' },
        { status: 404 }
      );
    }

    const supabase = createServerClient();

    // Upsert the auto-entry record
    const { error } = await supabase
      .from('pinwheel_auto_entries')
      .upsert(
        {
          wallet_address: walletLower,
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
