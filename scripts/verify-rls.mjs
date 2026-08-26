/**
 * The single most important new test (Stage 9): proves that Row-Level
 * Security — not application code — is what actually stops one seller from
 * reading, editing or deleting another seller's listings, and stops a
 * non-admin from reaching admin-only tables. This talks to Supabase
 * directly with the anon key, signed in as two real test accounts, so it is
 * testing the database's own rules, not this codebase's judgement about
 * what the database's rules probably are.
 *
 * Needs SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in
 * .env. Creates two throwaway accounts (owner-a@fodel-test.local,
 * owner-b@fodel-test.local) if they don't already exist, and cleans up the
 * property it creates for the test. Safe to re-run.
 *
 * Usage: node scripts/verify-rls.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error('Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env before running this.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { console.error(`  ✗ ${msg}`); failures++; };

async function ensureTestUser(email, password) {
  const { data: list } = await admin.auth.admin.listUsers();
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
    await admin.from('profiles').insert({ id: user.id, role: 'owner', email, full_name: 'RLS test account' });
  }
  return user;
}

async function signInAs(email, password) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function main() {
  console.log('\nRLS verification\n');

  const PASSWORD = 'rls-test-password-not-real-123!';
  const ownerA = await ensureTestUser('owner-a@fodel-test.local', PASSWORD);
  await ensureTestUser('owner-b@fodel-test.local', PASSWORD);

  // Clean up any leftover test property from a previous run.
  await admin.from('properties').delete().eq('ref', '9999');

  const { data: property, error: createError } = await admin
    .from('properties')
    .insert({
      ref: '9999',
      owner_id: ownerA.id,
      status: 'draft',
      category: 'house',
      settlement: 'RLS test',
      county: 'Test',
      region: 'Test',
      lat: 47,
      lng: 19,
      price_eur: 1000,
      price_huf: 360000,
      price_asof: new Date().toISOString().slice(0, 10),
      plot_m2: 100,
    })
    .select('id')
    .single();
  if (createError) throw createError;
  const propertyId = property.id;

  const clientB = await signInAs('owner-b@fodel-test.local', PASSWORD);

  // 1. Owner B must not be able to read owner A's draft property.
  const { data: readAttempt } = await clientB.from('properties').select('id').eq('id', propertyId);
  if (readAttempt && readAttempt.length > 0) fail('owner B could read owner A\'s draft property');
  else pass('owner B cannot read owner A\'s draft property');

  // 2. Owner B must not be able to update it.
  const { error: updateError, data: updateData } = await clientB
    .from('properties')
    .update({ settlement: 'hijacked' })
    .eq('id', propertyId)
    .select();
  if (updateData && updateData.length > 0) fail('owner B could update owner A\'s property');
  else pass('owner B cannot update owner A\'s property' + (updateError ? '' : ' (silently affected 0 rows, as RLS does)'));

  // 3. Owner B must not be able to delete it.
  const { data: deleteData } = await clientB.from('properties').delete().eq('id', propertyId).select();
  if (deleteData && deleteData.length > 0) fail('owner B could delete owner A\'s property');
  else pass('owner B cannot delete owner A\'s property');

  // 4. Owner B must not be able to read owner A's profile (email, phone).
  const { data: profileAttempt } = await clientB.from('profiles').select('email').eq('id', ownerA.id);
  if (profileAttempt && profileAttempt.length > 0) fail('owner B could read owner A\'s profile');
  else pass('owner B cannot read owner A\'s profile');

  // 5. Owner B must not be able to read the admin-only invites table.
  const { data: invitesAttempt } = await clientB.from('invites').select('id');
  if (invitesAttempt && invitesAttempt.length > 0) fail('owner B (non-admin) could read the invites table');
  else pass('owner B (non-admin) cannot read the invites table');

  // 6. FODEL 1.1 — one owner must not see another's order. `payments` gained
  // an owner-read policy so a seller can see what they owe; the risk that
  // introduces is that it reads *everyone's*, which is FODEL's commercial data.
  const { data: orderA } = await admin
    .from('payments')
    .insert({
      property_id: propertyId,
      owner_id: ownerA.id,
      amount_cents: 12900,
      currency: 'eur',
      status: 'pending',
      line_items: [{ kind: 'package', id: 'normal-12m', quantity: 1, unitCents: 12900, label: 'test' }],
    })
    .select('id')
    .single();

  const { data: paymentsAttempt } = await clientB.from('payments').select('id, amount_cents');
  if (paymentsAttempt && paymentsAttempt.length > 0) fail("owner B could read owner A's orders");
  else pass("owner B cannot read owner A's orders");

  // 7. And must not be able to settle one.
  const { data: paidAttempt } = await clientB
    .from('payments')
    .update({ status: 'paid' })
    .eq('id', orderA.id)
    .select();
  if (paidAttempt && paidAttempt.length > 0) fail("owner B could mark an order paid");
  else pass('owner B cannot mark an order paid');

  // 8. review_notes opened to owners in 1.1 — same question, same risk.
  await admin.from('review_notes').insert({
    property_id: propertyId,
    author_id: ownerA.id,
    note: 'RLS test note',
  });
  const { data: notesAttempt } = await clientB.from('review_notes').select('note');
  if (notesAttempt && notesAttempt.length > 0) fail("owner B could read review notes on owner A's listing");
  else pass("owner B cannot read review notes on owner A's listing");

  // 9. password_resets is service-role only — no signed-in user may read it,
  // because a readable reset token is an account takeover.
  const { data: resetAttempt } = await clientB.from('password_resets').select('token_hash');
  if (resetAttempt && resetAttempt.length > 0) fail('a signed-in user could read password_resets');
  else pass('password_resets is unreadable to signed-in users');

  // 10. Once published, the SAME property must become publicly readable —
  // proves the policy is a real status-based gate, not just "always deny".
  await admin.from('properties').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', propertyId);
  const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: publicRead } = await publicClient.from('properties').select('id').eq('id', propertyId);
  if (!publicRead || publicRead.length === 0) fail('published property is not publicly readable (over-restrictive policy)');
  else pass('published property IS publicly readable — the gate is status-based, not a blanket deny');

  // Cleanup.
  await admin.from('payments').delete().eq('property_id', propertyId);
  await admin.from('review_notes').delete().eq('property_id', propertyId);
  await admin.from('properties').delete().eq('id', propertyId);

  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
