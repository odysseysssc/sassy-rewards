import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.toLowerCase();

  if (!query || query.length < 3) {
    return NextResponse.json({ error: 'Search query must be at least 3 characters' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    // Search users by email, display_name, or id
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name, drip_account_id, created_at')
      .or(`email.ilike.%${query}%,display_name.ilike.%${query}%,id.eq.${query}`)
      .limit(20);

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

    // Merge and dedupe results
    const allUsers = [...(users || []), ...credUsers];
    const uniqueUsers = allUsers.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );

    // Fetch all credentials for found users
    const userIds = uniqueUsers.map(u => u.id);
    const { data: allCredentials } = await supabase
      .from('connected_credentials')
      .select('user_id, credential_type, identifier')
      .in('user_id', userIds);

    // Build response with credentials attached
    const usersWithCredentials = uniqueUsers.map(user => ({
      ...user,
      credentials: (allCredentials || []).filter(c => c.user_id === user.id),
    }));

    return NextResponse.json({ users: usersWithCredentials });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
