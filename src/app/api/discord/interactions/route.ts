import { NextRequest, NextResponse } from 'next/server';
import { findUserByDiscordId, createSubmission, hasSubmittedToday, findUserById, createUser } from '@/lib/db';

// Discord interaction types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const;

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
} as const;

// Verify Discord signature
async function verifyDiscordSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) {
    return false;
  }

  try {
    // Dynamic import tweetnacl
    const nacl = await import('tweetnacl');

    const isValid = nacl.sign.detached.verify(
      new TextEncoder().encode(timestamp + body),
      hexToUint8Array(signature),
      hexToUint8Array(publicKey)
    );

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array();
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

// Helper to detect platform from URL
function detectPlatform(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('tiktok.com')) return 'tiktok';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) return 'facebook';
  return 'other';
}

// Helper to detect content type
function detectContentType(url: string, platform: string): string {
  const lowerUrl = url.toLowerCase();
  if (platform === 'instagram') {
    if (lowerUrl.includes('/reel/') || lowerUrl.includes('/reels/')) return 'video';
    if (lowerUrl.includes('/stories/')) return 'story';
    return 'post';
  }
  if (platform === 'tiktok') return 'video';
  if (platform === 'youtube') return 'video';
  return 'post';
}

// Helper to detect if content is STF from URL or description
function isShredTheFeed(url: string, description?: string): boolean {
  const text = `${url} ${description || ''}`.toLowerCase();
  return (
    text.includes('shredthefeed') ||
    text.includes('shred the feed') ||
    text.includes('#shredthefeed') ||
    text.includes('shred-the-feed')
  );
}

// Extract URL from message
function extractUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/i;
  const match = text.match(urlRegex);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  // Verify the request is from Discord
  const isValid = await verifyDiscordSignature(request, body);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Handle Discord ping (verification)
  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  // Handle slash commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = interaction.data;
    const discordUserId = interaction.member?.user?.id || interaction.user?.id;
    const discordUsername = interaction.member?.user?.username || interaction.user?.username;

    if (name === 'submit') {
      // Get the URL option
      const urlOption = options?.find((opt: { name: string; value: string }) => opt.name === 'url');
      const shredOption = options?.find((opt: { name: string; value: boolean }) => opt.name === 'shredthefeed');

      const contentUrl = urlOption?.value;

      if (!contentUrl) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Please provide a URL to submit.',
            flags: 64, // Ephemeral - only visible to user
          },
        });
      }

      // Validate URL
      try {
        new URL(contentUrl);
      } catch {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ That doesn\'t look like a valid URL. Please check and try again.',
            flags: 64,
          },
        });
      }

      // Find user by Discord ID
      const user = await findUserByDiscordId(discordUserId);

      if (!user) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Your Discord isn't linked yet!\n\nLink your account at **https://portal.shreddingsassy.com/profile** first, then come back and submit.`,
            flags: 64,
          },
        });
      }

      // Determine submission type (explicit flag or auto-detect)
      const isSTF = shredOption?.value === true || isShredTheFeed(contentUrl);
      const submissionType = isSTF ? 'shred' : 'general';

      // Check if already submitted today
      const alreadySubmitted = await hasSubmittedToday(user.id, submissionType);
      if (alreadySubmitted) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ You've already submitted ${isSTF ? 'a Shred the Feed entry' : 'content'} today. Come back tomorrow!`,
            flags: 64,
          },
        });
      }

      // Auto-detect platform and content type
      const platform = detectPlatform(contentUrl);
      const contentType = detectContentType(contentUrl, platform);

      // Create the submission
      try {
        await createSubmission(
          user.id,
          platform,
          contentUrl,
          contentType,
          `Submitted via Discord by ${discordUsername}`,
          submissionType
        );

        const emoji = isSTF ? '🏂' : '✅';
        const typeLabel = isSTF ? 'Shred the Feed entry' : 'content submission';

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `${emoji} **Submitted!** Your ${typeLabel} has been received.\n\nYou'll be notified once it's reviewed. ${isSTF ? 'Good luck! 🤙' : ''}`,
            flags: 64,
          },
        });
      } catch (error) {
        console.error('Error creating submission via Discord:', error);
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Something went wrong creating your submission. Please try again or use the website.',
            flags: 64,
          },
        });
      }
    }
  }

  // Unknown interaction
  return NextResponse.json({ error: 'Unknown interaction' }, { status: 400 });
}
