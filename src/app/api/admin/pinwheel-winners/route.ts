import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet, getMemberByAccountId } from '@/lib/drip';
import { requireAdmin } from '@/lib/admin';

interface ShippingAddress {
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
}

// Helper to check if a string is a wallet address (starts with 0x)
function isWalletAddress(identifier: string): boolean {
  return identifier.startsWith('0x');
}

export async function GET() {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('pinwheel_winners')
      .select('*')
      .order('date_won', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Get unique identifiers (can be wallets or account IDs)
    const uniqueIdentifiers = [...new Set(data?.map(w => w.wallet_address) || [])];

    // Separate wallets from account IDs
    const walletIdentifiers = uniqueIdentifiers.filter(isWalletAddress);
    const accountIdIdentifiers = uniqueIdentifiers.filter(id => !isWalletAddress(id));

    // Fetch member names from Drip for both types
    const memberNames: Record<string, string> = {};

    // Fetch wallet-based members
    const walletResults = await Promise.all(
      walletIdentifiers.map(async (wallet) => {
        const member = await getMemberByWallet(wallet);
        return { identifier: wallet, name: member?.username || null };
      })
    );
    walletResults.forEach(({ identifier, name }) => {
      if (name) memberNames[identifier] = name;
    });

    // Fetch account ID-based members
    const accountResults = await Promise.all(
      accountIdIdentifiers.map(async (accountId) => {
        const member = await getMemberByAccountId(accountId);
        return { identifier: accountId, name: member?.username || null };
      })
    );
    accountResults.forEach(({ identifier, name }) => {
      if (name) memberNames[identifier] = name;
    });

    // Find users via connected_credentials (for wallets)
    const { data: walletCredentials } = await supabase
      .from('connected_credentials')
      .select('user_id, identifier')
      .eq('credential_type', 'wallet')
      .in('identifier', walletIdentifiers.map(w => w.toLowerCase()));

    const identifierToUserId: Record<string, string> = {};
    (walletCredentials || []).forEach((cred: { user_id: string; identifier: string }) => {
      identifierToUserId[cred.identifier.toLowerCase()] = cred.user_id;
    });

    // For account IDs, look up users by drip_account_id
    if (accountIdIdentifiers.length > 0) {
      const { data: accountUsers } = await supabase
        .from('users')
        .select('id, drip_account_id')
        .in('drip_account_id', accountIdIdentifiers);

      (accountUsers || []).forEach((user: { id: string; drip_account_id: string }) => {
        if (user.drip_account_id) {
          identifierToUserId[user.drip_account_id.toLowerCase()] = user.id;
        }
      });
    }

    // Get all user IDs
    const userIds = [...new Set(Object.values(identifierToUserId))];

    // Fetch shipping addresses and display names for those users
    const shippingAddresses: Record<string, ShippingAddress> = {};
    const displayNames: Record<string, string> = {};
    const userEmails: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, display_name, drip_account_id, shipping_name, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country')
        .in('id', userIds);

      (users || []).forEach((user: {
        id: string;
        email: string | null;
        display_name: string | null;
        drip_account_id: string | null;
        shipping_name: string | null;
        shipping_address: string | null;
        shipping_city: string | null;
        shipping_state: string | null;
        shipping_zip: string | null;
        shipping_country: string | null;
      }) => {
        // Find identifier for this user (could be wallet or account ID)
        const identifier = Object.entries(identifierToUserId).find(([, userId]) => userId === user.id)?.[0];
        if (identifier) {
          if (user.display_name) {
            displayNames[identifier] = user.display_name;
          }
          if (user.email) {
            userEmails[identifier] = user.email;
          }
          if (user.shipping_address) {
            shippingAddresses[identifier] = {
              name: user.shipping_name,
              address: user.shipping_address,
              city: user.shipping_city,
              state: user.shipping_state,
              zip: user.shipping_zip,
              country: user.shipping_country,
            };
          }
        }
      });
    }

    // Add member names, email and shipping to winners
    const winnersWithData = data?.map(winner => {
      const identifierLower = winner.wallet_address.toLowerCase();
      return {
        ...winner,
        identifier_full: winner.wallet_address, // Full identifier for admin visibility
        identifier_type: isWalletAddress(winner.wallet_address) ? 'wallet' : 'account_id',
        member_name: displayNames[identifierLower] || memberNames[winner.wallet_address] || null,
        user_email: userEmails[identifierLower] || null,
        shipping_address: shippingAddresses[identifierLower] || null,
      };
    });

    return NextResponse.json({ winners: winnersWithData });
  } catch (error) {
    console.error('Error fetching winners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch winners' },
      { status: 500 }
    );
  }
}

// PATCH - Update shipped status
export async function PATCH(request: NextRequest) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const { winnerId, shipped } = await request.json();

    if (!winnerId || typeof shipped !== 'boolean') {
      return NextResponse.json({ error: 'winnerId and shipped are required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error: updateError } = await supabase
      .from('pinwheel_winners')
      .update({ shipped })
      .eq('id', winnerId);

    if (updateError) {
      console.error('Error updating shipped status:', updateError);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
