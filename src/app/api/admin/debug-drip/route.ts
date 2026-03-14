import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { findCredential, getMemberByEmail, createEmailCredential } from '@/lib/drip';

const DRIP_API_BASE = 'https://api.drip.re/api/v1';

async function rawDripFetch(endpoint: string) {
  const apiKey = process.env.DRIP_API_KEY;
  const response = await fetch(`${DRIP_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  return { status: response.status, body: text };
}

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
  const realmId = process.env.DRIP_REALM_ID;
  const results: Record<string, unknown> = { email: emailLower, realmId };

  // Test different type values for find endpoint
  const typesToTry = ['email', 'social', 'email-social', 'provider-email'];
  for (const type of typesToTry) {
    try {
      const url = `/realms/${realmId}/credentials/find?type=${type}&value=${encodeURIComponent(emailLower)}`;
      results[`find_${type}`] = await rawDripFetch(url);
    } catch (e) {
      results[`find_${type}_error`] = e instanceof Error ? e.message : String(e);
    }
  }

  // Test member search
  try {
    const member = await getMemberByEmail(emailLower);
    results.getMember = member;
  } catch (e) {
    results.getMemberError = e instanceof Error ? e.message : String(e);
  }

  // Test create (will show 409 if exists)
  try {
    const created = await createEmailCredential(emailLower, emailLower.split('@')[0]);
    results.createCredential = created;
  } catch (e) {
    results.createCredentialError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(results);
}
