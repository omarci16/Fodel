// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

import { SITE_URL, LOCALES, DEFAULT_LOCALE } from './src/config/site.mjs';

/**
 * FODEL 1.1
 *
 * Hybrid rendering, not fully static any more: property data now lives in
 * Supabase, not in files the build can read once and freeze. Content pages
 * (about, sellers, legal, blog, …) still declare `export const prerender =
 * true` and are exactly as static as before. Pages that read from Supabase —
 * home, property list, property detail, sold archive — render on request
 * with a short CDN cache (`s-maxage=300`), so an admin approving a listing
 * shows up live within minutes without a full rebuild. The four form
 * endpoints under /api were already `prerender = false`; nothing changes for
 * them.
 *
 * No UI framework is installed on purpose. The interactive pieces (filters,
 * gallery, mobile nav, consent) are small vanilla scripts over server-
 * rendered markup, so listings stay in the HTML for crawlers and JS stays
 * near zero.
 *
 * Hosted on Vercel. `output: 'server'` means every route below renders as a
 * Vercel Serverless Function unless it declares `export const prerender =
 * true` — nothing host-specific beyond the adapter line itself.
 */
export default defineConfig({
  site: SITE_URL,
  output: 'server',
  // imageService: false — the adapter otherwise hands every <Image> to
  // Vercel's own Image Optimization API at runtime, which ships the
  // unoptimised originals and ties the build to one host. We optimise with
  // sharp instead, same as the rest of this config's `image` block.
  adapter: vercel({ imageService: false }),

  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...LOCALES],
    // Manual, not the automatic `{ prefixDefaultLocale, redirectToDefaultLocale }`
    // strategy this started with. That automatic mode does more than its name
    // suggests: for every *page* route (not API routes) it silently 404s any
    // path whose segments don't include a configured locale — found while
    // wiring up the portal (Stage 2) and /de,/en,/fr (Stage 8), both entirely
    // outside /hu/ or /nl/, which the automatic strategy was quietly killing
    // even though a real page existed at each. Nothing in this codebase uses
    // Astro's built-in i18n helpers (Astro.currentLocale, getRelativeLocaleUrl
    // — checked, zero references): routing, URLs and hreflang are all
    // hand-rolled in src/i18n/ui.ts and src/lib/page.ts, and the root's own
    // redirect is hand-rolled in src/pages/index.astro. So `manual` disables
    // exactly the one behaviour that was doing anything here, and it was
    // actively wrong.
    routing: 'manual',
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: DEFAULT_LOCALE,
        locales: { hu: 'hu-HU', nl: 'nl-NL' },
      },
      filter: (page) => !page.includes('/api/'),
    }),
  ],

  image: {
    // Optimise at build time with sharp rather than delegating to the host's
    // image CDN. Costs build seconds, but the output is fast on any host and
    // the file sizes are verifiable in dist/ instead of taken on trust.
    service: { entrypoint: 'astro/assets/services/sharp' },
    responsiveStyles: true,
    layout: 'constrained',
    // Property photos a seller uploads through the portal (Stage 3) live in
    // Supabase Storage, not the repo, so <Image> needs to be allowed to
    // fetch and transform them on request — the same sharp service handles
    // both local demo photos and these at request time under SSR.
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },

  build: {
    inlineStylesheets: 'always',
  },
});
