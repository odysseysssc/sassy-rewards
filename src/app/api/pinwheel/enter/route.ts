import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet, deductGrit } from '@/lib/drip';
import { RAFFLE_COST } from '@/lib/constants';

// Get the draw date for the current entry window
// Before 8pm UTC: entries are for today's draw
// After 8pm UTC: entries are for tomorrow's draw
function getDrawDate(): string {
  const now = new Date();
  const hour = now.getUTCHours();

  if (hour >= 20) {
    // After 8pm UTC, entries are for tomorrow's draw
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Before 8pm UTC, entries are for today's draw
  return now.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
  try {
    const { wallet } = await request.json();

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const walletLower = wallet.toLowerCase();
    const supabase = createServerClient();
    const drawDate = getDrawDate();

    // Check if already entered for current draw window
    const { data: existingEntry } = await supabase
      .from('pinwheel_entries')
      .select('id')
      .eq('wallet_address', walletLower)
      .eq('entry_date', drawDate)
      .single();

    if (existingEntry) {
      return NextResponse.json(
        { error: 'You have already entered for this draw' },
        { status: 400 }
      );
    }

    // Get member and check balance
    const member = await getMemberByWallet(wallet);
    if (!member) {
      return NextResponse.json(
        { error: 'Wallet not found in Drip' },
        { status: 404 }
      );
    }

    if (member.points < RAFFLE_COST) {
      return NextResponse.json(
        { error: `Insufficient Grit. You need ${RAFFLE_COST} Grit to enter.` },
        { status: 400 }
      );
    }

    if (!member.currencyId) {
      return NextResponse.json(
        { error: 'Could not find Grit currency' },
        { status: 500 }
      );
    }

    // Deduct Grit
    const deductResult = await deductGrit(member.id, RAFFLE_COST, member.currencyId);
    if (!deductResult.success) {
      return NextResponse.json(
        { error: deductResult.error || 'Failed to deduct Grit' },
        { status: 500 }
      );
    }

    // Create entry
    const { error: insertError } = await supabase
      .from('pinwheel_entries')
      .insert({
        wallet_address: walletLower,
        entry_date: drawDate,
      });

    if (insertError) {
      console.error('Error creating entry:', insertError);
      return NextResponse.json(
        { error: 'Failed to create entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newBalance: deductResult.newBalance,
      message: 'Entry successful! Good luck in the draw.',
    });
  } catch (error) {
    console.error('Error entering pinwheel:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
