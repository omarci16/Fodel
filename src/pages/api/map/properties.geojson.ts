import type { APIRoute } from 'astro';
import { activeProperties, text, url as propertyUrl } from '~/lib/properties';
import { categoryLabel, isLocale, type CategoryKey } from '~/i18n/ui';
import { eur } from '~/lib/format';

export const prerender = false;

/** Feeds the browse map's clustered markers. Cached briefly — see the calling pages' own s-maxage. */
export const GET: APIRoute = async ({ url }) => {
  const localeParam = url.searchParams.get('locale');
  const locale = isLocale(localeParam ?? '') ? (localeParam as 'hu' | 'nl') : 'hu';

  const properties = await activeProperties();

  const features = properties.map((p) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [p.data.location.lng, p.data.location.lat] },
    properties: {
      ref: p.data.ref,
      title: text(p.data.title, locale),
      category: categoryLabel(p.data.category as CategoryKey, locale),
      price: eur(p.data.price.eur),
      url: propertyUrl(p, locale),
    },
  }));

  return new Response(JSON.stringify({ type: 'FeatureCollection', features }), {
    headers: {
      'content-type': 'application/geo+json',
      'cache-control': 's-maxage=300, stale-while-revalidate=86400',
    },
  });
};
