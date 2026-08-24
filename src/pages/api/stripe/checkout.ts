import type { APIRoute } from 'astro';
import { isStripeEnabled, getStripe, priceForItem, type CheckoutItem } from '~/lib/stripe';
import { createSupabaseAdminClient } from '~/lib/supabase-server';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/**
 * Creates a Checkout Session for a listing package or extra. Behind
 * STRIPE_ENABLED — while it's off (the default), this just says so; bank
 * transfer is the only live payment path.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!isStripeEnabled()) {
    return json(503, { ok: false, error: 'stripe-disabled', message: 'Card payment is not enabled — use bank transfer.' });
  }

  const body = await request.json().catch(() => null);
  const propertyId = body?.propertyId;
  const item = body?.item as CheckoutItem | undefined;
  if (!propertyId || !item) return json(400, { ok: false, error: 'missing-fields' });

  let price;
  try {
    price = priceForItem(item);
  } catch {
    return json(400, { ok: false, error: 'unknown-item' });
  }

  const stripe = getStripe();
  const origin = new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: { currency: 'eur', unit_amount: price.cents, product_data: { name: price.label } },
        quantity: 1,
      },
    ],
    success_url: `${origin}/portal/properties/${propertyId}?payment=success`,
    cancel_url: `${origin}/portal/properties/${propertyId}?payment=cancelled`,
    metadata: { propertyId, itemKind: item.kind, itemId: item.id },
  });

  const admin = createSupabaseAdminClient();
  await admin.from('payments').insert({
    property_id: propertyId,
    stripe_session_id: session.id,
    amount_cents: price.cents,
    currency: 'eur',
    status: 'pending',
  });

  return json(200, { ok: true, url: session.url });
};
