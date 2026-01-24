import { NextResponse } from 'next/server';
import { getMemberByWallet } from '@/lib/drip';

const LOGO_URL = 'https://portal.shreddingsassy.com/images/sassy%20mascot%20logo%20(2).jpg';

export async function GET() {
  const webhookUrl = process.env.DISCORD_PINWHEEL_WEBHOOK;
  if (!webhookUrl) {
    return NextResponse.json({ error: 'Discord webhook not configured' }, { status: 500 });
  }

  // Test with the winner from today
  const testWallet = '0xa1922c47aa67c41b1c1e877e9919f5ef29c99373';
  const testPin = 'Diamond Hands';

  // Try to get member info from Drip
  let displayName = `${testWallet.slice(0, 6)}...${testWallet.slice(-4)}`;
  let discordId: string | undefined;
  try {
    const member = await getMemberByWallet(testWallet);
    if (member?.username) {
      displayName = member.username;
    }
    if (member?.discordId) {
      discordId = member.discordId;
    }
  } catch (error) {
    console.error('Error fetching member info:', error);
  }

  const pinImageUrl = `https://portal.shreddingsassy.com/images/${encodeURIComponent(testPin.toLowerCase())}.png`;

  // Build message with ping if we have Discord ID
  const winnerMention = discordId ? `<@${discordId}>` : `**${displayName}**`;
  const description = `${winnerMention} just won a **${testPin}** pin! 🎉`;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Shredding Sassy',
        avatar_url: LOGO_URL,
        content: discordId ? `Congratulations <@${discordId}>!` : undefined,
        embeds: [{
          title: '🎡 Pin Wheel Winner!',
          description,
          color: 0xFACC15,
          image: { url: pinImageUrl },
          timestamp: new Date().toISOString(),
        }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: 'Discord failed', status: response.status, body: text }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      displayName,
      discordId: discordId || 'not found',
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
