/**
 * Stripe's callback — where a card payment actually publishes a listing.
 *
 * Stripe calls this directly, not through the browser, so it carries no user
 * session. The signature check against STRIPE_WEBHOOK_SECRET is what proves
 * the request genuinely came from Stripe, and it stands in for authentication
 * here. Everything after that check runs with the service-role client, because
 * there is no user to run as.
 *
 * Idempotency is not optional. Stripe retries any webhook it doesn't receive a
 * 2xx for — for up to three days — and it can legitimately deliver the same
 * event twice even on success. So every handler below has to be safe to run
 * again: `publishProperty` returns early if the listing is already live, and
 * the order update is a no-op the second time because the row is no longer
 * `pending`.
 *
 * A note on the response contract: this returns 200 even for events it does
 * nothing with. A non-2xx tells Stripe "retry me", so returning an error for
 * an event we simply don't handle would earn an escalating retry storm and,
 * eventually, a disabled endpoint.
 */
import type { APIRoute } from 'astro';
import { isStripeEnabled, getStripe } from '~/lib/stripe';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { publishProperty, listingTitle } from '~/lib/portal/publish';
import { deliver, localeOf, templates } from '~/lib/email/send';
import { linesForEmail, formatCents, type OrderLine } from '~/lib/orders';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isStripeEnabled()) return new Response(null, { status: 404 });

  const signature = request.headers.get('stripe-signature');
  const secret = import.meta.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response('missing signature config', { status: 400 });

  const rawBody = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    return new Response(`signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      id: string;
      metadata?: { orderId?: string; propertyId?: string } | null;
      payment_status?: string;
    };

    // `completed` fires for delayed payment methods before the money is
    // actually there; only `paid` means settled.
    if (session.payment_status && session.payment_status !== 'paid') {
      return new Response(null, { status: 200 });
    }

    const { data: order } = await admin
      .from('payments')
      .select('id, property_id, owner_id, amount_cents, discount_cents, line_items, status')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (!order) {
      // Nothing to reconcile against — log rather than 500, or Stripe retries
      // an event that can never succeed.
      console.error(`[stripe] no order found for session ${session.id}`);
      return new Response(null, { status: 200 });
    }

    // Second delivery of the same event: the order is already settled.
    if (order.status === 'paid' || order.status === 'manual') {
      return new Response(null, { status: 200 });
    }

    const paidAt = new Date();
    await admin
      .from('payments')
      .update({ status: 'paid', paid_at: paidAt.toISOString() })
      .eq('id', order.id);

    const result = await publishProperty(admin, order.property_id);
    if (!result.ok) {
      // The money is in and recorded; publication failed. Returning 500 asks
      // Stripe to retry, which is exactly right — the retry will find the
      // order already paid and simply re-attempt the publish.
      console.error(`[stripe] payment recorded but publish failed for ${order.property_id}`, result.error);
      return new Response('publish failed', { status: 500 });
    }

    await sendReceipt(admin, order, paidAt);
    return new Response(null, { status: 200 });
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as { id: string };
    await admin
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('stripe_session_id', session.id)
      .eq('status', 'pending');
    return new Response(null, { status: 200 });
  }

  return new Response(null, { status: 200 });
};

async function sendReceipt(
  admin: any,
  order: {
    property_id: string;
    owner_id: string | null;
    amount_cents: number;
    discount_cents?: number;
    line_items: OrderLine[];
  },
  paidAt: Date
): Promise<void> {
  if (!order.owner_id) return;

  const { data: owner } = await admin
    .from('profiles')
    .select('email, locale')
    .eq('id', order.owner_id)
    .maybeSingle();
  if (!owner?.email) return;

  const { data: property } = await admin
    .from('properties')
    .select('ref')
    .eq('id', order.property_id)
    .maybeSingle();
  if (!property) return;

  const locale = localeOf(owner);
  const title = await listingTitle(admin, order.property_id, locale, property.ref);

  await deliver(
    owner.email,
    templates.paymentReceipt(locale, {
      ref: property.ref,
      title,
      items: linesForEmail(order.line_items ?? []),
      discount: order.discount_cents ? `−${formatCents(order.discount_cents)}` : undefined,
      total: formatCents(order.amount_cents),
      paidAt: paidAt.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    })
  );
}
