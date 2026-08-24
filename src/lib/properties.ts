/**
 * Property queries and locale resolution.
 *
 * Until Stage 1, this file read six Markdown files through Astro's content
 * collections. It now queries Supabase instead — but every exported function
 * keeps its exact old name and shape, so every page and component that
 * consumes a `Property` (PropertyCard, PropertiesPage, PropertyDetailPage,
 * HomePage, SoldPage, seo.ts) needed zero changes. Only this file and the two
 * property detail routes know the data now comes from a database.
 *
 * A listing's Hungarian text always exists; other locales exist only if the
 * seller paid €25 for that translation. When a locale is missing we fall back
 * to Hungarian rather than hiding the listing — a Dutch buyer seeing the
 * Hungarian description is far better than not seeing the property at all.
 *
 * Queries use the anon Supabase client, so Row-Level Security — not this
 * file — is what actually stops an unpublished listing from ever being
 * returned. See src/lib/supabase.ts.
 */

import { getSupabase } from '~/lib/supabase';
import { resolveImage } from '~/lib/property-images';
import type { Locale, CategoryKey } from '~/i18n/ui';
import { LOCALES, propertyPath } from '~/i18n/ui';
import type { ImageMetadata } from 'astro';

type LocalisedText = { hu: string; nl?: string; de?: string; en?: string; fr?: string };

export type Property = {
  id: string;
  data: {
    ref: string;
    category: CategoryKey;
    status: 'active' | 'reserved' | 'sold';
    title: LocalisedText;
    subtitle?: LocalisedText;
    description: LocalisedText;
    body: LocalisedText;
    price: { eur: number; huf: number; asOf: Date; negotiable: boolean };
    location: {
      settlement: string;
      county: string;
      region: string;
      lat: number;
      lng: number;
      precision: 'exact' | 'approximate';
    };
    areas: { floorM2?: number; plotM2: number };
    rooms?: { bedrooms: number; bathrooms: number };
    building: {
      yearBuilt?: number;
      renovatedIn?: number;
      condition?: LocalisedText;
      heating?: LocalisedText;
      epcClass: string;
    };
    features: string[];
    media: {
      // A local demo photo (Stage 1's seed data) resolves to a real
      // ImageMetadata object; a photo uploaded through the portal (Stage 3)
      // is a plain Supabase Storage URL. <Image> accepts either — see
      // astro.config.mjs's `image.remotePatterns` and the `inferSize` prop
      // on the <Image> calls in PropertyCard and PropertyDetailPage.
      hero: ImageMetadata | string;
      heroAlt: LocalisedText;
      gallery: { src: ImageMetadata | string; alt: LocalisedText; label?: LocalisedText }[];
      videoUrl?: string;
    };
    listing: {
      package: 'cheap-6m' | 'normal-12m';
      featured: boolean;
      homepageFeatured: boolean;
      homepageOrder: number;
      publishedAt: Date;
      expiresAt: Date;
      languages: Locale[];
    };
    seller: { contactVisible: boolean; name?: string; phone?: string; speaks: string[] };
    tag?: LocalisedText;
  };
};

/* ── Row shapes as they come back from Supabase ──────────────────────────── */

type TranslationRow = {
  locale: string;
  title: string;
  subtitle: string | null;
  description: string;
  body: string;
  condition: string | null;
  heating: string | null;
  tag: string | null;
};

type MediaRow = {
  storage_path: string;
  alt: Record<string, string>;
  label: Record<string, string> | null;
  sort_order: number;
  is_hero: boolean;
};

