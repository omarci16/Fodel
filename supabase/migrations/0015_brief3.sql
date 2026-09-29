-- FODEL 2.2 — development brief 3 (2026-09-29): fodel.eu, the approved
-- Hungarian invite letter, WhatsApp number, on-site services, requested
-- extras, listing-quality settings and valuation 2.0.
--
-- How to run this: Supabase → SQL Editor → New query → paste this whole file
-- → Run. It adds no enum values, so unlike 0005/0014 it is ONE step.
-- Idempotent: running it twice changes nothing the second time, and none of
-- the seeds below overwrites a value an admin has already edited.
-- Requires 0014.

/* ── Company e-mail: fodel.eu (brief 3 §A.5) ─────────────────────────────── */
-- Only while the address is still the one 0012 seeded — an admin's own edit
-- in Beállítások → Cégadatok is never overwritten.
update site_settings
   set emails = jsonb_set(emails, '{primary}', '"info@fodel.eu"')
 where id = 1 and emails->>'primary' = 'info@fodel.nl';

/* ── WhatsApp (brief 3 §C) ───────────────────────────────────────────────── */
-- The number Éva and Gábor supplied; passes 0014's format check.
update site_settings set whatsapp = '+31615282212' where id = 1 and whatsapp is null;

/* ── Hungarian owner invite letter (brief 3 §B) ──────────────────────────── */
-- The body is the client's text, verbatim, with their paragraph breaks. The
-- subject and button text are FODEL-dev proposals awaiting sign-off. Approved
-- rows apply to OWNER invites only; admin invites keep the built-in wording.
-- `do nothing` on conflict: an admin's edit in Beállítások → Meghívólevelek
-- is never overwritten.
insert into email_templates (key, locale, subject, heading, body, cta, approved)
values (
  'invite',
  'hu',
  'Meghívó a FODEL Ingatlan online felületére',
  'Kedves Tulajdonos!',
  'Szeretnénk meghívni Önt a FODEL Ingatlan új online felületére, ahol ingatlanát egyszerűen és gyorsan regisztrálhatja, és lehetőséget biztosíthatunk arra, hogy nemzetközi szinten is meghirdessük.

Célunk, hogy a magyarországi ingatlanokat külföldi, elsősorban holland, német, osztrák és belga érdeklődők számára is láthatóvá tegyük.

Ha szeretné eladni ingatlanát, regisztrálja nálunk, és mi felvesszük Önnel a kapcsolatot a további lehetőségekről.

FODEL Ingatlan – magyar ingatlanok külföldi vevőknek.

Várjuk szeretettel!',
  'Ingatlanom regisztrálása',
  true
)
on conflict (key, locale) do nothing;

/* ── What the owner asked for on the public form (brief 3 item 14) ──────── */
-- Until now only the package survived from the submit form into the draft;
-- highlight, video and translations reached FODEL only in the notification
-- email. Stored as the owner's request, never as an order: the review screen
-- pre-ticks from it and the admin still confirms every line.
-- { source, at, package, translations: ['nl','de'], categoryHighlight,
--   homepageHighlight, video, service }
alter table properties add column if not exists requested_extras jsonb not null default '{}'::jsonb;

