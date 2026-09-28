-- FODEL 2.1 — development brief 2 (2026-09-28): moderation, curation, free
-- listing invites, payments ledger, abandoned registrations, multilingual blog
-- with case studies, valuation workflow, contact and automation settings.
--
-- How to run this: Supabase → SQL Editor → New query. Run it in TWO steps,
-- exactly like 0005: PostgreSQL refuses to use a newly-added enum value inside
-- the same transaction that added it.
--
-- ══ STEP 1 ══ Run this statement ON ITS OWN, then continue to step 2.

alter type property_status add value if not exists 'rejected' after 'changes_requested';

-- ══ STEP 2 ══ Run everything below this line.

/* ── Moderation: rejection and the refund decision ───────────────────────── */
-- `rejected` is terminal for the listing. Whether money has to go back is a
-- decision the admin records, never an automatic refund: there is no final
-- refund rule and no refund integration yet (brief §7).
alter table properties add column if not exists rejected_at timestamptz;
alter table properties add column if not exists refund_required boolean not null default false;

-- Set only by the server when an admin-issued invite grants a free listing.
-- A seller cannot set it (see protect_property_admin_columns below), so a
-- free listing is a server-side entitlement, not a URL parameter.
alter table properties add column if not exists free_listing boolean not null default false;

alter table review_notes add column if not exists kind text not null default 'changes';
alter table review_notes drop constraint if exists review_notes_kind_check;
alter table review_notes add constraint review_notes_kind_check check (kind in ('changes', 'rejection'));

/* ── Admin-only property columns ─────────────────────────────────────────── */
-- properties_owner_update lets an owner update any column of their own draft,
-- which included editorial and paid placement: an owner could tick themselves
-- into the Top 10 through the API. A trigger, because RLS cannot compare old
-- and new column values. Service-role writes (auth.uid() is null) and admins
-- pass through untouched.
create or replace function protect_property_admin_columns() returns trigger as $$
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.featured := false;
    new.homepage_featured := false;
    new.homepage_order := 99;
    new.editors_pick := false;
    new.editors_pick_order := 99;
    new.bargain := false;
    new.bargain_since := null;
    new.free_listing := false;
    new.refund_required := false;
    new.rejected_at := null;
    new.approved_at := null;
    new.approved_by := null;
    new.published_at := null;
    new.expires_at := null;
    return new;
  end if;

  new.featured := old.featured;
  new.homepage_featured := old.homepage_featured;
  new.homepage_order := old.homepage_order;
  new.editors_pick := old.editors_pick;
  new.editors_pick_order := old.editors_pick_order;
  new.bargain := old.bargain;
  new.bargain_since := old.bargain_since;
  new.free_listing := old.free_listing;
  new.refund_required := old.refund_required;
  new.rejected_at := old.rejected_at;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  new.published_at := old.published_at;
  new.expires_at := old.expires_at;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists properties_protect_admin_columns on properties;
create trigger properties_protect_admin_columns
  before insert or update on properties
  for each row execute function protect_property_admin_columns();

/* ── Top 10: one editorial list, saved in one statement ──────────────────── */
-- Editorial, never paid: payment columns are not read here at all. At most ten
-- entries; the whole order is replaced in one transaction so the homepage can
-- never read a half-saved ranking. Security invoker, so RLS and the admin
-- check below both apply to the caller.
create or replace function set_editors_pick(p_ids uuid[]) returns void as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;
  if coalesce(array_length(p_ids, 1), 0) > 10 then
    raise exception 'too-many';
  end if;
  update properties set editors_pick = false, editors_pick_order = 99
    where editors_pick and not (id = any (coalesce(p_ids, '{}')));
  update properties p set editors_pick = true, editors_pick_order = x.ord
    from unnest(coalesce(p_ids, '{}')) with ordinality as x(id, ord)
    where p.id = x.id;
end;
$$ language plpgsql security invoker set search_path = public;

