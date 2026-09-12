/**
 * Listing orders — what an approved listing costs, itemised.
 *
 * FODEL 1.1's payment model is approve-then-charge: an admin reviews a
 * submitted listing, confirms the package and ticks any extras, and the system
 * turns that into an order the owner pays before publication.
 *
 * Two rules run through this file:
 *
 * 1. **A price is never taken from the client.** Everything resolves against
 *    the catalogue in src/config/company.ts by id. The browser sends "the
 *    12-month package and two translations", never "€179".
 *
 * 2. **A stored order is denormalised on purpose.** The label and unit price
 *    are written into `payments.line_items` at the moment the order is made,
 *    not looked up again later. An order is a financial record: it has to
 *    still read correctly in three years, after the tariff on fodel.hu has
 *    changed twice. Re-deriving a 2026 total from the 2029 price list would
 *    quietly rewrite history.
 */
import { LISTING_PACKAGES, LISTING_EXTRAS } from '~/config/company';

export type OrderLocale = 'hu' | 'nl';

/** One line of a stored order, exactly as it lives in `payments.line_items`. */
export type OrderLine = {
  kind: 'package' | 'extra';
  id: string;
  quantity: number;
  unitCents: number;
  label: string;
};

/** What the admin's review form sends: ids and counts, never money. */
export type OrderSelection = {
  packageId: string;
  /** The €179 tier applies above 150M HUF — decided from the listing, not typed in. */
  aboveThreshold?: boolean;
  extras: { id: string; quantity: number }[];
};

/* ── Labels ──────────────────────────────────────────────────────────────── */
// The public price list (src/components/pages/PriceListPage.astro) writes its
// own marketing copy for these. These are the invoice wordings — shorter,
// literal, and safe to sit on a payment record for years.

const PACKAGE_LABEL: Record<string, Record<OrderLocale, string>> = {
  'cheap-6m': {
    hu: 'Hirdetés — 6 hónap',
    nl: 'Advertentie — 6 maanden',
  },
  'normal-12m': {
    hu: 'Hirdetés — 12 hónap',
    nl: 'Advertentie — 12 maanden',
  },
};

const EXTRA_LABEL: Record<string, Record<OrderLocale, string>> = {
  translation: { hu: 'Fordítás', nl: 'Vertaling' },
  'category-highlight': { hu: 'Kiemelés a kategóriában', nl: 'Uitgelicht in de categorie' },
  'homepage-highlight': { hu: 'Kiemelés a főoldalon', nl: 'Uitgelicht op de homepage' },
  video: { hu: 'Videós bemutató', nl: 'Videopresentatie' },
  'retro-images': { hu: 'Fotóretusálás', nl: 'Fotobewerking' },
  'renewal-6m': { hu: 'Hosszabbítás — 6 hónap', nl: 'Verlenging — 6 maanden' },
};

/**
 * The unit a quantity is counted in.
 *
 * Two forms, because the two places this appears need different grammar:
 * `one` for a rate ("€ 25 / taal"), `many` for a count ("Vertaling — 2 talen").
 * Dutch pluralises after a numeral and Hungarian does not — "2 nyelv" is
 * correct and "2 nyelvek" is wrong — so this cannot be one string with an "s"
 * bolted on.
 */
const EXTRA_UNIT: Record<string, Record<OrderLocale, { one: string; many: string }>> = {
  translation: {
    hu: { one: 'nyelv', many: 'nyelv' },
    nl: { one: 'taal', many: 'talen' },
  },
  'category-highlight': {
    hu: { one: 'hónap', many: 'hónap' },
    nl: { one: 'maand', many: 'maanden' },
  },
  'homepage-highlight': {
    hu: { one: 'hónap', many: 'hónap' },
    nl: { one: 'maand', many: 'maanden' },
  },
  video: { hu: { one: '', many: '' }, nl: { one: '', many: '' } },
  'retro-images': { hu: { one: '', many: '' }, nl: { one: '', many: '' } },
  'renewal-6m': { hu: { one: '', many: '' }, nl: { one: '', many: '' } },
};

/* ── Formatting ──────────────────────────────────────────────────────────── */

const NBSP = ' ';

