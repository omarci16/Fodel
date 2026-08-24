-- FODEL 1.0 — initial schema.
--
-- How to run this: open your Supabase project → SQL Editor → New query →
-- paste this whole file → Run. Then run 0002_seed_properties.sql the same way.
--
-- This is the full data model from the build plan (profiles, invites,
-- properties, translations, media, review notes, enquiries, search requests,
-- payments), even though Stage 1 only populates and reads `properties`,
-- `property_translations` and `property_media`. The rest exists now so later
-- stages (portal, approvals, Stripe) don't need another schema migration.
--
-- Row-Level Security is the actual security boundary here, not app code —
-- every table below has RLS enabled and explicit policies. The public website
-- talks to Supabase with the low-privilege "anon" key, which can only ever
-- see what these policies allow.

create extension if not exists pgcrypto;

/* ── Enums ──────────────────────────────────────────────────────────────── */

create type user_role as enum ('admin', 'owner');

-- The spine from the build plan: draft → submitted → published → sold |
-- archived, with changes_requested as the loop back to submitted.
-- `published` is the only status the public site (anon key) can read.
create type property_status as enum (
  'draft', 'submitted', 'changes_requested', 'published', 'sold', 'archived'
);

create type property_category as enum (
  'house', 'holiday', 'farm', 'land', 'commercial', 'agricultural', 'mansion', 'apartment'
);

create type epc_class as enum (
  'AA++', 'AA+', 'AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'II', 'JJ', 'pending', 'exempt'
);

create type listing_package as enum ('cheap-6m', 'normal-12m');

create type location_precision as enum ('exact', 'approximate');

create type locale_code as enum ('hu', 'nl', 'de', 'en', 'fr');

/* ── profiles ───────────────────────────────────────────────────────────── */
-- One row per authenticated user (admin or seller), keyed to Supabase Auth.
-- Created by Stage 2 (auth) — the table exists now so `properties.owner_id`
-- and the RLS policies below have something to reference.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'owner',
  full_name text,
  phone text,
  email text not null,
  locale locale_code not null default 'hu',
  created_at timestamptz not null default now()
);

/* ── invites ────────────────────────────────────────────────────────────── */
-- Single-use, expiring, hashed tokens for inviting a seller into the portal.
-- Built and used starting Stage 5.

