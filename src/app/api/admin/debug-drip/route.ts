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

  // Try PATCH balance directly (this is what should award GRIT)
  try {
    const url = `/realms/${realmId}/credentials/balance?type=email&value=${encodeURIComponent(emailLower)}`;
    const gritCurrencyId = process.env.DRIP_GRIT_CURRENCY_ID;
    const response = await fetch(`${DRIP_API_BASE}${url}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.DRIP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 1, // Just 1 GRIT as test
        ...(gritCurrencyId && { realmPointId: gritCurrencyId }),
      }),
    });
    const body = await response.text();
    results.balance_patch = { status: response.status, body };
  } catch (e) {
    results.balance_patch_error = e instanceof Error ? e.message : String(e);
  }

  // Also try without the realmPointId
  try {
    const url = `/realms/${realmId}/credentials/balance?type=email&value=${encodeURIComponent(emailLower)}`;
    const response = await fetch(`${DRIP_API_BASE}${url}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.DRIP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: 1 }),
    });
    const body = await response.text();
    results.balance_patch_no_currency = { status: response.status, body };
  } catch (e) {
    results.balance_patch_no_currency_error = e instanceof Error ? e.message : String(e);
  }

  // Test member search
  try {
    const member = await getMemberByEmail(emailLower);
    results.getMember = member;
  } catch (e) {
    results.getMemberError = e instanceof Error ? e.message : String(e);
  }

  // Test create with raw response (to see full 409 body)
  try {
    const url = `/realms/${realmId}/credentials/social`;
    const response = await fetch(`${DRIP_API_BASE}${url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DRIP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'email',
        providerId: emailLower,
        username: emailLower.split('@')[0],
      }),
    });
    const body = await response.text();
    results.createRaw = { status: response.status, body };
  } catch (e) {
    results.createRawError = e instanceof Error ? e.message : String(e);
  }

  // Try DELETE to clear the broken credential
  try {
    const url = `/realms/${realmId}/credentials/social?provider=email&providerId=${encodeURIComponent(emailLower)}`;
    const response = await fetch(`${DRIP_API_BASE}${url}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.DRIP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    const body = await response.text();
    results.delete_credential = { status: response.status, body };
  } catch (e) {
    results.delete_credential_error = e instanceof Error ? e.message : String(e);
  }

  // After delete attempt, try create again
  try {
    const url = `/realms/${realmId}/credentials/social`;
    const response = await fetch(`${DRIP_API_BASE}${url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DRIP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'email',
        providerId: emailLower,
        username: emailLower.split('@')[0],
      }),
    });
    const body = await response.text();
    results.createAfterDelete = { status: response.status, body };
  } catch (e) {
    results.createAfterDeleteError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(results);
}