/* ── A live listing's text and photos are not owner-editable ─────────────── */
-- 0001 let an owner write translations and media whatever the listing's
-- status, so a published listing's photos and text could be changed through
-- the API without going back through review. Owners may now write only while
-- the listing is a draft or has changes requested — the same rule
-- properties_owner_update already applies to the row itself.
drop policy if exists property_translations_write on property_translations;
drop policy if exists property_translations_update on property_translations;
drop policy if exists property_translations_delete on property_translations;
drop policy if exists property_media_write on property_media;
drop policy if exists property_media_update on property_media;
drop policy if exists property_media_delete on property_media;

create policy property_translations_write on property_translations
  for insert with check (
    is_admin() or exists (
      select 1 from properties p
      where p.id = property_translations.property_id
        and p.owner_id = auth.uid() and p.status in ('draft', 'changes_requested')
    )
  );
create policy property_translations_update on property_translations
  for update using (
    is_admin() or exists (
      select 1 from properties p
      where p.id = property_translations.property_id
        and p.owner_id = auth.uid() and p.status in ('draft', 'changes_requested')
    )
  );
create policy property_translations_delete on property_translations
  for delete using (
    is_admin() or exists (
      select 1 from properties p
      where p.id = property_translations.property_id
        and p.owner_id = auth.uid() and p.status in ('draft', 'changes_requested')
    )
  );

create policy property_media_write on property_media
  for insert with check (
    is_admin() or exists (
      select 1 from properties p
      where p.id = property_media.property_id
        and p.owner_id = auth.uid() and p.status in ('draft', 'changes_requested')
    )
  );
create policy property_media_update on property_media
  for update using (
    is_admin() or exists (
      select 1 from properties p
      where p.id = property_media.property_id
        and p.owner_id = auth.uid() and p.status in ('draft', 'changes_requested')
    )
  );
create policy property_media_delete on property_media
  for delete using (
    is_admin() or exists (
      select 1 from properties p
      where p.id = property_media.property_id
        and p.owner_id = auth.uid() and p.status in ('draft', 'changes_requested')
    )
  );

drop policy if exists "property_media_objects_insert" on storage.objects;
drop policy if exists "property_media_objects_delete" on storage.objects;
create policy "property_media_objects_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'property-media'
    and (is_admin() or exists (
      select 1 from properties p
      where p.id::text = (storage.foldername(name))[1]
        and p.owner_id = auth.uid() and p.status in ('draft', 'changes_requested')
    ))
  );
create policy "property_media_objects_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'property-media'
    and (is_admin() or exists (
      select 1 from properties p
      where p.id::text = (storage.foldername(name))[1]
        and p.owner_id = auth.uid() and p.status in ('draft', 'changes_requested')
    ))
  );

/* ── Invites: free listing grant and the recipient's language ────────────── */
alter table invites add column if not exists grants_free_listing boolean not null default false;

-- Localised, editable invite wording. A row only overrides the built-in text
-- once an admin has approved it; English and German invites cannot be sent at
-- all until an approved row exists, so no test wording reaches a customer.
create table if not exists email_templates (
  key text not null check (key in ('invite')),
  locale locale_code not null,
  subject text not null,
  heading text not null,
  body text not null,
  cta text not null,
  approved boolean not null default false,
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (key, locale)
);

drop trigger if exists email_templates_set_updated_at on email_templates;
create trigger email_templates_set_updated_at
  before update on email_templates
  for each row execute function set_updated_at();

alter table email_templates enable row level security;
drop policy if exists email_templates_admin_all on email_templates;
create policy email_templates_admin_all on email_templates for all using (is_admin());

