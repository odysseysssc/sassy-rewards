import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const supabase = createServerClient();
    const drawDate = getDrawDate();

    // Get entry count for current draw window
    const { count, error } = await supabase
      .from('pinwheel_entries')
      .select('*', { count: 'exact', head: true })
      .eq('entry_date', drawDate);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to get entries' },
        { status: 500 }
      );
    }

    // Get recent winner if any
    const { data: recentWinner } = await supabase
      .from('pinwheel_winners')
      .select('*')
      .order('date_won', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      entryCount: count || 0,
      recentWinner: recentWinner || null
    });
  } catch (error) {
    console.error('Error fetching raffle data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch raffle data' },
      { status: 500 }
    );
  }
}