type PropertyRow = {
  id: string;
  ref: string;
  category: CategoryKey;
  status: 'published' | 'sold';
  reserved: boolean;
  settlement: string;
  county: string;
  region: string;
  lat: number;
  lng: number;
  precision: 'exact' | 'approximate';
  price_eur: number;
  price_huf: number;
  price_asof: string;
  price_negotiable: boolean;
  floor_m2: number | null;
  plot_m2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  year_built: number | null;
  renovated_in: number | null;
  epc_class: string;
  features: string[];
  video_url: string | null;
  seller_contact_visible: boolean;
  seller_name: string | null;
  seller_phone: string | null;
  seller_speaks: string[];
  package: 'cheap-6m' | 'normal-12m';
  featured: boolean;
  homepage_featured: boolean;
  homepage_order: number;
  published_at: string | null;
  expires_at: string | null;
  property_translations: TranslationRow[];
  property_media: MediaRow[];
};

/** A demo photo is a bare filename resolved locally; a real upload is a full Storage URL. */
function resolveMedia(storagePath: string): ImageMetadata | string {
  return storagePath.startsWith('http') ? storagePath : resolveImage(storagePath);
}

/** Build a `{hu, nl, ...}` object from translation rows. `hu` is assumed present. */
function localisedField(
  rows: TranslationRow[],
  field: 'title' | 'subtitle' | 'description' | 'body' | 'condition' | 'heating' | 'tag'
): LocalisedText | undefined {
  const byLocale = Object.fromEntries(rows.map((r) => [r.locale, r[field]]));
  const hu = byLocale.hu;
  if (!hu) return undefined;
  const out: LocalisedText = { hu };
  for (const locale of ['nl', 'de', 'en', 'fr'] as const) {
    const value = byLocale[locale];
    if (value) out[locale] = value;
  }
  return out;
}

function mapRow(row: PropertyRow): Property {
  const translations = row.property_translations;
  const media = [...row.property_media].sort((a, b) => a.sort_order - b.sort_order);
  const hero = media.find((m) => m.is_hero) ?? media[0];
  const gallery = media.filter((m) => m !== hero);

  const languages = translations
    .map((t) => t.locale)
    .filter((l): l is Locale => (LOCALES as readonly string[]).includes(l));

  return {
    id: row.id,
    data: {
      ref: row.ref,
      category: row.category,
      status: row.status === 'sold' ? 'sold' : row.reserved ? 'reserved' : 'active',
      title: localisedField(translations, 'title')!,
      subtitle: localisedField(translations, 'subtitle'),
      description: localisedField(translations, 'description')!,
      body: localisedField(translations, 'body') ?? { hu: '' },
      price: {
        eur: row.price_eur,
        huf: row.price_huf,
        asOf: new Date(row.price_asof),
        negotiable: row.price_negotiable,
      },
      location: {
        settlement: row.settlement,
        county: row.county,
        region: row.region,
        lat: row.lat,
        lng: row.lng,
        precision: row.precision,
      },
      areas: { floorM2: row.floor_m2 ?? undefined, plotM2: row.plot_m2 },
      rooms:
        row.bedrooms != null && row.bathrooms != null
          ? { bedrooms: row.bedrooms, bathrooms: row.bathrooms }
          : undefined,
      building: {
        yearBuilt: row.year_built ?? undefined,
        renovatedIn: row.renovated_in ?? undefined,
        condition: localisedField(translations, 'condition'),
        heating: localisedField(translations, 'heating'),
        epcClass: row.epc_class,
      },
      features: row.features,
      media: {
        hero: resolveMedia(hero.storage_path),
        heroAlt: (hero.alt as LocalisedText) ?? { hu: '' },
        gallery: gallery.map((m) => ({
          src: resolveMedia(m.storage_path),
          alt: (m.alt as LocalisedText) ?? { hu: '' },
          label: (m.label as LocalisedText) ?? undefined,
        })),
        videoUrl: row.video_url ?? undefined,
      },
      listing: {
        package: row.package,
        featured: row.featured,
        homepageFeatured: row.homepage_featured,
        homepageOrder: row.homepage_order,
        publishedAt: new Date(row.published_at ?? row.price_asof),
        expiresAt: new Date(row.expires_at ?? row.price_asof),
        languages,
      },
      seller: {
        contactVisible: row.seller_contact_visible,
        name: row.seller_name ?? undefined,
        phone: row.seller_phone ?? undefined,
        speaks: row.seller_speaks,
      },
      tag: localisedField(translations, 'tag'),
    },
  };
}

