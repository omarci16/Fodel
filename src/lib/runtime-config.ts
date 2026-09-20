/**
 * Runtime vocabulary and company facts.
 *
 * Listings are deliberately uncached in properties.ts because stale workflow
 * state is dangerous. These roughly sixty rows change a few times a year and
 * already sit behind routes with `s-maxage=300`, so a short process-local TTL
 * removes repeated reads without making an approval appear stale. A failed
 * configuration read always falls back to the checked-in 1.2 facts: a database
 * blip must not turn every public page into a 500.
 */
import { COMPANY } from '~/config/company';
import { CATEGORY_FALLBACK, PLANNED_LOCALES, type PlannedLocale } from '~/i18n/ui';
import { FEATURES, COUNTIES } from '~/data/features';
import { getSupabase } from '~/lib/supabase';

export type TaxonomyGroup =
  | 'category'
  | 'feature'
  | 'condition'
  | 'heating'
  | 'county'
  | 'region'
  | 'blog_category';

export type TaxonomyTerm = {
  id?: string;
  groupKey: TaxonomyGroup;
  key: string;
  labels: Partial<Record<PlannedLocale, string>> & { hu: string; nl: string };
  slugs: Partial<Record<PlannedLocale, string>>;
  schemaType?: string;
  sortOrder: number;
  enabled: boolean;
};

export type Taxonomy = Record<TaxonomyGroup, TaxonomyTerm[]>;
export type Company = Omit<typeof COMPANY, 'phones'> & {
  // `note` is optional here even though every static COMPANY.phones entry has
  // one: site_settings.phones is admin-editable from 1.3 on, and an admin
  // adding a phone through /portal/settings/company has no reason to be
  // forced into typing supplementary note text for it.
  phones: ReadonlyArray<Omit<(typeof COMPANY.phones)[number], 'note'> & { public: boolean; note?: Record<string, string> }>;
};

const groups: TaxonomyGroup[] = [
  'category', 'feature', 'condition', 'heating', 'county', 'region', 'blog_category',
];

function emptyTaxonomy(): Taxonomy {
  return Object.fromEntries(groups.map((group) => [group, []])) as unknown as Taxonomy;
}

export const TAXONOMY_FALLBACK: Taxonomy = (() => {
  const taxonomy = emptyTaxonomy();
  taxonomy.category = Object.entries(CATEGORY_FALLBACK).map(([key, value], index) => ({
    groupKey: 'category',
    key,
    labels: Object.fromEntries(
      PLANNED_LOCALES.map((locale) => [locale, value[locale].label])
    ) as TaxonomyTerm['labels'],
    slugs: { hu: value.hu.slug, nl: value.nl.slug },
    schemaType: value.schema,
    sortOrder: (index + 1) * 10,
    enabled: true,
  }));
  taxonomy.feature = Object.entries(FEATURES).map(([key, labels], index) => ({
    groupKey: 'feature', key, labels, slugs: {}, sortOrder: (index + 1) * 10, enabled: true,
  }));
  taxonomy.county = COUNTIES.map((label, index) => ({
    groupKey: 'county',
    key: label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'),
    labels: { hu: label, nl: label },
    slugs: {}, sortOrder: (index + 1) * 10, enabled: true,
  }));
  return taxonomy;
})();

export const COMPANY_FALLBACK: Company = {
  ...COMPANY,
  phones: COMPANY.phones.map((phone, index) => ({ ...phone, public: index !== 2 })),
};

type Cache<T> = { value?: T; expiresAt: number; pending?: Promise<T> };
const taxonomyCache: Cache<Taxonomy> = { expiresAt: 0 };
const companyCache: Cache<Company> = { expiresAt: 0 };
const TTL_MS = 60_000;

async function cached<T>(cache: Cache<T>, load: () => Promise<T>, fallback: T): Promise<T> {
  if (cache.value && cache.expiresAt > Date.now()) return cache.value;
  if (cache.pending) return cache.pending;
  cache.pending = load()
    .then((value) => {
      cache.value = value;
      cache.expiresAt = Date.now() + TTL_MS;
      return value;
    })
    .catch((error) => {
      console.error('[runtime-config] database read failed; using checked-in fallback', error);
      cache.value = fallback;
      cache.expiresAt = Date.now() + TTL_MS;
      return fallback;
    })
    .finally(() => { cache.pending = undefined; });
  return cache.pending;
}

export async function getTaxonomy(): Promise<Taxonomy> {
  return cached(taxonomyCache, async () => {
    const { data, error } = await getSupabase()
      .from('taxonomy_terms')
      .select('id, group_key, key, labels, slugs, schema_type, sort_order, enabled')
      .order('sort_order');
    if (error) throw error;
    const taxonomy = emptyTaxonomy();
    for (const row of data ?? []) {
      const groupKey = row.group_key as TaxonomyGroup;
      if (!taxonomy[groupKey]) continue;
      taxonomy[groupKey].push({
        id: row.id,
        groupKey,
        key: row.key,
        labels: row.labels,
        slugs: row.slugs ?? {},
        schemaType: row.schema_type ?? undefined,
        sortOrder: row.sort_order,
        enabled: row.enabled,
      });
    }
    return taxonomy;
  }, TAXONOMY_FALLBACK);
}

export async function getCompany(): Promise<Company> {
  return cached(companyCache, async () => {
    const { data, error } = await getSupabase().from('site_settings').select('*').eq('id', 1).single();
    if (error) throw error;
    return {
      ...COMPANY_FALLBACK,
      names: data.names,
      phones: data.phones,
      email: data.emails,
      address: data.address,
      registration: data.registration,
      hours: data.hours,
      banks: data.banks,
      social: data.social,
      reach: data.reach,
      network: data.network,
      founded: data.founded,
      foundedIn: data.founded_in,
      principal: data.principal,
    } as Company;
  }, COMPANY_FALLBACK);
}

export function categoryBySlug(taxonomy: Taxonomy, locale: 'hu' | 'nl', slug: string) {
  return taxonomy.category.find((term) => term.slugs[locale] === slug);
}

export function termLabel(term: TaxonomyTerm | undefined, locale: PlannedLocale): string {
  return term?.labels[locale] ?? term?.labels.hu ?? term?.key ?? '';
}
