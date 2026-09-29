/**
 * robots.txt, generated so its sitemap lines follow SITE_URL (brief 3 §A) —
 * it used to be a static file in public/ with the origin typed in three times.
 */
export const prerender = true;

import type { APIRoute } from 'astro';
import { SITE_URL } from '~/config/site.mjs';

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /
Disallow: /api/

# Answer engines. FODEL's content is factual and plainly stated — prices,
# commission terms, process steps — which is what these crawlers surface well.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${SITE_URL}/sitemap-index.xml
Sitemap: ${SITE_URL}/sitemap-properties.xml
Sitemap: ${SITE_URL}/sitemap-blog.xml
`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } }
  );
