/**
 * Pay-now for a valuation package (the FODEL visit, or an official valuation
 * when an admin has given it a fixed price).
 *
 * Listings are charged only after approval and have their own endpoint
 * (checkout.ts); this is for something bought outright by someone who has no
 * account. The caller proves it is the person who just made the request with
 * the HMAC token the submit response carried, and names nothing else: the
 * package comes from the stored valuation and the price from the admin's
 * package settings, never from the request.
 */
import type { APIRoute } from 'astro';
import { isStripeEnabled, getStripe } from '~/lib/stripe';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { validValuationActionToken } from '~/lib/valuation/action-token';
import { getCompany } from '~/lib/runtime-config';
import { valuationPackage, isPayable } from '~/lib/valuation/packages';
import { path } from '~/i18n/ui';
import type { OrderLine } from '~/lib/orders';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!isStripeEnabled()) return json(503, { ok: false, error: 'stripe-disabled' });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? '');
  const token = String(body.token ?? '');
  if (!/^[a-f0-9-]{36}$/.test(id) || !validValuationActionToken(id, token)) return json(403, { ok: false, error: 'forbidden' });

  const admin = createSupabaseAdminClient();
  const { data: valuation } = await admin
    .from('valuations')
    .select('id, request_kind, locale, contact_name, contact_email')
    .eq('id', id)
    .maybeSingle();
  if (!valuation || !valuation.contact_email) return json(404, { ok: false, error: 'not-found' });

  const company = await getCompany();
  const pkg = valuationPackage(company.services, valuation.request_kind);
  if (valuation.request_kind === 'indicative' || !isPayable(pkg)) return json(409, { ok: false, error: 'not-payable' });

  const locale = valuation.locale === 'nl' ? 'nl' : 'hu';
  const amountCents = pkg.priceEur * 100;
  const lines: OrderLine[] = [{ kind: 'service', id: `valuation-${pkg.kind}`, quantity: 1, unitCents: amountCents, label: pkg.names[locale] }];

  const { data: orders } = await admin
    .from('payments')
    .select('id, status, amount_cents, stripe_session_id')
    .eq('valuation_id', id)
    .in('status', ['pending', 'paid'])
    .order('created_at', { ascending: false });
  if ((orders ?? []).some((order) => order.status === 'paid')) return json(409, { ok: false, error: 'already-paid' });

  const stripe = getStripe();
  const origin = new URL(request.url).origin;
  const back = `${origin}${path(locale, 'valuation')}`;

  // One open order per request. A price changed in admin since the last attempt
  // makes the old order stale, so it is cancelled rather than quietly reused.
  let order = (orders ?? []).find((entry) => entry.status === 'pending' && entry.amount_cents === amountCents) ?? null;
  for (const stale of (orders ?? []).filter((entry) => entry.status === 'pending' && entry.id !== order?.id)) {
    await admin.from('payments').update({ status: 'cancelled' }).eq('id', stale.id);
  }

  if (order?.stripe_session_id) {
    const open = await stripe.checkout.sessions.retrieve(order.stripe_session_id).catch(() => null);
    if (open?.status === 'open' && open.url) return json(200, { ok: true, url: open.url });
  }

  if (!order) {
    const { data: created, error } = await admin
      .from('payments')
      .insert({
        kind: 'valuation', valuation_id: id, amount_cents: amountCents, currency: 'eur', status: 'pending',
        line_items: lines, billing_name: valuation.contact_name, contact_email: valuation.contact_email, locale,
      })
      .select('id, status, amount_cents, stripe_session_id')
      .single();
    // Most likely migration 0017 has not run — say so in the log, not to the visitor.
    if (error || !created) {
      console.error('[stripe] valuation order not stored', error?.message);
      return json(503, { ok: false, error: 'unavailable' });
    }
    order = created;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price_data: { currency: 'eur', unit_amount: amountCents, product_data: { name: pkg.names[locale] } }, quantity: 1 }],
    customer_email: valuation.contact_email,
    success_url: `${back}?paid=1`,
    cancel_url: back,
    client_reference_id: order.id,
    // The webhook trusts this, not the request that created the session.
    metadata: { kind: 'valuation', orderId: order.id, valuationId: id },
  });
  await admin.from('payments').update({ stripe_session_id: session.id }).eq('id', order.id);

  return json(200, { ok: true, url: session.url });
};
