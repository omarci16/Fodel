/**
 * The status machine.
 *
 *   draft ──submit──▶ submitted ──approve──▶ awaiting_payment ──┬─[Stripe]──▶ published
 *                         │                                     │
 *                         │                                     └─publish_manually──▶ published
 *                         └──request_changes──▶ changes_requested ──▶ (owner edits, submits again)
 *
 *                                                        published ──▶ sold | archived
 *
 * FODEL 1.1 changed one link in that chain: `approve` no longer publishes.
 * It writes an order and moves the listing to `awaiting_payment`, and money —
 * card or bank transfer — is what publishes it. The reason is commercial, not
 * technical: FODEL never holds a payment for a listing it then rejected, so
 * there is no refund path to build, staff, or explain in the terms.
 *
 * Every transition is re-checked here even though RLS also constrains who may
 * UPDATE a row at all. RLS cannot express "only when moving from exactly this
 * status to exactly that one", so that half of the rule lives here — and the
 * half that matters most for security (who owns what) stays in the database.
 */
import type { APIRoute } from 'astro';
import { deliver, localeOf, templates, adminRecipients } from '~/lib/email/send';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { publishProperty, listingTitle } from '~/lib/portal/publish';
import {
  buildOrderLines,
  orderTotalCents,
  linesForEmail,
  formatCents,
  suggestSelection,
  OrderError,
  type OrderSelection,
} from '~/lib/orders';
import { SITE_URL } from '~/config/site.mjs';
import { eur } from '~/lib/format';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

type OwnerContact = { email: string; locale: 'hu' | 'nl'; full_name: string | null };

