import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { findCredentialByEmail, getMemberByEmail, createEmailCredential } from '@/lib/drip';

export async function GET(request: NextRequest) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const emailLower = email.toLowerCase();
  const results: Record<string, unknown> = { email: emailLower };

  // Test 1: Find credential by email
  try {
    const credential = await findCredentialByEmail(emailLower);
    results.findCredential = credential;
  } catch (e) {
    results.findCredentialError = e instanceof Error ? e.message : String(e);
  }

  // Test 2: Get member by email
  try {
    const member = await getMemberByEmail(emailLower);
    results.getMember = member;
  } catch (e) {
    results.getMemberError = e instanceof Error ? e.message : String(e);
  }

  // Test 3: Try to create credential (will show if it already exists)
  try {
    const created = await createEmailCredential(emailLower, emailLower.split('@')[0]);
    results.createCredential = created;
  } catch (e) {
    results.createCredentialError = e instanceof Error ? e.message : String(e);
  }

  // Test 4: Find credential again after create attempt
  try {
    const credential = await findCredentialByEmail(emailLower);
    results.findCredentialAfterCreate = credential;
  } catch (e) {
    results.findCredentialAfterCreateError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(results);
}
