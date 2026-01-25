import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet } from '@/lib/drip';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  try {
    // If wallet provided, get that user's last win
    if (wallet) {
      const { data: lastWin, error: winError } = await supabase
        .from('pinwheel_winners')
        .select('pin_won, date_won')
        .eq('wallet_address', wallet.toLowerCase())
        .order('date_won', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (winError) {
        console.error('Error fetching user last win:', winError);
      }

      return NextResponse.json({ lastWin: lastWin || null });
    }

    // Otherwise get global last winner
    const { data: winner, error } = await supabase
      .from('pinwheel_winners')
      .select('*')
      .order('date_won', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching last spin:', error);
      return NextResponse.json(
        { error: 'Failed to fetch last spin' },
        { status: 500 }
      );
    }

    if (!winner) {
      return NextResponse.json({ winner: null });
    }

    // Get member name from Drip
    let displayName = `${winner.wallet_address.slice(0, 6)}...${winner.wallet_address.slice(-4)}`;
    try {
      const member = await getMemberByWallet(winner.wallet_address);
      if (member?.username) {
        displayName = member.username;
      }
    } catch {
      // Fallback to truncated wallet
    }

    return NextResponse.json({
      winner: {
        wallet_address: winner.wallet_address,
        display_name: displayName,
        pin_won: winner.pin_won,
        spin_segment_index: winner.spin_segment_index,
        date_won: winner.date_won,
      },
    });
  } catch (error) {
    console.error('Error fetching last spin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch last spin' },
      { status: 500 }
    );
  }
}
