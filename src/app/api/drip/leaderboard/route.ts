import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/drip';
import { createServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Who is asking (to flag their own row) - computed server-side so internal IDs never leave
    const session = await getServerSession(authOptions);
    const myAccountId = session?.user?.dripAccountId;
    const myWallet = session?.user?.wallet?.toLowerCase();

    // Public shape: rank, name, points, truncated wallet, isMe. No Drip account IDs
    // (those were enough to act on other users' GRIT) and no full wallet addresses.
    const leaderboardWithNames = leaderboard.map(entry => ({
      rank: entry.rank,
      points: entry.points,
      username: entry.accountId && displayNameMap[entry.accountId]
        ? displayNameMap[entry.accountId]
        : entry.username,
      wallet: entry.wallet ? `${entry.wallet.slice(0, 6)}...${entry.wallet.slice(-4)}` : undefined,
      isMe: !!((myAccountId && entry.accountId === myAccountId) ||
               (myWallet && entry.wallet?.toLowerCase() === myWallet)),
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
