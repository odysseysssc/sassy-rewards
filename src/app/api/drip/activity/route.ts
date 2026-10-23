import { NextResponse } from 'next/server';
import { getSessionMember } from '@/lib/sessionIdentity';

const DRIP_API_BASE = 'https://api.drip.re/api/v1';

// Returns recent GRIT activity for the signed-in user only (memberId query param ignored).
export async function GET() {
  try {
    const { authed, member } = await getSessionMember();
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!member?.id) {
      return NextResponse.json({ activity: [] });
    }
    const memberId = encodeURIComponent(String(member.id));

    const apiKey = process.env.DRIP_API_KEY;
    const realmId = process.env.DRIP_REALM_ID;

    if (!apiKey || !realmId) {
      return NextResponse.json(
        { error: 'API not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${DRIP_API_BASE}/realms/${realmId}/members/${memberId}/activity`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch activity' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform and filter to only show non-zero transactions
    const activity = data.data
      ?.filter((item: { context?: { amount?: number } }) => item.context?.amount !== 0)
      .slice(0, 10)
      .map((item: { id: string; createdAt: string; name: string; context?: { amount?: number } }) => ({
        id: item.id,
        date: item.createdAt,
        action: item.name,
        amount: item.context?.amount || 0,
      })) || [];

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
