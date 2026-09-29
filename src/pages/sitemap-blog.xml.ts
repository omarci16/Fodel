/**
 * Sitemap for blog posts and case studies — same reasoning as
 * sitemap-properties.xml.ts: @astrojs/sitemap only sees build-time routes,
 * and posts are looked up from Supabase per request. Declared via a
 * `Sitemap:` line in public/robots.txt.
 *
 * hreflang pairs stay inside each page family, exactly as the pages declare
 * them: hu↔nl on the full site, en↔de on the bridge-style pages. Only live
 * siblings are listed; most posts have none.
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { publishedPosts, siblingPost, postPath, BLOG_LOCALES, type BlogLocale } from '~/lib/blog';

import { SITE_URL as SITE } from '~/config/site.mjs';
const FAMILY: Record<BlogLocale, BlogLocale> = { hu: 'nl', nl: 'hu', en: 'de', de: 'en' };

export const GET: APIRoute = async () => {
  const posts = (await Promise.all(BLOG_LOCALES.map((locale) => publishedPosts(locale)))).flat();

  const urls = await Promise.all(
    posts.map(async (post) => {
      const loc = `${SITE}${postPath(post)}`;
      const sibling = await siblingPost(post, FAMILY[post.locale]);
      const links = sibling
        ? [
            `<xhtml:link rel="alternate" hreflang="${post.locale}" href="${loc}" />`,
            `<xhtml:link rel="alternate" hreflang="${sibling.locale}" href="${SITE}${postPath(sibling)}" />`,
          ].join('')
        : '';
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
