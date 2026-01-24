import { NextResponse } from 'next/server';
import { createServerClient, UserProfile } from '@/lib/supabase';
import { getMemberByWallet } from '@/lib/drip';

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('pinwheel_winners')
      .select('*')
      .order('date_won', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Get unique wallets
    const uniqueWallets = [...new Set(data?.map(w => w.wallet_address) || [])];

    // Fetch member names and profiles in parallel
    const [memberResults, profileResults] = await Promise.all([
      Promise.all(
        uniqueWallets.map(async (wallet) => {
          const member = await getMemberByWallet(wallet);
          return { wallet, name: member?.username || null };
        })
      ),
      supabase
        .from('user_profiles')
        .select('*')
        .in('wallet_address', uniqueWallets),
    ]);

    const memberNames: Record<string, string> = {};
    memberResults.forEach(({ wallet, name }) => {
      if (name) memberNames[wallet] = name;
    });

    const profiles: Record<string, UserProfile> = {};
    (profileResults.data || []).forEach((profile: UserProfile) => {
      profiles[profile.wallet_address] = profile;
    });

    // Add member names and profiles to winners
    const winnersWithData = data?.map(winner => ({
      ...winner,
      member_name: memberNames[winner.wallet_address] || null,
      profile: profiles[winner.wallet_address] || null,
    }));

    return NextResponse.json({ winners: winnersWithData });
  } catch (error) {
    console.error('Error fetching winners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch winners' },
      { status: 500 }
    );
  }
}
