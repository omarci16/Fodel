-- FODEL 3.1 — valuation round 2: documents, OSM surroundings, AI analysis and
-- pay-now for valuation packages. Not run by Claude; the code degrades without it.

/* ── Valuation: documents, surroundings, analysis ───────────────────────── */
-- documents: [{ path, name, size, type }] in the private `valuation-docs` bucket.
alter table valuations add column if not exists documents jsonb not null default '[]'::jsonb;
-- nearby: OpenStreetMap / Overpass summary, { center, radiusM, groups[], source, retrievedAt }.
alter table valuations add column if not exists nearby jsonb;
-- ai_analysis: qualitative review of the customer's input + documents + photos + surroundings.
-- It never carries a price or a percentage — an admin sets the band.
alter table valuations add column if not exists ai_analysis jsonb;
alter table valuations add column if not exists ai_analysed_at timestamptz;

/* ── Payments: not only listings ────────────────────────────────────────── */
-- A valuation package paid with a card has no listing and no portal account:
-- the payment keeps the contact it was made for.
alter table payments add column if not exists valuation_id uuid references valuations (id) on delete set null;
alter table payments add column if not exists contact_email text;
alter table payments add column if not exists locale text;
alter table payments add column if not exists kind text not null default 'listing';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_kind_check') then
    alter table payments add constraint payments_kind_check check (kind in ('listing', 'valuation'));
  end if;
end $$;
create index if not exists payments_valuation_idx on payments (valuation_id) where valuation_id is not null;

/* ── Private bucket for large customer documents ────────────────────────── */
-- Files go straight from the browser to storage through a signed upload URL
-- (serverless bodies are capped at a few MB). 50 MB is Supabase's per-file
-- limit on the free plan; raise both if the plan allows more.
insert into storage.buckets (id, name, public, file_size_limit)
values ('valuation-docs', 'valuation-docs', false, 52428800)
on conflict (id) do nothing;
