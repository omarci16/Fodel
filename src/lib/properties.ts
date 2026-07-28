/**
 * Property queries and locale resolution.
 *
 * A listing's Hungarian text always exists; other locales exist only if the
 * seller paid €25 for that translation. When a locale is missing we fall back
 * to Hungarian rather than hiding the listing — a Dutch buyer seeing the
 * Hungarian description is far better than not seeing the property at all.
 */

import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale, CategoryKey } from '~/i18n/ui';
import { propertyPath } from '~/i18n/ui';

export type Property = CollectionEntry<'properties'>;

type LocalisedText = { hu: string; nl?: string; de?: string; en?: string; fr?: string };

/** Resolve a localised field, falling back to Hungarian. */
export function text(field: LocalisedText | undefined, locale: Locale): string {
  if (!field) return '';
  return field[locale] ?? field.hu ?? '';
}

/** True when the seller paid for this locale, so we can mark machine fallbacks. */
export function hasTranslation(p: Property, locale: Locale): boolean {
  return p.data.listing.languages.includes(locale);
}

export async function allProperties(): Promise<Property[]> {
  const entries = await getCollection('properties');
  return entries.sort(sortByFeaturedThenDate);
}

export async function activeProperties(): Promise<Property[]> {
  return (await allProperties()).filter((p) => p.data.status === 'active');
}

export async function soldProperties(): Promise<Property[]> {
  return (await allProperties()).filter((p) => p.data.status === 'sold');
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
export const PRICE_BANDS = [
  { id: 'to-75', max: 75000 },
  { id: '75-150', min: 75000, max: 150000 },
  { id: '150-250', min: 150000, max: 250000 },
  { id: 'from-250', min: 250000 },
] as const;

export function priceBandLabel(band: (typeof PRICE_BANDS)[number]): string {
  const f = (n: number) => `€${(n / 1000).toFixed(0)}k`;
  if (!band.min) return `< ${f(band.max!)}`;
  if (!band.max) return `> ${f(band.min)}`;
  return `${f(band.min)} – ${f(band.max)}`;
}
