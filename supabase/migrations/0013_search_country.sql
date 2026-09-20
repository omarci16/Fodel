-- FODEL 1.3 — multi-country, area-range and Dutch-fallback search.
-- How to run this: Supabase → SQL Editor → New query → paste this whole file → Run.
-- This migration adds no enum values, so unlike 0005 it is one atomic paste.

/* ── coordinates: global sanity in SQL, country bounds in the editor ─── */

-- Constraint names are discovered from their definitions. `drop constraint if
-- exists` with a guessed name is a silent no-op — the exact failure that left
-- the old search function behind in 0004.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'properties'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ~* '(lat|lng).*(45\.7|48\.6|16|22\.9)'
  loop
    execute format('alter table properties drop constraint %I', c.conname);
  end loop;
end $$;

alter table properties drop constraint if exists properties_lat_global_check;
alter table properties add constraint properties_lat_global_check check (lat between -90 and 90);
alter table properties drop constraint if exists properties_lng_global_check;
alter table properties add constraint properties_lng_global_check check (lng between -180 and 180);

/* ── one canonical search function ───────────────────────────────────── */

-- 0004 accidentally named a 13-argument overload in its DROP even though the
-- function has always had 14 arguments. Drop the actual current signature.
drop function if exists search_properties(text,text,text,text,text,text,integer,integer,numeric,integer,numeric[],text,integer,integer);
drop function if exists search_properties(text,text,text,text,text,text,text,integer,integer,numeric,numeric,numeric,numeric,integer,numeric[],boolean,text,integer,integer);

create function search_properties(
  p_locale text default 'hu',
  p_query text default null,
  p_category text default null,
  p_country text default null,
  p_region text default null,
  p_county text default null,
  p_settlement text default null,
  p_price_min integer default null,
  p_price_max integer default null,
  p_floor_min numeric default null,
  p_floor_max numeric default null,
  p_plot_min numeric default null,
  p_plot_max numeric default null,
  p_bedrooms_min integer default null,
  p_bbox numeric[] default null,
  p_bargain boolean default null,
  p_sort text default 'featured',
  p_limit integer default 24,
  p_offset integer default 0
) returns table (id uuid, total_count bigint)
language sql stable as $$
  select p.id, count(*) over() as total_count
  from properties p
  join lateral (
    select tr.* from property_translations tr
    where tr.property_id = p.id
      and tr.locale in (coalesce(p_locale,'hu')::locale_code, 'hu'::locale_code)
    order by (tr.locale = coalesce(p_locale,'hu')::locale_code) desc
    limit 1
  ) t on true
  where p.status = 'published'
    and (p_category is null or p.category = p_category)
    and (p_country is null or p.country = upper(p_country))
    and (p_region is null or p.region = p_region)
    and (p_county is null or p.county = p_county)
    and (p_settlement is null or p.settlement ilike '%' || p_settlement || '%')
    and (p_price_min is null or p.price_eur >= p_price_min)
    and (p_price_max is null or p.price_eur < p_price_max)
    and (p_floor_min is null or p.floor_m2 >= p_floor_min)
    and (p_floor_max is null or p.floor_m2 <= p_floor_max)
    and (p_plot_min is null or p.plot_m2 >= p_plot_min)
    and (p_plot_max is null or p.plot_m2 <= p_plot_max)
    and (p_bedrooms_min is null or p.bedrooms >= p_bedrooms_min)
    and (p_bargain is null or p.bargain = p_bargain)
    and (p_bbox is null or (p.lng between p_bbox[1] and p_bbox[3] and p.lat between p_bbox[2] and p_bbox[4]))
    and (
      p_query is null or btrim(p_query) = '' or
      p.ref ilike '%' || btrim(p_query) || '%' or
      p.settlement ilike '%' || btrim(p_query) || '%' or
      p.county ilike '%' || btrim(p_query) || '%' or
      p.region ilike '%' || btrim(p_query) || '%' or
      t.search_vector @@ websearch_to_tsquery(
        case t.locale
          when 'hu' then 'hungarian'::regconfig
          when 'nl' then 'dutch'::regconfig
          when 'de' then 'german'::regconfig
          when 'en' then 'english'::regconfig
          when 'fr' then 'french'::regconfig
          else 'simple'::regconfig
        end,
        p_query
      )
    )
  order by
    case when p_sort = 'price-asc' then p.price_eur end asc nulls last,
    case when p_sort = 'price-desc' then p.price_eur end desc nulls last,
    case when p_sort = 'area-desc' then p.floor_m2 end desc nulls last,
    case when p_sort = 'bargain' then p.bargain_since end desc nulls last,
    p.featured desc,
    p.editors_pick desc,
    p.published_at desc
  limit p_limit offset p_offset;
$$;

create index if not exists properties_status_price_idx on properties (status, price_eur);
create index if not exists properties_status_floor_idx on properties (status, floor_m2);

notify pgrst, 'reload schema';
