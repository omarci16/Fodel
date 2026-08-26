-- FODEL 1.1 — pay-after-approval, self-service registration, password reset.
--
-- How to run this: Supabase → SQL Editor → New query. Run it in TWO steps,
-- in this order. The file is split by the marker below because PostgreSQL
-- refuses to use a newly-added enum value inside the same transaction that
-- added it — a single paste of the whole file fails with
-- "unsafe use of new value 'awaiting_payment' of enum type property_status".
--
-- ══ STEP 1 ══ Run this statement ON ITS OWN, then continue to step 2.

alter type property_status add value if not exists 'awaiting_payment' after 'submitted';

-- ══ STEP 2 ══ Run everything below this line.

/* ── invites.payload ────────────────────────────────────────────────────── */
-- FODEL 1.1's self-service front door. Someone fills in the public ad form;
-- instead of an email to the office and nothing else, we write an invite here
-- and stash their answers. When they click the link in their inbox and set a
-- password, those answers become a pre-filled draft listing — so they land
-- inside their half-written ad instead of an empty dashboard.
--
-- Why an invite rather than creating the account outright: the token proves
-- the person actually controls that mailbox. An unauthenticated endpoint that
-- creates accounts lets anyone register under someone else's address. This
-- reuses the hashed-token mechanism that already exists and is already tested.
alter table invites add column if not exists payload jsonb;

/* ── payments becomes an order ──────────────────────────────────────────── */
-- 1.0 treated this as a single amount against a property. 1.1 needs the
-- itemisation: a package plus any extras (translations at €25/language, video
-- €36, homepage highlight €25/month…), assembled by an admin during review and
-- then charged as one payment.
--
-- line_items shape — an array of:
--   { kind: 'package'|'extra', id: text, quantity: int, unitCents: int, label: text }
-- Denormalised on purpose: an order is a financial record and must still read
-- correctly years later, even after the price list in src/config/company.ts
-- has changed. Never re-derive a historical total from today's catalogue.
alter table payments add column if not exists line_items jsonb not null default '[]'::jsonb;
alter table payments add column if not exists owner_id uuid references profiles (id);
alter table payments add column if not exists paid_at timestamptz;
alter table payments add column if not exists updated_at timestamptz not null default now();

-- 'manual' is a real, expected outcome, not an edge case: FODEL's published
-- process is bank transfer, and that stays live alongside card payment. An
-- admin publishing a listing whose money arrived by transfer records the order
-- as 'manual' so the books still balance.
alter table payments drop constraint if exists payments_status_check;
alter table payments add constraint payments_status_check
  check (status in ('pending', 'paid', 'manual', 'cancelled'));

create index if not exists payments_property_idx on payments (property_id);
create index if not exists payments_owner_idx on payments (owner_id);

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

/* ── password_resets ────────────────────────────────────────────────────── */
-- Deliberately the same design as `invites`: a cryptographically random token
-- that is hashed before it touches the database, single-use, and expiring. A
-- database leak alone therefore cannot be used to take over an account.
--
-- Not using Supabase's own resetPasswordForEmail: it sends Supabase's
-- template, which is unbranded and English. Every other message FODEL sends is
-- branded and in the reader's language; a password reset — the one email most
-- likely to be mistaken for phishing — is the worst possible place to break
-- that pattern.
create table if not exists password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_resets_user_idx on password_resets (user_id);

alter table password_resets enable row level security;

-- No policy grants anyone access. Reads and writes happen exclusively through
-- the service-role key inside the two API routes that own this flow, because
-- the person using it is by definition not signed in. An empty policy set on
-- an RLS-enabled table means "deny all" for anon and authenticated alike —
-- that is the intent here, not an oversight.

/* ── payments: let an owner see their own invoice ───────────────────────── */
-- 1.0 made payments strictly admin-only, which was right when the table was
-- inert. Now an owner has to be able to see what they owe and what they paid.
-- Read only: creating and settling an order stays with admins and the Stripe
-- webhook (which uses the service-role key and bypasses RLS entirely).
drop policy if exists payments_admin_only on payments;

create policy payments_admin_all on payments
  for all using (is_admin());

create policy payments_owner_read on payments
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from properties p
      where p.id = payments.property_id and p.owner_id = auth.uid()
    )
  );

/* ── review_notes: let the owner read the note about their own listing ──── */
-- A real 1.0 bug found during the 1.1 audit. The changes-requested email
-- quotes the admin's note, so the owner does see it once — but the portal
-- screen they are sent to cannot read it back, because this table was
-- admin-only. "Go to the portal and fix it" followed by a page that won't
-- tell them what to fix.
drop policy if exists review_notes_admin_only on review_notes;

create policy review_notes_admin_all on review_notes
  for all using (is_admin());

create policy review_notes_owner_read on review_notes
  for select using (
    exists (
      select 1 from properties p
      where p.id = review_notes.property_id and p.owner_id = auth.uid()
    )
  );

/* ── properties: awaiting_payment is not owner-editable ─────────────────── */
-- No change is needed to properties_owner_update — it already restricts
-- editing to draft/changes_requested, so awaiting_payment is excluded by
-- construction, exactly like submitted. Recorded here explicitly because it
-- is load-bearing: it is what stops an owner from editing the listing after
-- an admin approved it but before they have paid for it, and what stops them
-- from setting status = 'published' themselves. `npm run verify:rls` asserts it.
