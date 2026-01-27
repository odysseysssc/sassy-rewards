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

    // Get unique identifiers
    const identifiers = [...new Set(winners?.map(w => w.wallet_address) || [])];

    // Look up display names from our users table (via drip_account_id or wallet credential)
    const walletIdentifiers = identifiers.filter(isWalletAddress);
    const accountIdIdentifiers = identifiers.filter(id => !isWalletAddress(id));

    const displayNames: Record<string, string> = {};

    // Look up users by drip_account_id
    if (accountIdIdentifiers.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('drip_account_id, display_name')
        .in('drip_account_id', accountIdIdentifiers);

      users?.forEach(u => {
        if (u.drip_account_id && u.display_name) {
          displayNames[u.drip_account_id] = u.display_name;
        }
      });
    }

    // Look up users by wallet credential
    if (walletIdentifiers.length > 0) {
      const { data: credentials } = await supabase
        .from('connected_credentials')
        .select('identifier, user_id')
        .eq('credential_type', 'wallet')
        .in('identifier', walletIdentifiers.map(w => w.toLowerCase()));

      if (credentials && credentials.length > 0) {
        const userIds = credentials.map(c => c.user_id);
        const { data: users } = await supabase
          .from('users')
          .select('id, display_name')
          .in('id', userIds);

        credentials.forEach(cred => {
          const user = users?.find(u => u.id === cred.user_id);
          if (user?.display_name) {
            displayNames[cred.identifier.toLowerCase()] = user.display_name;
          }
        });
      }
    }

    // Fetch member names from Drip for any we don't have
    const winnersWithNames = await Promise.all(
      (winners || []).map(async (winner) => {
        const identifier = winner.wallet_address;
        const identifierLower = identifier.toLowerCase();
        const truncated = isWalletAddress(identifier)
          ? `${identifier.slice(0, 6)}...${identifier.slice(-4)}`
          : `${identifier.slice(0, 8)}...`;

        // First check our DB
        if (displayNames[identifierLower] || displayNames[identifier]) {
          return {
            ...winner,
            display_name: displayNames[identifierLower] || displayNames[identifier],
          };
        }

        // Fall back to Drip lookup
        try {
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
