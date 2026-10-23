import { NextResponse } from 'next/server';
import { getSessionMember } from '@/lib/sessionIdentity';

// Returns the signed-in user's own Drip member record. Query parameters are ignored:
// this used to look up any email/wallet/account, which exposed other users' data.
export async function GET() {
  try {
    const { authed, member } = await getSessionMember();
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ member: member ?? null });
  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json({ error: 'Failed to fetch member data' }, { status: 500 });
  }
}
