import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getMemberByEmail, getMemberByWallet, getMemberByDiscordId, getMemberByAccountId, getEmailCredentialGrit, DripMember } from './drip';

/**
 * The GRIT identity of the logged-in user, taken from the server session only.
 * Entry/spend routes must use this and ignore any wallet/accountId in the request body.
 */
export async function getSessionIdentity(): Promise<{ userId: string; accountId?: string; wallet?: string } | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return null;
  const accountId = user.dripAccountId || undefined;
  const wallet = user.wallet ? user.wallet.toLowerCase() : undefined;
  if (!accountId && !wallet) return null;
  return { userId: user.id, accountId, wallet };
}

/** Resolve the Drip member for the signed-in user (session identifiers only). */
export async function getSessionMember() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return { authed: false as const, member: null };

  let member = null;
  if (user.dripAccountId) member = await getMemberByAccountId(user.dripAccountId);
  if (!member && user.wallet) member = await getMemberByWallet(user.wallet);
  if (!member && user.discordId) member = await getMemberByDiscordId(user.discordId);
  if (!member && user.email) member = await getMemberByEmail(user.email);

  // No Drip account yet (email-only users): show GRIT held on their email credential.
  // id is empty because there is no account to act on; it moves into one when they
  // connect Discord or a wallet.
  if (!member && user.email) {
    const points = await getEmailCredentialGrit(user.email);
    member = { id: '', email: user.email, points } as DripMember;
  }
  return { authed: true as const, member };
}

