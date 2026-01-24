import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet } from '@/lib/drip';

export async function GET() {
  const supabase = createServerClient();

  try {
    const { data: winners, error } = await supabase
      .from('pinwheel_winners')
      .select('wallet_address, pin_won, date_won')
      .order('date_won', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching winners:', error);
      return NextResponse.json(
        { error: 'Failed to fetch winners' },
        { status: 500 }
      );
    }

    // Fetch member names for all winners
    const winnersWithNames = await Promise.all(
      (winners || []).map(async (winner) => {
        try {
          const member = await getMemberByWallet(winner.wallet_address);
          return {
            ...winner,
            display_name: member?.username || `${winner.wallet_address.slice(0, 6)}...${winner.wallet_address.slice(-4)}`,
          };
        } catch {
          return {
            ...winner,
            display_name: `${winner.wallet_address.slice(0, 6)}...${winner.wallet_address.slice(-4)}`,
          };
        }
      })
    );

    return NextResponse.json({ winners: winnersWithNames });
  } catch (error) {
    console.error('Error fetching winners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch winners' },
      { status: 500 }
    );
  }
}
