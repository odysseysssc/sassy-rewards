import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { authOptions } from '@/lib/auth';
import { createWalletChallenge, WalletPurpose } from '@/lib/walletAuth';

// Returns a message for the wallet to sign. purpose 'login' (signin page) or
// 'link' (profile -> connect wallet; requires an active session and is bound to it).
export async function POST(request: NextRequest) {
  try {
    const { address, purpose } = await request.json();
    if (typeof address !== 'string' || !isAddress(address)) {
      return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
    }
    const p: WalletPurpose = purpose === 'link' ? 'link' : 'login';

    let userId: string | undefined;
    if (p === 'link') {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
    }

    return NextResponse.json({ message: createWalletChallenge(address, p, userId) });
  } catch (error) {
    console.error('wallet-challenge error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
