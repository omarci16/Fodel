/**
 * The status machine.
 *
 *   draft ──submit──▶ submitted ──approve──▶ published ──▶ sold | archived
 *                         │                 │
 *                         │                 └─request_changes──▶ changes_requested
 *                         └──request_changes──▶ changes_requested ──▶ (owner edits, submits again)
 *
 *   legacy only: awaiting_payment ──[Stripe / manual / publish_unpaid]──▶ published
 *
 * FODEL 1.3 changed the approval link again: approval still writes the exact
 * same pending order and due date, but publication no longer waits for money.
 * PAYMENT_GATES_PUBLISHING=true restores the 1.2 gate after a rebuild. Existing
 * awaiting_payment rows stay under their original contract and are never
 * bulk-published by a migration.
 *
 * Every transition is re-checked here even though RLS also constrains who may
 * UPDATE a row at all. RLS cannot express "only when moving from exactly this
 * status to exactly that one", so that half of the rule lives here — and the
 * half that matters most for security (who owns what) stays in the database.
 */
import type { APIRoute } from 'astro';
import { deliver, localeOf, templates, adminRecipients } from '~/lib/email/send';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { publishProperty, listingTitle, publicUrl } from '~/lib/portal/publish';
import { deleteImage } from '~/lib/media';
import { logEvent } from '~/lib/activity';
import {
  buildOrderLines,
  orderTotalCents,
  linesForEmail,
  formatCents,
  suggestSelection,
  referralDiscountCents,
  OrderError,
  type OrderSelection,
} from '~/lib/orders';
import { SITE_URL } from '~/config/site.mjs';
import { eur } from '~/lib/format';
import { paymentGatesPublishing } from '~/config/flags';

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

    await logEvent({
      kind: 'listing.submit',
      actorId: user!.id,
      actorEmail: profile?.email ?? null,
      subjectType: 'property',
      subjectId: id,
      propertyId: id,
      source: 'portal',
    }).catch(() => {});

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

    // Referral discount — never a negative OrderLine (Stripe 400s a Checkout
    // session on a negative unit_amount). Its own column instead, resolved
    // from a real referrals row the admin ticked, never trusted as an amount
    // from the request body.
    const admin = createSupabaseAdminClient();
    const referralDiscountId: string | null =
      typeof body.order?.referralDiscountId === 'string' ? body.order.referralDiscountId : null;
    const referralCreditId: string | null =
      typeof body.order?.referralCreditId === 'string' ? body.order.referralCreditId : null;

    let discountCents = 0;
    let appliedReferral: { id: string; kind: 'discount' | 'credit' } | null = null;
    let creditedReferral: { id: string } | null = null;

    if (referralDiscountId) {
      const { data: referral } = await admin
        .from('referrals')
        .select('id')
        .eq('id', referralDiscountId)
        .eq('referred_property_id', id)
        .eq('status', 'pending')
        .maybeSingle();
      if (referral) {
        discountCents += referralDiscountCents(lines);
        appliedReferral = { id: referral.id, kind: 'discount' };
      }
    }
    if (referralCreditId) {
      const { data: referral } = await admin
        .from('referrals')
        .select('id')
        .eq('id', referralCreditId)
        .eq('referrer_id', property.owner_id)
        .eq('status', 'applied')
        .maybeSingle();
      if (referral) {
        discountCents += referralDiscountCents(lines);
        creditedReferral = { id: referral.id };
      }
    }

    const totalCents = Math.max(0, orderTotalCents(lines) - discountCents);

    // Billing details, if the owner typed them on the original ad-submission
    // form — carried on their invite's payload since Stage C, read here for
    // the first time so Stage E's invoicing has something to print. Missing
    // entirely for anyone who registered another way; an admin fills them in
    // on the payment detail screen before issuing an invoice either way.
    let billingName: string | null = null;
    let billingAddress: string | null = null;
    if (owner?.email) {
      const { data: invite } = await admin
        .from('invites')
        .select('payload')
        .eq('email', owner.email)
        .not('payload->>billingName', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const payload = invite?.payload as { billingName?: string; billingAddress?: string } | undefined;
      billingName = payload?.billingName ?? null;
      billingAddress = payload?.billingAddress ?? null;
    }

    // Supersede any earlier unpaid order for this listing — an admin who
    // approves, changes their mind about the extras, and approves again must
    // not leave two live payment links pointing at different amounts.
    await admin
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('property_id', id)
      .eq('status', 'pending');

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 14);

    const { data: insertedOrder, error: orderError } = await admin
      .from('payments')
      .insert({
        property_id: id,
        owner_id: property.owner_id,
        amount_cents: totalCents,
        discount_cents: discountCents,
        billing_name: billingName,
        billing_address: billingAddress,
        due_at: dueAt.toISOString(),
        currency: 'eur',
        status: 'pending',
        line_items: lines,
      })
      .select('id')
      .single();
    if (orderError) return json(500, { ok: false, error: orderError.message });

    if (appliedReferral) {
      await admin
        .from('referrals')
        .update({ status: 'applied', discount_applied_to: insertedOrder.id })
        .eq('id', appliedReferral.id);
    }
    if (creditedReferral) {
      await admin
        .from('referrals')
        .update({ status: 'credited', credited_to: insertedOrder.id })
        .eq('id', creditedReferral.id);
    }

    const gated = paymentGatesPublishing();
    const { error } = await supabase
      .from('properties')
      .update({
        status: 'awaiting_payment',
        package: selection.packageId,
        approved_at: new Date().toISOString(),
        approved_by: user!.id,
      })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

    if (!gated) {
      const published = await publishProperty(supabase, id!, { notifyOwner: false });
      if (!published.ok) return json(500, { ok: false, error: published.error });
    }

    if (owner) {
      const title = await listingTitle(supabase, property.id, locale, property.ref);
      const sharedEmail = {
          ref: property.ref,
          title,
          items: linesForEmail(lines),
          discount: discountCents > 0 ? `−${formatCents(discountCents)}` : undefined,
          total: formatCents(totalCents),
          // The email links to the listing's own page, which is where the pay
          // button lives. A Stripe session is created at the moment they click
          // it — never here, because a session minted now would have expired by
          // the time a seller who reads email on Sunday gets to it.
          payUrl: `${SITE_URL}/portal/properties/${property.id}`,
      };
      const email = gated
        ? templates.approvedAwaitingPayment(locale, sharedEmail)
        : templates.approvedPublished(locale, {
            ...sharedEmail,
            viewUrl: await publicUrl(property, locale),
            dueDate: dueAt.toLocaleDateString(locale === 'hu' ? 'hu-HU' : 'nl-NL'),
          });
      await deliver(owner.email, email);
    }

    await logEvent({
      kind: 'listing.approve',
      actorId: user!.id,
      actorEmail: profile?.email ?? null,
      subjectType: 'property',
      subjectId: id,
      propertyId: id,
      source: 'portal',
      payload: { totalCents, discountCents },
    }).catch(() => {});

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
      await logEvent({
        kind: 'payment.manual',
        actorId: user!.id,
        actorEmail: profile?.email ?? null,
        subjectType: 'payment',
        subjectId: order.id,
        propertyId: id,
        source: 'portal',
      }).catch(() => {});
    }

    // listing.published is logged exclusively inside publishProperty() —
    // never here too. It is the one function both this action and the
    // Stripe webhook call, and logging in both would double-count the event.
    const result = await publishProperty(supabase, id!);
    if (!result.ok) return json(500, { ok: false, error: result.error });
    return json(200, { ok: true });
  }

  /* Temporary backlog tool: publish an old awaiting-payment listing without
     falsely recording its still-pending order as paid. Remove after backlog. */
  if (action === 'publish_unpaid') {
    if (!isAdmin) return json(403, { ok: false });
    if (property.status !== 'awaiting_payment') return json(409, { ok: false, error: 'not-awaiting-payment' });
    const result = await publishProperty(supabase, id!);
    return result.ok ? json(200, { ok: true }) : json(500, { ok: false, error: result.error });
  }

  /* ── request changes ────────────────────────────────────────────────── */

  if (action === 'request_changes') {
    if (!isAdmin) return json(403, { ok: false });
    if (!['submitted', 'awaiting_payment', 'published'].includes(property.status)) {
      return json(409, { ok: false, error: 'not-reviewable' });
    }
    const note = String(body.note ?? '').trim();
    if (!note) return json(422, { ok: false, error: 'note-required' });

    const { error } = await supabase
      .from('properties')
      .update({ status: 'changes_requested', published_at: null })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

    await supabase.from('review_notes').insert({ property_id: id, author_id: user!.id, note });

    // Sending a listing back after approval invalidates its order: the price
    // may change once the listing does.
    if (['awaiting_payment', 'published'].includes(property.status)) {
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

    await logEvent({
      kind: 'listing.request_changes',
      actorId: user!.id,
      actorEmail: profile?.email ?? null,
      subjectType: 'property',
      subjectId: id,
      propertyId: id,
      source: 'portal',
      payload: { note },
    }).catch(() => {});

    return json(200, { ok: true });
  }

  /* ── sold / archive ─────────────────────────────────────────────────── */

  if (action === 'mark_sold') {
    if (!isAdmin && !isOwner) return json(403, { ok: false });
    if (property.status !== 'published') return json(409, { ok: false, error: 'not-published' });
    const { error } = await supabase.from('properties').update({ status: 'sold' }).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });
    await logEvent({
      kind: 'listing.mark_sold',
      actorId: user!.id,
      actorEmail: profile?.email ?? null,
      subjectType: 'property',
      subjectId: id,
      propertyId: id,
      source: 'portal',
    }).catch(() => {});
    return json(200, { ok: true });
  }

  if (action === 'archive') {
    if (!isAdmin) return json(403, { ok: false });
    const { error } = await supabase.from('properties').update({ status: 'archived' }).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });
    await logEvent({
      kind: 'listing.archive',
      actorId: user!.id,
      actorEmail: profile?.email ?? null,
      subjectType: 'property',
      subjectId: id,
      propertyId: id,
      source: 'portal',
    }).catch(() => {});
    return json(200, { ok: true });
  }

  /* ── delete ─────────────────────────────────────────────────────────── */
  // Admin-only, any status. RLS backs this up (properties_admin_all has no
  // status restriction; the owner's own delete policy is narrower — draft
  // only — and isn't exercised from this admin action). Every FK from
  // properties is either ON DELETE CASCADE (property_translations,
  // property_media, review_notes — inherently scoped to this listing) or
  // ON DELETE SET NULL (enquiries, payments, activity_events, valuations,
  // invites.referred_property_id — historical records outlive the listing
  // they were about), so this is a genuine, schema-sanctioned hard delete,
  // not a workaround.

  if (action === 'delete') {
    if (!isAdmin) return json(403, { ok: false });

    // The DB row cascades on its own; the actual files in storage do not —
    // deleting the row without this would leave every photo orphaned in
    // the bucket forever.
    const { data: media } = await supabase.from('property_media').select('storage_path').eq('property_id', id);
    for (const m of media ?? []) {
      await deleteImage(supabase, m.storage_path).catch(() => {});
    }

    // Logged before the delete: activity_events.property_id is SET NULL,
    // not CASCADE, so every earlier event about this listing survives —
    // but only this event's own payload still carries the ref once the
    // property itself is gone.
    await logEvent({
      kind: 'listing.delete',
      actorId: user!.id,
      actorEmail: profile?.email ?? null,
      subjectType: 'property',
      subjectId: id,
      propertyId: id,
      source: 'portal',
      payload: { ref: property.ref, category: property.category },
    }).catch(() => {});

    const { error } = await supabase.from('properties').delete().eq('id', id);
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
