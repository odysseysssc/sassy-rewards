import { NextRequest, NextResponse } from 'next/server';

const DRIP_API_BASE = 'https://api.drip.re/api/v1';

export async function POST(request: NextRequest) {
  try {
    const { memberId, wallet } = await request.json();

    if (!memberId || !wallet) {
      return NextResponse.json(
        { error: 'Member ID and wallet are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.DRIP_API_KEY;
    const realmId = process.env.DRIP_REALM_ID;

    if (!apiKey || !realmId) {
      return NextResponse.json(
        { error: 'API not configured' },
        { status: 500 }
      );
    }

    // Step 1: Create a wallet credential
    const createCredentialRes = await fetch(
      `${DRIP_API_BASE}/realms/${realmId}/credentials`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'blockchain',
          publicIdentifier: wallet.toLowerCase(),
          chain: 'eip155',
        }),
      }
    );

    if (!createCredentialRes.ok) {
      const error = await createCredentialRes.text();
      console.error('Create credential error:', error);
      // Credential might already exist, try to link anyway
    }

    // Step 2: Link the credential to the account
    const linkRes = await fetch(
      `${DRIP_API_BASE}/realms/${realmId}/members/${memberId}/credentials`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'blockchain',
          publicIdentifier: wallet.toLowerCase(),
          chain: 'eip155',
        }),
      }
    );

    if (!linkRes.ok) {
      const error = await linkRes.text();
      console.error('Link credential error:', error);
      return NextResponse.json(
        { error: 'Failed to link wallet' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Link wallet error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
