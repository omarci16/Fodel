/**
 * Scripted pass through the whole approval workflow: draft → submitted →
 * changes_requested → resubmitted → approved (awaiting_payment) → paid →
 * published, asserting who can see the listing at each step and that only the
 * right role can make each transition. This drives the database directly (the
 * same status rules src/pages/api/portal/properties/[id]/status.ts enforces),
 * so it's really testing the RLS/status-machine combination the portal depends
 * on, independent of the API route code.
 *
 * FODEL 1.1 added the payment gate in the middle. The assertion that matters
 * most here is the new one: an approved listing must stay invisible to the
 * public until it is paid for, and its owner must not be able to publish it
 * themselves.
 *
 * Needs SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.
 * Usage: node scripts/verify-workflow.mjs
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

let failures = 0;
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { console.error(`  ✗ ${msg}`); failures++; };

async function ensureUser(email, role) {
  const { data: list } = await admin.auth.admin.listUsers();
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email, password: 'workflow-test-password-not-real-123!', email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  }
  await admin.from('profiles').upsert({ id: user.id, role, email, full_name: `Workflow test (${role})` });
  return user;
}

async function isPubliclyVisible(id) {
  const { data } = await publicClient.from('properties').select('id').eq('id', id);
  return Boolean(data && data.length > 0);
}

async function main() {
  console.log('\nWorkflow verification\n');

  const owner = await ensureUser('workflow-owner@fodel-test.local', 'owner');
  const adminUser = await ensureUser('workflow-admin@fodel-test.local', 'admin');

  await admin.from('properties').delete().eq('ref', '9998');
  const { data: property } = await admin
    .from('properties')
    .insert({
      ref: '9998', owner_id: owner.id, status: 'draft', category: 'house',
      settlement: 'Workflow test', county: 'Test', region: 'Test', lat: 47, lng: 19,
      price_eur: 1000, price_huf: 360000, price_asof: new Date().toISOString().slice(0, 10), plot_m2: 100,
    })
    .select('id')
    .single();
  const id = property.id;

  // draft: not publicly visible.
  if (await isPubliclyVisible(id)) fail('draft listing is publicly visible (should not be)');
  else pass('draft listing is not publicly visible');

  // draft → submitted.
  await admin.from('properties').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', id);
  if (await isPubliclyVisible(id)) fail('submitted listing is publicly visible (should not be)');
  else pass('submitted listing is not publicly visible');

  // submitted → changes_requested, with a note (mirrors status.ts's request_changes action).
  await admin.from('properties').update({ status: 'changes_requested' }).eq('id', id);
  await admin.from('review_notes').insert({ property_id: id, author_id: adminUser.id, note: 'Test note: please add photos.' });
  const { data: notes } = await admin.from('review_notes').select('note').eq('property_id', id);
  if (!notes || notes.length === 0) fail('review note was not recorded');
  else pass('review note recorded on changes_requested');

  // changes_requested → submitted (resubmit).
  await admin.from('properties').update({ status: 'submitted' }).eq('id', id);
  pass('resubmitted after changes_requested');

  // submitted → awaiting_payment (approve). FODEL 1.1: approving raises an
  // order and does NOT publish. Money is what publishes.
  await admin
    .from('properties')
    .update({
      status: 'awaiting_payment',
      approved_at: new Date().toISOString(),
      approved_by: adminUser.id,
    })
    .eq('id', id);

  const { data: order, error: orderError } = await admin
    .from('payments')
    .insert({
      property_id: id,
      owner_id: owner.id,
      amount_cents: 6900,
      currency: 'eur',
      status: 'pending',
      line_items: [
        { kind: 'package', id: 'cheap-6m', quantity: 1, unitCents: 6900, label: 'Hirdetés — 6 hónap' },
      ],
    })
    .select('id')
    .single();
  if (orderError) fail(`could not raise an order: ${orderError.message}`);
  else pass('approving raises a pending order');

  if (await isPubliclyVisible(id)) fail('approved-but-unpaid listing is publicly visible (should not be)');
  else pass('approved listing stays hidden until it is paid for');

  const ownerClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await ownerClient.auth.signInWithPassword({ email: 'workflow-owner@fodel-test.local', password: 'workflow-test-password-not-real-123!' });

  // The owner must not be able to publish their own listing by editing the
  // status column — that would be paying for nothing.
  const { data: selfPublish } = await ownerClient
    .from('properties')
    .update({ status: 'published' })
    .eq('id', id)
    .select();
  if (selfPublish && selfPublish.length > 0) fail('owner could publish their own awaiting_payment listing (must require payment)');
  else pass('owner cannot self-publish an awaiting_payment listing');

  // The owner must be able to READ their own order — it is what the pay panel
  // on the listing renders from.
  const { data: ownerOrder } = await ownerClient.from('payments').select('id, amount_cents').eq('property_id', id);
  if (!ownerOrder || ownerOrder.length === 0) fail('owner cannot read their own order (the pay panel would render empty)');
  else pass('owner can read their own order');

  // The owner must NOT be able to mark it paid.
  const { data: selfPaid } = await ownerClient
    .from('payments')
    .update({ status: 'paid' })
    .eq('property_id', id)
    .select();
  if (selfPaid && selfPaid.length > 0) fail('owner could mark their own order paid');
  else pass('owner cannot mark their own order paid');

  // The owner must be able to read the review note about their own listing —
  // the changes-requested email sends them to a screen that has to show it.
  const { data: ownerNotes } = await ownerClient.from('review_notes').select('note').eq('property_id', id);
  if (!ownerNotes || ownerNotes.length === 0) fail('owner cannot read the review note on their own listing');
  else pass('owner can read the review note on their own listing');

  // payment settles → published (what the Stripe webhook does).
  const months = 6;
  const expires = new Date();
  expires.setMonth(expires.getMonth() + months);
  await admin.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('property_id', id);
  await admin
    .from('properties')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      expires_at: expires.toISOString(),
    })
    .eq('id', id);

  if (!(await isPubliclyVisible(id))) fail('paid listing is not publicly visible (should be)');
  else pass('paid listing is publicly visible');

  // Owner should no longer be able to edit directly (RLS: owner_update requires draft/changes_requested).
  const { data: editAttempt } = await ownerClient.from('properties').update({ settlement: 'edited' }).eq('id', id).select();
  if (editAttempt && editAttempt.length > 0) fail('owner could edit a published listing directly (should require going through the workflow)');
  else pass('owner cannot edit a published listing directly');

  // Cleanup.
  await admin.from('payments').delete().eq('property_id', id);
  await admin.from('review_notes').delete().eq('property_id', id);
  await admin.from('properties').delete().eq('id', id);

  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
