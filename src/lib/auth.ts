import { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createServerClient } from './supabase';
import {
  getMemberByDiscordId,
  getMemberByWallet,
  getOrCreateDripAccount,
  getOrCreateDripAccountByWallet,
  getOrCreateDripAccountByDiscord,
  findCredential,
  linkCredentialToAccount,
} from './drip';

// Helper: Find user by any credential
async function findUserByCredential(type: string, identifier: string) {
  try {
    const supabase = createServerClient();

    const { data: credential, error: credError } = await supabase
      .from('connected_credentials')
      .select('user_id')
      .eq('credential_type', type)
      .eq('identifier', identifier.toLowerCase())
      .single();

    if (credError || !credential?.user_id) return null;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', credential.user_id)
      .single();

    if (userError) return null;
    return user;
  } catch (error) {
    console.error('findUserByCredential error:', error);
    return null;
  }
}

// Helper: Find user by Drip account ID
// If multiple users share the same Drip account (duplicates), returns the "best" one
// (most credentials, has email, oldest)
async function findUserByDripAccount(dripAccountId: string) {
  try {
    const supabase = createServerClient();

    // Get ALL users with this Drip account ID (there might be duplicates)
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('drip_account_id', dripAccountId)
      .order('created_at', { ascending: true });

    if (error || !users || users.length === 0) return null;

    // If only one user, return it
    if (users.length === 1) return users[0];

    // Multiple users found - this is a duplicate situation
    // Get credentials for all these users to pick the best one
    console.log(`[findUserByDripAccount] WARNING: Found ${users.length} users with Drip account ${dripAccountId}`);

    const userIds = users.map(u => u.id);
    const { data: credentials } = await supabase
      .from('connected_credentials')
      .select('user_id, credential_type')
      .in('user_id', userIds);

    // Count credentials per user
    const credCounts: Record<string, { count: number; hasEmail: boolean }> = {};
    users.forEach(u => {
      credCounts[u.id] = { count: 0, hasEmail: !!u.email };
    });
    credentials?.forEach(c => {
      if (credCounts[c.user_id]) {
        credCounts[c.user_id].count++;
        if (c.credential_type === 'email') credCounts[c.user_id].hasEmail = true;
      }
    });

    // Sort users: prefer has email, then most credentials, then oldest
    const sorted = users.sort((a, b) => {
      const aInfo = credCounts[a.id];
      const bInfo = credCounts[b.id];
      if (aInfo.hasEmail !== bInfo.hasEmail) return aInfo.hasEmail ? -1 : 1;
      if (aInfo.count !== bInfo.count) return bInfo.count - aInfo.count;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    console.log(`[findUserByDripAccount] Selected user ${sorted[0].id} as primary`);
    return sorted[0];
  } catch (error) {
    console.error('findUserByDripAccount error:', error);
    return null;
  }
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
// IMPORTANT: This function does a FINAL check for existing users before creating
// to handle race conditions where two logins happen simultaneously
async function createUserWithCredential(type: string, identifier: string, dripAccountId?: string) {
  try {
    const supabase = createServerClient();
    console.log('[createUser] Creating user with type:', type, 'dripId:', dripAccountId);

    // FINAL CHECK: Before creating, verify no user exists with this Drip account
    // This handles race conditions where two auth requests come in simultaneously
    if (dripAccountId) {
      const existingUser = await findUserByDripAccount(dripAccountId);
      if (existingUser) {
        console.log('[createUser] RACE CONDITION PREVENTED: Found existing user with Drip account, linking instead');
        await addCredentialToUser(existingUser.id, type, identifier);
        return existingUser;
      }
    }

    // Also check if credential already exists (another race condition)
    const existingByCredential = await findUserByCredential(type, identifier);
    if (existingByCredential) {
      console.log('[createUser] RACE CONDITION PREVENTED: Found existing user with credential');
      return existingByCredential;
    }

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
      console.error('[createUser] Error creating user:', userError);

      // If insert failed due to constraint, try to find the existing user
      if (userError?.code === '23505') {
        console.log('[createUser] Constraint violation, looking for existing user...');
        if (dripAccountId) {
          const existing = await findUserByDripAccount(dripAccountId);
          if (existing) {
            await addCredentialToUser(existing.id, type, identifier);
            return existing;
          }
        }
      }
      return null;
    }
    console.log('[createUser] User created:', user.id);

    // Add credential
    const { error: credError } = await supabase
      .from('connected_credentials')
      .insert({
        user_id: user.id,
        credential_type: type,
        identifier: identifier.toLowerCase(),
        verified: true,
      });

    if (credError) {
      console.error('[createUser] Error adding credential:', credError);
      // If credential already exists, it might be linked to this user or another
      // This shouldn't happen but handle gracefully
    } else {
      console.log('[createUser] Credential added successfully');
    }

    return user;
  } catch (error) {
    console.error('[createUser] Exception:', error);
    return null;
  }
}

// Helper: Add credential to existing user
// If the credential exists for a different user, this logs a warning but still returns true
// to allow the auth flow to continue (the user found by Drip account is still valid)
async function addCredentialToUser(userId: string, type: string, identifier: string) {
  const supabase = createServerClient();
  const identifierLower = identifier.toLowerCase();

  // Check if credential already exists
  const { data: existing } = await supabase
    .from('connected_credentials')
    .select('user_id')
    .eq('credential_type', type)
    .eq('identifier', identifierLower)
    .single();

  if (existing && existing.user_id !== userId) {
    // Credential exists for a DIFFERENT user - this indicates duplicate profiles
    console.warn(`[addCredentialToUser] WARNING: ${type} credential ${identifierLower} is linked to user ${existing.user_id}, but trying to link to ${userId}. This may indicate duplicate profiles that need merging.`);
    // Don't fail - the caller found a user by Drip account which is still valid
    // The admin should use the duplicate finder to clean this up
    return true;
  }

  if (existing) {
    // Already linked to this user - success
    console.log(`[addCredentialToUser] ${type} credential already linked to user ${userId}`);
    return true;
  }

  // Add new credential
  const { error } = await supabase
    .from('connected_credentials')
    .insert({
      user_id: userId,
      credential_type: type,
      identifier: identifierLower,
      verified: true,
    });

  if (error) {
    // Handle unique constraint violation (race condition)
    if (error.code === '23505') {
      console.log(`[addCredentialToUser] Credential already exists (race condition), continuing...`);
      return true;
    }
    console.error(`[addCredentialToUser] Error adding ${type} credential:`, error);
    return false;
  }

  console.log(`[addCredentialToUser] Successfully linked ${type} credential to user ${userId}`);
  return true;
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
            // Get or create Drip account - this finds ghost credentials too!
            const dripAccountId = await getOrCreateDripAccount(email, email.split('@')[0]);

            // IMPORTANT: Check if a user with this Drip account already exists
            // This prevents duplicate profiles when user logs in with different credentials
            if (dripAccountId) {
              const existingDripUser = await findUserByDripAccount(dripAccountId);
              if (existingDripUser) {
                console.log('[Email Auth] Found existing user with same Drip account, linking credential...');
                // Link this email credential to the existing user
                await addCredentialToUser(existingDripUser.id, 'email', email);
                user = existingDripUser;
              }
            }

            // Only create new user if we didn't find an existing one
            if (!user) {
              user = await createUserWithCredential('email', email, dripAccountId || undefined);
            }

            // Link email credential to Drip account (claims any ghost GRIT)
            if (dripAccountId) {
              try {
                await linkCredentialToAccount('email', email, dripAccountId);
              } catch (e) {
                console.error('Failed to link email credential:', e);
              }
            }
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
        console.log('[Wallet Auth] Starting with credentials:', credentials?.wallet?.slice(0, 10));
        if (!credentials?.wallet) return null;

        const wallet = credentials.wallet.toLowerCase();

        try {
          // Check if this wallet is already linked to a user
          console.log('[Wallet Auth] Looking up user by credential...');
          let user = await findUserByCredential('wallet', wallet);
          console.log('[Wallet Auth] Found user:', user?.id);

          if (!user) {
            // Get or create Drip account - this finds ghost credentials too!
            console.log('[Wallet Auth] No user found, getting/creating Drip account...');
            const dripAccountId = await getOrCreateDripAccountByWallet(wallet);
            console.log('[Wallet Auth] Drip account:', dripAccountId);

            // IMPORTANT: Check if a user with this Drip account already exists
            // This prevents duplicate profiles when user logs in with different credentials
            if (dripAccountId) {
              const existingDripUser = await findUserByDripAccount(dripAccountId);
              if (existingDripUser) {
                console.log('[Wallet Auth] Found existing user with same Drip account, linking credential...');
                // Link this wallet credential to the existing user
                await addCredentialToUser(existingDripUser.id, 'wallet', wallet);
                user = existingDripUser;
              }
            }

            // Only create new user if we didn't find an existing one
            if (!user) {
              console.log('[Wallet Auth] Creating new user...');
              user = await createUserWithCredential('wallet', wallet, dripAccountId || undefined);
              console.log('[Wallet Auth] Created user:', user?.id);
            }

            // Link wallet credential to Drip account (claims any ghost GRIT)
            if (dripAccountId) {
              try {
                await linkCredentialToAccount('wallet', wallet, dripAccountId);
              } catch (e) {
                console.error('[Wallet Auth] Failed to link wallet credential:', e);
              }
            }
          }

          if (!user) {
            console.log('[Wallet Auth] No user, returning null');
            return null;
          }

          // Get all linked credentials
          const creds = await getUserCredentials(user.id);
          console.log('[Wallet Auth] Credentials:', creds);

          return {
            id: user.id,
            email: creds.email,
            wallet: creds.wallet,
            discordId: creds.discordId,
            dripAccountId: user.drip_account_id,
            authType: 'wallet',
          };
        } catch (error) {
          console.error('[Wallet Auth] Error:', error);
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
            // Get or create Drip account - this finds ghost credentials too!
            const dripAccountId = await getOrCreateDripAccountByDiscord(discordId);

            // IMPORTANT: Check if a user with this Drip account already exists
            // This prevents duplicate profiles when user logs in with different credentials
            if (dripAccountId) {
              const existingDripUser = await findUserByDripAccount(dripAccountId);
              if (existingDripUser) {
                console.log('[Discord Auth] Found existing user with same Drip account, linking credential...');
                // Link this discord credential to the existing user
                await addCredentialToUser(existingDripUser.id, 'discord', discordId);
                user = existingDripUser;
              }
            }

            // Only create new user if we didn't find an existing one
            if (!user) {
              user = await createUserWithCredential('discord', discordId, dripAccountId || undefined);
            }

            // Link discord credential to Drip account (claims any ghost GRIT)
            if (dripAccountId) {
              try {
                await linkCredentialToAccount('discord-id', discordId, dripAccountId);
              } catch (e) {
                console.error('Failed to link discord credential:', e);
              }
            }
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
