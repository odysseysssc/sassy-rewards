import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { updateMemberDisplayName, getMemberByEmail, getMemberByWallet } from '@/lib/drip';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch from Supabase users table
    const { data, error } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching display name:', error);
      return NextResponse.json({ error: 'Failed to fetch display name' }, { status: 500 });
    }

    return NextResponse.json({ displayName: data?.display_name || null });
  } catch (error) {
    console.error('Error in display-name GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { displayName } = await request.json();

    if (!displayName || typeof displayName !== 'string') {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    const trimmedName = displayName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      return NextResponse.json({ error: 'Display name must be 2-30 characters' }, { status: 400 });
    }

    // Update in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({ display_name: trimmedName })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Error updating display name in Supabase:', updateError);
      return NextResponse.json({ error: 'Failed to update display name' }, { status: 500 });
    }

    // Also update in Drip - try to find the account ID if not in session
    let dripAccountId = session.user.dripAccountId;

    if (!dripAccountId) {
      // Try to find Drip account by email or wallet
      if (session.user.email) {
        const member = await getMemberByEmail(session.user.email);
        if (member?.id) dripAccountId = member.id;
      }
      if (!dripAccountId && session.user.wallet) {
        const member = await getMemberByWallet(session.user.wallet);
        if (member?.id) dripAccountId = member.id;
      }
    }

    if (dripAccountId) {
      const dripUpdated = await updateMemberDisplayName(dripAccountId, trimmedName);
      if (!dripUpdated) {
        console.warn('Failed to update display name in Drip, but Supabase was updated');
      }
    }

    return NextResponse.json({ success: true, displayName: trimmedName });
  } catch (error) {
    console.error('Error in display-name POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
