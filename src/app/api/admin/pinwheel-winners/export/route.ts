import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet, getMemberByAccountId } from '@/lib/drip';
import { requireAdmin } from '@/lib/admin';

// Pietra Account ID
const PIETRA_ACCOUNT_ID = '285380';

// Pin to SKU/Product ID mapping (from Pietra inventory export)
const PIN_CATALOG: Record<string, { sku: string; productId: string; pietraName: string }> = {
  'Beer Can': { sku: '320461', productId: '320461', pietraName: 'Beer Can Pin' },
  'Base Logo': { sku: '320482', productId: '320482', pietraName: 'Base Logo Pin' },
  'Bitcoin Logo': { sku: '320465', productId: '320465', pietraName: 'Bitcoin Logo Pin' },
  'Diamond Hands': { sku: '320479', productId: '320479', pietraName: 'Diamond Hands Pin' },
  'Double Peaks': { sku: '320474', productId: '320474', pietraName: 'Double Peak Pin' },
  'ETH Logo': { sku: '320464', productId: '320464', pietraName: 'Ethereum Logo Pin' },
  'Fire': { sku: '320475', productId: '320475', pietraName: 'Fire Emoji Pin' },
  'Flaming Goggles': { sku: '320467', productId: '320467', pietraName: 'Flaming Goggles Pin' },
  'Ghost': { sku: '320478', productId: '320478', pietraName: 'Ghost Skater Pin' },
  'Glitch Smiley': { sku: '320468', productId: '320468', pietraName: 'Glitch Smiley Pin' },
  'MTB Sassy': { sku: '320471', productId: '320471', pietraName: 'MTB Sassy Pin' },
  'Pixel Glasses': { sku: '320480', productId: '320480', pietraName: 'Pixel Glasses Pin' },
  'Sassy Drip Logo': { sku: '320462', productId: '320462', pietraName: 'Drip Logo Pin' },
  'Skateboard': { sku: '320469', productId: '320469', pietraName: 'Skateboard Pin' },
  'Ski Sassy': { sku: '320473', productId: '320473', pietraName: 'Ski Sassy Pin' },
  'Snowboard Sassy': { sku: '320470', productId: '320470', pietraName: 'Snowboard Sassy Pin' },
  'SSSC': { sku: '320463', productId: '320463', pietraName: 'SSSC Pin' },
  'Stache': { sku: '320466', productId: '320466', pietraName: 'Mustache Pin' },
  'Surf Sassy': { sku: '320472', productId: '320472', pietraName: 'Surf Sassy Pin' },
};

