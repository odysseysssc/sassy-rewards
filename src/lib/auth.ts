import { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByEmail, createUser, findUserById, claimPendingGrit, getTotalPendingGrit } from './db';
import { getOrCreateDripAccount, getMemberByDiscordId, getMemberByWallet, awardGritToAccount } from './drip';

export const authOptions: NextAuthOptions = {
  providers: [
    // Discord OAuth (secondary)
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),

    // Email magic link provider - receives credentials from Supabase callback
    CredentialsProvider({
      id: 'email',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        supabaseUserId: { label: 'Supabase User ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.supabaseUserId) {
          return null;
        }

        const email = credentials.email.toLowerCase();
        const supabaseUserId = credentials.supabaseUserId;

        try {
          // Check if user exists in our DB
          let user = await findUserById(supabaseUserId);

          if (!user) {
            // Check if user exists by email (edge case)
            user = await findUserByEmail(email);
          }

          // Get or create Drip account
          const dripAccountId = await getOrCreateDripAccount(email);

          if (!user) {
            // Create new user
            user = await createUser(supabaseUserId, email, dripAccountId || undefined);
          }

          // Claim any pending GRIT for this email
          const finalDripAccountId = user.drip_account_id || dripAccountId;
          if (finalDripAccountId) {
            try {
              const pendingAmount = await getTotalPendingGrit(email);
              if (pendingAmount > 0) {
                // Award the pending GRIT to their Drip account
                const awarded = await awardGritToAccount(finalDripAccountId, pendingAmount, 'Claimed pending GRIT on signup');
                if (awarded) {
                  // Mark as claimed in our DB
                  await claimPendingGrit(email, user.id);
                  console.log(`Claimed ${pendingAmount} pending GRIT for ${email}`);
                }
              }
            } catch (claimError) {
              console.error('Error claiming pending GRIT:', claimError);
              // Don't fail auth if claiming fails
            }
          }

          return {
            id: user.id,
            email: user.email,
            dripAccountId: user.drip_account_id || dripAccountId || undefined,
            authType: 'email',
          };
        } catch (error) {
          console.error('Email auth error:', error);
          return null;
        }
      },
    }),

    // Wallet provider (secondary)
    CredentialsProvider({
      id: 'wallet',
      name: 'Wallet',
      credentials: {
        wallet: { label: 'Wallet Address', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.wallet) {
          return null;
        }

        const wallet = credentials.wallet.toLowerCase();

        try {
          // Try to find existing Drip member by wallet
          const member = await getMemberByWallet(wallet);

          return {
            id: wallet,
            wallet: wallet,
            dripAccountId: member?.id,
            authType: 'wallet',
          };
        } catch (error) {
          console.error('Wallet auth error:', error);
          // Still allow login even if Drip lookup fails
          return {
            id: wallet,
            wallet: wallet,
            authType: 'wallet',
          };
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.dripAccountId = user.dripAccountId;
        token.wallet = user.wallet;
        token.authType = user.authType || (account?.provider === 'discord' ? 'discord' : undefined);

        // Handle Discord OAuth
        if (account?.provider === 'discord') {
          token.discordId = account.providerAccountId;

          // Try to get Drip account from Discord ID
          try {
            const member = await getMemberByDiscordId(account.providerAccountId);
            if (member?.id) {
              token.dripAccountId = member.id;
            }
            if (member?.email) {
              token.email = member.email;
            }
          } catch (error) {
            console.error('Discord Drip lookup error:', error);
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string | undefined;
        session.user.dripAccountId = token.dripAccountId as string | undefined;
        session.user.wallet = token.wallet as string | undefined;
        session.user.authType = token.authType as string | undefined;
        session.user.discordId = token.discordId as string | undefined;
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
