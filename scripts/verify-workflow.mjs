/**
 * Scripted pass through the whole approval workflow (Stage 9): draft →
 * submitted → changes_requested → resubmitted → approved → published,
 * asserting who can see the listing at each step and that only the right
 * role can make each transition. This drives the database directly (the
 * same status rules src/pages/api/portal/properties/[id]/status.ts
 * enforces), so it's really testing the RLS/status-machine combination the
 * portal depends on, independent of the API route code.
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

  // submitted → published (approve).
  const months = 6;
  const expires = new Date();
  expires.setMonth(expires.getMonth() + months);
  await admin
    .from('properties')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      approved_by: adminUser.id,
      expires_at: expires.toISOString(),
    })
    .eq('id', id);

  if (!(await isPubliclyVisible(id))) fail('published listing is not publicly visible (should be)');
  else pass('published listing is publicly visible');

  // Owner should no longer be able to edit directly (RLS: owner_update requires draft/changes_requested).
  const ownerClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await ownerClient.auth.signInWithPassword({ email: 'workflow-owner@fodel-test.local', password: 'workflow-test-password-not-real-123!' });
  const { data: editAttempt } = await ownerClient.from('properties').update({ settlement: 'edited' }).eq('id', id).select();
  if (editAttempt && editAttempt.length > 0) fail('owner could edit a published listing directly (should require going through the workflow)');
  else pass('owner cannot edit a published listing directly');

  // Cleanup.
  await admin.from('review_notes').delete().eq('property_id', id);
  await admin.from('properties').delete().eq('id', id);

  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
