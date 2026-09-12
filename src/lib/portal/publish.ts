/**
 * Publishing a listing — the one place a property becomes publicly visible.
 *
 * Two very different callers reach this: the Stripe webhook (a card payment
 * cleared) and an admin pressing "publish, paid by transfer". In 1.0 the
 * publish logic lived inline in the approve action; with two entry points it
 * has to be one function, or the expiry date silently differs depending on how
 * the listing was paid for.
 *
 * Idempotent by design. Stripe retries a webhook it doesn't get a 200 from,
 * sometimes several times, so "publish this listing" must be safe to run twice
 * — the second call notices the listing is already live and sends no second
 * "you're online!" email.
 */
import { SITE_URL } from '~/config/site.mjs';
import { CATEGORIES, ROUTES } from '~/i18n/ui';
import { LISTING_PACKAGES } from '~/config/company';
import { deliver, localeOf, templates } from '~/lib/email/send';
import { logEvent } from '~/lib/activity';

/** The public URL of a listing, in the owner's own language. */
export function publicUrl(
  property: { category: string; ref: string },
  locale: 'hu' | 'nl' = 'hu'
): string {
  const slug = (CATEGORIES as any)[property.category]?.[locale]?.slug ?? property.category;
  return `${SITE_URL}/${locale}/${ROUTES[locale].detail(slug, property.ref)}/`;
}

/** How long a package buys, from the published tariff rather than a magic number. */
export function monthsForPackage(packageId: string): number {
  return LISTING_PACKAGES.find((p) => p.id === packageId)?.months ?? 6;
}

export type PublishResult =
  | { ok: true; alreadyPublished: boolean }
  | { ok: false; error: string };

/**
 * @param client Must be able to update the property. The webhook has no user
 *   session, so it passes the service-role client; the admin action passes the
 *   signed-in admin's own session client and RLS authorises it.
 * @param dedupeKey The Stripe event id, when this call is triggered by a
 *   webhook delivery — see src/lib/activity.ts. Stripe can legitimately
 *   deliver the same event twice even on success; this is what stops a retry
 *   from writing "listing.published" a second time. Manual publication
 *   (an admin confirming a bank transfer) passes none, because that call
 *   cannot be retried the way a webhook can.
 */
export async function publishProperty(
  client: any,
  propertyId: string,
  dedupeKey?: string | null
): Promise<PublishResult> {
  const { data: property, error } = await client
    .from('properties')
    .select('id, ref, category, status, owner_id, package')
    .eq('id', propertyId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!property) return { ok: false, error: 'not-found' };

  // Already live — a Stripe retry, or two admins clicking at once. Not an error.
  if (property.status === 'published') return { ok: true, alreadyPublished: true };

  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + monthsForPackage(property.package));

  const { error: updateError } = await client
    .from('properties')
    .update({
      status: 'published',
      published_at: now.toISOString(),
      expires_at: expires.toISOString(),
    })
    .eq('id', propertyId);

  if (updateError) return { ok: false, error: updateError.message };

  await notifyOwnerPublished(client, property);

  // The only place a listing goes live, so the only place this is logged —
  // never also in the Stripe webhook or the manual-publish action, which
  // would double-count every card payment.
  await logEvent({
    kind: 'listing.published',
    subjectType: 'property',
    subjectId: propertyId,
    propertyId,
    source: dedupeKey ? 'stripe-webhook' : 'portal',
    dedupeKey: dedupeKey ?? null,
  }).catch(() => {});

  return { ok: true, alreadyPublished: false };
}

async function notifyOwnerPublished(
  client: any,
  property: { id: string; ref: string; category: string; owner_id: string | null }
): Promise<void> {
  if (!property.owner_id) return;

  const { data: owner } = await client
    .from('profiles')
    .select('email, locale')
    .eq('id', property.owner_id)
    .maybeSingle();
  if (!owner?.email) return;

  const locale = localeOf(owner);
  const title = await listingTitle(client, property.id, locale, property.ref);

  await deliver(
    owner.email,
    templates.published(locale, {
      ref: property.ref,
      title,
      url: publicUrl(property, locale),
    })
  );
}

/**
 * The listing's title in the reader's language, falling back to Hungarian —
 * which always exists — and then to the reference number.
 *
 * Mirrors the fallback the public site uses (`text()` in src/lib/properties.ts):
 * a Dutch owner who hasn't paid for a Dutch translation should see the
 * Hungarian title, not a blank.
 */
export async function listingTitle(
  client: any,
  propertyId: string,
  locale: 'hu' | 'nl',
  ref: string
): Promise<string> {
  const { data } = await client
    .from('property_translations')
    .select('locale, title')
    .eq('property_id', propertyId)
    .in('locale', [locale, 'hu']);

  const rows = (data ?? []) as { locale: string; title: string }[];
  const preferred = rows.find((row) => row.locale === locale)?.title;
  const hungarian = rows.find((row) => row.locale === 'hu')?.title;
  return preferred || hungarian || `#${ref}`;
}
