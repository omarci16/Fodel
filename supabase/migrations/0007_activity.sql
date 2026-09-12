-- FODEL 1.2 — the admin "Database": an append-only activity log.
--
-- How to run this: Supabase → SQL Editor → New query → paste this whole file
-- → Run. No enum values are added, so no two-step split is needed.

/* ── activity_events ─────────────────────────────────────────────────────── */
-- One wide table, not a query-time UNION of enquiries/search_requests/payments/
-- properties/auth events: it is the only shape that stays sortable and
-- filterable across event kinds in one round trip, and it survives a row
-- being deleted from `properties` (property_id is ON DELETE SET NULL, not
-- CASCADE — the log outlives the listing it was about).
create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  kind text not null,
  actor_id uuid references profiles (id) on delete set null,
  actor_email text,
  subject_type text,
  subject_id text,
  property_id uuid references properties (id) on delete set null,
  locale locale_code,
  source text,
  payload jsonb not null default '{}'::jsonb,

  -- Carries the Stripe event.id when a row is written from the webhook, so a
  -- retried delivery cannot write "listing.published" twice for one payment.
  -- Nullable + unique: most rows have no dedupe concern at all.
  dedupe_key text unique
);

create index if not exists activity_events_occurred_at_idx on activity_events (occurred_at desc);
create index if not exists activity_events_kind_idx on activity_events (kind, occurred_at desc);
create index if not exists activity_events_property_idx on activity_events (property_id);
-- lower(email) so an Art. 17 erasure request ("delete everything under this
-- address") and the people view's own lookup are both a plain equality scan,
-- not a case-insensitive table scan.
create index if not exists activity_events_actor_email_idx on activity_events (lower(actor_email));
create index if not exists activity_events_payload_idx on activity_events using gin (payload);

alter table activity_events enable row level security;
create policy activity_events_admin_only on activity_events for all using (is_admin());
-- No insert policy for anon/authenticated: every write goes through
-- src/lib/activity.ts with the service-role client, same posture as `invites`.

/* ── enquiries: the two indexes and the column the plan calls out ────────── */
alter table enquiries add column if not exists handled_at timestamptz;
create index if not exists enquiries_created_at_idx on enquiries (created_at desc);
create index if not exists enquiries_property_idx on enquiries (property_id);

/* ── GDPR retention ──────────────────────────────────────────────────────── */
-- Documented, not scheduled — same posture as the migrations themselves (run
-- by hand). Twenty-four months matches the note added to
-- src/data/pages-legal.ts. No raw IPs are ever stored in `payload`.
--
--   delete from activity_events where occurred_at < now() - interval '24 months';
