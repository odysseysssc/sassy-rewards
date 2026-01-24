import { NextRequest, NextResponse } from 'next/server';
import { getMemberByEmail, getMemberByWallet, getMemberByDiscordId, getMemberByAccountId } from '@/lib/drip';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const email = searchParams.get('email');
    const wallet = searchParams.get('wallet');
    const discordId = searchParams.get('discordId');

    if (!accountId && !email && !wallet && !discordId) {
      return NextResponse.json(
        { error: 'accountId, email, wallet, or discordId parameter is required' },
        { status: 400 }
      );
    }

    let member = null;

    // Try accountId first (most direct)
    if (accountId) {
      member = await getMemberByAccountId(accountId);
    }

    // Then try wallet
    if (!member && wallet) {
      member = await getMemberByWallet(wallet);
    }

    // Then Discord
    if (!member && discordId) {
      member = await getMemberByDiscordId(discordId);
    }

    // Finally email
    if (!member && email) {
      member = await getMemberByEmail(email);
    }

    if (!member) {
      return NextResponse.json({ member: null });
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member data' },
      { status: 500 }
    );
  }
}
