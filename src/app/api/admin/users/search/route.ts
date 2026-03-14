import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { getMemberByAccountId, getMemberByEmail, searchMembersByUsername } from '@/lib/drip';

export async function GET(request: NextRequest) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.toLowerCase().trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    // Search users by email, display_name, drip_account_id, or id
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name, drip_account_id, created_at')
      .or(`email.ilike.%${query}%,display_name.ilike.%${query}%,drip_account_id.ilike.%${query}%,id.ilike.%${query}%`)
      .limit(30);

    if (usersError) throw usersError;

    // Also search connected_credentials for wallet/discord matches
    const { data: credentials, error: credsError } = await supabase
      .from('connected_credentials')
      .select('user_id, credential_type, identifier')
      .ilike('identifier', `%${query}%`)
      .limit(20);

    if (credsError) throw credsError;

    // Get unique user IDs from credential search
    const credUserIds = [...new Set(credentials?.map(c => c.user_id) || [])];

    // Fetch those users too
    let credUsers: typeof users = [];
    if (credUserIds.length > 0) {
      const { data } = await supabase
        .from('users')
        .select('id, email, display_name, drip_account_id, created_at')
        .in('id', credUserIds);
      credUsers = data || [];
    }

    // Search Drip directly for username matches
    const dripMatches = await searchMembersByUsername(query, 20);
    const dripAccountIds = dripMatches.map(m => m.id).filter(Boolean);

    // Find users in our DB with these Drip account IDs
    let dripUserMatches: typeof users = [];
    if (dripAccountIds.length > 0) {
      const { data } = await supabase
        .from('users')
        .select('id, email, display_name, drip_account_id, created_at')
        .in('drip_account_id', dripAccountIds);
      dripUserMatches = data || [];
    }

    // For Drip matches not found by account ID, try finding by their wallet credentials
    const foundDripAccountIds = new Set(dripUserMatches.map(u => u.drip_account_id));
    const unmatchedDripMembers = dripMatches.filter(m => m.id && !foundDripAccountIds.has(m.id));

    if (unmatchedDripMembers.length > 0) {
      // Collect wallets from Drip members (returned from leaderboard)
      const memberWallets = unmatchedDripMembers
        .filter(m => m.wallet)
        .map(m => m.wallet!.toLowerCase());

      // Search for users by wallet credentials
      if (memberWallets.length > 0) {
        const { data: walletCreds } = await supabase
          .from('connected_credentials')
          .select('user_id')
          .eq('credential_type', 'wallet')
          .in('identifier', memberWallets);

        if (walletCreds && walletCreds.length > 0) {
          const walletUserIds = [...new Set(walletCreds.map(c => c.user_id))];
          const { data: walletUsers } = await supabase
            .from('users')
            .select('id, email, display_name, drip_account_id, created_at')
            .in('id', walletUserIds);
          if (walletUsers) dripUserMatches.push(...walletUsers);
        }
      }
    }

    // Merge and dedupe results
    const allUsers = [...(users || []), ...credUsers, ...dripUserMatches];
    const uniqueUsers = allUsers.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );

    // Fetch all credentials for found users
    const userIds = uniqueUsers.map(u => u.id);
    const { data: allCredentials } = await supabase
      .from('connected_credentials')
      .select('user_id, credential_type, identifier')
      .in('user_id', userIds.length > 0 ? userIds : ['none']);

    // Fetch GRIT balance and Drip username for users
    const usersWithGrit = await Promise.all(
      uniqueUsers.map(async (user) => {
        let gritBalance = 0;
        let dripUsername = null;
        let member = null;

        // Try by drip_account_id first
        if (user.drip_account_id) {
          try {
            member = await getMemberByAccountId(user.drip_account_id);
          } catch (e) {
            console.error('Error fetching GRIT by accountId for user:', user.id, e);
          }
        }

        // If no drip_account_id or lookup failed, try by email
        if (!member && user.email) {
          try {
            member = await getMemberByEmail(user.email);
          } catch (e) {
            console.error('Error fetching GRIT by email for user:', user.id, e);
          }
        }

        if (member) {
          gritBalance = member.points || 0;
          dripUsername = member.username || null;
        }

        return {
          ...user,
          credentials: (allCredentials || []).filter(c => c.user_id === user.id),
          gritBalance,
          dripUsername,
        };
      })
    );

    return NextResponse.json({ users: usersWithGrit });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
