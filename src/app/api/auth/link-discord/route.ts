import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

// Initiates Discord OAuth for linking (not login)
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/signin', process.env.NEXTAUTH_URL));
  }

  // Store the current user ID in a cookie before OAuth redirect
  const cookieStore = await cookies();
  cookieStore.set('link_user_id', session.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5, // 5 minutes
    path: '/',
  });

  // Build Discord OAuth URL
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/link-discord/callback`;
  const scope = 'identify';
  const state = crypto.randomUUID(); // CSRF protection

  cookieStore.set('discord_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5,
    path: '/',
  });

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;

  return NextResponse.redirect(discordAuthUrl);
}
