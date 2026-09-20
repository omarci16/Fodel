-- FODEL 1.3 — database-backed property and editorial vocabulary.
-- How to run this: Supabase → SQL Editor → New query → paste this whole file → Run.
-- This migration adds no enum values, so unlike 0005 it is one atomic paste.
-- Before running, inspect the legacy backlog:
--   select count(*) from properties where status = 'awaiting_payment';
-- Before the foreign key is added, this migration also proves that every stored
-- category has a matching seed row. A mismatch aborts the paste instead of
-- quietly making existing listings uneditable.

/* ── vocabulary ───────────────────────────────────────────────────────── */

create table if not exists taxonomy_terms (
  id uuid primary key default gen_random_uuid(),
  group_key text not null check (group_key in (
    'category', 'feature', 'condition', 'heating', 'county', 'region', 'blog_category'
  )),
  key text not null check (key ~ '^[a-z0-9][a-z0-9-]{0,48}$'),
  labels jsonb not null check (
    jsonb_typeof(labels) = 'object' and
    nullif(btrim(labels->>'hu'), '') is not null and
    nullif(btrim(labels->>'nl'), '') is not null
  ),
  slugs jsonb not null default '{}'::jsonb,
  schema_type text,
  sort_order integer not null default 100,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_key, key),
  check (
    group_key <> 'category' or (
      nullif(btrim(slugs->>'hu'), '') is not null and
      nullif(btrim(slugs->>'nl'), '') is not null and
      nullif(btrim(schema_type), '') is not null
    )
  )
);

create unique index if not exists taxonomy_category_hu_slug_unique
  on taxonomy_terms ((slugs->>'hu')) where group_key = 'category';
create unique index if not exists taxonomy_category_nl_slug_unique
  on taxonomy_terms ((slugs->>'nl')) where group_key = 'category';

drop trigger if exists taxonomy_terms_updated_at on taxonomy_terms;
create trigger taxonomy_terms_updated_at before update on taxonomy_terms
  for each row execute function set_updated_at();

alter table taxonomy_terms enable row level security;
drop policy if exists taxonomy_terms_admin_all on taxonomy_terms;
create policy taxonomy_terms_admin_all on taxonomy_terms for all using (is_admin());
drop policy if exists taxonomy_terms_public_read on taxonomy_terms;
-- Disabled means “do not offer for new data”, not “secret”. Old published
-- listings must keep resolving their label and permanent URL after a term is
-- retired, so enabled filtering deliberately belongs to each application UI.
create policy taxonomy_terms_public_read on taxonomy_terms for select using (true);

/* ── seed the 1.2 fallbacks before validating existing rows ───────────── */

insert into taxonomy_terms (group_key, key, labels, slugs, schema_type, sort_order) values
  ('category','house',        '{"hu":"Eladó ház","nl":"Huis","de":"Haus","en":"House","fr":"Maison"}', '{"hu":"haz","nl":"huis"}', 'SingleFamilyResidence', 10),
  ('category','holiday',      '{"hu":"Eladó nyaraló","nl":"Vakantiehuis","de":"Ferienhaus","en":"Vacation house","fr":"Maison de vacances"}', '{"hu":"nyaralo","nl":"vakantiehuis"}', 'House', 20),
  ('category','farm',         '{"hu":"Eladó tanya","nl":"Boerderij","de":"Bauernhof","en":"Farm","fr":"Ferme"}', '{"hu":"tanya","nl":"boerderij"}', 'House', 30),
  ('category','land',         '{"hu":"Eladó telek","nl":"Perceel","de":"Grundstück","en":"Land","fr":"Terrain"}', '{"hu":"telek","nl":"perceel"}', 'LandForm', 40),
  ('category','commercial',   '{"hu":"Üzleti ingatlan","nl":"Bedrijfsaanbod","de":"Geschäftsimmobilie","en":"Commercial property","fr":"Immobilier commercial"}', '{"hu":"uzleti-ingatlan","nl":"bedrijfsaanbod"}', 'Place', 50),
  ('category','agricultural', '{"hu":"Agráringatlan","nl":"Agrarisch onroerend goed","de":"Agrarimmobilie","en":"Agricultural property","fr":"Immobilier agricole"}', '{"hu":"agraringatlan","nl":"agrarisch-onroerend-goed"}', 'Place', 60),
  ('category','mansion',      '{"hu":"Kúria, kastély","nl":"Landhuis, herenhuis","de":"Landhaus, Herrenhaus","en":"Country house, mansion","fr":"Maison de campagne, manoir"}', '{"hu":"kuria-kastely","nl":"landhuis"}', 'House', 70),
  ('category','apartment',    '{"hu":"Eladó lakás","nl":"Appartement","de":"Wohnung","en":"Flat","fr":"Appartement"}', '{"hu":"lakas","nl":"appartement"}', 'Apartment', 80),
  ('category','industrial',   '{"hu":"Ipari ingatlan","nl":"Bedrijfspand","de":"Industrieimmobilie","en":"Industrial property","fr":"Immobilier industriel"}', '{"hu":"ipari-ingatlan","nl":"bedrijfspand"}', 'Place', 90)
on conflict (group_key, key) do nothing;

