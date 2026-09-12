export const prerender = false;

import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { publishedPosts } from '~/lib/blog';
import { path } from '~/i18n/ui';

export async function GET(context: APIContext) {
  const posts = await publishedPosts('hu');
  return rss({
    title: 'FODEL Ingatlan — Hírek és cikkek',
    description: 'Elemzések a magyar ingatlanpiacról és a nyugat-európai vevőkről.',
    site: context.site ?? 'https://fodel.nl',
    items: posts.map((post) => ({
      title: post.title,
      description: post.excerpt,
      pubDate: post.published_at ?? post.updated_at,
      link: `${path('hu', 'blog')}${post.slug}/`,
    })),
  });
}
