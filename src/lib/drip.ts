const DRIP_API_BASE = 'https://api.drip.re/api/v1';

export interface DripMember {
  id: string;
  wallet?: string;
  email?: string;
  username?: string;
  points: number;
  rank?: number;
  currencyId?: string;
  discordId?: string;
}

export interface LeaderboardEntry {
  rank: number;
  wallet?: string;
  username?: string;
  points: number;
  accountId?: string;
}

async function dripFetch(endpoint: string, options?: RequestInit) {
  const apiKey = process.env.DRIP_API_KEY;

  if (!apiKey) {
    throw new Error('DRIP_API_KEY is not configured');
  }

  const response = await fetch(`${DRIP_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Drip API error details:', response.status, errorBody);
    throw new Error(`Drip API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  return response.json();
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const realmId = process.env.DRIP_REALM_ID;
  const currencyId = process.env.DRIP_GRIT_CURRENCY_ID;

  if (!realmId) {
    throw new Error('DRIP_REALM_ID is not configured');
  }

  const allEntries: LeaderboardEntry[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;

  // Paginate through all results
  while (hasNextPage) {
    const params = new URLSearchParams({ take: '50' });
    if (currencyId) params.set('currencyId', currencyId);
    if (cursor) params.set('after', cursor);

    const url = `/realms/${realmId}/members/leaderboard?${params.toString()}`;
    const response = await dripFetch(url);

    const entries = response.data?.map((member: { rank: number; wallet?: string; username?: string; displayName?: string; balance: number; accountId?: string }) => ({
      rank: member.rank,
      wallet: member.wallet,
      username: member.displayName || member.username,
      points: member.balance,
      accountId: member.accountId,
    })) || [];

    allEntries.push(...entries);

    // Check pagination
    hasNextPage = response.meta?.hasNextPage || false;
    cursor = response.meta?.endCursor;

    // Safety limit to prevent infinite loops
    if (allEntries.length >= 500) break;
  }

  console.log('[Leaderboard] Total entries fetched:', allEntries.length);

  return allEntries;
}

export async function getMemberByEmail(email: string): Promise<DripMember | null> {
  const realmId = process.env.DRIP_REALM_ID;

  if (!realmId) {
    throw new Error('DRIP_REALM_ID is not configured');
  }

  try {
    const response = await dripFetch(
      `/realms/${realmId}/members/search?type=email&values=${encodeURIComponent(email)}`
    );

    const member = response.data?.[0];
    if (!member) return null;

    // Balance is in balances array
    const gritBalance = member.balances?.find((b: { currencyName: string }) => b.currencyName === 'GRIT');

    return {
      id: member.accountId || member.id,
      wallet: member.credentials?.find((c: { format: string }) => c.format === 'blockchain')?.publicIdentifier,
      email: member.email,
      username: member.displayName || member.username,
      points: gritBalance?.balance || 0,
      rank: member.rank,
    };
  } catch {
    return null;
  }
}

export async function getMemberByWallet(wallet: string): Promise<DripMember | null> {
  const realmId = process.env.DRIP_REALM_ID;

  if (!realmId) {
    throw new Error('DRIP_REALM_ID is not configured');
  }

  try {
    const response = await dripFetch(
      `/realms/${realmId}/members/search?type=wallet&values=${encodeURIComponent(wallet)}`
    );

    const member = response.data?.[0];
    if (!member) return null;

    // Balance is in balances array
    const gritBalance = member.balances?.find((b: { currencyName: string }) => b.currencyName === 'GRIT');

    return {
      id: member.accountId || member.id,
      wallet: member.credentials?.find((c: { format: string }) => c.format === 'blockchain')?.publicIdentifier,
      email: member.email,
      username: member.displayName || member.username,
      points: gritBalance?.balance || 0,
      rank: member.rank,
      currencyId: gritBalance?.currencyId,
    };
  } catch {
    return null;
  }
}

export async function deductGrit(
  memberId: string,
  amount: number,
  currencyId: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const realmId = process.env.DRIP_REALM_ID;

  if (!realmId) {
    return { success: false, error: 'DRIP_REALM_ID is not configured' };
  }

  try {
    const response = await dripFetch(`/realms/${realmId}/members/${memberId}/balance`, {
      method: 'PATCH',
      body: JSON.stringify({
        amount: -amount,
        currencyId,
      }),
    });

    return {
      success: true,
      newBalance: response.balance
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deduct Grit'
    };
  }
}

export async function getMemberByDiscordId(discordId: string): Promise<DripMember | null> {
  const realmId = process.env.DRIP_REALM_ID;

  if (!realmId) {
    throw new Error('DRIP_REALM_ID is not configured');
  }

  try {
    const response = await dripFetch(
      `/realms/${realmId}/members/search?type=discord-id&values=${encodeURIComponent(discordId)}`
    );

    const member = response.data?.[0];
    if (!member) return null;

    // Balance is in balances array
    const gritBalance = member.balances?.find((b: { currencyName: string }) => b.currencyName === 'GRIT');

    return {
      id: member.accountId || member.id,
      wallet: member.credentials?.find((c: { format: string }) => c.format === 'blockchain')?.publicIdentifier,
      email: member.email,
      username: member.displayName || member.username,
      points: gritBalance?.balance || 0,
      rank: member.rank,
    };
  } catch {
    return null;
  }
}

export function truncateWallet(wallet: string): string {
  if (!wallet) return '';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

// Ghost credential types
export type CredentialType = 'email' | 'wallet' | 'discord-id' | 'twitter-id';

export interface DripCredential {
  id: string;
  accountId?: string;
  format: string;
  provider?: string;
  publicIdentifier: string;
  balances?: Array<{ currencyId: string; balance: number }>;
}

/**
 * Find an existing credential in Drip (ghost or linked)
 */
export async function findCredential(
  type: CredentialType,
  value: string
): Promise<DripCredential | null> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  try {
    const response = await dripFetch(
      `/realms/${realmId}/credentials/find?type=${type}&value=${encodeURIComponent(value.toLowerCase())}`
    );
    return response.data || response;
  } catch {
    // 404 means not found
    return null;
  }
}

// Convenience wrapper for email
export async function findCredentialByEmail(email: string): Promise<DripCredential | null> {
  return findCredential('email', email);
}

/**
 * Create a social credential (email, discord, twitter)
 */
export async function createSocialCredential(
  provider: string,
  providerId: string,
  username?: string,
  accountId?: string
): Promise<DripCredential> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  const response = await dripFetch(`/realms/${realmId}/credentials/social`, {
    method: 'POST',
    body: JSON.stringify({
      provider,
      providerId: providerId.toLowerCase(),
      username: username || providerId,
      ...(accountId && { accountId }),
    }),
  });

  return response.data || response;
}

/**
 * Create an email credential (ghost)
 */
export async function createEmailCredential(
  email: string,
  username?: string,
  accountId?: string
): Promise<DripCredential> {
  return createSocialCredential('email', email, username || email.split('@')[0], accountId);
}

/**
 * Create a wallet credential (ghost)
 */
export async function createWalletCredential(
  address: string,
  chain: string = 'ethereum'
): Promise<DripCredential> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  const response = await dripFetch(`/realms/${realmId}/credentials/wallet`, {
    method: 'POST',
    body: JSON.stringify({
      address: address.toLowerCase(),
      chain,
    }),
  });

  return response.data || response;
}

