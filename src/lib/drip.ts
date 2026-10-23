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
  // Checks both storage forms (type=email and custom/email)
  return (await findEmailCredential(email))?.credential ?? null;
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

// ---------------------------------------------------------------------------
// Email credentials
//
// In this realm, POST /credentials/social with provider "email" does NOT create an
// `email`-type credential: Drip stores it as type `custom` with source `email`
// (oauth format). Lookups/balances/links with type=email therefore 404 for those
// people, which is why Shopify payouts to non-members failed from Jan-Oct 2026.
// Some older credentials do exist as real `email` type, so we check both.
// ---------------------------------------------------------------------------

export type EmailCredentialKind = 'email' | 'custom';

function emailCredentialQuery(kind: EmailCredentialKind, email: string): string {
  const value = encodeURIComponent(email.toLowerCase());
  return kind === 'email' ? `type=email&value=${value}` : `type=custom&source=email&value=${value}`;
}

/** Find a person's email credential in Drip (either storage form). */
export async function findEmailCredential(
  email: string
): Promise<{ kind: EmailCredentialKind; credential: DripCredential } | null> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');
  for (const kind of ['email', 'custom'] as EmailCredentialKind[]) {
    try {
      const response = await dripFetch(`/realms/${realmId}/credentials/find?${emailCredentialQuery(kind, email)}`);
      const credential = response?.data || response;
      if (credential?.id) return { kind, credential };
    } catch {
      // 404 = not in this form; try the next
    }
  }
  return null;
}

/** Find the email credential, creating it (as Drip does: custom/email) if missing. */
export async function ensureEmailCredential(email: string, username?: string) {
  const existing = await findEmailCredential(email);
  if (existing) return existing;
  try {
    await createEmailCredential(email.toLowerCase(), username);
  } catch {
    // 409 = already exists in some form; fall through to lookup
  }
  return findEmailCredential(email);
}

/** GRIT currently held on a person's (unlinked) email credential. */
export async function getEmailCredentialGrit(email: string): Promise<number> {
  const found = await findEmailCredential(email);
  const gritId = process.env.DRIP_GRIT_CURRENCY_ID;
  const balances = found?.credential?.balances || [];
  const entry = gritId ? balances.find((b) => b.currencyId === gritId) : balances[0];
  return entry?.balance || 0;
}

/**
 * Link a person's email credential to their Drip account. Moves any GRIT held on it
 * into the account. No-op if there is no credential or it is already linked.
 */
