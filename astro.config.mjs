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
  // Every POST form on the site (portal login, enquiries, ad submission,
  // search requests…) was returning "Cross-site POST form submissions are
  // forbidden" in production. Not a bug in the form code: Astro's CSRF check
  // (security.checkOrigin, on by default) compares the browser's real Origin
  // header against Astro's own reconstruction of the request's origin — and
  // Astro has never trusted Host/X-Forwarded-Host for that reconstruction
  // unless the real domain is explicitly allowlisted here (added in Astro
  // 5.14.2, specifically to stop a spoofed forwarded-header attack). Without
  // this, Astro fell back to "localhost" for every request, which can never
  // match a real Origin header — so the check failed on every single
  // same-site submission, not just cross-site ones. Verified directly: a
  // POST to the live site with the *correct* Origin header still 403'd until
  // this was added. Vercel's own dynamic per-deployment preview URLs
  // (fodel-<hash>-….vercel.app) are deliberately left out — they already sit
  // behind Vercel's own SSO gate (confirmed live: an anonymous request to
  // one redirects to vercel.com/sso-api), so an attacker can't reach them to
  // exploit the gap anyway, and they change on every deploy.
  security: {
    allowedDomains: [
      { protocol: 'https', hostname: 'fodel.vercel.app' },
      { protocol: 'https', hostname: 'fodel-marton-oroszs-projects.vercel.app' },
      { protocol: 'https', hostname: 'fodel-git-main-marton-oroszs-projects.vercel.app' },
      // The real domain, once DNS is pointed at Vercel — see README's
      // "Before this can go live".
      { protocol: 'https', hostname: 'fodel.nl' },
      { protocol: 'https', hostname: 'www.fodel.nl' },
    ],
  },
  // imageService: true — deliberately NOT the build-time-sharp choice this
  // config used to make (see the `image` block below, and the equivalent
  // `imageCDN: false` this project shipped with on Netlify). Verified live:
  // Astro's own on-demand /_image endpoint 404s once this adapter re-bundles
  // the server function for a Vercel Serverless Function — every SSR page's
  // images broke, not just remote ones, because Astro defers *all* <Image>
  // processing to that endpoint on a page it can't fully pre-render (i.e.
  // every page here, since all of them read Supabase). This is a known,
  // reported Astro/adapter bundling bug (withastro/astro#13183 and related
  // issues), not something fixable from this file alone. Routing every image
  // through Vercel's own Image Optimization API instead sidesteps the broken
  // endpoint entirely rather than working around it. The adapter carries our
  // `image.remotePatterns` below into Vercel's image config automatically,
  // so Supabase-hosted photos stay allowed with no extra setting here.
  adapter: vercel({ imageService: true }),

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
    // `service` here is what `astro dev` and `astro build`'s own build-time
    // image generation use (sharp — real, and still what processes every
    // statically-known image at build time). In production on Vercel, the
    // adapter's `imageService: true` above additionally takes over the
    // *on-demand* transform path (astro/dist/assets/endpoint) and points it
    // at Vercel's Image Optimization API instead — see the adapter comment.
    service: { entrypoint: 'astro/assets/services/sharp' },
    responsiveStyles: true,
    layout: 'constrained',
    // Property photos a seller uploads through the portal live in Supabase
    // Storage, not the repo, so <Image> needs to be allowed to fetch and
    // transform them on request. The Vercel adapter reads this same array to
    // configure its own Image Optimization API — one list, not two.
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },

  build: {
    inlineStylesheets: 'always',
  },
});
