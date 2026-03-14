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

  // Test find endpoint with type=email
  try {
    const url = `/realms/${realmId}/credentials/find?type=email&value=${encodeURIComponent(emailLower)}`;
    results.find_email = await rawDripFetch(url);
  } catch (e) {
    results.find_email_error = e instanceof Error ? e.message : String(e);
  }

  // Try search endpoint (like members/search)
  try {
    const url = `/realms/${realmId}/credentials/search?type=email&values=${encodeURIComponent(emailLower)}`;
    results.search_email = await rawDripFetch(url);
  } catch (e) {
    results.search_email_error = e instanceof Error ? e.message : String(e);
  }

  // Try GET all credentials and filter
  try {
    const url = `/realms/${realmId}/credentials?type=email`;
    results.list_credentials = await rawDripFetch(url);
  } catch (e) {
    results.list_credentials_error = e instanceof Error ? e.message : String(e);
  }

  // Try the balance endpoint directly (might give different error)
  try {
    const url = `/realms/${realmId}/credentials/balance?type=email&value=${encodeURIComponent(emailLower)}`;
    results.balance_get = await rawDripFetch(url);
  } catch (e) {
    results.balance_get_error = e instanceof Error ? e.message : String(e);
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
