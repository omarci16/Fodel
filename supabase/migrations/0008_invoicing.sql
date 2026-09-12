-- FODEL 1.2 — payments detail + Dutch invoicing.
--
-- ⚠️ LEGAL BLOCKERS, unresolved as of this migration (see the plan's
-- architecture review, items 18 and 19):
--   1. COMPANY.registration.kvk is null — a Dutch invoice is not legally
--      complete without it. `npm run verify` already fails on it.
--   2. The VAT rate may be wrong. company.ts assumes 21% Dutch VAT on every
--      price; B2C advertising/electronic services sold to Hungarian private
--      individuals are generally taxable where the CUSTOMER is (HU 27%, via
--      the EU's One-Stop-Shop scheme), not at the seller's home rate. If so,
--      every invoice this schema produces is wrong, retroactively, carrying a
--      sequential legal number that cannot be silently reissued.
-- This was built anyway, against the current 21% NL placeholder, on the
-- user's explicit instruction — nothing here should be treated as legally
-- final. One email to FODEL's accountant resolves both before any real
-- invoice number is allocated in production.
--
-- How to run this: Supabase → SQL Editor → New query → paste this whole file
-- → Run.

/* ── payments: the columns invoicing needs ──────────────────────────────── */
alter table payments add column if not exists billing_name text;
alter table payments add column if not exists billing_address text;
-- Set at approval time (14 days out) so the calendar view has something to
-- sort and colour by — a column with no reader is worse than no column.
-- No automated reminder email exists yet; this is a display-only consumer.
alter table payments add column if not exists due_at timestamptz;

/* ── invoice numbering: a gap-free counter, not a sequence ──────────────── */
-- A Postgres SEQUENCE is explicitly not gap-free — nextval() is
-- non-transactional by design, which is fine for property_ref_seq (a ref gap
-- is cosmetic) and not fine here, where NL and HU both require an unbroken
-- series. This table plus issue_invoice() below allocate the next number and
-- insert the invoice row in the SAME function call — one Postgres transaction
-- — never as two separate round trips from the app.
create table if not exists invoice_counters (
  series text primary key,
  n integer not null default 0
);

/* ── invoices ────────────────────────────────────────────────────────────── */
-- Finalised the moment they are created — this build has no draft stage, so
-- finalised_at is always set at insert and the immutability trigger below
-- blocks every UPDATE from that point on. A mistake is corrected by issuing a
-- credit_note (kind + corrects_id), never by editing the original row.
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  kind text not null default 'invoice' check (kind in ('invoice', 'credit_note')),
  corrects_id uuid references invoices (id),

  payment_id uuid not null references payments (id),
  property_id uuid references properties (id) on delete set null,
  owner_id uuid references profiles (id) on delete set null,

  billing_name text not null,
  billing_address text not null,

  -- Rendered from payments.line_items at the moment of issue — never
  -- re-derived from today's catalogue, same invariant as payments itself.
  line_items jsonb not null default '[]'::jsonb,
  discount_cents integer not null default 0,

  -- gross is what the customer paid; net/vat back it out. Rounding is
  -- net = round(gross / (1 + rate/100)), vat = gross - net — never
  -- round(net * rate), or the three numbers stop summing at the boundary.
  gross_cents integer not null,
  vat_rate numeric not null,
  net_cents integer not null,
  vat_cents integer not null,
  currency text not null default 'eur',

  -- An unguessable secondary key so the emailed link
  -- (/portal/invoices/[number]?t=[view_token]) works for a signed-out
  -- recipient without a login — the same posture as invites/password_resets,
  -- except this token is not single-use: an invoice is a document someone
  -- reasonably reopens.
  view_token uuid not null default gen_random_uuid(),

  issued_at timestamptz not null default now(),
  supply_date date not null default current_date,
  finalised_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_payment_idx on invoices (payment_id);
create index if not exists invoices_owner_idx on invoices (owner_id);
create index if not exists invoices_property_idx on invoices (property_id);

create trigger invoices_set_updated_at
  before update on invoices
  for each row execute function set_updated_at();

create or replace function reject_finalised_invoice_update() returns trigger as $$
begin
  if old.finalised_at is not null then
    raise exception 'invoice % is finalised and cannot be modified — issue a credit_note instead', old.number;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists invoices_reject_update on invoices;
create trigger invoices_reject_update
  before update on invoices
  for each row execute function reject_finalised_invoice_update();

alter table invoices enable row level security;
create policy invoices_admin_all on invoices for all using (is_admin());
create policy invoices_owner_read on invoices for select using (owner_id = auth.uid());

/* ── issue_invoice(): allocate the number and write the row atomically ───── */
create or replace function issue_invoice(
  p_payment_id uuid,
  p_kind text,
  p_property_id uuid,
  p_owner_id uuid,
  p_billing_name text,
  p_billing_address text,
  p_line_items jsonb,
  p_discount_cents integer,
  p_gross_cents integer,
  p_vat_rate numeric,
  p_corrects_id uuid default null
) returns invoices as $$
declare
  v_series text := to_char(now(), 'YYYY');
  v_n integer;
  v_number text;
  v_net_cents integer;
  v_vat_cents integer;
  v_row invoices;
begin
  insert into invoice_counters (series, n) values (v_series, 1)
  on conflict (series) do update set n = invoice_counters.n + 1
  returning n into v_n;

  v_number := format('FD-%s-%s', v_series, lpad(v_n::text, 4, '0'));

  v_net_cents := round(p_gross_cents / (1 + p_vat_rate / 100.0));
  v_vat_cents := p_gross_cents - v_net_cents;

  insert into invoices (
    number, kind, corrects_id, payment_id, property_id, owner_id,
    billing_name, billing_address, line_items, discount_cents,
    gross_cents, vat_rate, net_cents, vat_cents
  ) values (
    v_number, p_kind, p_corrects_id, p_payment_id, p_property_id, p_owner_id,
    p_billing_name, p_billing_address, p_line_items, p_discount_cents,
    p_gross_cents, p_vat_rate, v_net_cents, v_vat_cents
  )
  returning * into v_row;

  return v_row;
end;
$$ language plpgsql security definer;
-- security definer: called with the admin (service-role) client from
-- src/pages/api/portal/payments/[id]/invoice.ts, same posture as the other
-- service-role-only writes (payments, invites). Not exposed to PostgREST for
-- anon/authenticated roles beyond what RLS on `invoices` already allows them
-- to read back afterwards.