/** Resolve a localised field, falling back to Hungarian. */
export function text(field: LocalisedText | undefined, locale: Locale): string {
  if (!field) return '';
  return field[locale] ?? field.hu ?? '';
}

/** True when the seller paid for this locale, so we can mark machine fallbacks. */
export function hasTranslation(p: Property, locale: Locale): boolean {
  return p.data.listing.languages.includes(locale);
}

/**
 * Every property visible to the public: published (for sale) or sold (for
 * the archive). RLS enforces this same filter independently — this `.in()`
 * is what makes the SQL efficient, not what makes it safe.
 *
 * Deliberately uncached: Netlify keeps serverless functions warm across
 * separate visitor requests, so any cache here without a TTL would silently
 * serve stale listings between CDN revalidations — undermining the one thing
 * the approval workflow (Stage 4) depends on: approve a listing and it
 * appears live. The route-level `s-maxage` header is where caching belongs.
 */
async function fetchAll(): Promise<Property[]> {
  const { data, error } = await getSupabase()
    .from('properties')
    .select('*, property_translations(*), property_media(*)')
    .in('status', ['published', 'sold']);
  if (error) throw new Error(`Failed to load properties from Supabase: ${error.message}`);
  return ((data ?? []) as PropertyRow[]).map(mapRow).sort(sortByFeaturedThenDate);
}

export async function allProperties(): Promise<Property[]> {
  return fetchAll();
}

export type SearchParams = {
  locale: Locale;
  q?: string;
  category?: string;
  region?: string;
  county?: string;
  settlement?: string;
  priceMin?: number;
  priceMax?: number;
  floorMin?: number;
  bedroomsMin?: number;
  /** [west, south, east, north] from the browse map's "search this area". */
  bbox?: [number, number, number, number];
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'area-desc';
  page?: number;
  perPage?: number;
};

export type SearchResult = { properties: Property[]; total: number; page: number; perPage: number };

/**
 * The Stage 6 server-side query. The `search_properties` Postgres function
 * (supabase/migrations/0004_search.sql) does the actual filtering, free-text
 * matching and ordering in one round trip and hands back matching ids in
 * order; this fetches the full rows for exactly those ids and re-applies
 * that order (Postgres doesn't guarantee `id = ANY(...)` preserves it) using
 * the same mapRow used everywhere else, so a search result is shaped
 * identically to any other Property.
 */
export async function searchProperties(params: SearchParams): Promise<SearchResult> {
  const perPage = params.perPage ?? 24;
  const page = Math.max(1, params.page ?? 1);

  const { data: matches, error: rpcError } = await getSupabase().rpc('search_properties', {
    p_locale: params.locale,
    p_query: params.q || null,
    p_category: params.category || null,
    p_region: params.region || null,
    p_county: params.county || null,
    p_settlement: params.settlement || null,
    p_price_min: params.priceMin ?? null,
    p_price_max: params.priceMax ?? null,
    p_floor_min: params.floorMin ?? null,
    p_bedrooms_min: params.bedroomsMin ?? null,
    p_bbox: params.bbox ?? null,
    p_sort: params.sort ?? 'featured',
    p_limit: perPage,
    p_offset: (page - 1) * perPage,
  });
  if (rpcError) throw new Error(`Search failed: ${rpcError.message}`);

  const ids = (matches ?? []).map((m: { id: string }) => m.id);
  const total = matches?.[0]?.total_count ?? 0;
  if (ids.length === 0) return { properties: [], total: Number(total), page, perPage };

  const { data, error } = await getSupabase()
    .from('properties')
    .select('*, property_translations(*), property_media(*)')
    .in('id', ids);
  if (error) throw new Error(`Failed to load search results: ${error.message}`);

  const byId = new Map(((data ?? []) as PropertyRow[]).map((row) => [row.id, mapRow(row)]));
  const properties = ids
    .map((id: string) => byId.get(id))
    .filter((p: Property | undefined): p is Property => Boolean(p));

  return { properties, total: Number(total), page, perPage };
}

