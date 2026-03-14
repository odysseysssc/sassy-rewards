import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { findCredentialByEmail, getMemberByEmail, getOrCreateDripAccount } from '@/lib/drip';

// POST - Fix users with NULL drip_account_id
export async function POST() {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Find all users with NULL drip_account_id who have an email
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email')
      .is('drip_account_id', null)
      .not('email', 'is', null);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with NULL drip_account_id found',
        fixed: 0
      });
    }

    const results: Array<{
      email: string;
      status: 'fixed' | 'not_found' | 'error';
      drip_account_id?: string;
      error?: string;
    }> = [];

    for (const user of users) {
      if (!user.email) continue;

      try {
        // Try to find/create Drip account for this email
        const dripAccountId = await getOrCreateDripAccount(user.email, user.email.split('@')[0]);

        if (dripAccountId) {
          // Update the user
          const { error: updateError } = await supabase
            .from('users')
            .update({ drip_account_id: dripAccountId })
            .eq('id', user.id);

          if (updateError) {
            results.push({
              email: user.email,
              status: 'error',
              error: `Update failed: ${updateError.message}`,
            });
          } else {
            results.push({
              email: user.email,
              status: 'fixed',
              drip_account_id: dripAccountId,
            });
          }
        } else {
          results.push({
            email: user.email,
            status: 'not_found',
            error: 'Could not find or create Drip account',
          });
        }
      } catch (e) {
        results.push({
          email: user.email,
          status: 'error',
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }

    const fixed = results.filter(r => r.status === 'fixed').length;
    const notFound = results.filter(r => r.status === 'not_found').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      total: users.length,
      fixed,
      notFound,
      errors,
      results,
    });
  } catch (error) {
    console.error('Error fixing drip accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Preview users that would be fixed
export async function GET() {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Find all users with NULL drip_account_id who have an email
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .is('drip_account_id', null)
      .not('email', 'is', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // For each user, check if they have GRIT in Drip
    const usersWithDripInfo = await Promise.all(
      (users || []).map(async (user) => {
        let dripInfo = null;
        if (user.email) {
          try {
            const credential = await findCredentialByEmail(user.email);
            const member = await getMemberByEmail(user.email);
            dripInfo = {
              hasCredential: !!credential,
              credentialAccountId: credential?.accountId || null,
              hasMember: !!member,
              memberId: member?.id || null,
              gritBalance: member?.points || 0,
            };
          } catch (e) {
            dripInfo = { error: 'Failed to check Drip' };
          }
        }
        return { ...user, dripInfo };
      })
    );

    return NextResponse.json({
      count: users?.length || 0,
      users: usersWithDripInfo,
    });
  } catch (error) {
    console.error('Error previewing drip accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