/* ── On-site services: requests and their follow-up (brief 3 §F) ─────────── */
-- One row per request for `onsite-media` (€150) or `onsite-visit` (€200).
-- Created the moment it is asked for — on the public form, in the listing
-- editor or on a valuation — with the contact details, so it is never lost
-- even when the person has no account or listing yet. Prices are not stored
-- here: the service is added to the listing's order at approval, from the
-- catalogue in src/config/company.ts (payment timing is still a decision).
create table if not exists service_requests (
  id uuid primary key default gen_random_uuid(),
  service_id text not null check (service_id in ('onsite-media', 'onsite-visit')),
  status text not null default 'requested' check (status in ('requested', 'scheduled', 'done', 'cancelled')),
  source text not null check (source in ('submit_form', 'listing_editor', 'valuation', 'admin')),
  property_id uuid references properties (id) on delete set null,
  valuation_id uuid references valuations (id) on delete set null,
  profile_id uuid references profiles (id) on delete set null,
  contact_name text,
  contact_email text,
  contact_phone text,
  locale locale_code not null default 'hu',
  note text check (note is null or length(note) <= 2000),
  admin_note text,
  scheduled_for date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_status_idx on service_requests (status, created_at desc);
create index if not exists service_requests_property_idx on service_requests (property_id);
create index if not exists service_requests_profile_idx on service_requests (profile_id);
-- The two services are mutually exclusive: one open request per listing.
create unique index if not exists service_requests_one_open_per_property
  on service_requests (property_id) where property_id is not null and status in ('requested', 'scheduled');
create unique index if not exists service_requests_one_open_per_valuation
  on service_requests (valuation_id) where valuation_id is not null and status in ('requested', 'scheduled');

drop trigger if exists service_requests_set_updated_at on service_requests;
create trigger service_requests_set_updated_at
  before update on service_requests
  for each row execute function set_updated_at();

alter table service_requests enable row level security;
drop policy if exists service_requests_admin_all on service_requests;
create policy service_requests_admin_all on service_requests for all using (is_admin());
-- An owner sees their own requests — made under their account, or on a
-- listing they own. Anonymous visitors see nothing.
drop policy if exists service_requests_owner_read on service_requests;
create policy service_requests_owner_read on service_requests
  for select using (
    profile_id = auth.uid()
    or exists (select 1 from properties p where p.id = service_requests.property_id and p.owner_id = auth.uid())
  );
-- An owner may ask for a service on their own listing while it is still
-- editable, and only as a fresh request — scheduling is the office's job.
drop policy if exists service_requests_owner_insert on service_requests;
create policy service_requests_owner_insert on service_requests
  for insert with check (
    profile_id = auth.uid()
    and status = 'requested'
    and source = 'listing_editor'
    and exists (
      select 1 from properties p
      where p.id = service_requests.property_id
        and p.owner_id = auth.uid() and p.status in ('draft', 'changes_requested')
    )
  );

/* ── Valuation 2.0 facts and dated baseline ─────────────────────────────── */
alter table valuations add column if not exists bedrooms integer;
alter table valuations add column if not exists bathrooms integer;
alter table valuations add column if not exists renovated_in integer;
alter table valuations add column if not exists condition_key text;
alter table valuations add column if not exists heating_key text;
alter table valuations add column if not exists epc_class text;
alter table valuations add column if not exists features text[] not null default '{}';
alter table valuations add column if not exists parcel_count integer;
alter table valuations add column if not exists renovation_extent text;
alter table valuations add column if not exists address_private text;
alter table valuations add column if not exists latitude numeric;
alter table valuations add column if not exists longitude numeric;
alter table valuations add column if not exists factors jsonb not null default '[]'::jsonb;
alter table valuations add column if not exists request_kind text not null default 'indicative';
alter table valuations add column if not exists ksh_code text;
alter table valuations add column if not exists low_huf bigint;
alter table valuations add column if not exists mid_huf bigint;
alter table valuations add column if not exists high_huf bigint;
alter table valuations add column if not exists baseline jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'valuations_request_kind_check') then
    alter table valuations add constraint valuations_request_kind_check
      check (request_kind in ('indicative', 'expert_visit', 'judicial'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'valuations_renovation_extent_check') then
    alter table valuations add constraint valuations_renovation_extent_check
      check (renovation_extent is null or renovation_extent in ('partial', 'full', 'none', 'unknown'));
  end if;
end $$;
create index if not exists valuations_request_kind_idx on valuations (request_kind, created_at desc);

insert into taxonomy_terms (group_key, key, labels, sort_order) values
('feature','garage','{"hu":"Garázs","nl":"Garage","en":"Garage","de":"Garage"}',210),
('feature','pool','{"hu":"Medence","nl":"Zwembad","en":"Pool","de":"Pool"}',220),
('feature','balcony','{"hu":"Erkély","nl":"Balkon","en":"Balcony","de":"Balkon"}',230),
('feature','carport','{"hu":"Fedett beálló","nl":"Carport","en":"Carport","de":"Carport"}',240),
('feature','storage-building','{"hu":"Tárolóépület","nl":"Opslaggebouw","en":"Storage building","de":"Lagergebäude"}',250),
('feature','barn-hall','{"hu":"Csarnok","nl":"Schuur of hal","en":"Barn or hall","de":"Scheune oder Halle"}',260),
('feature','animal-housing','{"hu":"Állattartásra alkalmas épület","nl":"Dierenverblijf","en":"Animal housing","de":"Tierstall"}',270),
('feature','gazebo','{"hu":"Szaletli","nl":"Prieel","en":"Gazebo","de":"Gartenpavillon"}',280),
('feature','outdoor-oven','{"hu":"Kerti sütőde / kemence","nl":"Buitenoven","en":"Outdoor oven","de":"Außenofen"}',290)
on conflict (group_key, key) do nothing;
