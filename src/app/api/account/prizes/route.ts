import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get user's wallet from connected_credentials
    const { data: walletCred } = await supabase
      .from('connected_credentials')
      .select('identifier')
      .eq('user_id', session.user.id)
      .eq('credential_type', 'wallet')
      .single();

    if (!walletCred?.identifier) {
      // No wallet connected, no prizes possible
      return NextResponse.json({ prizes: [] });
    }

    // Get prizes won by this wallet
    const { data: prizes, error } = await supabase
      .from('pinwheel_winners')
      .select('id, date_won, pin_won, shipped')
      .eq('wallet_address', walletCred.identifier.toLowerCase())
      .order('date_won', { ascending: false });

    if (error) {
      console.error('Error fetching prizes:', error);
      return NextResponse.json({ prizes: [] });
    }

    return NextResponse.json({ prizes: prizes || [] });
  } catch (error) {
    console.error('Error in prizes GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
