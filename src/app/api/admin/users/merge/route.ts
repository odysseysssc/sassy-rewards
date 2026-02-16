import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export async function POST(request: NextRequest) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const { keepUserId, deleteUserId } = await request.json();

    if (!keepUserId || !deleteUserId) {
      return NextResponse.json({ error: 'keepUserId and deleteUserId are required' }, { status: 400 });
    }

    if (keepUserId === deleteUserId) {
      return NextResponse.json({ error: 'Cannot merge user with itself' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify both users exist
    const { data: keepUser, error: keepError } = await supabase
      .from('users')
      .select('*')
      .eq('id', keepUserId)
      .single();

    if (keepError || !keepUser) {
      return NextResponse.json({ error: 'Keep user not found' }, { status: 404 });
    }

    const { data: deleteUser, error: deleteError } = await supabase
      .from('users')
      .select('*')
      .eq('id', deleteUserId)
      .single();

    if (deleteError || !deleteUser) {
      return NextResponse.json({ error: 'Delete user not found' }, { status: 404 });
    }

    const mergeLog: string[] = [];

    // 1. Move connected_credentials from deleteUser to keepUser
    const { data: credsToMove } = await supabase
      .from('connected_credentials')
      .select('*')
      .eq('user_id', deleteUserId);

    if (credsToMove && credsToMove.length > 0) {
      // Check for conflicts (same credential type already exists on keepUser)
      const { data: existingCreds } = await supabase
        .from('connected_credentials')
        .select('credential_type, identifier')
        .eq('user_id', keepUserId);

      const existingTypes = new Set(existingCreds?.map(c => `${c.credential_type}:${c.identifier}`) || []);

      for (const cred of credsToMove) {
        const key = `${cred.credential_type}:${cred.identifier}`;
        if (existingTypes.has(key)) {
          // Delete duplicate credential from deleteUser
          await supabase
            .from('connected_credentials')
            .delete()
            .eq('id', cred.id);
          mergeLog.push(`Skipped duplicate credential: ${cred.credential_type} ${cred.identifier}`);
        } else {
          // Move credential to keepUser
          await supabase
            .from('connected_credentials')
            .update({ user_id: keepUserId })
            .eq('id', cred.id);
          mergeLog.push(`Moved credential: ${cred.credential_type} ${cred.identifier}`);
        }
      }
    }

    // 2. Move submissions
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id')
      .eq('user_id', deleteUserId);

    if (submissions && submissions.length > 0) {
      await supabase
        .from('submissions')
        .update({ user_id: keepUserId })
        .eq('user_id', deleteUserId);
      mergeLog.push(`Moved ${submissions.length} submissions`);
    }

    // 3. Move pinwheel_winners (wallet_address based, may need manual handling)
    // These are linked by wallet_address, not user_id, so they should auto-resolve

    // 4. Delete email_verifications for deleteUser (no longer needed)
    await supabase
      .from('email_verifications')
      .delete()
      .eq('user_id', deleteUserId);
    mergeLog.push('Deleted email verifications');

    // 5. Copy over any missing data from deleteUser to keepUser
    const updates: Record<string, string | null> = {};

    if (!keepUser.email && deleteUser.email) {
      updates.email = deleteUser.email;
      mergeLog.push(`Copied email: ${deleteUser.email}`);
    }

    if (!keepUser.display_name && deleteUser.display_name) {
      updates.display_name = deleteUser.display_name;
      mergeLog.push(`Copied display_name: ${deleteUser.display_name}`);
    }

    if (!keepUser.drip_account_id && deleteUser.drip_account_id) {
      updates.drip_account_id = deleteUser.drip_account_id;
      mergeLog.push(`Copied drip_account_id: ${deleteUser.drip_account_id}`);
    }

    // Copy shipping address if keepUser doesn't have one
    if (!keepUser.shipping_address && deleteUser.shipping_address) {
      updates.shipping_name = deleteUser.shipping_name;
      updates.shipping_email = deleteUser.shipping_email;
      updates.shipping_phone = deleteUser.shipping_phone;
      updates.shipping_address = deleteUser.shipping_address;
      updates.shipping_city = deleteUser.shipping_city;
      updates.shipping_state = deleteUser.shipping_state;
      updates.shipping_zip = deleteUser.shipping_zip;
      updates.shipping_country = deleteUser.shipping_country;
      mergeLog.push('Copied shipping address');
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('users')
        .update(updates)
        .eq('id', keepUserId);
    }

    // 6. Delete the old user
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', deleteUserId);

    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError);
      return NextResponse.json({
        error: 'Merge partially complete but failed to delete old user',
        log: mergeLog
      }, { status: 500 });
    }

    mergeLog.push(`Deleted user: ${deleteUserId}`);

    return NextResponse.json({
      success: true,
      message: 'Users merged successfully',
      log: mergeLog
    });
  } catch (error) {
    console.error('Error merging users:', error);
    return NextResponse.json({ error: 'Failed to merge users' }, { status: 500 });
  }
}
