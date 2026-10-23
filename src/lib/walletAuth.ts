import crypto from 'crypto';
import { createPublicClient, getAddress, http, isAddress, verifyMessage } from 'viem';
import { base } from 'viem/chains';

// Proof-of-ownership for wallets: the server issues a short, HMAC-stamped message,
// the wallet signs it (free, no transaction), and the server verifies the signature.
// Stateless: the HMAC (keyed with NEXTAUTH_SECRET) proves the message came from us,
// and the timestamp limits how long a signed message stays usable.

export type WalletPurpose = 'login' | 'link';

const TTL_MS = 10 * 60 * 1000;
const HEADERS: Record<WalletPurpose, string> = {
  login: 'Sign in to Shredding Sassy Rewards',
  link: 'Link this wallet to your Shredding Sassy Rewards account',
};

function hmac(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function stamp(purpose: WalletPurpose, address: string, issued: string, nonce: string, userId = ''): string {
  return hmac([purpose, address.toLowerCase(), issued, nonce, userId].join('|'));
}

/** Build the message the wallet must sign. For 'link', bind it to the logged-in user. */
export function createWalletChallenge(address: string, purpose: WalletPurpose, userId?: string): string {
  if (!isAddress(address)) throw new Error('Invalid wallet address');
  const checksummed = getAddress(address);
  const issued = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString('hex');
  return [
    HEADERS[purpose],
    '',
    'This signature only proves you own this wallet. It is free and sends no transaction.',
    '',
    `Wallet: ${checksummed}`,
    `Issued: ${issued}`,
    `Nonce: ${nonce}`,
    `Check: ${stamp(purpose, checksummed, issued, nonce, userId)}`,
  ].join('\n');
}

const publicClient = createPublicClient({ chain: base, transport: http() });

/**
 * Verify a signed challenge. Returns the lowercased wallet address on success, null otherwise.
 * Supports normal wallets (local recovery) and smart wallets such as Coinbase Smart Wallet
 * (ERC-1271 / ERC-6492, checked on Base).
 */
export async function verifyWalletChallenge(
  message: string | undefined,
  signature: string | undefined,
  purpose: WalletPurpose,
  userId?: string,
): Promise<string | null> {
  if (!message || !signature || !/^0x[0-9a-fA-F]+$/.test(signature)) return null;

  const lines = message.split('\n');
  if (lines[0] !== HEADERS[purpose]) return null;
  const field = (name: string) => lines.find((l) => l.startsWith(`${name}: `))?.slice(name.length + 2).trim();

  const wallet = field('Wallet');
  const issued = field('Issued');
  const nonce = field('Nonce');
  const check = field('Check');
  if (!wallet || !issued || !nonce || !check || !isAddress(wallet)) return null;

  // Message must be one we issued (for this purpose / user), and recent.
  const expected = stamp(purpose, getAddress(wallet), issued, nonce, userId);
  if (check.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(check), Buffer.from(expected))) return null;
  const age = Date.now() - new Date(issued).getTime();
  if (!Number.isFinite(age) || age < -60_000 || age > TTL_MS) return null;

  const address = getAddress(wallet);
  const sig = signature as `0x${string}`;

  try {
    if (await verifyMessage({ address, message, signature: sig })) return address.toLowerCase();
  } catch {
    // not a plain EOA signature; fall through to smart-wallet check
  }
  try {
    if (await publicClient.verifyMessage({ address, message, signature: sig })) return address.toLowerCase();
  } catch (error) {
    console.error('[walletAuth] smart wallet verification failed:', error instanceof Error ? error.message : error);
  }
  return null;
}
