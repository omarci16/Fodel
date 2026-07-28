/**
 * Shared by astro.config.mjs (which cannot import TypeScript) and by the app.
 * Keep this file plain JS.
 */

export const SITE_URL = 'https://fodel.nl';

/** Locales live in 1.0. de/en/fr are scaffolded in src/i18n/ui.ts but not routed yet. */
export const LOCALES = ['hu', 'nl'];

export const DEFAULT_LOCALE = 'hu';

/** Every locale FODEL sells in — used for the hreflang plan and the language switcher. */
export const PLANNED_LOCALES = ['hu', 'nl', 'de', 'en', 'fr'];
