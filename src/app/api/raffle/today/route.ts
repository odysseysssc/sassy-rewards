import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];

    // Get today's entry count
    const { count, error } = await supabase
      .from('pinwheel_entries')
      .select('*', { count: 'exact', head: true })
      .eq('entry_date', today);

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
