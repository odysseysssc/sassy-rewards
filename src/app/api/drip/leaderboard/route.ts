import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/drip';
import { createServerClient } from '@/lib/supabase';

// Disable caching for leaderboard to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const leaderboard = await getLeaderboard();

    // Fetch local display names from our database
    const supabase = createServerClient();
    const { data: users } = await supabase
      .from('users')
      .select('drip_account_id, display_name')
      .not('display_name', 'is', null);

    // Create a map of drip_account_id -> display_name
    const displayNameMap: Record<string, string> = {};
    users?.forEach(user => {
      if (user.drip_account_id && user.display_name) {
        displayNameMap[user.drip_account_id] = user.display_name;
      }
    });

    // Merge local display names with leaderboard data
    const leaderboardWithNames = leaderboard.map(entry => ({
      ...entry,
      // Use local display name if available, otherwise keep original
      username: entry.accountId && displayNameMap[entry.accountId]
        ? displayNameMap[entry.accountId]
        : entry.username,
    }));

    return NextResponse.json({ leaderboard: leaderboardWithNames }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
