import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

// GET - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { userId } = await params;

  try {
    const supabase = createServerClient();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get credentials
    const { data: credentials } = await supabase
      .from('connected_credentials')
      .select('*')
      .eq('user_id', userId);

    // Get submissions count
    const { count: submissionsCount } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get pinwheel wins (by looking up via credentials)
    const walletCreds = credentials?.filter(c => c.credential_type === 'wallet') || [];
    const walletAddresses = walletCreds.map(c => c.identifier);

    let pinwheelWins: { id: string; pin_won: string; date_won: string }[] = [];
    if (walletAddresses.length > 0) {
      const { data: wins } = await supabase
        .from('pinwheel_winners')
        .select('id, pin_won, date_won')
        .in('wallet_address', walletAddresses);
      pinwheelWins = wins || [];
    }

    return NextResponse.json({
      user,
      credentials: credentials || [],
      submissionsCount: submissionsCount || 0,
      pinwheelWins,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// DELETE - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { userId } = await params;

  try {
    const supabase = createServerClient();

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has submissions (warn but don't block)
    const { count: submissionsCount } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const deleteLog: string[] = [];

    // 1. Delete connected_credentials
    const { data: deletedCreds } = await supabase
      .from('connected_credentials')
      .delete()
      .eq('user_id', userId)
      .select();
    deleteLog.push(`Deleted ${deletedCreds?.length || 0} credentials`);

    // 2. Delete email_verifications
    await supabase
      .from('email_verifications')
      .delete()
      .eq('user_id', userId);
    deleteLog.push('Deleted email verifications');

    // 3. Delete submissions (optional - could reassign instead)
    if (submissionsCount && submissionsCount > 0) {
      await supabase
        .from('submissions')
        .delete()
        .eq('user_id', userId);
      deleteLog.push(`Deleted ${submissionsCount} submissions`);
    }

    // 4. Delete the user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({
        error: 'Failed to delete user',
        log: deleteLog
      }, { status: 500 });
    }

    deleteLog.push(`Deleted user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      log: deleteLog
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
