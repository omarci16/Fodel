/**
 * What an owner asked for when placing the ad — package, extras and an
 * optional on-site service — kept with their draft (`properties.requested_extras`,
 * migration 0015).
 *
 * Before brief 3 only the package survived the trip from the public form into
 * the draft; highlight, video and translations reached FODEL in the
 * notification email and nowhere else, so the review screen priced listings
 * without them (brief 3 item 14). This is a *request*, never an order: the
 * review screen pre-ticks from it and the admin confirms every line. No price
 * is ever read from here — prices come from the catalogue in company.ts.
 */
import { isOnsiteServiceId, TRANSLATION_LANGUAGES, type OnsiteServiceId } from '~/config/company';

export type RequestedExtras = {
  source?: 'submit_form' | 'listing_editor';
  /** ISO timestamp of the request. */
  at?: string;
  package?: string;
  /** Language codes the owner wants FODEL to translate into (nl, de, en, fr). */
  translations?: string[];
  categoryHighlight?: boolean;
  homepageHighlight?: boolean;
  video?: boolean;
  service?: OnsiteServiceId | null;
};

const LANGS: readonly string[] = TRANSLATION_LANGUAGES;

/**
 * From the submit form's posted values. Everything is whitelisted: unknown
 * languages, highlight values or services are dropped rather than stored.
 */
export function extrasFromForm(values: Record<string, string>): RequestedExtras {
  const translations = (values.translations ?? '')
    .split(/[\s,]+/)
    .map((code) => code.trim().toLowerCase())
    .filter((code, index, all) => LANGS.includes(code) && all.indexOf(code) === index);
  const highlight = values.highlight ?? 'none';
  return {
    source: 'submit_form',
    at: new Date().toISOString(),
    package: values.package === 'normal-12m' || values.package === 'cheap-6m' ? values.package : undefined,
    translations,
    categoryHighlight: highlight === 'category' || highlight === 'both',
    homepageHighlight: highlight === 'homepage' || highlight === 'both',
    video: values.video === 'yes',
    service: isOnsiteServiceId(values.service) ? values.service : null,
  };
}

/** Reads a stored value defensively — rows from before 0015 have `{}` or nothing. */
export function readRequestedExtras(value: unknown): RequestedExtras {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  return {
    source: raw.source === 'listing_editor' ? 'listing_editor' : raw.source === 'submit_form' ? 'submit_form' : undefined,
    at: typeof raw.at === 'string' ? raw.at : undefined,
    package: typeof raw.package === 'string' ? raw.package : undefined,
    translations: Array.isArray(raw.translations) ? raw.translations.filter((code): code is string => typeof code === 'string' && LANGS.includes(code)) : [],
    categoryHighlight: raw.categoryHighlight === true,
    homepageHighlight: raw.homepageHighlight === true,
    video: raw.video === true,
    service: isOnsiteServiceId(raw.service) ? raw.service : null,
  };
}

/** True when the owner asked for anything beyond the package. */
export function hasRequests(extras: RequestedExtras): boolean {
  return Boolean(
    (extras.translations?.length ?? 0) > 0 || extras.categoryHighlight || extras.homepageHighlight || extras.video || extras.service
  );
}

/** Hungarian summary lines for the admin (review screen, service list). */
export function describeRequestedExtras(extras: RequestedExtras): string[] {
  const lines: string[] = [];
  const LANG_HU: Record<string, string> = { nl: 'holland', de: 'német', en: 'angol', fr: 'francia' };
  if (extras.translations?.length) lines.push(`Fordítás: ${extras.translations.map((code) => LANG_HU[code] ?? code).join(', ')}`);
  if (extras.categoryHighlight) lines.push('Kiemelés a kategóriában');
  if (extras.homepageHighlight) lines.push('Kiemelés a főoldalon');
  if (extras.video) lines.push('Videós bemutató (saját videó elhelyezése)');
  return lines;
}
