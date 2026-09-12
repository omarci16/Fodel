-- FODEL 1.2 — referral programme.
--
-- How to run this: Supabase → SQL Editor → New query → paste this whole file
-- → Run. No enum values are added, so — unlike 0005 — this does not need to
-- be split into two steps.

/* ── profiles.referral_code ─────────────────────────────────────────────── */
-- An 8-character code from an unambiguous alphabet (no 0/O, 1/I), minted the
-- moment a profile row is created. A DB trigger rather than app code because
-- there is more than one place a profile gets inserted (self-service invite
-- accept today, an admin-invited user tomorrow) and a trigger can't be
-- forgotten at a second call site the way a helper function can.

alter table profiles add column if not exists referral_code text unique;

create or replace function generate_referral_code() returns text as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from profiles where referral_code = code);
  end loop;
  return code;
end;
$$ language plpgsql;

create or replace function set_referral_code() returns trigger as $$
begin
  if new.referral_code is null then
    new.referral_code := generate_referral_code();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_referral_code on profiles;
create trigger profiles_set_referral_code
  before insert on profiles
  for each row execute function set_referral_code();

-- Backfill anyone created before this migration ran.
update profiles set referral_code = generate_referral_code() where referral_code is null;

/* ── payments.discount_cents ────────────────────────────────────────────── */
-- The referral discount is NOT an OrderLine (Stripe rejects a negative
-- unit_amount and 400s the whole Checkout session). It is its own column,
-- rendered as its own line in the email/invoice and passed to Stripe as a
-- one-off coupon — see src/pages/api/stripe/checkout.ts.
alter table payments add column if not exists discount_cents integer not null default 0;
alter table payments add column if not exists referral_id uuid;

/* ── referrals ───────────────────────────────────────────────────────────── */
-- Both sides of the programme, in one row per referral:
--   pending   — code resolved at submission, discount not used yet
--   applied   — the referred seller's 10% discount was used on their order
--   credited  — the referrer's own 10% credit was used on a later order
-- The referrer side is deliberately manual (a tick-box on the referrer's own
-- next review), not an automatic refund/credit process — see the plan.
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),

  -- Null when the referrer typed their own details into the homepage form
  -- without (yet) having an account — FODEL reconciles that by hand.
  referrer_id uuid references profiles (id) on delete set null,
  referrer_name text,
  referrer_email text not null,

  referred_name text not null,
  referred_email text not null,
  -- Filled in once the referred person accepts their invite and a draft
  -- listing exists — see src/pages/api/portal/invite/accept.ts.
  referred_property_id uuid references properties (id) on delete set null,

  status text not null default 'pending' check (status in ('pending', 'applied', 'credited')),
  discount_applied_to uuid references payments (id) on delete set null,
  credited_to uuid references payments (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists referrals_referrer_idx on referrals (referrer_id);
create index if not exists referrals_referred_property_idx on referrals (referred_property_id);
create index if not exists referrals_referrer_email_idx on referrals (lower(referrer_email));

create trigger referrals_set_updated_at
  before update on referrals
  for each row execute function set_updated_at();

alter table referrals enable row level security;

create policy referrals_admin_all on referrals for all using (is_admin());

-- A seller reads referrals where they are the referrer — "who have I sent
-- FODEL's way" — but never the other side's rows.
create policy referrals_owner_read on referrals
  for select using (referrer_id = auth.uid());

-- Written exclusively through the service-role client (the public referral
-- form and the ad-submission form are both unauthenticated), same posture as
-- invites/payments.
