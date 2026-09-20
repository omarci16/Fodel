-- FODEL 1.3 — runtime company settings and editorial curation.
-- How to run this: Supabase → SQL Editor → New query → paste this whole file → Run.
-- This migration adds no enum values, so unlike 0005 it is one atomic paste.

/* ── single-row company settings ─────────────────────────────────────── */

create table if not exists site_settings (
  id smallint primary key default 1 check (id = 1),
  names jsonb not null default '{}'::jsonb,
  phones jsonb not null default '[]'::jsonb check (jsonb_typeof(phones) = 'array'),
  emails jsonb not null default '{}'::jsonb,
  address jsonb not null default '{}'::jsonb,
  registration jsonb not null default '{}'::jsonb,
  hours jsonb not null default '{}'::jsonb,
  banks jsonb not null default '{}'::jsonb,
  social jsonb not null default '{}'::jsonb,
  reach jsonb not null default '{}'::jsonb,
  network jsonb not null default '[]'::jsonb,
  founded integer not null,
  founded_in text not null,
  principal text not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists site_settings_updated_at on site_settings;
create trigger site_settings_updated_at before update on site_settings
  for each row execute function set_updated_at();

alter table site_settings enable row level security;
drop policy if exists site_settings_admin_all on site_settings;
create policy site_settings_admin_all on site_settings for all using (is_admin());
drop policy if exists site_settings_public_read on site_settings;
create policy site_settings_public_read on site_settings for select using (true);

insert into site_settings (
  id, names, phones, emails, address, registration, hours, banks, social,
  reach, network, founded, founded_in, principal
) values (
  1,
  '{"legal":"FODEL VASTGOED","hu":"FODEL INGATLAN","nl":"FODEL Vastgoed","de":"FODEL Immobilien","en":"FODEL Real Estates","fr":"FODEL"}',
  '[{"label":{"hu":"Holland szám","nl":"Nederlands nummer"},"display":"+31 6 4400 5550","href":"tel:+31644005550","public":true,"note":{"hu":"Magyarul beszélő munkatársunk ezen a számon is elérhető","nl":"Ook bereikbaar voor Hongaarstalige klanten"}},{"label":{"hu":"Magyar szám","nl":"Hongaars nummer"},"display":"+36 70 225 5255","href":"tel:+36702255255","public":true,"note":{"hu":"Ingatlanos munkatárs","nl":"Makelaar"}},{"label":{"hu":"Magyar információs vonal","nl":"Hongaarse infolijn"},"display":"+36 70 231 0031","href":"tel:+36702310031","public":false,"note":{"hu":"Általános információ","nl":"Algemene informatie"}}]',
  '{"primary":"info@fodel.nl","hu":"info@fodel.hu","all":["info@fodel.nl","info@fodel.hu","info@ingatlan.nl"]}',
  '{"street":"Seinpostduin 168","postalCode":"2586 EC","city":"Den Haag","country":"Nederland","countryCode":"NL","oneLine":"Seinpostduin 168, 2586 EC Den Haag, Nederland"}',
  '{"kvk":null,"vat":"NL002505231B62","vatVerified":false}',
  '{"weekdays":{"from":"09:00","to":"18:00"},"callback":{"to":"21:00","includesWeekends":true}}',
  '{"nl":{"iban":"NL35 RABO 0360284973","bic":"RABONL2U"},"hu":{"account":"11600006-30000006-12407762"}}',
  '{"youtube":"https://www.youtube.com/@FODEL.REAL.ESTATE","facebookNl":"https://www.facebook.com/Infofodel.nl","facebookHu":"https://www.facebook.com/fodel.hu"}',
  '{"countries":8,"languages":5}',
  '["fodel.nl","fodel.hu","immofodel.de","fodel.at","fodel.ch","fodel.uk","fodel.us"]',
  2013, 'Den Haag', 'Födelmesi Gábor'
)
on conflict (id) do nothing;

/* ── editorial curation is separate from paid placement ──────────────── */

alter table properties add column if not exists editors_pick boolean not null default false;
alter table properties add column if not exists editors_pick_order integer not null default 99;
alter table properties add column if not exists bargain boolean not null default false;
alter table properties add column if not exists bargain_since timestamptz;

create index if not exists properties_editors_pick_live_idx
  on properties (editors_pick_order) where status = 'published' and editors_pick;
create index if not exists properties_bargain_live_idx
  on properties (bargain_since desc) where status = 'published' and bargain;

notify pgrst, 'reload schema';
