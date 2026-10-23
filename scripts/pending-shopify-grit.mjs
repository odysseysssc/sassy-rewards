// Inspect / pay out pending Shopify GRIT (grit_transactions where source='shopify' and claimed=false).
//
//   node scripts/pending-shopify-grit.mjs probe            # read-only: what Drip has for each pending email
//   node scripts/pending-shopify-grit.mjs pay --limit 1    # pay the oldest N pending orders
//
// Reads Supabase + Drip settings from .env.local. Never prints keys.
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '')];
    }),
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SBKEY = env.SUPABASE_SERVICE_ROLE_KEY;
const DRIP = 'https://api.drip.re/api/v1', DKEY = env.DRIP_API_KEY, REALM = env.DRIP_REALM_ID, GRIT = env.DRIP_GRIT_CURRENCY_ID;
for (const [k, v] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: SBKEY, DRIP_API_KEY: DKEY, DRIP_REALM_ID: REALM })) {
  if (!v) { console.error(`Missing ${k} in .env.local`); process.exit(1); }
}

const mode = process.argv[2] || 'probe';
const limitIdx = process.argv.indexOf('--limit');
const limit = limitIdx > 0 ? Number(process.argv[limitIdx + 1]) : 1;

const sb = async (path, init = {}) => {
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SBKEY, Authorization: `Bearer ${SBKEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${t}`);
  return t ? JSON.parse(t) : null;
};
const drip = async (path, init = {}) => {
  const r = await fetch(`${DRIP}${path}`, { ...init, headers: { Authorization: `Bearer ${DKEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const t = await r.text();
  let body; try { body = JSON.parse(t); } catch { body = t; }
  return { status: r.status, body };
};
const mask = (e) => e.replace(/^(.{2}).*(@.*)$/, '$1***$2');

const pending = await sb('grit_transactions?source=eq.shopify&claimed=eq.false&order=created_at.asc&select=id,email,amount,source_reference,created_at');
console.log(`Realm …${REALM.slice(-4)} | GRIT currency ${GRIT ? '…' + GRIT.slice(-4) : '(default)'} | ${pending.length} pending orders, ${pending.reduce((s, p) => s + p.amount, 0)} GRIT\n`);

if (mode === 'probe') {
  for (const p of pending) {
    const f = await drip(`/realms/${REALM}/credentials/find?type=email&value=${encodeURIComponent(p.email.toLowerCase())}`);
    const c = f.body?.data || f.body;
    const bal = Array.isArray(c?.balances) ? c.balances.map((b) => `${b.balance}${GRIT && b.currencyId === GRIT ? ' GRIT' : ''}`).join(', ') : '-';
    console.log(`${p.created_at.slice(0, 10)}  order ${p.source_reference}  ${String(p.amount).padStart(5)} GRIT  ${mask(p.email).padEnd(28)}  find=${f.status}  ${f.status === 200 ? `account=${c?.accountId ? 'yes' : 'NO (ghost)'} balances=[${bal}]` : JSON.stringify(f.body).slice(0, 120)}`);
  }
  process.exit(0);
}

if (mode === 'inspect') {
  // 1) Show Drip's full response when creating an email credential (the 409 body),
  // 2) try paying the oldest order to a `custom` credential (source shopify-email); claimed first, reverted on failure.
  const p = pending[0];
  const email = p.email.toLowerCase();
  const m = (o) => JSON.stringify(o).split(email).join(mask(email)).slice(0, 500);

  for (const provider of ['email']) {
    const c = await drip(`/realms/${REALM}/credentials/social`, { method: 'POST', body: JSON.stringify({ provider, providerId: email, username: email.split('@')[0] }) });
    console.log(`create social provider=${provider}: ${c.status} ${m(c.body)}`);
  }
  for (const [type, extra] of [['custom', '&source=shopify-email'], ['custom', '&source=email']]) {
    const f = await drip(`/realms/${REALM}/credentials/find?type=${type}&value=${encodeURIComponent(email)}${extra}`);
    console.log(`find type=${type}${extra}: ${f.status} ${m(f.body)}`);
  }

  const claimed = await sb(`grit_transactions?id=eq.${p.id}&claimed=eq.false`, { method: 'PATCH', body: JSON.stringify({ claimed: true, claimed_at: new Date().toISOString() }) });
  if (!claimed?.length) { console.log('already claimed'); process.exit(0); }
  const r = await drip(`/realms/${REALM}/credentials/balance?type=custom&source=shopify-email&value=${encodeURIComponent(email)}`, {
    method: 'PATCH', body: JSON.stringify({ amount: p.amount, ...(GRIT && { realmPointId: GRIT }) }),
  });
  console.log(`pay via custom/shopify-email: ${r.status} ${m(r.body)}`);
  if (!(r.status >= 200 && r.status < 300)) {
    await sb(`grit_transactions?id=eq.${p.id}`, { method: 'PATCH', body: JSON.stringify({ claimed: false, claimed_at: null }) });
    console.log('-> not paid, left pending');
  } else {
    console.log(`-> PAID ${p.amount} GRIT for order ${p.source_reference}`);
  }

  // How many site users have no Drip account at all (affects email sign-ups)?
  const noDrip = await sb('users?drip_account_id=is.null&select=id', { headers: { Prefer: 'count=exact' } });
  const all = await sb('users?select=id');
  console.log(`site users without a Drip account: ${noDrip.length} of ${all.length}`);
  process.exit(0);
}

if (mode === 'try-batch') {
  // Experiment: pay the oldest pending order via the batch endpoint, which takes type=email directly.
  const p = pending[0];
  const email = p.email.toLowerCase();
  const claimed = await sb(`grit_transactions?id=eq.${p.id}&claimed=eq.false`, { method: 'PATCH', body: JSON.stringify({ claimed: true, claimed_at: new Date().toISOString() }) });
  if (!claimed?.length) { console.log('already claimed'); process.exit(0); }
  const r = await drip(`/realms/${REALM}/credentials/transaction`, {
    method: 'PATCH',
    body: JSON.stringify({ updates: [{ type: 'email', value: email, amount: p.amount, ...(GRIT && { realmPointId: GRIT }) }] }),
  });
  const ok = r.status >= 200 && r.status < 300 && (r.body?.results?.length ?? 0) > 0 && !(r.body?.errors?.length);
  console.log(`order ${p.source_reference} (${p.amount} GRIT, ${mask(email)}): batch -> ${r.status} ${JSON.stringify(r.body).replace(email, mask(email)).slice(0, 400)}`);
  if (!ok) {
    await sb(`grit_transactions?id=eq.${p.id}`, { method: 'PATCH', body: JSON.stringify({ claimed: false, claimed_at: null }) });
    console.log('-> not paid, left pending');
  } else {
    const after = await drip(`/realms/${REALM}/credentials/find?type=email&value=${encodeURIComponent(email)}`);
    console.log(`-> PAID. find now: ${after.status} ${JSON.stringify(after.body?.data || after.body).replace(email, mask(email)).slice(0, 300)}`);
  }
  process.exit(0);
}

if (mode === 'pay') {
  for (const p of pending.slice(0, limit)) {
    const email = p.email.toLowerCase();
    // claim the row first so nothing else can pay it concurrently
    const claimed = await sb(`grit_transactions?id=eq.${p.id}&claimed=eq.false`, { method: 'PATCH', body: JSON.stringify({ claimed: true, claimed_at: new Date().toISOString() }) });
    if (!claimed?.length) { console.log(`order ${p.source_reference}: already claimed, skipping`); continue; }

    const note = `Shopify order ${p.source_reference}`;
    const enc = encodeURIComponent(email);
    const body = JSON.stringify({ amount: p.amount, ...(GRIT && { realmPointId: GRIT }) });
    let result;
    // 1) email-type credential (account or ghost)
    const f = await drip(`/realms/${REALM}/credentials/find?type=email&value=${enc}`);
    const fc = f.body?.data || f.body;
    if (f.status === 200 && fc?.accountId) {
      result = await drip(`/realms/${REALM}/members/${fc.accountId}/balance`, { method: 'PATCH', body: JSON.stringify({ amount: p.amount, note, ...(GRIT && { realmPointId: GRIT }) }) });
      result.path = 'account(email)';
    } else if (f.status === 200) {
      result = await drip(`/realms/${REALM}/credentials/balance?type=email&value=${enc}`, { method: 'PATCH', body });
      result.path = 'ghost(email)';
    } else {
      // 2) custom credential with source=email (what POST /credentials/social provider=email creates)
      let c = await drip(`/realms/${REALM}/credentials/find?type=custom&source=email&value=${enc}`);
      if (c.status === 404) {
        const created = await drip(`/realms/${REALM}/credentials/social`, { method: 'POST', body: JSON.stringify({ provider: 'email', providerId: email, username: email.split('@')[0] }) });
        console.log(`  create credential: ${created.status}`);
        c = await drip(`/realms/${REALM}/credentials/find?type=custom&source=email&value=${enc}`);
      }
      const cc = c.body?.data || c.body;
      if (c.status === 200 && cc?.accountId) {
        result = await drip(`/realms/${REALM}/members/${cc.accountId}/balance`, { method: 'PATCH', body: JSON.stringify({ amount: p.amount, note, ...(GRIT && { realmPointId: GRIT }) }) });
        result.path = 'account(custom/email)';
      } else {
        result = await drip(`/realms/${REALM}/credentials/balance?type=custom&source=email&value=${enc}`, { method: 'PATCH', body });
        result.path = 'ghost(custom/email)';
      }
    }

    if (result.status >= 200 && result.status < 300) {
      console.log(`order ${p.source_reference}: PAID ${p.amount} GRIT to ${mask(email)} via ${result.path} -> ${result.status} ${JSON.stringify(result.body).split(email).join(mask(email)).slice(0, 200)}`);
    } else {
      await sb(`grit_transactions?id=eq.${p.id}`, { method: 'PATCH', body: JSON.stringify({ claimed: false, claimed_at: null }) });
      console.log(`order ${p.source_reference}: FAILED via ${result.path} -> ${result.status} ${JSON.stringify(result.body).slice(0, 300)} (left pending)`);
    }
  }
}
