/**
 * Stripe client and the on/off switch.
 *
 * FODEL 1.1 uses card payment for one thing: an owner settling the order for a
 * listing FODEL has already approved. Bank transfer remains the primary,
 * published method and is a first-class path through the portal — this is the
 * addition, not the replacement.
 *
 * Everything stays inert while STRIPE_ENABLED is anything but "true". With it
 * off, an approved listing still moves to `awaiting_payment` and the owner
 * still gets the "approved — here's what it costs" email; it simply carries
 * bank details and no card button. Nothing breaks in either state, which is
 * what makes the switch safe to flip without a release.
 *
 * Price resolution deliberately does NOT live here any more. In 1.0 this file
 * resolved a catalogue item to an amount, which invited the pattern of a
 * browser naming what it was buying. Orders are now built and stored by an
 * admin at approval time — see src/lib/orders.ts — and Stripe is handed a
 * stored order, never a request body.
 */
import Stripe from 'stripe';

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
