import type { APIRoute } from 'astro';
import { activeProperties, text, url as propertyUrl } from '~/lib/properties';
import { isLocale } from '~/i18n/ui';
import { eur } from '~/lib/format';

export const prerender = false;

/** Feeds the browse map's clustered markers. Cached briefly — see the calling pages' own s-maxage. */
export const GET: APIRoute = async ({ url }) => {
  const localeParam = url.searchParams.get('locale');
  const locale = isLocale(localeParam ?? '') ? (localeParam as 'hu' | 'nl') : 'hu';

  const bbox = url.searchParams.get('bbox')?.split(',').map(Number);
  const properties = (await activeProperties()).filter((property) =>
    !bbox || bbox.length !== 4 || (
      property.data.location.lng >= bbox[0] && property.data.location.lng <= bbox[2] &&
      property.data.location.lat >= bbox[1] && property.data.location.lat <= bbox[3]
    )
  );

  const features = properties.map((p) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [p.data.location.lng, p.data.location.lat] },
    properties: {
      ref: p.data.ref,
      title: text(p.data.title, locale),
      category: p.data.categoryLabels[locale] ?? p.data.categoryLabels.hu,
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