export async function activeProperties(): Promise<Property[]> {
  return (await fetchAll()).filter((p) => p.data.status === 'active');
}

export async function soldProperties(): Promise<Property[]> {
  return (await fetchAll()).filter((p) => p.data.status === 'sold');
}

/**
 * Homepage placement is a product FODEL sell (€25/month), so the order is
 * theirs to set via `listing.homepageOrder` rather than falling out of a
 * publish date.
 */
export async function homepageFeatured(limit = 3): Promise<Property[]> {
  const active = await activeProperties();
  const featured = active.filter((p) => p.data.listing.homepageFeatured);
  return (featured.length ? featured : active)
    .sort((a, b) => a.data.listing.homepageOrder - b.data.listing.homepageOrder)
    .slice(0, limit);
}

/**
 * Related listings, ranked rather than filtered.
 *
 * A strict "same region OR same category" filter left most properties with a
 * single match, which renders as one lonely card in a three-column grid. This
 * scores every other listing and always returns the best `limit`, so the
 * section is either full or absent.
 */
export function similarTo(p: Property, pool: Property[], limit = 3): Property[] {
  const priceOf = (x: Property) => x.data.price.eur;

  return pool
    .filter((c) => c.id !== p.id && c.data.status === 'active')
    .map((c) => {
      let score = 0;
      if (c.data.location.region === p.data.location.region) score += 4;
      if (c.data.location.county === p.data.location.county) score += 2;
      if (c.data.category === p.data.category) score += 3;
      // Balaton and Balaton-felvidék are one market to a buyer.
      if (
        c.data.location.region.startsWith('Balaton') &&
        p.data.location.region.startsWith('Balaton')
      ) {
        score += 2;
      }
      // Closer asking price is a better comparison.
      const ratio = Math.min(priceOf(c), priceOf(p)) / Math.max(priceOf(c), priceOf(p));
      score += ratio * 2;
      return { entry: c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

function sortByFeaturedThenDate(a: Property, b: Property): number {
  const featured = Number(b.data.listing.featured) - Number(a.data.listing.featured);
  if (featured !== 0) return featured;
  return b.data.listing.publishedAt.getTime() - a.data.listing.publishedAt.getTime();
}

export function url(p: Property, locale: Locale): string {
  return propertyPath(locale, p.data.category as CategoryKey, p.data.ref);
}

/** Distinct regions present in the inventory, for filters and landing pages. */
export function regionsOf(properties: Property[]): string[] {
  return [...new Set(properties.map((p) => p.data.location.region))].sort();
}

export function countiesOf(properties: Property[]): string[] {
  return [...new Set(properties.map((p) => p.data.location.county))].sort();
}

export function categoriesOf(properties: Property[]): CategoryKey[] {
  return [...new Set(properties.map((p) => p.data.category))] as CategoryKey[];
}

/** URL-safe slug for a region or county name (handles Hungarian diacritics). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Price buckets used by the filter UI, in euro. */
// Every entry carries both keys (undefined where open-ended) so the type is
// uniform — a mix of "some entries have min, some have max" made every
// consumer's `band.min`/`band.max` access a type error once there was more
// than one (formatting-only) reader of this array.
export const PRICE_BANDS = [
  { id: 'to-75', min: undefined, max: 75000 },
  { id: '75-150', min: 75000, max: 150000 },
  { id: '150-250', min: 150000, max: 250000 },
  { id: 'from-250', min: 250000, max: undefined },
] as const;

export function priceBandLabel(band: (typeof PRICE_BANDS)[number]): string {
  const f = (n: number) => `€${(n / 1000).toFixed(0)}k`;
  if (!band.min) return `< ${f(band.max!)}`;
  if (!band.max) return `> ${f(band.min)}`;
  return `${f(band.min)} – ${f(band.max)}`;
}
