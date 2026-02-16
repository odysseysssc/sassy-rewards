/**
 * Register Discord slash commands
 *
 * Run with: npx ts-node scripts/register-discord-commands.ts
 *
 * Required env vars:
 * - DISCORD_CLIENT_ID
 * - DISCORD_BOT_TOKEN
 */

const DISCORD_API = 'https://discord.com/api/v10';

const commands = [
  {
    name: 'submit',
    description: 'Submit content to earn GRIT rewards',
    options: [
      {
        name: 'url',
        description: 'The URL of your content (X, Instagram, TikTok, YouTube, etc.)',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'shredthefeed',
        description: 'Is this a Shred the Feed competition entry?',
        type: 5, // BOOLEAN
        required: false,
      },
    ],
  },
];

async function registerCommands() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!clientId || !botToken) {
    console.error('Missing required environment variables:');
    if (!clientId) console.error('  - DISCORD_CLIENT_ID');
    if (!botToken) console.error('  - DISCORD_BOT_TOKEN');
    process.exit(1);
  }

  console.log('Registering Discord slash commands...');

  try {
    const response = await fetch(
      `${DISCORD_API}/applications/${clientId}/commands`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${botToken}`,
        },
        body: JSON.stringify(commands),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to register commands:', response.status, error);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Successfully registered commands:');
    data.forEach((cmd: { name: string; id: string }) => {
      console.log(`   - /${cmd.name} (ID: ${cmd.id})`);
    });
  } catch (error) {
    console.error('Error registering commands:', error);
    process.exit(1);
  }
}

registerCommands();
