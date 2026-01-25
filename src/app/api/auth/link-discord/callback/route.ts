import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const cookieStore = await cookies();
  const storedState = cookieStore.get('discord_oauth_state')?.value;
  const userId = cookieStore.get('link_user_id')?.value;

  // Clean up cookies
  cookieStore.delete('discord_oauth_state');
  cookieStore.delete('link_user_id');

  // Handle errors
  if (error) {
    console.error('Discord OAuth error:', error);
    return NextResponse.redirect(new URL('/profile?error=discord_denied', process.env.NEXTAUTH_URL!));
  }

  if (!code || !state || state !== storedState) {
    console.error('Invalid OAuth state');
    return NextResponse.redirect(new URL('/profile?error=invalid_state', process.env.NEXTAUTH_URL!));
  }

  if (!userId) {
    console.error('No user ID found for linking');
    return NextResponse.redirect(new URL('/profile?error=no_user', process.env.NEXTAUTH_URL!));
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/link-discord/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/profile?error=token_failed', process.env.NEXTAUTH_URL!));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get Discord user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to get Discord user');
      return NextResponse.redirect(new URL('/profile?error=discord_user_failed', process.env.NEXTAUTH_URL!));
    }

    const discordUser = await userResponse.json();
    const discordId = discordUser.id;

    // Check if Discord is already linked to another user
    const supabase = createServerClient();

    const { data: existing } = await supabase
      .from('connected_credentials')
      .select('user_id')
      .eq('credential_type', 'discord')
      .eq('identifier', discordId)
      .single();

    if (existing && existing.user_id !== userId) {
      console.error('Discord already linked to another user');
      return NextResponse.redirect(new URL('/profile?error=discord_already_linked', process.env.NEXTAUTH_URL!));
    }

    if (!existing) {
      // Add Discord credential to user
      const { error: insertError } = await supabase
        .from('connected_credentials')
        .insert({
          user_id: userId,
          credential_type: 'discord',
          identifier: discordId,
          verified: true,
        });

      if (insertError) {
        console.error('Failed to link Discord:', insertError);
        return NextResponse.redirect(new URL('/profile?error=link_failed', process.env.NEXTAUTH_URL!));
      }
    }

    // Success - redirect back to profile
    return NextResponse.redirect(new URL('/profile?discord_linked=true', process.env.NEXTAUTH_URL!));
  } catch (err) {
    console.error('Discord linking error:', err);
    return NextResponse.redirect(new URL('/profile?error=unknown', process.env.NEXTAUTH_URL!));
  }
}