async function ownerContact(supabase: any, ownerId: string | null): Promise<OwnerContact | null> {
  if (!ownerId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('email, locale, full_name')
    .eq('id', ownerId)
    .maybeSingle();
  if (!data?.email) return null;
  return { email: data.email, locale: localeOf(data), full_name: data.full_name };
}

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { id } = params;
  const { supabase, profile, user } = locals;
  const isAdmin = profile?.role === 'admin';

  const { data: property } = await supabase
    .from('properties')
    .select(
      'id, ref, category, status, owner_id, package, price_huf, price_eur, settlement, county, video_url, homepage_featured, featured, property_translations(locale)'
    )
    .eq('id', id)
    .maybeSingle();
  if (!property) return json(404, { ok: false, error: 'not-found' });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? '');
  const isOwner = property.owner_id === user?.id;

  /* ── submit ─────────────────────────────────────────────────────────── */

  if (action === 'submit') {
    if (!isOwner && !isAdmin) return json(403, { ok: false });
    if (!['draft', 'changes_requested'].includes(property.status)) {
      return json(409, { ok: false, error: 'not-editable' });
    }

    const { count: mediaCount } = await supabase
      .from('property_media')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', id);
    if (!mediaCount) return json(422, { ok: false, error: 'no-photos' });

    const { error } = await supabase
      .from('properties')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

    const owner = await ownerContact(supabase, property.owner_id);
    if (owner) {
      const title = await listingTitle(supabase, property.id, owner.locale, property.ref);
      await deliver(owner.email, templates.submissionReceived(owner.locale, { ref: property.ref, title }));
    }

    // Closes a real 1.0 gap: the owner was told "we received it" and nobody at
    // FODEL was told anything at all, so a submission was only ever noticed by
    // an admin who happened to open the dashboard.
    await notifyAdmins(supabase, property, owner, mediaCount ?? 0);

    return json(200, { ok: true });
  }

  /* ── approve → awaiting_payment ─────────────────────────────────────── */

  if (action === 'approve') {
    if (!isAdmin) return json(403, { ok: false });
    if (property.status !== 'submitted') return json(409, { ok: false, error: 'not-submitted' });

    const owner = await ownerContact(supabase, property.owner_id);
    const locale = owner?.locale ?? 'hu';

    // The admin's confirmed order, or — if the review screen sent nothing —
    // what the listing itself implies. Either way the prices come from the
    // catalogue, never from the request body.
    const selection: OrderSelection = body.order
      ? {
          packageId: String(body.order.packageId ?? property.package),
          aboveThreshold: Boolean(body.order.aboveThreshold),
          extras: Array.isArray(body.order.extras)
            ? body.order.extras.map((e: any) => ({
                id: String(e.id),
                quantity: Number(e.quantity ?? 1),
              }))
            : [],
        }
      : suggestSelection({
          package: property.package,
          price_huf: property.price_huf,
          video_url: property.video_url,
          homepage_featured: property.homepage_featured,
          featured: property.featured,
          // The Supabase row nests these under the join's own name; the
          // `as any` that used to stand here hid the mismatch and would have
          // thrown the first time an admin approved without the review
          // screen's order panel.
          locales: (property.property_translations ?? []).map((t: { locale: string }) => t.locale),
        });

    let lines;
    try {
      lines = buildOrderLines(selection, locale);
    } catch (e) {
      if (e instanceof OrderError) return json(422, { ok: false, error: e.code });
      throw e;
    }
    const totalCents = orderTotalCents(lines);

    // Supersede any earlier unpaid order for this listing — an admin who
    // approves, changes their mind about the extras, and approves again must
    // not leave two live payment links pointing at different amounts.
    const admin = createSupabaseAdminClient();
    await admin
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('property_id', id)
      .eq('status', 'pending');

    const { error: orderError } = await admin.from('payments').insert({
      property_id: id,
      owner_id: property.owner_id,
      amount_cents: totalCents,
      currency: 'eur',
      status: 'pending',
      line_items: lines,
    });
    if (orderError) return json(500, { ok: false, error: orderError.message });

    const { error } = await supabase
      .from('properties')
      .update({
        status: 'awaiting_payment',
        approved_at: new Date().toISOString(),
        approved_by: user!.id,
      })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

    if (owner) {
      const title = await listingTitle(supabase, property.id, locale, property.ref);
      await deliver(
        owner.email,
        templates.approvedAwaitingPayment(locale, {
          ref: property.ref,
          title,
          items: linesForEmail(lines),
          total: formatCents(totalCents),
          // The email links to the listing's own page, which is where the pay
          // button lives. A Stripe session is created at the moment they click
          // it — never here, because a session minted now would have expired by
          // the time a seller who reads email on Sunday gets to it.
          payUrl: `${SITE_URL}/portal/properties/${property.id}`,
        })
      );
    }

    return json(200, { ok: true, totalCents });
  }

  /* ── publish manually (bank transfer received) ──────────────────────── */
  // Not a convenience: bank transfer is FODEL's published, primary payment
  // method. Card payment is the addition, so the transfer path has to be a
  // first-class action rather than something an admin works around.

  if (action === 'publish_manually') {
    if (!isAdmin) return json(403, { ok: false });
    if (property.status !== 'awaiting_payment') {
      return json(409, { ok: false, error: 'not-awaiting-payment' });
    }

    const admin = createSupabaseAdminClient();
    const { data: order } = await admin
      .from('payments')
      .select('id')
      .eq('property_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (order) {
      await admin
        .from('payments')
        .update({ status: 'manual', paid_at: new Date().toISOString() })
        .eq('id', order.id);
    }

    const result = await publishProperty(supabase, id!);
    if (!result.ok) return json(500, { ok: false, error: result.error });
    return json(200, { ok: true });
  }

  /* ── request changes ────────────────────────────────────────────────── */

  if (action === 'request_changes') {
    if (!isAdmin) return json(403, { ok: false });
    if (!['submitted', 'awaiting_payment'].includes(property.status)) {
      return json(409, { ok: false, error: 'not-reviewable' });
    }
    const note = String(body.note ?? '').trim();
    if (!note) return json(422, { ok: false, error: 'note-required' });

    const { error } = await supabase
      .from('properties')
      .update({ status: 'changes_requested' })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

    await supabase.from('review_notes').insert({ property_id: id, author_id: user!.id, note });

    // Sending a listing back after approval invalidates its order: the price
    // may change once the listing does.
    if (property.status === 'awaiting_payment') {
      const admin = createSupabaseAdminClient();
      await admin
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('property_id', id)
        .eq('status', 'pending');
    }

    const owner = await ownerContact(supabase, property.owner_id);
    if (owner) {
      const title = await listingTitle(supabase, property.id, owner.locale, property.ref);
      await deliver(
        owner.email,
        templates.changesRequested(owner.locale, {
          ref: property.ref,
          title,
          note,
          editUrl: `${SITE_URL}/portal/properties/${property.id}`,
        })
      );
    }
    return json(200, { ok: true });
  }

  /* ── sold / archive ─────────────────────────────────────────────────── */

  if (action === 'mark_sold') {
    if (!isAdmin && !isOwner) return json(403, { ok: false });
    if (property.status !== 'published') return json(409, { ok: false, error: 'not-published' });
    const { error } = await supabase.from('properties').update({ status: 'sold' }).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  if (action === 'archive') {
    if (!isAdmin) return json(403, { ok: false });
    const { error } = await supabase.from('properties').update({ status: 'archived' }).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  return json(400, { ok: false, error: 'unknown-action' });
};

/* ── helpers ─────────────────────────────────────────────────────────────── */

async function notifyAdmins(
  supabase: any,
  property: {
    id: string;
    ref: string;
    category: string;
    settlement: string;
    county: string;
    price_eur: number;
    property_translations: { locale: string }[];
  },
  owner: OwnerContact | null,
  photoCount: number
): Promise<void> {
  // The service-role client, because the *owner* triggered this: RLS would
  // (correctly) stop them from reading the admin roster.
  const admin = createSupabaseAdminClient();
  const recipients = await adminRecipients(admin);

  // FODEL's office works in Hungarian — this is the one email whose language
  // follows the reader rather than the subject.
  const title = await listingTitle(supabase, property.id, 'hu', property.ref);
  const languages = property.property_translations
    .map((t) => t.locale.toUpperCase())
    .sort()
    .join(', ');

  const email = templates.adminNewSubmission('hu', {
    ref: property.ref,
    title,
    ownerName: owner?.full_name ?? '—',
    ownerEmail: owner?.email ?? '—',
    location: `${property.settlement}, ${property.county}`,
    price: eur(property.price_eur),
    photoCount,
    languages: languages || 'HU',
    reviewUrl: `${SITE_URL}/portal/review/${property.id}`,
  });

  // replyTo the owner: an admin can answer a question about the listing
  // without leaving their inbox.
  for (const recipient of recipients) {
    await deliver(recipient, email, owner?.email);
  }
}
