-- FODEL 3.0 — admin redesign. One step, idempotent, run once by hand
-- (Supabase → SQL Editor → paste → Run). Safe to run twice.
--
-- The portal and the public site both work WITHOUT this file: every new
-- column is read with `select *` and written with a fallback. Running it
-- switches on callback preference, "handled at" and the CRM hand-off marker.

alter table enquiries add column if not exists contact_pref text;
alter table enquiries add column if not exists handled_at timestamptz;
alter table enquiries add column if not exists crm_synced_at timestamptz;
alter table enquiries add column if not exists crm_error text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'enquiries_contact_pref_check') then
    alter table enquiries add constraint enquiries_contact_pref_check
      check (contact_pref is null or contact_pref in ('callback', 'email'));
  end if;
end $$;

-- Enquiries handled before this column existed keep a null handled_at; the
-- portal then simply shows no "handled on" date for them.
create index if not exists enquiries_handled_idx on enquiries (handled, created_at desc);