insert into taxonomy_terms (group_key, key, labels, sort_order) values
  ('feature','panoramic-view','{"hu":"Panorámás kilátás","nl":"Panoramisch uitzicht"}',10),
  ('feature','waterfront','{"hu":"Közvetlen vízpart","nl":"Direct aan het water"}',20),
  ('feature','private-jetty','{"hu":"Saját stég","nl":"Eigen steiger"}',30),
  ('feature','boathouse','{"hu":"Csónakház","nl":"Botenhuis"}',40),
  ('feature','hillside','{"hu":"Dombtetőn","nl":"Op een heuvel"}',50),
  ('feature','forest-adjacent','{"hu":"Erdő közelében","nl":"Nabij het bos"}',60),
  ('feature','vineyard','{"hu":"Szőlőskert","nl":"Wijngaard"}',70),
  ('feature','winery','{"hu":"Működő pincészet","nl":"Werkend wijngoed"}',80),
  ('feature','cellar','{"hu":"Borospince","nl":"Wijnkelder"}',90),
  ('feature','orchard','{"hu":"Gyümölcsös","nl":"Boomgaard"}',100),
  ('feature','well','{"hu":"Saját kút","nl":"Eigen put"}',110),
  ('feature','outbuildings','{"hu":"Gazdasági épületek","nl":"Bijgebouwen"}',120),
  ('feature','stables','{"hu":"Lovarda, istálló","nl":"Paardenstal"}',130),
  ('feature','guesthouse','{"hu":"Vendégház","nl":"Gastenverblijf"}',140),
  ('feature','park','{"hu":"Park","nl":"Park"}',150),
  ('feature','terrace','{"hu":"Terasz","nl":"Terras"}',160),
  ('feature','original-beams','{"hu":"Eredeti gerendázat","nl":"Oorspronkelijke balken"}',170),
  ('feature','renovated','{"hu":"Felújított","nl":"Gerenoveerd"}',180),
  ('feature','parking','{"hu":"Parkolás a telken","nl":"Parkeren op eigen terrein"}',190),
  ('condition','new','{"hu":"Újszerű","nl":"Zo goed als nieuw"}',10),
  ('condition','renovated','{"hu":"Felújított","nl":"Gerenoveerd"}',20),
  ('condition','good','{"hu":"Jó állapotú","nl":"Goede staat"}',30),
  ('condition','needs-renovation','{"hu":"Felújítandó","nl":"Te renoveren"}',40),
  ('heating','gas','{"hu":"Gázfűtés","nl":"Gasverwarming"}',10),
  ('heating','electric','{"hu":"Elektromos fűtés","nl":"Elektrische verwarming"}',20),
  ('heating','wood','{"hu":"Fa tüzelés","nl":"Houtverwarming"}',30),
  ('heating','heat-pump','{"hu":"Hőszivattyú","nl":"Warmtepomp"}',40),
  ('county','baranya','{"hu":"Baranya","nl":"Baranya"}',10),
  ('county','tolna','{"hu":"Tolna","nl":"Tolna"}',20),
  ('county','zala','{"hu":"Zala","nl":"Zala"}',30),
  ('county','somogy','{"hu":"Somogy","nl":"Somogy"}',40),
  ('county','veszprem','{"hu":"Veszprém","nl":"Veszprém"}',50),
  ('county','bacs-kiskun','{"hu":"Bács-Kiskun","nl":"Bács-Kiskun"}',60),
  ('county','pest','{"hu":"Pest","nl":"Pest"}',70),
  ('blog_category','market','{"hu":"Piacelemzés","nl":"Marktanalyse"}',10),
  ('blog_category','buyers','{"hu":"Vevői útmutató","nl":"Kopersgids"}',20),
  ('blog_category','news','{"hu":"Hírek","nl":"Nieuws"}',30)
on conflict (group_key, key) do nothing;

insert into taxonomy_terms (group_key, key, labels, sort_order)
select 'region',
       'region-' || substr(md5(region), 1, 12),
       jsonb_build_object('hu', region, 'nl', region),
       100
from (select distinct region from properties where nullif(btrim(region), '') is not null) r
on conflict (group_key, key) do nothing;

/* ── properties move from enum to stable taxonomy keys ───────────────── */

alter table properties add column if not exists category_group text not null default 'category';
alter table properties drop constraint if exists properties_category_group_check;
alter table properties add constraint properties_category_group_check check (category_group = 'category');

alter table properties alter column category type text using category::text;

do $$
begin
  if exists (
    select 1 from properties p
    left join taxonomy_terms t on t.group_key = 'category' and t.key = p.category
    where t.id is null
  ) then
    raise exception 'properties contains a category not seeded in taxonomy_terms';
  end if;
end $$;

alter table properties drop constraint if exists properties_category_fk;
alter table properties add constraint properties_category_fk foreign key (category_group, category)
  references taxonomy_terms (group_key, key) on update restrict on delete restrict;

alter table properties add column if not exists condition_group text not null default 'condition';
alter table properties add column if not exists condition_key text;
alter table properties drop constraint if exists properties_condition_group_check;
alter table properties add constraint properties_condition_group_check check (condition_group = 'condition');
alter table properties drop constraint if exists properties_condition_fk;
alter table properties add constraint properties_condition_fk foreign key (condition_group, condition_key)
  references taxonomy_terms (group_key, key) on update restrict on delete restrict;

alter table properties add column if not exists heating_group text not null default 'heating';
alter table properties add column if not exists heating_key text;
alter table properties drop constraint if exists properties_heating_group_check;
alter table properties add constraint properties_heating_group_check check (heating_group = 'heating');
alter table properties drop constraint if exists properties_heating_fk;
alter table properties add constraint properties_heating_fk foreign key (heating_group, heating_key)
  references taxonomy_terms (group_key, key) on update restrict on delete restrict;

notify pgrst, 'reload schema';
