import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet } from '@/lib/drip';
import { requireAdmin } from '@/lib/admin';

// Get the draw date for the current entry window
function getDrawDate(): string {
  const now = new Date();
  const hour = now.getUTCHours();

  if (hour >= 20) {
    // After 8pm UTC, entries are for tomorrow's draw
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Before 8pm UTC, entries are for today's draw
  return now.toISOString().split('T')[0];
}

export async function GET() {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const drawDate = getDrawDate();

    // Only fetch entries for the current draw window
    const { data, error } = await supabase
      .from('pinwheel_entries')
      .select('*')
      .eq('entry_date', drawDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get unique wallets and fetch member names
    const uniqueWallets = [...new Set(data?.map(e => e.wallet_address) || [])];
    const memberNames: Record<string, string> = {};

    // Fetch member names in parallel (max 20 at a time to avoid rate limits)
    const batchSize = 20;
    for (let i = 0; i < uniqueWallets.length; i += batchSize) {
      const batch = uniqueWallets.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (wallet) => {
          const member = await getMemberByWallet(wallet);
          return { wallet, name: member?.username || null };
        })
      );
      results.forEach(({ wallet, name }) => {
        if (name) memberNames[wallet] = name;
      });
    }

    // Add member names to entries
    const entriesWithNames = data?.map(entry => ({
      ...entry,
      member_name: memberNames[entry.wallet_address] || null,
    }));

    return NextResponse.json({ entries: entriesWithNames });
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}
