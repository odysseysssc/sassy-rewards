import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet, getMemberByAccountId, deductGrit } from '@/lib/drip';
import { RAFFLE_COST } from '@/lib/constants';

// Helper to check if a string is a wallet address (starts with 0x)
function isWalletAddress(identifier: string): boolean {
  return identifier.startsWith('0x');
}

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

    // Prefer accountId over wallet address
    const identifier = accountId || wallet;

    if (!identifier) {
      return NextResponse.json(
        { error: 'Wallet address or account ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const drawDate = getDrawDate();

    // ALWAYS look up the Drip member first to get canonical account ID
    // This prevents double charges when user enters with different credentials
    let member;
    if (isWalletAddress(identifier)) {
      member = await getMemberByWallet(identifier);
    } else {
      member = await getMemberByAccountId(identifier);
    }

    if (!member) {
      return NextResponse.json(
        { error: 'Account not found in Drip' },
        { status: 404 }
      );
    }

    // Use Drip account ID as the canonical identifier for entries
    // This ensures one entry per Drip account, regardless of which credential was used
    const canonicalId = member.id.toLowerCase();

    // Check if already entered for current draw window using canonical Drip account ID
    const { data: existingEntry } = await supabase
      .from('pinwheel_entries')
      .select('id')
      .eq('wallet_address', canonicalId)
      .eq('entry_date', drawDate)
      .single();

    if (existingEntry) {
      return NextResponse.json(
        { error: 'You have already entered for this draw' },
        { status: 400 }
      );
    }

    // Also check for legacy entries using the raw identifier (backwards compatibility)
    const identifierLower = identifier.toLowerCase();
    if (identifierLower !== canonicalId) {
      const { data: legacyEntry } = await supabase
        .from('pinwheel_entries')
        .select('id')
        .eq('wallet_address', identifierLower)
        .eq('entry_date', drawDate)
        .single();

      if (legacyEntry) {
        return NextResponse.json(
          { error: 'You have already entered for this draw' },
          { status: 400 }
        );
      }
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

    // Create entry FIRST to claim the slot (prevents race conditions)
    const { error: insertError } = await supabase
      .from('pinwheel_entries')
      .insert({
        wallet_address: canonicalId,
        entry_date: drawDate,
      });

    if (insertError) {
      // If it's a unique constraint violation, user already entered
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already entered for this draw' },
          { status: 400 }
        );
      }
      console.error('Error creating entry:', insertError);
      return NextResponse.json(
        { error: 'Failed to create entry' },
        { status: 500 }
      );
    }

    // Now deduct Grit (entry is already claimed)
    const deductResult = await deductGrit(member.id, RAFFLE_COST, member.currencyId);
    if (!deductResult.success) {
      // GRIT deduction failed - remove the entry we just created
      await supabase
        .from('pinwheel_entries')
        .delete()
        .eq('wallet_address', canonicalId)
        .eq('entry_date', drawDate);

      return NextResponse.json(
        { error: deductResult.error || 'Failed to deduct Grit' },
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
