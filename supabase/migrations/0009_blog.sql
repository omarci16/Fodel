-- FODEL 1.2 — blog moves from two Markdown files to a Supabase-backed CMS.
--
-- How to run this: Supabase → SQL Editor → New query → paste this whole file
-- → Run.

/* ── blog_posts ──────────────────────────────────────────────────────────── */
-- One row per language. `group_id` links a Hungarian post to its Dutch
-- counterpart when (and only when) a real translation exists — it is
-- nullable on purpose. The two seeded articles below are NOT translations of
-- each other (Piacelemzés vs. Kopersgids are different pieces entirely), so
-- both keep group_id null and hreflang is emitted only where a sibling
-- actually exists.
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid,
  locale locale_code not null,
  slug text not null,
  title text not null,
  excerpt text not null,
  body_md text not null,
  category text not null,
  cover_url text,
  cover_alt text,
  og_image_url text,
  author text not null default 'FODEL',
  reading_minutes integer not null default 5,
  seo_title text,
  seo_description text,
  featured boolean not null default false,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles (id) on delete set null,

  unique (locale, slug)
);

create index if not exists blog_posts_locale_published_idx on blog_posts (locale, published, published_at desc);
create index if not exists blog_posts_group_idx on blog_posts (group_id);

create trigger blog_posts_set_updated_at
  before update on blog_posts
  for each row execute function set_updated_at();

alter table blog_posts enable row level security;
create policy blog_posts_admin_all on blog_posts for all using (is_admin());
create policy blog_posts_public_read on blog_posts for select using (published);

/* ── blog-media storage bucket ──────────────────────────────────────────── */
-- Mirrors 0003's property-media pattern: public read (a blog cover is meant
-- to be seen by anyone), admin-only write — there is no per-post ownership
-- concept here the way there is for a seller's own listing photos.
insert into storage.buckets (id, name, public)
values ('blog-media', 'blog-media', true)
on conflict (id) do nothing;

create policy "blog_media_objects_read" on storage.objects
  for select using (bucket_id = 'blog-media');

create policy "blog_media_objects_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'blog-media' and is_admin());

create policy "blog_media_objects_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'blog-media' and is_admin());

/* ── Seed: the two existing Markdown articles, at their exact slugs ──────── */
-- So /hu/blog/holland-migracio-okai/ and
-- /nl/nieuws/wat-kost-een-huis-in-hongarije/ do not 404 once the public pages
-- switch from getCollection to this table. Neither had a cover image, so
-- there is no image migration to do.
insert into blog_posts (locale, slug, title, excerpt, body_md, category, author, reading_minutes, featured, published, published_at)
values (
  'hu',
  'holland-migracio-okai',
  'A holland migráció okai — miért költöznek Magyarországra?',
  'Ár/érték arány, túlnépesedés, megélhetés és földrajzi biztonság — négy ok, amely a holland vevőket Magyarországra hozza.',
  $md$A hollandok magyarországi ingatlanvásárlásának nem egyetlen oka van. Ügyfeleinkkel
folytatott több száz beszélgetés alapján négy tényező tér vissza újra és újra.

## 1. Ár/érték arány

A magyar vidéki ingatlankínálat ár/érték arányban Európa élmezőnyébe tartozik.
Egy 125 m²-es építési telek Hollandiában nagyságrendileg 88 000 € (mintegy
27 millió Ft); egy garázs 100 000 € körül mozog. Ugyanezért az összegért
Magyarországon vidéken tágas családi ház vásárolható, gyakran jelentős
földterülettel.

## 2. Népsűrűség

Hollandia népsűrűsége 482 fő/km², a lakosság mintegy 17 millió fő. Az ország
jelentős része vízzel borított vagy beépíthetetlen. A tér hiánya konkrét,
mindennapi tapasztalat — és ez az egyik leggyakrabban említett indok.

## 3. Az életforma megváltozása

Vásárlóink jelentős része nyugdíjas vagy nyugdíj előtt álló. Számukra a
magyarországi megélhetési költség, az ingatlanadó hiánya és az elérhető
egészségügyi ellátás együtt olyan életszínvonalat tesz lehetővé, amelyet
Hollandiában ugyanabból a nyugdíjból nem érnének el.

## 4. Földrajzi biztonság

Az 1953-as gátszakadás óta Hollandia hatalmas védőrendszert épített ki. A
tengerszint emelkedésével kapcsolatos aggodalom sokak döntésében szerepet
játszik: Magyarország a kontinens közepén, a tengerszint felett fekszik.

---

## Mit jelent ez egy magyar eladónak?

Azt, hogy a vevő nem alkalmi érdeklődő. Egy magyarországi ingatlan megtekintése
legalább két napjába és 200–300 eurójába kerül. Aki ezt vállalja, komolyan
gondolja — és jellemzően egy összegben, banki átutalással fizet, hitel és
állami támogatás nélkül.$md$,
  'Piacelemzés',
  'FODEL',
  8,
  true,
  true,
  '2026-03-15'
)
on conflict (locale, slug) do nothing;

insert into blog_posts (locale, slug, title, excerpt, body_md, category, author, reading_minutes, featured, published, published_at)
values (
  'nl',
  'wat-kost-een-huis-in-hongarije',
  'Wat kost een huis in Hongarije werkelijk?',
  'Overdrachtsbelasting, notaris, kadaster en vertaling: de werkelijke kosten van een aankoop in Hongarije, naast de vraagprijs.',
  $md$De vraagprijs is zelden het hele verhaal. Hieronder de posten waar Nederlandse
en Belgische kopers in de praktijk mee te maken krijgen.

## De koopsom

Ons aanbod loopt ruwweg van € 60.000 voor een gerenoveerde dorpswoning tot
enkele honderdduizenden euro's voor een landhuis of wijngoed. Onderhandelen is
gebruikelijk, maar de ruimte is kleiner dan veel kopers verwachten: sterk
overgeprijsde woningen blijven in Hongarije jarenlang staan, en realistisch
geprijsde woningen gaan snel.

## Overdrachtsbelasting

Hongarije kent een overdrachtsbelasting op woningen. Het tarief en eventuele
vrijstellingen hangen af van het type object en uw situatie; wij rekenen dit
per woning voor u door voordat u een bod doet.

## Notaris en juridische kosten

Een koopovereenkomst moet in Hongarije door een advocaat of notaris worden
opgesteld en tegengetekend. Wij laten het contract tweetalig opstellen, zodat u
leest wat u tekent:

- Hongaars: vanaf € 150
- Duits–Hongaars of Engels–Hongaars: vanaf € 300
- Nederlands–Hongaars: vanaf € 400

## Kadaster en nutsvoorzieningen

De inschrijving van de nieuwe eigenaar bij het Hongaarse kadaster en het
overzetten van gas, water, licht en afval regelen wij. U hoeft daarvoor niet
naar Hongarije te reizen — met een volmacht vertegenwoordigen wij u ter plaatse.

## Onze courtage

4% netto met een minimum van € 2.000, plus 21% Nederlandse btw. Die wordt
betaald door de verkoper, niet door u.

En als u de eigenaar rechtstreeks benadert via de gegevens die bij de
advertentie staan, en u regelt de koop samen zonder onze hulp? Dan betaalt
niemand courtage. Dat is geen uitzondering — dat is hoe ons model werkt.$md$,
  'Kopersgids',
  'FODEL',
  7,
  true,
  true,
  '2026-04-22'
)
on conflict (locale, slug) do nothing;
