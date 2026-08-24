/**
 * Stripe plumbing (Stage 8) — inert by default. FODEL's live process is
 * form → díjbekérő by email → bank transfer, and that stays exactly as it
 * is; nothing here changes what a seller sees today. This exists so that if
 * FODEL later wants card payment as an option, turning it on is flipping
 * STRIPE_ENABLED to "true" and setting the two Stripe env vars — not writing
 * new code under launch pressure.
 */
import Stripe from 'stripe';
import { LISTING_PACKAGES, LISTING_EXTRAS } from '~/config/company';

export function isStripeEnabled(): boolean {
  return import.meta.env.STRIPE_ENABLED === 'true';
}

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;
  const key = import.meta.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY must be set to use Stripe (see .env.example).');
  client = new Stripe(key);
  return client;
}

export type CheckoutItem =
  | { kind: 'package'; id: (typeof LISTING_PACKAGES)[number]['id']; aboveThreshold?: boolean }
  | { kind: 'extra'; id: (typeof LISTING_EXTRAS)[number]['id']; quantity?: number };

/** Resolves a catalog item to a price in cents — never trusts a client-supplied amount. */
export function priceForItem(item: CheckoutItem): { cents: number; label: string } {
  if (item.kind === 'package') {
    const pkg = LISTING_PACKAGES.find((p) => p.id === item.id);
    if (!pkg) throw new Error(`Unknown package: ${item.id}`);
    const eur = 'priceEurAbove' in pkg && item.aboveThreshold ? pkg.priceEurAbove! : pkg.priceEur;
    return { cents: eur * 100, label: `FODEL hirdetés — ${pkg.months} hónap` };
  }
  const extra = LISTING_EXTRAS.find((e) => e.id === item.id);
  if (!extra) throw new Error(`Unknown extra: ${item.id}`);
  const quantity = item.quantity ?? 1;
  return { cents: extra.priceEur * 100 * quantity, label: `FODEL — ${extra.id}` };
}
