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

  if (!realmId) {
    throw new Error('DRIP_REALM_ID is not configured');
  }

  const response = await dripFetch(`/realms/${realmId}/members/leaderboard?limit=50`);

  return response.data?.map((member: { rank: number; wallet?: string; username?: string; displayName?: string; balance: number; accountId?: string }) => ({
    rank: member.rank,
    wallet: member.wallet,
    username: member.displayName || member.username,
    points: member.balance,
    accountId: member.accountId,
  })) || [];
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

// Email credential functions for the new auth flow

export interface DripCredential {
  id: string;
  accountId: string;
  format: string;
  provider?: string;
  publicIdentifier: string;
}

/**
 * Find an existing email credential in Drip
 */
export async function findCredentialByEmail(email: string): Promise<DripCredential | null> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  try {
    const response = await dripFetch(
      `/realms/${realmId}/credentials/find?type=email&value=${encodeURIComponent(email.toLowerCase())}`
    );
    return response.data || response;
  } catch {
    // 404 means not found
    return null;
  }
}

/**
 * Create a new email credential (social type)
 * If accountId is provided, links immediately. Otherwise creates a "ghost" credential.
 */
export async function createEmailCredential(
  email: string,
  username?: string,
  accountId?: string
): Promise<DripCredential> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  const response = await dripFetch(`/realms/${realmId}/credentials/social`, {
    method: 'POST',
    body: JSON.stringify({
      provider: 'email',
      providerId: email.toLowerCase(),
      username: username || email.split('@')[0],
      ...(accountId && { accountId }),
    }),
  });

  return response.data || response;
}

/**
 * Link an existing ghost credential to an account
 * This transfers any accumulated balance to the account
 */
export async function linkCredentialToAccount(
  email: string,
  accountId: string
): Promise<boolean> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  try {
    await dripFetch(
      `/realms/${realmId}/credentials/link?type=email&value=${encodeURIComponent(email.toLowerCase())}&accountId=${accountId}`,
      { method: 'POST' }
    );
    return true;
  } catch {
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
    // The direct member endpoint doesn't exist, so search the leaderboard
    const response = await dripFetch(`/realms/${realmId}/members/leaderboard?limit=100`);
    const members = response.data || [];

    const member = members.find((m: { accountId: string }) => m.accountId === accountId);
    if (!member) return null;

    return {
      id: member.accountId,
      username: member.displayName || member.username,
      points: member.balance || 0,
      rank: member.rank,
      currencyId: gritCurrencyId,
    };
  } catch {
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
    return newCredential.accountId;
  } catch {
    return null;
  }
}
