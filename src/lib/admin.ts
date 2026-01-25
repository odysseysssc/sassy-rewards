import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Admin emails - add your team's emails here
const ADMIN_EMAILS = [
  'josh@shreddingsassy.com',
  'admin@shreddingsassy.com',
  'josh@sassy.com',
  // Add more admin emails as needed
];

// Admin wallet addresses (lowercase)
const ADMIN_WALLETS = [
  '0xa1922c47aa67c41b1c1e877e9919f5ef29c99373',
  // Add more admin wallets as needed
];

export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return false;
  }

  // Check email
  if (session.user.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    return true;
  }

  // Check wallet
  if (session.user.wallet && ADMIN_WALLETS.includes(session.user.wallet.toLowerCase())) {
    return true;
  }

  return false;
}

export async function requireAdmin(): Promise<{ isAdmin: boolean; error?: string }> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { isAdmin: false, error: 'Unauthorized - not logged in' };
  }

  // Check email
  if (session.user.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    return { isAdmin: true };
  }

  // Check wallet
  if (session.user.wallet && ADMIN_WALLETS.includes(session.user.wallet.toLowerCase())) {
    return { isAdmin: true };
  }

  return { isAdmin: false, error: 'Unauthorized - not an admin' };
}
