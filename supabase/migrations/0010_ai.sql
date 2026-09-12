-- FODEL 1.2 — AI valuation + description rewrite, both behind a human
-- approval gate. See src/lib/ai/client.ts.
--
-- How to run this: Supabase → SQL Editor → New query → paste this whole file
-- → Run.

/* ── valuations ──────────────────────────────────────────────────────────── */
-- One row per estimate request, whichever of the two surfaces it came from:
-- the public lead-magnet form (property_id null, contact_* filled) or an
-- admin re-pricing an existing listing from its review screen (property_id
-- set, contact_* null — the owner's own profile has that already).
create table if not exists valuations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties (id) on delete set null,
  source text not null check (source in ('public_lead', 'admin_review')),

  -- The facts the estimate was actually run against — copied in rather than
  -- joined, so a later edit to the property (or a public lead with no
  -- property at all) never silently changes what this row means.
  category text not null,
  county text not null,
  region text,
  settlement text,
  floor_m2 numeric,
  plot_m2 numeric,
  condition text,
  year_built integer,

  contact_name text,
  contact_email text,
  contact_phone text,

  -- Cold-start is the normal case with six seeded listings — never a point
  -- estimate from too few comps. status='insufficient_data' below is not an
  -- edge case to handle, it is most of this feature's business value.
  comps jsonb not null default '[]'::jsonb,
  comp_count integer not null default 0,
  median_eur_per_m2 numeric,
  low_eur integer,
  mid_eur integer,
  high_eur integer,

  -- Bounded to [-15, 15] at the call site — see src/lib/ai/valuation.ts.
  -- Null whenever AI_ENABLED is off or the call failed; the deterministic
  -- band above still stands on its own either way.
  ai_adjustment_percent numeric,
  ai_confidence text,
  ai_rationale_hu text,
  ai_rationale_nl text,
  ai_factors jsonb,

  status text not null default 'queued' check (
    status in ('queued', 'insufficient_data', 'needs_review', 'approved', 'rejected')
  ),
  admin_note text,
  reviewed_by uuid references profiles (id) on delete set null,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists valuations_status_idx on valuations (status, created_at desc);
create index if not exists valuations_property_idx on valuations (property_id);

create trigger valuations_set_updated_at
  before update on valuations
  for each row execute function set_updated_at();

alter table valuations enable row level security;
create policy valuations_admin_all on valuations for all using (is_admin());
-- An owner may see a valuation run against their own listing (source =
-- 'admin_review'); a public lead (source = 'public_lead') has no
-- authenticated owner at all and is admin-only by construction.
create policy valuations_owner_read on valuations
  for select using (
    exists (select 1 from properties p where p.id = valuations.property_id and p.owner_id = auth.uid())
  );

/* ── ai_suggestions ──────────────────────────────────────────────────────── */
-- The description-rewrite half. One row per (property, locale) rewrite
-- request — a seller can ask again after editing, which supersedes the
-- previous pending row rather than leaving two live suggestions.
create table if not exists ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  locale locale_code not null,

  original jsonb not null,
  suggested jsonb not null,
  issues jsonb not null default '[]'::jsonb,

  status text not null default 'pending' check (status in ('pending', 'accepted', 'accepted_edited', 'rejected')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_suggestions_property_idx on ai_suggestions (property_id, locale);

create trigger ai_suggestions_set_updated_at
  before update on ai_suggestions
  for each row execute function set_updated_at();

alter table ai_suggestions enable row level security;
create policy ai_suggestions_admin_all on ai_suggestions for all using (is_admin());
create policy ai_suggestions_owner_all on ai_suggestions
  for all using (
    exists (select 1 from properties p where p.id = ai_suggestions.property_id and p.owner_id = auth.uid())
  );