/** €1 234 — matches src/lib/format.ts's `eur()`, but from cents. */
export function formatCents(cents: number): string {
  return `€${NBSP}${(cents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ── Building an order ───────────────────────────────────────────────────── */

/**
 * What an admin can put on an order, with today's prices. Drives the review
 * screen's checkboxes; `minMonths` is surfaced so the form can enforce
 * FODEL's own three-month minimum on highlighting rather than reinventing it.
 */
export function catalogue(locale: OrderLocale) {
  return {
    packages: LISTING_PACKAGES.map((pkg) => ({
      id: pkg.id,
      label: PACKAGE_LABEL[pkg.id]?.[locale] ?? pkg.id,
      priceEur: pkg.priceEur,
      priceEurAbove: 'priceEurAbove' in pkg ? pkg.priceEurAbove : undefined,
      thresholdHuf: 'thresholdHuf' in pkg ? pkg.thresholdHuf : undefined,
      months: pkg.months,
    })),
    extras: LISTING_EXTRAS.map((extra) => ({
      id: extra.id,
      label: EXTRA_LABEL[extra.id]?.[locale] ?? extra.id,
      unit: EXTRA_UNIT[extra.id]?.[locale]?.one ?? '',
      priceEur: extra.priceEur,
      minMonths: 'minMonths' in extra ? extra.minMonths : undefined,
    })),
  };
}

export class OrderError extends Error {
  constructor(public code: 'unknown-package' | 'unknown-extra' | 'bad-quantity') {
    super(code);
  }
}

/**
 * Turns a selection of ids into stored order lines.
 *
 * Throws rather than silently skipping an unknown id: an order that quietly
 * drops a line the admin ticked is worse than one that refuses to save.
 */
export function buildOrderLines(selection: OrderSelection, locale: OrderLocale): OrderLine[] {
  const pkg = LISTING_PACKAGES.find((p) => p.id === selection.packageId);
  if (!pkg) throw new OrderError('unknown-package');

  const packagePriceEur =
    'priceEurAbove' in pkg && selection.aboveThreshold ? pkg.priceEurAbove! : pkg.priceEur;

  const lines: OrderLine[] = [
    {
      kind: 'package',
      id: pkg.id,
      quantity: 1,
      unitCents: packagePriceEur * 100,
      label: PACKAGE_LABEL[pkg.id]?.[locale] ?? pkg.id,
    },
  ];

  for (const chosen of selection.extras) {
    const extra = LISTING_EXTRAS.find((e) => e.id === chosen.id);
    if (!extra) throw new OrderError('unknown-extra');

    const quantity = Math.floor(chosen.quantity);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 60) {
      throw new OrderError('bad-quantity');
    }

    const units = EXTRA_UNIT[extra.id]?.[locale];
    const base = EXTRA_LABEL[extra.id]?.[locale] ?? extra.id;
    const unit = quantity > 1 ? units?.many : units?.one;

    lines.push({
      kind: 'extra',
      id: extra.id,
      quantity,
      unitCents: extra.priceEur * 100,
      label: quantity > 1 && unit ? `${base} — ${quantity} ${unit}` : base,
    });
  }

  return lines;
}

export function orderTotalCents(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
}

/**
 * The referral programme's discount — 10% of the package line only, never
 * the extras. Deliberately NOT an `OrderLine`: Stripe rejects a negative
 * `unit_amount` with a 400 at the moment a seller clicks pay, so this is its
 * own `payments.discount_cents` column, applied at Checkout as a one-off
 * coupon (see src/pages/api/stripe/checkout.ts) and rendered as its own line
 * in the email and any future invoice.
 */
export const REFERRAL_DISCOUNT_PERCENT = 10;

export function referralDiscountCents(lines: OrderLine[]): number {
  const pkg = lines.find((line) => line.kind === 'package');
  if (!pkg) return 0;
  return Math.round((pkg.unitCents * pkg.quantity * REFERRAL_DISCOUNT_PERCENT) / 100);
}

/** Order lines shaped for the email templates' itemised table. */
export function linesForEmail(lines: OrderLine[]): { label: string; amount: string }[] {
  return lines.map((line) => ({
    label: line.label,
    amount: formatCents(line.unitCents * line.quantity),
  }));
}

/**
 * Whether a listing falls in the higher 12-month tier.
 *
 * Derived from the listing's own forint price against the published threshold,
 * so the admin never has to remember where the line sits — and so two admins
 * reviewing similar listings can't price them differently.
 */
export function isAboveThreshold(priceHuf: number): boolean {
  const tiered = LISTING_PACKAGES.find((p) => 'thresholdHuf' in p);
  const threshold = tiered && 'thresholdHuf' in tiered ? tiered.thresholdHuf : null;
  return threshold != null && priceHuf > threshold;
}

/**
 * A default order for a listing that has just been approved.
 *
 * Pre-ticks what the listing itself already tells us — the package the owner
 * chose, one translation per non-Hungarian language they wrote, the video
 * extra if they supplied a URL, homepage highlighting if it is switched on.
 * The admin adjusts and confirms; this only saves them the typing, it never
 * charges anything on its own.
 */
export type SuggestInput = {
  package: string;
  price_huf: number;
  video_url: string | null;
  homepage_featured: boolean;
  featured: boolean;
  /** Locales the listing actually has text for. Hungarian is not an extra. */
  locales: string[];
};

export function suggestSelection(property: SuggestInput): OrderSelection {
  const extraLanguages = property.locales.filter((locale) => locale !== 'hu').length;
  const extras: { id: string; quantity: number }[] = [];

  if (extraLanguages > 0) extras.push({ id: 'translation', quantity: extraLanguages });
  if (property.video_url) extras.push({ id: 'video', quantity: 1 });
  // FODEL's own minimum for highlighting is three months.
  if (property.homepage_featured) extras.push({ id: 'homepage-highlight', quantity: 3 });
  if (property.featured) extras.push({ id: 'category-highlight', quantity: 3 });

  return {
    packageId: property.package,
    aboveThreshold: isAboveThreshold(property.price_huf),
    extras,
  };
}
