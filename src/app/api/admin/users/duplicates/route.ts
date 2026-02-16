import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { getMemberByAccountId } from '@/lib/drip';

export async function GET() {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Find all users with drip_account_id
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name, drip_account_id, created_at')
      .not('drip_account_id', 'is', null)
      .order('drip_account_id');

    if (usersError) throw usersError;

    // Group users by drip_account_id
    const groupedByDrip: Record<string, typeof users> = {};
    (users || []).forEach(user => {
      if (user.drip_account_id) {
        if (!groupedByDrip[user.drip_account_id]) {
          groupedByDrip[user.drip_account_id] = [];
        }
        groupedByDrip[user.drip_account_id].push(user);
      }
    });

    // Filter to only groups with more than 1 user (duplicates)
    const duplicateGroups = Object.entries(groupedByDrip)
      .filter(([, users]) => users.length > 1)
      .map(([dripAccountId, users]) => ({
        dripAccountId,
        users,
      }));

    // Get credentials for all duplicate users
    const duplicateUserIds = duplicateGroups.flatMap(g => g.users.map(u => u.id));

    let credentialsMap: Record<string, { credential_type: string; identifier: string }[]> = {};

    if (duplicateUserIds.length > 0) {
      const { data: credentials } = await supabase
        .from('connected_credentials')
        .select('user_id, credential_type, identifier')
        .in('user_id', duplicateUserIds);

      // Group credentials by user_id
      (credentials || []).forEach(cred => {
        if (!credentialsMap[cred.user_id]) {
          credentialsMap[cred.user_id] = [];
        }
        credentialsMap[cred.user_id].push({
          credential_type: cred.credential_type,
          identifier: cred.identifier,
        });
      });
    }

    // Attach credentials to users
    const duplicatesWithCredentials = duplicateGroups.map(group => ({
      dripAccountId: group.dripAccountId,
      users: group.users.map(user => ({
        ...user,
        credentials: credentialsMap[user.id] || [],
      })),
    }));

    // Fetch GRIT balance for each duplicate group from Drip
    const duplicatesWithGrit = await Promise.all(
      duplicatesWithCredentials.map(async (group) => {
        let gritBalance = 0;
        try {
          const member = await getMemberByAccountId(group.dripAccountId);
          if (member) {
            gritBalance = member.points || 0;
          }
        } catch (e) {
          console.error('Error fetching GRIT for', group.dripAccountId, e);
        }
        return {
          ...group,
          gritBalance,
        };
      })
    );

    return NextResponse.json({
      duplicates: duplicatesWithGrit,
      totalDuplicateGroups: duplicatesWithGrit.length,
    });
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return NextResponse.json({ error: 'Failed to find duplicates' }, { status: 500 });
  }
}
