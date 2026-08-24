/**
 * Sitemap for property detail pages.
 *
 * @astrojs/sitemap builds its sitemap from routes it can see at build time —
 * which works for every static page, but property detail pages no longer
 * have a fixed list: they're looked up from Supabase per request (see
 * src/pages/hu/[slug].astro). This is a second, hand-written sitemap that
 * queries the same data live and lists every property currently live, so
 * search engines still find each listing without waiting for a rebuild.
 * Declared to crawlers via a second `Sitemap:` line in public/robots.txt —
 * a page is allowed to point to more than one sitemap file.
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { activeProperties, url as propertyUrl } from '~/lib/properties';
import { LOCALES } from '~/i18n/ui';

const SITE = 'https://fodel.nl';

export const GET: APIRoute = async () => {
  const properties = await activeProperties();

  const urls = properties.map((p) => {
    const links = LOCALES.map(
      (l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${propertyUrl(p, l)}" />`
    ).join('');
    // Hungarian is the canonical entry when both exist, matching the rest of
    // the site's hreflang graph (see src/lib/page.ts alternatesFor).
    return `<url><loc>${SITE}${propertyUrl(p, 'hu')}</loc><lastmod>${p.data.listing.publishedAt
      .toISOString()
      .slice(0, 10)}</lastmod>${links}</url>`;
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=86400',
    },
  });
};
