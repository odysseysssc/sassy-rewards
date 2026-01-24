import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  const supabase = createServerClient();
  const drawDate = getDrawDate();

  try {
    // Get entry count for current draw window
    const { count: entryCount } = await supabase
      .from('pinwheel_entries')
      .select('*', { count: 'exact', head: true })
      .eq('entry_date', drawDate);

    // Check if user has entered for current draw
    let hasEntered = false;
    if (wallet) {
      const { data: userEntry } = await supabase
        .from('pinwheel_entries')
        .select('id')
        .eq('wallet_address', wallet.toLowerCase())
        .eq('entry_date', drawDate)
        .single();

      hasEntered = !!userEntry;
    }

    // Calculate time until next 8pm UTC draw
    const now = new Date();
    const eightPmUtc = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      20, 0, 0
    ));

    // If it's past 8pm UTC today, set to tomorrow
    if (now.getTime() > eightPmUtc.getTime()) {
      eightPmUtc.setUTCDate(eightPmUtc.getUTCDate() + 1);
    }

    const msUntilDraw = eightPmUtc.getTime() - now.getTime();
    // Draw window is always open (no "complete" state - after draw, new window opens)
    const drawComplete = false;

    return NextResponse.json({
      entryCount: entryCount || 0,
      hasEntered,
      msUntilDraw,
      drawComplete,
      drawTime: eightPmUtc.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching pinwheel status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
