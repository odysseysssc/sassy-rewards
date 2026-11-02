import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getHolderTierForWallets, getLinkedWallets } from '@/lib/holdings';

// The signed-in user's holder tier (GRIT earn rate on merch), from their linked wallets.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const wallets = await getLinkedWallets(session.user.id);
    const result = await getHolderTierForWallets(wallets);
    return NextResponse.json({
      tier: { id: result.tier.id, name: result.tier.name, multiplier: result.tier.multiplier },
      furTypes: result.furTypes,
      hasOneOfOne: result.hasOneOfOne,
      headlinerPasses: result.headlinerPasses,
      sassyCount: result.sassyCount,
      walletCount: wallets.length,
    });
  } catch (error) {
    console.error('holder-tier error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Could not check holdings right now' }, { status: 500 });
  }
}