/* ── Abandoned registrations: reminder groundwork, switched off ──────────── */
-- One row per abandoned self-service registration that is due a reminder.
-- The unique invite_id is what makes sending idempotent; `cancelled_at` is set
-- the moment the registration completes. Nothing writes or sends here until
-- site_settings.automation->>'registrationReminder' is true, and the admin UI
-- refuses to enable that until the wording, timing and legal basis exist.
create table if not exists registration_reminders (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null unique references invites (id) on delete cascade,
  email text not null,
  due_at timestamptz not null,
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table registration_reminders enable row level security;
drop policy if exists registration_reminders_admin_all on registration_reminders;
create policy registration_reminders_admin_all on registration_reminders for all using (is_admin());

create index if not exists invites_email_idx on invites (lower(email));

/* ── Payments: refunds are recorded, never mixed with income ─────────────── */
alter table payments drop constraint if exists payments_status_check;
alter table payments add constraint payments_status_check
  check (status in ('pending', 'paid', 'manual', 'cancelled', 'refunded'));
alter table payments add column if not exists refund_required boolean not null default false;
alter table payments add column if not exists refunded_at timestamptz;
alter table payments add column if not exists refund_note text;

/* ── Blog: four languages, case studies ──────────────────────────────────── */
alter table blog_posts add column if not exists kind text not null default 'article';
alter table blog_posts drop constraint if exists blog_posts_kind_check;
alter table blog_posts add constraint blog_posts_kind_check check (kind in ('article', 'case_study'));
-- Case-study sections. Optional and free text: the brief asks for room for
-- sources, method and results, never for generated ones.
alter table blog_posts add column if not exists case_sources text;
alter table blog_posts add column if not exists case_method text;
alter table blog_posts add column if not exists case_results text;

create index if not exists blog_posts_live_idx
  on blog_posts (locale, kind, published_at desc) where published;

-- Drafts stay private, and so does anything scheduled for later.
drop policy if exists blog_posts_public_read on blog_posts;
create policy blog_posts_public_read on blog_posts
  for select using (published and published_at is not null and published_at <= now());

insert into taxonomy_terms (group_key, key, labels, sort_order) values
  ('blog_category', 'case-study', '{"hu":"Esettanulmány","nl":"Casestudy","de":"Fallstudie","en":"Case study"}', 40)
on conflict (group_key, key) do nothing;

/* ── Valuations: language, answers, photos, missing information ──────────── */
alter table valuations add column if not exists locale locale_code not null default 'hu';
alter table valuations add column if not exists answers jsonb not null default '{}'::jsonb;
alter table valuations add column if not exists photos jsonb not null default '[]'::jsonb;
alter table valuations add column if not exists info_request text;
alter table valuations drop constraint if exists valuations_status_check;
alter table valuations add constraint valuations_status_check check (
  status in ('queued', 'insufficient_data', 'needs_review', 'needs_info', 'approved', 'rejected')
);

-- Photos a member of the public attaches to a valuation request. Private: an
-- admin sees them through short-lived signed URLs. Written only by the server
-- (service role) after sharp has re-encoded them.
insert into storage.buckets (id, name, public)
values ('valuation-media', 'valuation-media', false)
on conflict (id) do nothing;

drop policy if exists "valuation_media_objects_admin_read" on storage.objects;
create policy "valuation_media_objects_admin_read" on storage.objects
  for select to authenticated using (bucket_id = 'valuation-media' and is_admin());

/* ── Site settings: contact channel, services and automation switches ───── */
-- WhatsApp: international format, no spaces. Null hides every WhatsApp button.
alter table site_settings add column if not exists whatsapp text;
alter table site_settings drop constraint if exists site_settings_whatsapp_check;
alter table site_settings add constraint site_settings_whatsapp_check
  check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{7,14}$');

-- services: { valuationEntry: bool, valuationFreeConfirmed: bool,
--             valuationNotice: { hu, nl } }
-- automation: { registrationReminder: bool, inviteAutomation: bool }
alter table site_settings add column if not exists services jsonb not null
  default '{"valuationEntry": true, "valuationFreeConfirmed": false}'::jsonb;
alter table site_settings add column if not exists automation jsonb not null
  default '{"registrationReminder": false, "inviteAutomation": false}'::jsonb;

notify pgrst, 'reload schema';
