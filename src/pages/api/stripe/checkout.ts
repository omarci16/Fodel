/**
 * Creates a Stripe Checkout Session for an approved listing's outstanding order.
 *
 * Security note — 1.0's version of this file had a real hole: it accepted a
 * `propertyId` and a price-catalogue `item` from an unauthenticated request
 * body. The amount itself could not be forged (it was resolved from the
 * catalogue), but anyone could mint a payment session against any listing,
 * and — more importantly — the request body decided *what was being bought*.
 *
 * 1.1 inverts that completely. The caller supplies a property id and nothing
 * else. The session is built from the order row an admin already wrote at
 * approval time, and the request is refused unless the caller is signed in and
 * is either the listing's owner or an admin. The browser cannot influence the
 * price, the line items, or whose listing is being paid for.
 */
import type { APIRoute } from 'astro';
import { isStripeEnabled, getStripe } from '~/lib/stripe';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { type OrderLine } from '~/lib/orders';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isStripeEnabled()) {
    return json(503, {
      ok: false,
      error: 'stripe-disabled',
      message: 'Card payment is not enabled — use bank transfer.',
    });
  }

  const { supabase, profile, user } = locals;
  if (!user) return json(401, { ok: false, error: 'unauthenticated' });

  const body = await request.json().catch(() => null);
  const propertyId = typeof body?.propertyId === 'string' ? body.propertyId : null;
  if (!propertyId) return json(400, { ok: false, error: 'missing-property' });

  // Read through the caller's own session client so RLS is the thing deciding
  // whether they may see this listing at all. The explicit owner check below
  // is the second layer, not the only one.
  const { data: property } = await supabase
    .from('properties')
    .select('id, ref, status, owner_id')
    .eq('id', propertyId)
    .maybeSingle();
  if (!property) return json(404, { ok: false, error: 'not-found' });

  const isAdmin = profile?.role === 'admin';
  if (!isAdmin && property.owner_id !== user.id) {
    return json(403, { ok: false, error: 'forbidden' });
  }

  if (property.status !== 'awaiting_payment') {
    return json(409, { ok: false, error: 'not-awaiting-payment' });
  }

  const admin = createSupabaseAdminClient();
  const { data: order } = await admin
    .from('payments')
    .select('id, amount_cents, discount_cents, line_items, status, stripe_session_id')
    .eq('property_id', propertyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order) return json(409, { ok: false, error: 'no-open-order' });
  if (!order.amount_cents || order.amount_cents < 100) {
    return json(422, { ok: false, error: 'order-empty' });
  }

  const lines = (order.line_items ?? []) as OrderLine[];
  // Stripe rejects a session with no line items with an opaque error; catching
  // it here says something useful instead.
  if (lines.length === 0) return json(422, { ok: false, error: 'order-empty' });

  const stripe = getStripe();
  const origin = new URL(request.url).origin;

  // A referral discount lives on its own column, never as a negative
  // OrderLine — Stripe rejects a negative unit_amount outright. A one-off
  // coupon reproduces the same breakdown on the seller's statement instead.
  let discounts: { coupon: string }[] | undefined;
  if (order.discount_cents && order.discount_cents > 0) {
    const coupon = await stripe.coupons.create(
      { amount_off: order.discount_cents, currency: 'eur', duration: 'once', name: 'Ajánlói kedvezmény' },
      { idempotencyKey: `order-${order.id}-coupon` }
    );
    discounts = [{ coupon: coupon.id }];
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      // One Stripe line per order line, so the seller's card statement and the
      // Stripe dashboard show the same breakdown as the email they were sent.
      line_items: lines.map((line) => ({
        price_data: {
          currency: 'eur',
          unit_amount: line.unitCents,
          product_data: { name: line.label },
        },
        quantity: line.quantity,
      })),
      ...(discounts ? { discounts } : {}),
      success_url: `${origin}/portal/properties/${propertyId}?payment=success`,
      cancel_url: `${origin}/portal/properties/${propertyId}?payment=cancelled`,
      client_reference_id: order.id,
      // The webhook trusts this, not the request that created the session.
      metadata: { orderId: order.id, propertyId, ref: property.ref },
    },
    // Double-clicking "pay" must not create two sessions against one order.
    { idempotencyKey: `order-${order.id}` }
  );

  await admin
    .from('payments')
    .update({ stripe_session_id: session.id })
    .eq('id', order.id);

  return json(200, { ok: true, url: session.url });
};
