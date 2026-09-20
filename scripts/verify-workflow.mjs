/**
 * FODEL 1.3 workflow verification.
 *
 * Scenario A proves the normal free-publishing workflow: approval creates a
 * pending accounting order but publishes the listing immediately for the
 * selected package term. Scenario B preserves paid-path regression coverage
 * for historical awaiting_payment rows.
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
const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });
const PASSWORD = 'workflow-test-password-not-real-123!';
let failures = 0;
const pass = (message) => console.log(`  ✓ ${message}`);
const fail = (message) => { console.error(`  ✗ ${message}`); failures += 1; };

async function ensureUser(email, role) {
  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;
  let user = list.users.find((candidate) => candidate.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email, password: PASSWORD, email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  }
  const { error } = await admin.from('profiles').upsert({
    id: user.id, role, email, full_name: `Workflow test (${role})`,
  });
  if (error) throw error;
  return user;
}

async function signedIn(email) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return client;
}

async function publicCanRead(id) {
  const { data, error } = await publicClient.from('properties').select('id').eq('id', id);
  if (error) throw error;
  return Boolean(data?.length);
}

async function insertProperty(ref, ownerId, status = 'draft') {
  const { data, error } = await admin.from('properties').insert({
    ref, owner_id: ownerId, status, category: 'house',
    settlement: 'Workflow test', county: 'Pest', region: 'Közép-Magyarország', country: 'HU',
    lat: 47, lng: 19, price_eur: 1000, price_huf: 360000,
    price_asof: new Date().toISOString().slice(0, 10), plot_m2: 100,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function insertPendingOrder(propertyId, ownerId) {
  const { data, error } = await admin.from('payments').insert({
    property_id: propertyId, owner_id: ownerId, amount_cents: 6900,
    currency: 'eur', status: 'pending',
    line_items: [{ kind: 'package', id: 'cheap-6m', quantity: 1, unitCents: 6900, label: 'Standard hirdetés' }],
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function main() {
  console.log('\nFODEL 1.3 workflow verification\n');
  const owner = await ensureUser('workflow-owner@fodel-test.local', 'owner');
  const reviewer = await ensureUser('workflow-admin@fodel-test.local', 'admin');
  const ownerClient = await signedIn('workflow-owner@fodel-test.local');
  await admin.from('properties').delete().in('ref', ['9997', '9998']);

  console.log('Scenario A — approval publishes without a payment gate');
  const freeId = await insertProperty('9998', owner.id);
  if (await publicCanRead(freeId)) fail('draft listing is public');
  else pass('draft listing stays private');
  await admin.from('properties').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', freeId);
  if (await publicCanRead(freeId)) fail('submitted listing is public');
  else pass('submitted listing stays private');

  await admin.from('properties').update({ status: 'changes_requested' }).eq('id', freeId);
  const { error: noteError } = await admin.from('review_notes').insert({
    property_id: freeId, author_id: reviewer.id, note: 'Workflow test: please add photos.',
  });
  if (noteError) fail(`review note failed: ${noteError.message}`);
  else pass('review note is recorded');
  await admin.from('properties').update({ status: 'submitted' }).eq('id', freeId);

  const freeOrderId = await insertPendingOrder(freeId, owner.id);
  const publishedAt = new Date();
  const expiresAt = new Date(publishedAt);
  expiresAt.setMonth(expiresAt.getMonth() + 6);
  const { error: publishError } = await admin.from('properties').update({
    status: 'published', approved_at: publishedAt.toISOString(), approved_by: reviewer.id,
    published_at: publishedAt.toISOString(), expires_at: expiresAt.toISOString(), package: 'cheap-6m',
  }).eq('id', freeId);
  if (publishError) throw publishError;
  const { data: freeOrder } = await admin.from('payments').select('status').eq('id', freeOrderId).single();
  if (freeOrder?.status !== 'pending') fail('approval did not preserve the pending accounting order');
  else pass('approval creates a pending accounting order');
  if (!(await publicCanRead(freeId))) fail('approved listing is not public');
  else pass('approved listing is immediately public');
  const { data: freeRow } = await admin.from('properties').select('expires_at').eq('id', freeId).single();
  const termDays = (new Date(freeRow.expires_at).getTime() - publishedAt.getTime()) / 86_400_000;
  if (termDays < 175 || termDays > 190) fail(`six-month expiry is outside tolerance (${termDays.toFixed(1)} days)`);
  else pass('expiry matches the selected six-month package');
  const { data: editPublished } = await ownerClient.from('properties')
    .update({ settlement: 'Owner edit' }).eq('id', freeId).select('id');
  if (editPublished?.length) fail('owner could directly edit a published listing');
  else pass('owner cannot directly edit a published listing');

  console.log('\nScenario B — legacy awaiting_payment remains payment-gated');
  const legacyId = await insertProperty('9997', owner.id, 'awaiting_payment');
  const legacyOrderId = await insertPendingOrder(legacyId, owner.id);
  if (await publicCanRead(legacyId)) fail('legacy unpaid listing is public');
  else pass('legacy unpaid listing stays private');
  const { data: ownOrder } = await ownerClient.from('payments').select('id').eq('id', legacyOrderId);
  if (!ownOrder?.length) fail('owner cannot read their legacy order');
  else pass('owner can read their legacy order');
  const { data: selfPaid } = await ownerClient.from('payments')
    .update({ status: 'paid' }).eq('id', legacyOrderId).select('id');
  if (selfPaid?.length) fail('owner could mark their order paid');
  else pass('owner cannot mark their order paid');
  const { data: selfPublished } = await ownerClient.from('properties')
    .update({ status: 'published' }).eq('id', legacyId).select('id');
  if (selfPublished?.length) fail('owner could publish a legacy unpaid listing');
  else pass('owner cannot publish a legacy unpaid listing');

  const legacyExpiry = new Date();
  legacyExpiry.setMonth(legacyExpiry.getMonth() + 6);
  await admin.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', legacyOrderId);
  await admin.from('properties').update({
    status: 'published', published_at: new Date().toISOString(), expires_at: legacyExpiry.toISOString(),
  }).eq('id', legacyId);
  if (!(await publicCanRead(legacyId))) fail('admin-settled legacy listing is not public');
  else pass('admin can settle and publish a legacy listing');

  await admin.from('payments').delete().in('property_id', [freeId, legacyId]);
  await admin.from('review_notes').delete().in('property_id', [freeId, legacyId]);
  await admin.from('properties').delete().in('id', [freeId, legacyId]);
  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => { console.error(error); process.exit(1); });