export async function linkEmailCredentialToAccount(email: string, accountId: string): Promise<boolean> {
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');
  const found = await findEmailCredential(email);
  if (!found) return false;
  if (found.credential.accountId) return found.credential.accountId === accountId;
  try {
    await dripFetch(
      `/realms/${realmId}/credentials/link?${emailCredentialQuery(found.kind, email)}&accountId=${encodeURIComponent(accountId)}`,
      { method: 'POST' }
    );
    return true;
  } catch (error) {
    console.error('[linkEmailCredentialToAccount] link failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Award GRIT to an email address.
 * - Member with a Drip account -> credited to the account.
 * - Otherwise -> held on their email credential (created if needed) and moved into
 *   their account automatically when that email is linked to one.
 */
export async function awardGritToEmail(
  email: string,
  amount: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const emailLower = email.toLowerCase();
  const realmId = process.env.DRIP_REALM_ID;
  if (!realmId) return { success: false, error: 'DRIP_REALM_ID is not configured' };

  // 1) Existing Drip member with this email
  const member = await getMemberByEmail(emailLower);
  if (member?.id) {
    const ok = await awardGritToAccount(member.id, amount, reason);
    return ok ? { success: true } : { success: false, error: `awardGritToAccount failed for ${member.id}` };
  }

  // 2) Email credential (linked -> account, unlinked -> hold balance on it)
  const found = await ensureEmailCredential(emailLower, emailLower.split('@')[0]);
  if (!found) return { success: false, error: 'Could not find or create an email credential in Drip' };

  if (found.credential.accountId) {
    const ok = await awardGritToAccount(found.credential.accountId, amount, reason);
    return ok ? { success: true } : { success: false, error: `awardGritToAccount failed for ${found.credential.accountId}` };
  }

  try {
    const gritId = process.env.DRIP_GRIT_CURRENCY_ID;
    await dripFetch(`/realms/${realmId}/credentials/balance?${emailCredentialQuery(found.kind, emailLower)}`, {
      method: 'PATCH',
      body: JSON.stringify({ amount, ...(gritId && { realmPointId: gritId }) }),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Credential balance update failed' };
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
    // Search through leaderboard with pagination to find member by accountId
    let cursor: string | undefined;
    let hasNextPage = true;
    let totalSearched = 0;

    while (hasNextPage && totalSearched < 500) {
      const params = new URLSearchParams({ take: '50' });
      if (gritCurrencyId) params.set('currencyId', gritCurrencyId);
      if (cursor) params.set('after', cursor);

      const url = `/realms/${realmId}/members/leaderboard?${params.toString()}`;
      const response = await dripFetch(url);
      const members = response.data || [];

      const accountIdLower = accountId.toLowerCase();
      const member = members.find((m: { accountId: string }) => m.accountId?.toLowerCase() === accountIdLower);
      if (member) {
        return {
          id: member.accountId,
          wallet: member.wallet,
          username: member.displayName || member.username,
          points: member.balance || 0,
          rank: member.rank,
          currencyId: gritCurrencyId,
        };
      }

      totalSearched += members.length;
      hasNextPage = response.meta?.hasNextPage || false;
      cursor = response.meta?.endCursor;
    }

    return null;
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
 * Search Drip members by username
 * Returns matching members from the leaderboard
 */
export async function searchMembersByUsername(query: string, limit: number = 10): Promise<DripMember[]> {
  const realmId = process.env.DRIP_REALM_ID;
  const gritCurrencyId = process.env.DRIP_GRIT_CURRENCY_ID;
  if (!realmId) throw new Error('DRIP_REALM_ID is not configured');

  const queryLower = query.toLowerCase();
  const matches: DripMember[] = [];

  try {
    let cursor: string | undefined;
    let hasNextPage = true;
    let totalSearched = 0;

    while (hasNextPage && totalSearched < 500 && matches.length < limit) {
      const params = new URLSearchParams({ take: '50' });
      if (gritCurrencyId) params.set('currencyId', gritCurrencyId);
      if (cursor) params.set('after', cursor);

      const url = `/realms/${realmId}/members/leaderboard?${params.toString()}`;
      const response = await dripFetch(url);
      const members = response.data || [];

      for (const member of members) {
        const username = (member.displayName || member.username || '').toLowerCase();
        if (username.includes(queryLower)) {
          matches.push({
            id: member.accountId,
            wallet: member.wallet,
            username: member.displayName || member.username,
            points: member.balance || 0,
            rank: member.rank,
            currencyId: gritCurrencyId,
          });
          if (matches.length >= limit) break;
        }
      }

      totalSearched += members.length;
      hasNextPage = response.meta?.hasNextPage || false;
      cursor = response.meta?.endCursor;
    }

    return matches;
  } catch (error) {
    console.error('searchMembersByUsername error:', error);
    return [];
  }
}

/**
 * Get or create a Drip account for an email
 * Returns the accountId
 *
 * Handles ghost credentials (from Shopify orders) that have GRIT but no accountId yet.
 */
export async function getOrCreateDripAccount(email: string, username?: string): Promise<string | null> {
  const emailLower = email.toLowerCase();

  // Existing Drip member with this email
  const existingMember = await getMemberByEmail(emailLower);
  if (existingMember?.id) return existingMember.id;

  // Email credential (either storage form); create it if missing so future GRIT has a home.
  // If it is linked we get the account; if it is a ghost there is no account yet (null),
  // and any GRIT stays on the credential until it is linked.
  const found = await ensureEmailCredential(emailLower, username);
  return found?.credential.accountId || null;
}

/**
 * Get or create a Drip account for a wallet
 * Returns the accountId
 */
export async function getOrCreateDripAccountByWallet(wallet: string): Promise<string | null> {
  const walletLower = wallet.toLowerCase();

  // First check if credential already exists (ghost or linked)
  const existingCredential = await findCredential('wallet', walletLower);
  if (existingCredential?.accountId) {
    return existingCredential.accountId;
  }

  // Also check if member exists via search
  const existingMember = await getMemberByWallet(wallet);
  if (existingMember?.id) {
    return existingMember.id;
  }

  // Create new wallet credential (this creates an account too)
  try {
    const newCredential = await createWalletCredential(walletLower);
    return newCredential.accountId || null;
  } catch {
    return null;
  }
}

/**
 * Get or create a Drip account for a Discord ID
 * Returns the accountId
 */
export async function getOrCreateDripAccountByDiscord(discordId: string, username?: string): Promise<string | null> {
  // First check if credential already exists (ghost or linked)
  const existingCredential = await findCredential('discord-id', discordId);
  if (existingCredential?.accountId) {
    return existingCredential.accountId;
  }

  // Also check if member exists via search
  const existingMember = await getMemberByDiscordId(discordId);
  if (existingMember?.id) {
    return existingMember.id;
  }

  // Create new discord credential (this creates an account too)
  try {
    const newCredential = await createSocialCredential('discord', discordId, username);
    return newCredential.accountId || null;
  } catch {
    return null;
  }
}
