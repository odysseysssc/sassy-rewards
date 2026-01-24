import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { PINS } from '@/lib/constants';
import { getMemberByWallet } from '@/lib/drip';

const LOGO_URL = 'https://portal.shreddingsassy.com/images/sassy%20mascot%20logo%20(2).jpg';

async function notifyDiscord(wallet: string, pin: string) {
  const webhookUrl = process.env.DISCORD_PINWHEEL_WEBHOOK;
  if (!webhookUrl) {
    console.log('Discord webhook URL not configured');
    return;
  }

  // Try to get member info from Drip
  let displayName = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  let discordId: string | undefined;
  try {
    const member = await getMemberByWallet(wallet);
    if (member?.username) {
      displayName = member.username;
    }
    if (member?.discordId) {
      discordId = member.discordId;
    }
  } catch (error) {
    console.error('Error fetching member info:', error);
  }

  const pinImageUrl = `https://portal.shreddingsassy.com/images/${encodeURIComponent(pin.toLowerCase())}.png`;

  // Build message with ping if we have Discord ID
  const winnerMention = discordId ? `<@${discordId}>` : `**${displayName}**`;
  const description = `${winnerMention} just won a **${pin}** pin! 🎉`;

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
      console.error('Discord notification failed:', response.status, await response.text());
    } else {
      console.log('Discord notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending Discord notification:', error);
  }
}

// Shared draw logic
async function runDraw() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];

  // Check if draw already happened today
  const { data: existingWinner } = await supabase
    .from('pinwheel_winners')
    .select('id')
    .eq('date_won', today)
    .single();

  if (existingWinner) {
    return NextResponse.json(
      { error: 'Draw already completed for today' },
      { status: 400 }
    );
  }

  // Get all entries for today
  const { data: entries, error: entriesError } = await supabase
    .from('pinwheel_entries')
    .select('wallet_address')
    .eq('entry_date', today);

  if (entriesError) {
    console.error('Error fetching entries:', entriesError);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }

  if (!entries || entries.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No entries today - no winner selected',
      winner: null,
    });
  }

  // Randomly select winner
  const winnerIndex = Math.floor(Math.random() * entries.length);
  const winnerWallet = entries[winnerIndex].wallet_address;

  // Randomly select pin (equal probability)
  const pinIndex = Math.floor(Math.random() * PINS.length);
  const pinWon = PINS[pinIndex].name;

  // Save winner
  const { error: insertError } = await supabase
    .from('pinwheel_winners')
    .insert({
      wallet_address: winnerWallet,
      date_won: today,
      pin_won: pinWon,
      spin_segment_index: pinIndex,
      shipped: false,
    });

  if (insertError) {
    console.error('Error saving winner:', insertError);
    return NextResponse.json(
      { error: 'Failed to save winner' },
      { status: 500 }
    );
  }

  // Notify Discord
  await notifyDiscord(winnerWallet, pinWon);

  return NextResponse.json({
    success: true,
    winner: {
      wallet_address: winnerWallet,
      pin_won: pinWon,
      spin_segment_index: pinIndex,
      date_won: today,
    },
    totalEntries: entries.length,
  });
}

// Check authorization for manual triggers
function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.CRON_SECRET || process.env.ADMIN_API_KEY;
  if (!expectedKey) return false;
  return authHeader === `Bearer ${expectedKey}`;
}

// GET handler for Vercel cron job (no auth required - Hobby plan compatible)
// Protected by: only one draw per day, Vercel cron is the only expected caller
export async function GET() {
  try {
    console.log('Draw triggered by cron job at', new Date().toISOString());
    return await runDraw();
  } catch (error) {
    console.error('Error running draw:', error);
    return NextResponse.json(
      { error: 'Failed to run draw' },
      { status: 500 }
    );
  }
}

// POST handler for admin/manual triggers (auth required)
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Draw triggered manually at', new Date().toISOString());
    return await runDraw();
  } catch (error) {
    console.error('Error running draw:', error);
    return NextResponse.json(
      { error: 'Failed to run draw' },
      { status: 500 }
    );
  }
}
