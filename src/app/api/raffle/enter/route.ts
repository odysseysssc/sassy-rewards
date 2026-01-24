import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet, getMemberByAccountId, deductGrit } from '@/lib/drip';
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
    const { wallet, accountId } = await request.json();

    if (!wallet && !accountId) {
      return NextResponse.json(
        { error: 'Wallet address or account ID is required' },
        { status: 400 }
      );
    }

    const normalizedWallet = wallet?.toLowerCase();
    const supabase = createServerClient();
    const drawDate = getDrawDate();

    // Check if already entered for current draw window
    const { data: existingEntry } = await supabase
      .from('pinwheel_entries')
      .select('*')
      .eq('wallet_address', normalizedWallet || accountId)
      .eq('entry_date', drawDate)
      .maybeSingle();

    if (existingEntry) {
      return NextResponse.json(
        {
          error: 'Already entered for this draw',
          enteredAt: existingEntry.created_at
        },
        { status: 400 }
      );
    }

    // Get member - try wallet first, then accountId
    let member = null;
    if (wallet) {
      member = await getMemberByWallet(wallet);
    }
    if (!member && accountId) {
      member = await getMemberByAccountId(accountId);
    }

    if (!member) {
      return NextResponse.json(
        { error: 'Account not found in Drip. Make sure you are logged in.' },
        { status: 404 }
      );
    }

    if (member.points < RAFFLE_COST) {
      return NextResponse.json(
        {
          error: 'Insufficient Grit balance',
          required: RAFFLE_COST,
          current: member.points
        },
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

    // Create entry - use wallet if available, otherwise use accountId
    const entryIdentifier = normalizedWallet || accountId;
    const { data: entry, error: insertError } = await supabase
      .from('pinwheel_entries')
      .insert({
        wallet_address: entryIdentifier,
        entry_date: drawDate,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      entry,
      newBalance: deductResult.newBalance,
      message: 'Entry successful! Good luck in the draw.',
    });
  } catch (error) {
    console.error('Error entering raffle:', error);
    return NextResponse.json(
      { error: 'Failed to enter raffle' },
      { status: 500 }
    );
  }
}
