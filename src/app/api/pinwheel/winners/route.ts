import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet, getMemberByAccountId } from '@/lib/drip';

// Helper to check if a string is a wallet address (starts with 0x)
function isWalletAddress(identifier: string): boolean {
  return identifier.startsWith('0x');
}

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
        const identifier = winner.wallet_address;
        const truncated = identifier.startsWith('0x')
          ? `${identifier.slice(0, 6)}...${identifier.slice(-4)}`
          : `${identifier.slice(0, 8)}...`;

        try {
          // Look up by wallet or account ID depending on format
          const member = isWalletAddress(identifier)
            ? await getMemberByWallet(identifier)
            : await getMemberByAccountId(identifier);

          return {
            ...winner,
            display_name: member?.username || truncated,
          };
        } catch {
          return {
            ...winner,
            display_name: truncated,
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
