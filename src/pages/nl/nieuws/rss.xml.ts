export const prerender = false;

import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { publishedPosts } from '~/lib/blog';
import { path } from '~/i18n/ui';

export async function GET(context: APIContext) {
  const posts = await publishedPosts('nl');
  return rss({
    title: 'FODEL Vastgoed — Nieuws en achtergrond',
    description: 'Analyses over de Hongaarse vastgoedmarkt en West-Europese kopers.',
    site: context.site ?? 'https://fodel.nl',
    items: posts.map((post) => ({
      title: post.title,
      description: post.excerpt,
      pubDate: post.published_at ?? post.updated_at,
      link: `${path('nl', 'blog')}${post.slug}/`,
    })),
  });
}
