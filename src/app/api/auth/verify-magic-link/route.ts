import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const normalizedEmail = email.toLowerCase();

    // Find the token
    const { data: tokenRecord, error: findError } = await supabase
      .from('magic_link_tokens')
      .select('*')
      .eq('token', token)
      .eq('email', normalizedEmail)
      .single();

    if (findError || !tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      // Delete expired token
      await supabase.from('magic_link_tokens').delete().eq('id', tokenRecord.id);
      return NextResponse.json(
        { error: 'This link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Delete the token (one-time use)
    await supabase.from('magic_link_tokens').delete().eq('id', tokenRecord.id);

    return NextResponse.json({ success: true, email: normalizedEmail });
  } catch (error) {
    console.error('Verify magic link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
