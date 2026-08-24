-- FODEL 1.0 — Stage 6: server-side search.
--
-- PostgreSQL ships proper Hungarian and Dutch text-search dictionaries
-- (Snowball stemmers) out of the box — `hungarian` and `dutch` are both
-- built-in configurations, no extension needed. Each translation row gets a
-- search_vector built with the dictionary for ITS OWN locale, not a generic
-- one, so "kertek" and "kert" (garden, gardens) actually match each other in
-- Hungarian the way "tuinen" and "tuin" do in Dutch.

alter table property_translations add column if not exists search_vector tsvector
  generated always as (
    to_tsvector(
      case locale
        when 'hu' then 'hungarian'::regconfig
        when 'nl' then 'dutch'::regconfig
        when 'de' then 'german'::regconfig
        when 'en' then 'english'::regconfig
        when 'fr' then 'french'::regconfig
        else 'simple'::regconfig
      end,
      coalesce(title, '') || ' ' || coalesce(subtitle, '') || ' ' || coalesce(description, '') || ' ' || coalesce(body, '')
    )
  ) stored;

create index if not exists property_translations_search_idx on property_translations using gin (search_vector);

-- One query, one round trip: returns matching property ids in the requested
-- order, each row carrying the total match count (via a window function) so
-- the page can build "123 results" and pagination without a second COUNT
-- query. The actual property rows are then fetched by id from the app side,
-- reusing the same mapping code that already turns a row into a Property —
-- this function's only job is "which ids, in what order".
-- CREATE OR REPLACE cannot change a function's parameter list — dropping
-- first is required whenever a parameter is added or removed, not just for
-- this one edit.
drop function if exists search_properties(text, text, text, text, text, text, integer, integer, numeric, integer, text, integer, integer);

create function search_properties(
  p_locale text default 'hu',
  p_query text default null,
  p_category text default null,
  p_region text default null,
  p_county text default null,
  p_settlement text default null,
  p_price_min integer default null,
  p_price_max integer default null,
  p_floor_min numeric default null,
  p_bedrooms_min integer default null,
  -- [west, south, east, north] — the map's "search this area" bounding box.
  -- Plain lat/lng range comparisons; Hungary is small and never crosses the
  -- antimeridian, so this needs no PostGIS extension.
  p_bbox numeric[] default null,
  p_sort text default 'featured',
  p_limit integer default 24,
  p_offset integer default 0
) returns table (id uuid, total_count bigint)
language sql stable as $$
  select p.id, count(*) over() as total_count
  from properties p
  join property_translations t on t.property_id = p.id and t.locale = coalesce(p_locale, 'hu')::locale_code
  where p.status = 'published'
    and (p_category is null or p.category::text = p_category)
    and (p_region is null or p.region = p_region)
    and (p_county is null or p.county = p_county)
    and (p_settlement is null or p.settlement ilike '%' || p_settlement || '%')
    and (p_price_min is null or p.price_eur >= p_price_min)
    and (p_price_max is null or p.price_eur < p_price_max)
    and (p_floor_min is null or p.floor_m2 >= p_floor_min)
    and (p_bedrooms_min is null or p.bedrooms >= p_bedrooms_min)
    and (
      p_bbox is null or (
        p.lng between p_bbox[1] and p_bbox[3] and p.lat between p_bbox[2] and p_bbox[4]
      )
    )
    and (
      p_query is null or btrim(p_query) = '' or
      t.search_vector @@ websearch_to_tsquery(
        case p_locale
          when 'hu' then 'hungarian'::regconfig
          when 'nl' then 'dutch'::regconfig
          else 'simple'::regconfig
        end,
        p_query
      )
    )
  order by
    case when p_sort = 'price-asc' then p.price_eur end asc nulls last,
    case when p_sort = 'price-desc' then p.price_eur end desc nulls last,
    case when p_sort = 'area-desc' then p.floor_m2 end desc nulls last,
    p.featured desc,
    p.published_at desc
  limit p_limit offset p_offset;
$$;
