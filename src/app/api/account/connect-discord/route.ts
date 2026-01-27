import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { getMemberByDiscordId, linkCredentialToAccount } from '@/lib/drip';

// This endpoint handles linking Discord after OAuth callback
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { discordId, discordUsername } = await request.json();

    if (!discordId) {
      return NextResponse.json({ error: 'Discord ID is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check if this Discord is already linked to another account
    const { data: existingCredential } = await supabase
      .from('connected_credentials')
      .select('user_id')
      .eq('credential_type', 'discord')
      .eq('identifier', discordId)
      .single();

    if (existingCredential && existingCredential.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'This Discord account is already linked to another user' },
        { status: 400 }
      );
    }

    // Check if Discord exists in Drip (may have ghost GRIT)
    const dripMember = await getMemberByDiscordId(discordId);

    // Add credential to our DB
    if (!existingCredential) {
      const { error: insertError } = await supabase
        .from('connected_credentials')
        .insert({
          user_id: session.user.id,
          credential_type: 'discord',
          identifier: discordId,
          display_name: discordUsername || undefined,
          verified: true,
        });

      if (insertError) {
        console.error('Error inserting Discord credential:', insertError);
        return NextResponse.json({ error: 'Failed to link Discord' }, { status: 500 });
      }
    }

    // Get user's current Drip account ID
    let userDripAccountId = session.user.dripAccountId;

    // If user doesn't have a Drip account but Discord does, adopt that account
    if (!userDripAccountId && dripMember?.id) {
      userDripAccountId = dripMember.id;
      await supabase
        .from('users')
        .update({ drip_account_id: dripMember.id, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
    }

    // Link Discord credential in Drip (transfers any ghost GRIT to user's account)
    if (userDripAccountId) {
      try {
        await linkCredentialToAccount('discord-id', discordId, userDripAccountId);
        console.log(`Linked Discord ${discordId} to Drip account ${userDripAccountId}`);
      } catch (error) {
        console.error('Error linking Discord in Drip:', error);
        // Non-fatal - credential is still saved in our DB
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Discord linked successfully',
      dripAccountId: userDripAccountId,
    });
  } catch (error) {
    console.error('Error connecting Discord:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to check Discord connection status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data: credential } = await supabase
      .from('connected_credentials')
      .select('identifier, display_name, created_at')
      .eq('user_id', session.user.id)
      .eq('credential_type', 'discord')
      .single();

    return NextResponse.json({
      connected: !!credential,
      discordId: credential?.identifier,
      displayName: credential?.display_name,
      connectedAt: credential?.created_at,
    });
  } catch (error) {
    console.error('Error checking Discord connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