/**
 * Link an existing ghost credential to an account
 * This transfers any accumulated balance to the account
 */
export async function linkCredentialToAccount(
  type: CredentialType,
  value: string,
  accountId: string
): Promise<boolean> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  try {
    const response = await dripFetch(
      `/realms/${realmId}/credentials/link?type=${type}&value=${encodeURIComponent(value.toLowerCase())}&accountId=${accountId}`,
      { method: 'POST' }
    );
    // 204 No Content means success
    return true;
  } catch (error) {
    console.error(`Failed to link ${type} credential:`, error);
    return false;
  }
}

/**
 * Update balance on a credential (ghost or linked)
 */
export async function updateCredentialBalance(
  type: CredentialType,
  value: string,
  amount: number,
  currencyId?: string
): Promise<boolean> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  try {
    const body: { amount: number; realmPointId?: string } = { amount };
    if (currencyId) {
      body.realmPointId = currencyId;
    }

    await dripFetch(
      `/realms/${realmId}/credentials/balance?type=${type}&value=${encodeURIComponent(value.toLowerCase())}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    );
    return true;
  } catch (error) {
    console.error(`Failed to update ${type} credential balance:`, error);
    return false;
  }
}

/**
 * Award GRIT to an email credential
 */
export async function awardGritToEmail(
  email: string,
  amount: number,
  reason?: string
): Promise<boolean> {
  const realmId = process.env.DRIP_REALM_ID;
  const gritCurrencyId = process.env.DRIP_GRIT_CURRENCY_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  try {
    await dripFetch(
      `/realms/${realmId}/credentials/balance?type=email&value=${encodeURIComponent(email.toLowerCase())}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          amount,
          ...(gritCurrencyId && { realmPointId: gritCurrencyId }),
          ...(reason && { metadata: { reason } }),
        }),
      }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Award GRIT to an account by ID
 */
