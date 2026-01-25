import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { Resend } from 'resend';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const supabase = createServerClient();

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing tokens for this email
    await supabase
      .from('magic_link_tokens')
      .delete()
      .eq('email', normalizedEmail);

    // Store the token
    const { error: insertError } = await supabase
      .from('magic_link_tokens')
      .insert({
        email: normalizedEmail,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error storing magic link token:', insertError);
      return NextResponse.json(
        { error: 'Failed to create login link' },
        { status: 500 }
      );
    }

    // Send email via Resend
    const loginUrl = `${process.env.NEXTAUTH_URL}/auth/callback?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: emailError } = await resend.emails.send({
      from: 'Shredding Sassy <noreply@shreddingsassy.com>',
      to: normalizedEmail,
      subject: 'Sign in to Shredding Sassy Rewards',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Sign in to Shredding Sassy</h2>
          <p>Click the button below to sign in to your Shredding Sassy Rewards account.</p>
          <a href="${loginUrl}" style="display: inline-block; background: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Sign In
          </a>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            This link expires in 15 minutes. If you didn't request this, you can ignore this email.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Error sending magic link email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send login email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Magic link sent to your email' });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