function isWalletAddress(identifier: string): boolean {
  return identifier.startsWith('0x');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Default email for orders without user email
const DEFAULT_EMAIL = 'support@shreddingsassy.com';

// Generate a placeholder phone number
function getPlaceholderPhone(): string {
  return '0000000000';
}

export async function GET(request: NextRequest) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const shippedFilter = searchParams.get('shipped'); // 'true', 'false', or null for all
  const hasAddressFilter = searchParams.get('hasAddress') === 'true'; // only include winners with shipping address
  const consolidate = searchParams.get('consolidate') !== 'false'; // consolidate by default, pass consolidate=false to disable

  try {
    const supabase = createServerClient();

    let query = supabase
      .from('pinwheel_winners')
      .select('*')
      .order('date_won', { ascending: false });

    // Filter by shipped status if specified
    if (shippedFilter === 'false') {
      query = query.eq('shipped', false);
    } else if (shippedFilter === 'true') {
      query = query.eq('shipped', true);
    }

    const { data, error: dbError } = await query;

    if (dbError) throw dbError;

    if (!data || data.length === 0) {
      return new NextResponse('No winners found', { status: 404 });
    }

    // Get unique identifiers
    const uniqueIdentifiers = [...new Set(data.map(w => w.wallet_address))];
    const walletIdentifiers = uniqueIdentifiers.filter(isWalletAddress);
    const accountIdIdentifiers = uniqueIdentifiers.filter(id => !isWalletAddress(id));

    // Fetch member names from Drip
    const memberNames: Record<string, string> = {};

    const walletResults = await Promise.all(
      walletIdentifiers.map(async (wallet) => {
        const member = await getMemberByWallet(wallet);
        return { identifier: wallet, name: member?.username || null };
      })
    );
    walletResults.forEach(({ identifier, name }) => {
      if (name) memberNames[identifier] = name;
    });

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

    // Fetch user data
    interface UserData {
      email: string | null;
      display_name: string | null;
      shipping_name: string | null;
      shipping_email: string | null;
      shipping_phone: string | null;
      shipping_address: string | null;
      shipping_city: string | null;
      shipping_state: string | null;
      shipping_zip: string | null;
      shipping_country: string | null;
    }
    const userData: Record<string, UserData> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, display_name, shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country')
        .in('id', userIds);

      (users || []).forEach((user: {
        id: string;
        email: string | null;
        display_name: string | null;
        shipping_name: string | null;
        shipping_email: string | null;
        shipping_phone: string | null;
        shipping_address: string | null;
        shipping_city: string | null;
        shipping_state: string | null;
        shipping_zip: string | null;
        shipping_country: string | null;
      }) => {
        const identifier = Object.entries(identifierToUserId).find(([, userId]) => userId === user.id)?.[0];
        if (identifier) {
          userData[identifier] = {
            email: user.email,
            display_name: user.display_name,
            shipping_name: user.shipping_name,
            shipping_email: user.shipping_email,
            shipping_phone: user.shipping_phone,
            shipping_address: user.shipping_address,
            shipping_city: user.shipping_city,
            shipping_state: user.shipping_state,
            shipping_zip: user.shipping_zip,
            shipping_country: user.shipping_country,
          };
        }
      });
    }

    // Filter to only winners with shipping address if requested
    let filteredData = data;
    if (hasAddressFilter) {
      filteredData = data.filter(winner => {
        const identifierLower = winner.wallet_address.toLowerCase();
        const user = userData[identifierLower];
        return user?.shipping_address && user?.shipping_name && user?.shipping_city;
      });
    }

    if (filteredData.length === 0) {
      return new NextResponse('No winners found matching criteria', { status: 404 });
    }

    // CSV Headers (Pietra format)
    const headers = [
      'Order Number',
      'Paid At',
      'Created At',
      'Account ID',
      'Shipping Name',
      'Shipping Email',
      'Shipping Phone',
      'Shipping Address1',
      'Shipping Address2',
      'Shipping Company',
      'Shipping City',
      'Shipping Zip',
      'Shipping Province',
      'Shipping Country',
      'Shipping Method',
      'Order Tags',
      'Order Notes',
      'Lineitem SKU',
      'Lineitem Name',
      'Product ID',
      'Lineitem Quantity',
      'Lineitem Price',
      'Lineitem Discount',
      'Lineitem Taxes',
    ];

    // Build CSV rows
    const rows: string[][] = [];
    let orderNumber = 555555; // Starting order number (prefix to avoid Shopify conflicts)

    if (consolidate) {
      // Group winners by wallet_address to consolidate orders
      const winnersByPerson: Record<string, typeof filteredData> = {};
      for (const winner of filteredData) {
        const key = winner.wallet_address.toLowerCase();
        if (!winnersByPerson[key]) {
          winnersByPerson[key] = [];
        }
        winnersByPerson[key].push(winner);
      }

      // Create consolidated orders
      for (const [identifier, wins] of Object.entries(winnersByPerson)) {
        const user = userData[identifier];
        const memberName = memberNames[wins[0].wallet_address];
        const currentOrderNumber = String(orderNumber++);

        // Use the most recent win date for the order
        const mostRecentDate = wins.reduce((latest, w) =>
          new Date(w.date_won) > new Date(latest) ? w.date_won : latest,
          wins[0].date_won
        );
        const dateStr = formatDate(mostRecentDate);

        // Build order notes with all pins won
        const allPins = wins.map(w => w.pin_won).join(', ');

        // Create a row for each line item (pin) in the order
        for (const winner of wins) {
          const pinInfo = PIN_CATALOG[winner.pin_won] || { sku: 'UNKNOWN', productId: 'UNKNOWN', pietraName: winner.pin_won };

          const row = [
            currentOrderNumber,                                       // Order Number (same for all items in order)
            dateStr,                                                  // Paid At
            dateStr,                                                  // Created At
            PIETRA_ACCOUNT_ID,                                        // Account ID
            user?.shipping_name || user?.display_name || memberName || '', // Shipping Name
            user?.shipping_email || user?.email || DEFAULT_EMAIL,     // Shipping Email
            user?.shipping_phone || getPlaceholderPhone(),            // Shipping Phone
            user?.shipping_address || '',                             // Shipping Address1
            '',                                                       // Shipping Address2
            '',                                                       // Shipping Company
            user?.shipping_city || '',                                // Shipping City
            user?.shipping_zip || '0',                                // Shipping Zip (0 for international without zip)
            user?.shipping_state || '',                               // Shipping Province
            user?.shipping_country || 'USA',                          // Shipping Country
            'standard',                                               // Shipping Method
            'pinwheel',                                               // Order Tags
            `Pin Wheel Winner - ${allPins}`,                          // Order Notes (all pins)
            pinInfo.sku,                                              // Lineitem SKU
            pinInfo.pietraName,                                       // Lineitem Name
            pinInfo.productId,                                        // Product ID
            '1',                                                      // Lineitem Quantity
            '0',                                                      // Lineitem Price
            '',                                                       // Lineitem Discount
            '',                                                       // Lineitem Taxes
          ];

          rows.push(row);
        }
      }
    } else {
      // Original behavior: one order per win
      for (const winner of filteredData) {
        const identifierLower = winner.wallet_address.toLowerCase();
        const user = userData[identifierLower];
        const memberName = memberNames[winner.wallet_address];

        // Get pin catalog info
        const pinInfo = PIN_CATALOG[winner.pin_won] || { sku: 'UNKNOWN', productId: 'UNKNOWN', pietraName: winner.pin_won };

        const dateStr = formatDate(winner.date_won);

        const row = [
          String(orderNumber++),                                    // Order Number
          dateStr,                                                  // Paid At
          dateStr,                                                  // Created At
          PIETRA_ACCOUNT_ID,                                        // Account ID
          user?.shipping_name || user?.display_name || memberName || '', // Shipping Name
          user?.shipping_email || user?.email || DEFAULT_EMAIL,     // Shipping Email
          user?.shipping_phone || getPlaceholderPhone(),            // Shipping Phone
          user?.shipping_address || '',                             // Shipping Address1
          '',                                                       // Shipping Address2
          '',                                                       // Shipping Company
          user?.shipping_city || '',                                // Shipping City
          user?.shipping_zip || '0',                                // Shipping Zip (0 for international without zip)
          user?.shipping_state || '',                               // Shipping Province
          user?.shipping_country || 'USA',                          // Shipping Country
          'standard',                                               // Shipping Method
          'pinwheel',                                               // Order Tags
          `Pin Wheel Winner - ${winner.pin_won}`,                   // Order Notes
          pinInfo.sku,                                              // Lineitem SKU
          pinInfo.pietraName,                                       // Lineitem Name
          pinInfo.productId,                                        // Product ID
          '1',                                                      // Lineitem Quantity
          '0',                                                      // Lineitem Price
          '',                                                       // Lineitem Discount
          '',                                                       // Lineitem Taxes
        ];

        rows.push(row);
      }
    }

    // Build CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Return CSV file
    const filename = `pinwheel-winners-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting winners:', error);
    return NextResponse.json(
      { error: 'Failed to export winners' },
      { status: 500 }
    );
  }
}