create table invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  role user_role not null default 'owner',
  invited_by uuid references profiles (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

/* ── properties ─────────────────────────────────────────────────────────── */

create table properties (
  id uuid primary key default gen_random_uuid(),

  -- FODEL's own reference number, quoted on the phone and in the old site's
  -- URLs (#1550). Matches the 3–6 digit shape enforced by the old content
  -- schema.
  ref text not null unique check (ref ~ '^\d{3,6}$'),

  owner_id uuid references profiles (id),
  status property_status not null default 'draft',

  -- Set once a published listing goes under offer. Distinct from `status`
  -- because "reserved" is not a workflow state — the listing is still
  -- published, just temporarily off the market. Only meaningful when
  -- status = 'published'.
  reserved boolean not null default false,

  category property_category not null,

  -- Hungary only at launch (client decision). The column exists and defaults
  -- correctly so a future market doesn't need a migration — the UI has no
  -- country filter and never shows this.
  country text not null default 'HU',

  settlement text not null,
  county text not null,
  region text not null,
  lat double precision not null check (lat between 45.7 and 48.6),
  lng double precision not null check (lng between 16 and 22.9),
  precision location_precision not null default 'approximate',

  price_eur integer not null check (price_eur > 0),
  price_huf integer not null check (price_huf > 0),
  price_asof date not null,
  price_negotiable boolean not null default false,

  floor_m2 numeric check (floor_m2 > 0),
  plot_m2 numeric not null check (plot_m2 > 0),

  bedrooms integer check (bedrooms >= 0),
  bathrooms integer check (bathrooms >= 0),

  year_built integer check (year_built between 1500 and 2100),
  renovated_in integer check (renovated_in between 1900 and 2100),
  epc_class epc_class not null default 'pending',

  features text[] not null default '{}',
  video_url text,

  seller_contact_visible boolean not null default false,
  seller_name text,
  seller_phone text,
  seller_speaks text[] not null default '{}',

  package listing_package not null default 'cheap-6m',
  featured boolean not null default false,
  homepage_featured boolean not null default false,
  homepage_order integer not null default 99,

  published_at timestamptz,
  expires_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references profiles (id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_status_idx on properties (status);
create index properties_owner_idx on properties (owner_id);
create index properties_region_idx on properties (region);
create index properties_category_idx on properties (category);

/* ── property_translations ─────────────────────────────────────────────── */
-- Hungarian always exists; the other four locales exist only once the seller
-- has paid the €25/language upsell. Condition, heating and the editorial tag
-- are localised text the same way title/description are — not fixed-vocabulary
-- fields — so they live here alongside them rather than as plain columns.

create table property_translations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  locale locale_code not null,

  title text not null,
  subtitle text,
  description text not null,
  -- The longer prose below the summary (the old Markdown body).
  body text not null default '',
  condition text,
  heating text,
  tag text,
  -- Reserved for a future custom-slug feature; unused by routing today, which
  -- still derives the URL from category + ref.
  slug text,

  unique (property_id, locale)
);

create index property_translations_property_idx on property_translations (property_id);

/* ── property_media ─────────────────────────────────────────────────────── */
-- `storage_path` is a real Supabase Storage path once Stage 3's uploader
-- exists. For the six seeded demo listings it is just the filename of an
-- image already checked into src/assets/properties/.

create table property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  storage_path text not null,
  -- Derivative sizes/formats, written by the Stage 3 sharp pipeline. Unused
  -- until then.
  variants jsonb,
  alt jsonb not null default '{}'::jsonb,
  label jsonb,
  sort_order integer not null default 0,
  is_hero boolean not null default false
);

create index property_media_property_idx on property_media (property_id);

/* ── review_notes ───────────────────────────────────────────────────────── */
-- An admin's note on a submission, shown to the seller when status moves to
-- changes_requested. Built in Stage 4.

create table review_notes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  author_id uuid not null references profiles (id),
  note text not null,
  created_at timestamptz not null default now()
);

/* ── enquiries ──────────────────────────────────────────────────────────── */
-- Property-page enquiry form submissions. The public site already has this
-- form (posts to /api/enquiry via Resend); this table is where Stage 4 wires
-- that endpoint to also persist a durable copy for the owner and FODEL to see
-- in the portal.

create table enquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  message text,
  locale locale_code not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

/* ── search_requests ────────────────────────────────────────────────────── */
-- The free "Kerestetés / Zoekdienst" lead-magnet form.

create table search_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  type text,
  region text,
  budget_min integer,
  budget_max integer,
  requirements text,
  locale locale_code not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

/* ── payments ───────────────────────────────────────────────────────────── */
-- Stripe plumbing, behind STRIPE_ENABLED=false per the client decision. Bank
-- transfer is the live flow; this table is inert until Stage 8.

create table payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties (id) on delete set null,
  stripe_session_id text unique,
  amount_cents integer not null,
  currency text not null default 'eur',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

/* ── updated_at trigger ────────────────────────────────────────────────── */

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger properties_set_updated_at
  before update on properties
  for each row execute function set_updated_at();

/* ── Row-Level Security ────────────────────────────────────────────────── */

alter table profiles enable row level security;
alter table invites enable row level security;
alter table properties enable row level security;
alter table property_translations enable row level security;
alter table property_media enable row level security;
alter table review_notes enable row level security;
alter table enquiries enable row level security;
alter table search_requests enable row level security;
alter table payments enable row level security;

-- SECURITY DEFINER so the policies below can check "is this user an admin?"
-- without RLS on `profiles` recursively blocking the check itself.
create function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- profiles: a user reads their own row; an admin reads everyone's.
create policy profiles_select_own on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_update_own on profiles
  for update using (id = auth.uid() or is_admin());
create policy profiles_admin_all on profiles
  for all using (is_admin());

-- properties: anyone (including the public anon key) reads published or sold
-- listings — sold ones stay visible for the "Eladva" archive. An owner reads
-- and writes their own rows only while still editable (draft or changes
-- requested) — once submitted, only an admin may change status. Admins can
-- do everything.
create policy properties_public_read on properties
  for select using (status in ('published', 'sold'));

create policy properties_owner_read on properties
  for select using (owner_id = auth.uid());

create policy properties_owner_write on properties
  for insert with check (owner_id = auth.uid());

create policy properties_owner_update on properties
  for update
  using (owner_id = auth.uid() and status in ('draft', 'changes_requested'))
  with check (owner_id = auth.uid() and status in ('draft', 'submitted', 'changes_requested'));

create policy properties_owner_delete on properties
  for delete using (owner_id = auth.uid() and status = 'draft');

create policy properties_admin_all on properties
  for all using (is_admin());

-- property_translations / property_media: inherit the parent property's rule
-- by joining back to it — there is no separate ownership concept here.
create policy property_translations_read on property_translations
  for select using (
    exists (
      select 1 from properties p
      where p.id = property_translations.property_id
        and (p.status in ('published', 'sold') or p.owner_id = auth.uid() or is_admin())
    )
  );
create policy property_translations_write on property_translations
  for insert with check (
    exists (
      select 1 from properties p
      where p.id = property_translations.property_id
        and (p.owner_id = auth.uid() or is_admin())
    )
  );
create policy property_translations_update on property_translations
  for update using (
    exists (
      select 1 from properties p
      where p.id = property_translations.property_id
        and (p.owner_id = auth.uid() or is_admin())
    )
  );
create policy property_translations_delete on property_translations
  for delete using (
    exists (
      select 1 from properties p
      where p.id = property_translations.property_id
        and (p.owner_id = auth.uid() or is_admin())
    )
  );

create policy property_media_read on property_media
  for select using (
    exists (
      select 1 from properties p
      where p.id = property_media.property_id
        and (p.status in ('published', 'sold') or p.owner_id = auth.uid() or is_admin())
    )
  );
create policy property_media_write on property_media
  for insert with check (
    exists (
      select 1 from properties p
      where p.id = property_media.property_id
        and (p.owner_id = auth.uid() or is_admin())
    )
  );
create policy property_media_update on property_media
  for update using (
    exists (
      select 1 from properties p
      where p.id = property_media.property_id
        and (p.owner_id = auth.uid() or is_admin())
    )
  );
create policy property_media_delete on property_media
  for delete using (
    exists (
      select 1 from properties p
      where p.id = property_media.property_id
        and (p.owner_id = auth.uid() or is_admin())
    )
  );

-- invites, payments, review_notes: admin only, full stop.
create policy invites_admin_only on invites for all using (is_admin());
create policy payments_admin_only on payments for all using (is_admin());
create policy review_notes_admin_only on review_notes for all using (is_admin());

-- enquiries / search_requests: anyone may create one (the public forms use
-- the anon key), but only an admin — or the property's owner, for enquiries
-- about their own listing — may read them back.
create policy enquiries_insert_public on enquiries for insert with check (true);
create policy enquiries_read on enquiries
  for select using (
    is_admin() or exists (
      select 1 from properties p where p.id = enquiries.property_id and p.owner_id = auth.uid()
    )
  );

create policy search_requests_insert_public on search_requests for insert with check (true);
create policy search_requests_admin_read on search_requests for select using (is_admin());
