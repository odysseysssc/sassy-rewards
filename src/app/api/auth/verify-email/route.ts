import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/profile?error=invalid_token', process.env.NEXTAUTH_URL!));
  }

  const supabase = createServerClient();

  // Find the verification record
  const { data: verification, error: findError } = await supabase
    .from('email_verifications')
    .select('*')
    .eq('token', token)
    .single();

  if (findError || !verification) {
    return NextResponse.redirect(new URL('/profile?error=invalid_token', process.env.NEXTAUTH_URL!));
  }

  // Check if expired
  if (new Date(verification.expires_at) < new Date()) {
    // Delete expired token
    await supabase.from('email_verifications').delete().eq('id', verification.id);
    return NextResponse.redirect(new URL('/profile?error=token_expired', process.env.NEXTAUTH_URL!));
  }

  // Check if email is already linked to another user
  const { data: existingCredential } = await supabase
    .from('connected_credentials')
    .select('user_id')
    .eq('credential_type', 'email')
    .eq('identifier', verification.email)
    .single();

  if (existingCredential && existingCredential.user_id !== verification.user_id) {
    await supabase.from('email_verifications').delete().eq('id', verification.id);
    return NextResponse.redirect(new URL('/profile?error=email_already_linked', process.env.NEXTAUTH_URL!));
  }

  // Add the email credential if not already linked
  if (!existingCredential) {
    const { error: insertError } = await supabase
      .from('connected_credentials')
      .insert({
        user_id: verification.user_id,
        credential_type: 'email',
        identifier: verification.email,
        verified: true,
      });

    if (insertError) {
      console.error('Error linking email:', insertError);
      return NextResponse.redirect(new URL('/profile?error=link_failed', process.env.NEXTAUTH_URL!));
    }
  }

  // Also update the users table email field
  await supabase
    .from('users')
    .update({ email: verification.email })
    .eq('id', verification.user_id);

  // Delete the verification record
  await supabase.from('email_verifications').delete().eq('id', verification.id);

  return NextResponse.redirect(new URL('/profile?email_linked=true', process.env.NEXTAUTH_URL!));
}