export async function awardGritToAccount(
  accountId: string,
  amount: number,
  reason?: string
): Promise<boolean> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  try {
    await dripFetch(`/realms/${realmId}/members/${accountId}/balance`, {
      method: 'PATCH',
      body: JSON.stringify({
        amount,
        note: reason || 'GRIT awarded',
      }),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get member by Drip account ID
 */
export async function getMemberByAccountId(accountId: string): Promise<DripMember | null> {
  const realmId = process.env.DRIP_REALM_ID;
  const gritCurrencyId = process.env.DRIP_GRIT_CURRENCY_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  try {
    // Use direct member endpoint
    const response = await dripFetch(`/realms/${realmId}/members/${accountId}`);
    const member = response.data || response;

    if (!member) return null;

    // Get GRIT balance from balances array if present
    const gritBalance = member.balances?.find((b: { currencyName?: string; currencyId?: string }) =>
      b.currencyName === 'GRIT' || b.currencyId === gritCurrencyId
    );

    return {
      id: member.accountId || member.id || accountId,
      wallet: member.credentials?.find((c: { format: string }) => c.format === 'blockchain')?.publicIdentifier,
      email: member.email,
      username: member.displayName || member.username,
      points: gritBalance?.balance ?? member.balance ?? 0,
      rank: member.rank,
      currencyId: gritBalance?.currencyId || gritCurrencyId,
    };
  } catch (error) {
    console.error('getMemberByAccountId error:', error);
    return null;
  }
}

/**
 * Update a member's display name in Drip
 */
export async function updateMemberDisplayName(
  accountId: string,
  displayName: string
): Promise<boolean> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  try {
    // Try name field
    await dripFetch(`/realms/${realmId}/members/${accountId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: displayName,
      }),
    });
    return true;
  } catch (error) {
    console.error('Failed to update display name in Drip:', error);
    return false;
  }
}

/**
 * Get or create a Drip account for an email
 * Returns the accountId
 */
export async function getOrCreateDripAccount(email: string, username?: string): Promise<string | null> {
  // First check if credential already exists
  const existingCredential = await findCredentialByEmail(email);
  if (existingCredential?.accountId) {
    return existingCredential.accountId;
  }

  // Also check if member exists via search
  const existingMember = await getMemberByEmail(email);
  if (existingMember?.id) {
    return existingMember.id;
  }

  // Create new credential (this creates an account too)
  try {
    const newCredential = await createEmailCredential(email, username);
    return newCredential.accountId || null;
  } catch {
    return null;
  }
}
