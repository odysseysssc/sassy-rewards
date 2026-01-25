import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet } from '@/lib/drip';
import { requireAdmin } from '@/lib/admin';

interface ShippingAddress {
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
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

    // Get unique wallets
    const uniqueWallets = [...new Set(data?.map(w => w.wallet_address) || [])];

    // Fetch member names from Drip
    const memberResults = await Promise.all(
      uniqueWallets.map(async (wallet) => {
        const member = await getMemberByWallet(wallet);
        return { wallet, name: member?.username || null };
      })
    );

    const memberNames: Record<string, string> = {};
    memberResults.forEach(({ wallet, name }) => {
      if (name) memberNames[wallet] = name;
    });

    // Find users by wallet via connected_credentials
    const { data: credentials } = await supabase
      .from('connected_credentials')
      .select('user_id, identifier')
      .eq('credential_type', 'wallet')
      .in('identifier', uniqueWallets.map(w => w.toLowerCase()));

    const walletToUserId: Record<string, string> = {};
    (credentials || []).forEach((cred: { user_id: string; identifier: string }) => {
      walletToUserId[cred.identifier.toLowerCase()] = cred.user_id;
    });

    // Get user IDs that have wallets
    const userIds = Object.values(walletToUserId);

    // Fetch shipping addresses for those users
    const shippingAddresses: Record<string, ShippingAddress> = {};
    const displayNames: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, shipping_name, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country')
        .in('id', userIds);

      (users || []).forEach((user: {
        id: string;
        display_name: string | null;
        shipping_name: string | null;
        shipping_address: string | null;
        shipping_city: string | null;
        shipping_state: string | null;
        shipping_zip: string | null;
        shipping_country: string | null;
      }) => {
        // Find wallet for this user
        const wallet = Object.entries(walletToUserId).find(([, userId]) => userId === user.id)?.[0];
        if (wallet) {
          if (user.display_name) {
            displayNames[wallet] = user.display_name;
          }
          if (user.shipping_address) {
            shippingAddresses[wallet] = {
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

    // Add member names and shipping to winners
    const winnersWithData = data?.map(winner => {
      const walletLower = winner.wallet_address.toLowerCase();
      return {
        ...winner,
        member_name: displayNames[walletLower] || memberNames[winner.wallet_address] || null,
        shipping_address: shippingAddresses[walletLower] || null,
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
