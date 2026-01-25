import { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createServerClient } from './supabase';
import { getMemberByDiscordId, getMemberByWallet, getMemberByEmail } from './drip';

// Helper: Find user by any credential
async function findUserByCredential(type: string, identifier: string) {
  const supabase = createServerClient();

  const { data: credential } = await supabase
    .from('connected_credentials')
    .select('user_id')
    .eq('credential_type', type)
    .eq('identifier', identifier.toLowerCase())
    .single();

  if (!credential?.user_id) return null;

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', credential.user_id)
    .single();

  return user;
}

// Helper: Get all credentials for a user
async function getUserCredentials(userId: string) {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('connected_credentials')
    .select('credential_type, identifier')
    .eq('user_id', userId);

  const result: { email?: string; wallet?: string; discordId?: string } = {};

  data?.forEach(cred => {
    if (cred.credential_type === 'email') result.email = cred.identifier;
    if (cred.credential_type === 'wallet') result.wallet = cred.identifier;
    if (cred.credential_type === 'discord') result.discordId = cred.identifier;
  });

  return result;
}

// Helper: Create new user with initial credential
async function createUserWithCredential(type: string, identifier: string, dripAccountId?: string) {
  const supabase = createServerClient();

  // Create user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      email: type === 'email' ? identifier.toLowerCase() : null,
      drip_account_id: dripAccountId || null,
    })
    .select()
    .single();

  if (userError || !user) {
    console.error('Error creating user:', userError);
    return null;
  }

  // Add credential
  await supabase
    .from('connected_credentials')
    .insert({
      user_id: user.id,
      credential_type: type,
      identifier: identifier.toLowerCase(),
      verified: true,
    });

  return user;
}

// Helper: Add credential to existing user
async function addCredentialToUser(userId: string, type: string, identifier: string) {
  const supabase = createServerClient();

  // Check if credential already exists for another user
  const { data: existing } = await supabase
    .from('connected_credentials')
    .select('user_id')
    .eq('credential_type', type)
    .eq('identifier', identifier.toLowerCase())
    .single();

  if (existing && existing.user_id !== userId) {
    console.error('Credential already linked to another user');
    return false;
  }

  if (existing) {
    // Already linked to this user
    return true;
  }

  // Add new credential
  const { error } = await supabase
    .from('connected_credentials')
    .insert({
      user_id: userId,
      credential_type: type,
      identifier: identifier.toLowerCase(),
      verified: true,
    });

  return !error;
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Discord OAuth
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),

    // Email magic link (from Supabase callback)
    CredentialsProvider({
      id: 'email',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        supabaseUserId: { label: 'Supabase User ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const email = credentials.email.toLowerCase();

        try {
          // Check if this email is already linked to a user
          let user = await findUserByCredential('email', email);

          if (!user) {
            // Try to find/create Drip account
            const dripMember = await getMemberByEmail(email);

            // Create new user
            user = await createUserWithCredential('email', email, dripMember?.id);
          }

          if (!user) return null;

          // Get all linked credentials
          const credentials = await getUserCredentials(user.id);

          return {
            id: user.id,
            email: credentials.email,
            wallet: credentials.wallet,
            discordId: credentials.discordId,
            dripAccountId: user.drip_account_id,
            authType: 'email',
          };
        } catch (error) {
          console.error('Email auth error:', error);
          return null;
        }
      },
    }),

    // Wallet login
    CredentialsProvider({
      id: 'wallet',
      name: 'Wallet',
      credentials: {
        wallet: { label: 'Wallet Address', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.wallet) return null;

        const wallet = credentials.wallet.toLowerCase();

        try {
          // Check if this wallet is already linked to a user
          let user = await findUserByCredential('wallet', wallet);

          if (!user) {
            // Try to find Drip account by wallet
            const dripMember = await getMemberByWallet(wallet);

            // Create new user
            user = await createUserWithCredential('wallet', wallet, dripMember?.id);
          }

          if (!user) return null;

          // Get all linked credentials
          const creds = await getUserCredentials(user.id);

          return {
            id: user.id,
            email: creds.email,
            wallet: creds.wallet,
            discordId: creds.discordId,
            dripAccountId: user.drip_account_id,
            authType: 'wallet',
          };
        } catch (error) {
          console.error('Wallet auth error:', error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Discord OAuth sign-in
      if (account?.provider === 'discord') {
        const discordId = account.providerAccountId;

        // Check if this is linking to existing session or fresh login
        if (token.id) {
          // LINKING: User already logged in, just add Discord
          token.discordId = discordId;

          // Save to database
          await addCredentialToUser(token.id as string, 'discord', discordId);

          return token;
        }

        // FRESH LOGIN with Discord
        try {
          let user = await findUserByCredential('discord', discordId);

          if (!user) {
            // Try to find Drip account by Discord
            const dripMember = await getMemberByDiscordId(discordId);

            // Create new user
            user = await createUserWithCredential('discord', discordId, dripMember?.id);
          }

          if (user) {
            const creds = await getUserCredentials(user.id);

            token.id = user.id;
            token.email = creds.email;
            token.wallet = creds.wallet;
            token.discordId = creds.discordId || discordId;
            token.dripAccountId = user.drip_account_id;
            token.authType = 'discord';
          }
        } catch (error) {
          console.error('Discord auth error:', error);
        }

        return token;
      }

      // Email or Wallet login
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.wallet = user.wallet;
        token.discordId = user.discordId;
        token.dripAccountId = user.dripAccountId;
        token.authType = user.authType;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string | undefined;
        session.user.wallet = token.wallet as string | undefined;
        session.user.discordId = token.discordId as string | undefined;
        session.user.dripAccountId = token.dripAccountId as string | undefined;
        session.user.authType = token.authType as string | undefined;
      }
      return session;
    },
  },

  pages: {
    signIn: '/signin',
  },

  session: {
    strategy: 'jwt',
  },
};
