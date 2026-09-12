/**
 * Sitemap for blog posts — same reasoning as sitemap-properties.xml.ts:
 * @astrojs/sitemap only sees build-time routes, and posts are now looked up
 * from Supabase per request. Declared via a third `Sitemap:` line in
 * public/robots.txt.
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { publishedPosts, siblingPost } from '~/lib/blog';
import { path } from '~/i18n/ui';

const SITE = 'https://fodel.nl';

export const GET: APIRoute = async () => {
  const [hu, nl] = await Promise.all([publishedPosts('hu'), publishedPosts('nl')]);

  const urls = await Promise.all(
    [...hu, ...nl].map(async (post) => {
      const loc = `${SITE}${path(post.locale, 'blog')}${post.slug}/`;
      const otherLocale = post.locale === 'hu' ? 'nl' : 'hu';
      const sibling = await siblingPost(post, otherLocale);
      const links = [
        `<xhtml:link rel="alternate" hreflang="${post.locale}" href="${loc}" />`,
        ...(sibling
          ? [`<xhtml:link rel="alternate" hreflang="${otherLocale}" href="${SITE}${path(otherLocale, 'blog')}${sibling.slug}/" />`]
          : []),
      ].join('');
      const lastmod = (post.published_at ?? post.updated_at).toISOString().slice(0, 10);
      return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod>${links}</url>`;
    })
  );

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
