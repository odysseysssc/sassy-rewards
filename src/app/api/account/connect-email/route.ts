import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const supabase = createServerClient();
    const normalizedEmail = email.toLowerCase();

    // Check if email is already linked to any user
    const { data: existingCredential } = await supabase
      .from('connected_credentials')
      .select('user_id')
      .eq('credential_type', 'email')
      .eq('identifier', normalizedEmail)
      .single();

    if (existingCredential && existingCredential.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'This email is already connected to another account' },
        { status: 409 }
      );
    }

    if (existingCredential) {
      // Already linked to this user
      return NextResponse.json({ success: true, message: 'Email already linked' });
    }

    // Generate a verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store the pending verification
    const { error: insertError } = await supabase
      .from('email_verifications')
      .insert({
        user_id: session.user.id,
        email: normalizedEmail,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error storing verification:', insertError);
      return NextResponse.json(
        { error: 'Failed to create verification' },
        { status: 500 }
      );
    }

    // Send verification email
    const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

    const { error: emailError } = await resend.emails.send({
      from: 'Shredding Sassy <noreply@shreddingsassy.com>',
      to: normalizedEmail,
      subject: 'Verify your email - Shredding Sassy Rewards',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify your email</h2>
          <p>Click the button below to link this email to your Shredding Sassy Rewards account.</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Verify Email
          </a>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            This link expires in 24 hours. If you didn't request this, you can ignore this email.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error) {
    console.error('Connect email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
