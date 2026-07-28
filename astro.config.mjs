// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

import { SITE_URL, LOCALES, DEFAULT_LOCALE } from './src/config/site.mjs';

/**
 * FODEL 1.0
 *
 * Static by default — every page is real HTML in the response, which is the
 * whole point of the rebuild. Only the four form endpoints under /api opt out
 * via `export const prerender = false`; the Netlify adapter serves those.
 *
 * No UI framework is installed on purpose. The interactive pieces (filters,
 * gallery, mobile nav, consent) are small vanilla scripts over pre-rendered
 * markup, so listings stay in the HTML for crawlers and JS stays near zero.
 */
export default defineConfig({
  site: SITE_URL,
  output: 'static',
  // imageCDN: false — the adapter otherwise hands every <Image> to Netlify's
  // image CDN at runtime, which ships the unoptimised originals in dist/ and
  // ties the build to one host. We optimise with sharp instead.
  adapter: netlify({ imageCDN: false }),

  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...LOCALES],
    routing: {
      // /hu/ and /nl/ are both explicit. No bare-root content: the root
      // redirects, so we never serve the same page on two URLs.
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
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
  },

  build: {
    inlineStylesheets: 'always',
  },
});
