import type { APIRoute } from 'astro';
import { isStripeEnabled, getStripe } from '~/lib/stripe';
import { createSupabaseAdminClient } from '~/lib/supabase-server';

export const prerender = false;

/**
 * Stripe calls this directly (not through the browser), so it can't carry a
 * user session — the signature check against STRIPE_WEBHOOK_SECRET is what
 * proves a request genuinely came from Stripe, standing in for auth here.
 */
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { id: string };
    const admin = createSupabaseAdminClient();
    await admin.from('payments').update({ status: 'paid' }).eq('stripe_session_id', session.id);
  }

  return new Response(null, { status: 200 });
};
