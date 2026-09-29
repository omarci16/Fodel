/**
 * Shared by astro.config.mjs (which cannot import TypeScript) and by the app.
 * Keep this file plain JS.
 */

/**
 * The canonical origin — the ONE place it is written (brief 3 §A). Every
 * canonical, hreflang, sitemap, RSS, robots/llms line, JSON-LD and email link
 * derives from this. fodel.eu from 2026-09-29 (client decision); the old
 * fodel.nl / fodel.hu / eladod.com hosts are redirected at DNS/host level.
 */
export const SITE_URL = 'https://fodel.eu';

/** The bare host, for copy that names the website ("látható a fodel.eu oldalon"). */
export const SITE_HOST = new URL(SITE_URL).host;

/** Locales live in 1.0. de/en/fr are scaffolded in src/i18n/ui.ts but not routed yet. */
export const LOCALES = ['hu', 'nl'];

export const DEFAULT_LOCALE = 'hu';

/** Every locale FODEL sells in — used for the hreflang plan and the language switcher. */
export const PLANNED_LOCALES = ['hu', 'nl', 'de', 'en', 'fr'];
