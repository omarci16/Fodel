/**
 * Admin actions on one order: update billing details, issue an invoice or a
 * credit note, resend the payment email, cancel a pending order.
 *
 * Deliberately separate from src/pages/api/portal/properties/[id]/status.ts
 * — that file owns the *listing's* status machine (submit/approve/publish);
 * this one owns actions on an already-created `payments` row. Settlement only
 * touches a property for a legacy awaiting_payment row, where it completes
 * the original 1.2 contract by publishing it.
 */
import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { deliver, localeOf, templates } from '~/lib/email/send';
import { issueInvoice } from '~/lib/invoice';
import { linesForEmail, formatCents, type OrderLine } from '~/lib/orders';
import { listingTitle, publishProperty, publicUrl } from '~/lib/portal/publish';
import { logEvent } from '~/lib/activity';
import { SITE_URL } from '~/config/site.mjs';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { profile, user } = locals;
  if (profile?.role !== 'admin') return json(403, { ok: false });

  const { id } = params;
  const admin = createSupabaseAdminClient();
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? '');

  const { data: order } = await admin
    .from('payments')
    .select('id, property_id, owner_id, amount_cents, discount_cents, line_items, status, billing_name, billing_address, due_at')
    .eq('id', id)
    .maybeSingle();
  if (!order) return json(404, { ok: false, error: 'not-found' });

  /* ── update billing details ───────────────────────────────────────────── */
  if (action === 'update_billing') {
    const billingName = String(body.billingName ?? '').trim();
    const billingAddress = String(body.billingAddress ?? '').trim();
    if (!billingName || !billingAddress) return json(422, { ok: false, error: 'billing-required' });

    const { error } = await admin
      .from('payments')
      .update({ billing_name: billingName, billing_address: billingAddress })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  /* ── cancel a pending order ────────────────────────────────────────────── */
  if (action === 'cancel') {
    if (order.status !== 'pending') return json(409, { ok: false, error: 'not-pending' });
    const { error } = await admin.from('payments').update({ status: 'cancelled' }).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  /* ── confirm a bank transfer without coupling settlement to publication ─ */
  if (action === 'mark_paid') {
    if (order.status !== 'pending') return json(409, { ok: false, error: 'not-pending' });
    const paidAt = new Date();
    const { error } = await admin.from('payments').update({ status: 'manual', paid_at: paidAt.toISOString() }).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

    await logEvent({ kind: 'payment.manual', actorId: user?.id ?? null, actorEmail: profile?.email ?? null,
      subjectType: 'payment', subjectId: order.id, propertyId: order.property_id, source: 'portal' }).catch(() => {});

    if (order.property_id) {
      const { data: property } = await admin.from('properties').select('ref, status').eq('id', order.property_id).maybeSingle();
      if (property?.status === 'awaiting_payment') {
        const published = await publishProperty(admin, order.property_id);
        if (!published.ok) return json(500, { ok: false, error: published.error });
      }
      if (property && order.owner_id) {
        const { data: owner } = await admin.from('profiles').select('email, locale').eq('id', order.owner_id).maybeSingle();
        if (owner?.email) {
          const locale = localeOf(owner);
          const title = await listingTitle(admin, order.property_id, locale, property.ref);
          await deliver(owner.email, templates.paymentReceipt(locale, {
            ref: property.ref, title, items: linesForEmail((order.line_items ?? []) as OrderLine[]),
            discount: order.discount_cents ? `−${formatCents(order.discount_cents)}` : undefined,
            total: formatCents(order.amount_cents), paidAt: paidAt.toLocaleDateString(locale === 'hu' ? 'hu-HU' : 'nl-NL'),
          }));
        }
      }
    }
    return json(200, { ok: true });
  }

  /* ── issue an invoice or a credit note ────────────────────────────────── */
  if (action === 'issue_invoice' || action === 'issue_credit_note') {
    if (!order.billing_name || !order.billing_address) {
      return json(422, { ok: false, error: 'billing-missing' });
    }

    let correctsId: string | null = null;
    if (action === 'issue_credit_note') {
      correctsId = typeof body.correctsId === 'string' ? body.correctsId : null;
      if (!correctsId) return json(422, { ok: false, error: 'corrects-id-required' });
    }

    let invoice;
    try {
      invoice = await issueInvoice(admin, {
        paymentId: order.id,
        kind: action === 'issue_credit_note' ? 'credit_note' : 'invoice',
        propertyId: order.property_id,
        ownerId: order.owner_id,
        billingName: order.billing_name,
        billingAddress: order.billing_address,
        lineItems: (order.line_items ?? []) as OrderLine[],
        discountCents: order.discount_cents ?? 0,
        grossCents: order.amount_cents,
        correctsId,
      });
    } catch (e) {
      return json(500, { ok: false, error: (e as Error).message });
    }

    await logEvent({
      kind: action === 'issue_credit_note' ? 'invoice.credit_note_issued' : 'invoice.issued',
      actorId: user?.id ?? null,
      actorEmail: profile?.email ?? null,
      subjectType: 'invoice',
      subjectId: invoice.id,
      propertyId: order.property_id,
      source: 'portal',
      payload: { number: invoice.number },
    }).catch(() => {});

    if (order.owner_id) {
      const { data: owner } = await admin
        .from('profiles')
        .select('email, locale')
        .eq('id', order.owner_id)
        .maybeSingle();
      if (owner?.email && order.property_id) {
        const locale = localeOf(owner);
        const { data: property } = await admin.from('properties').select('ref').eq('id', order.property_id).maybeSingle();
        const title = property ? await listingTitle(admin, order.property_id, locale, property.ref) : '';
        const viewUrl = `${SITE_URL}/portal/invoices/${invoice.number}?t=${invoice.view_token}`;

        if (action === 'issue_credit_note') {
          const { data: original } = await admin.from('invoices').select('number').eq('id', correctsId).maybeSingle();
          await deliver(
            owner.email,
            templates.creditNoteIssued(locale, {
              ref: property?.ref ?? '', title, number: invoice.number, correctsNumber: original?.number ?? '', viewUrl,
            })
          );
        } else {
          await deliver(
            owner.email,
            templates.invoiceIssued(locale, { ref: property?.ref ?? '', title, number: invoice.number, viewUrl })
          );
        }
      }
    }

    return json(200, { ok: true, number: invoice.number });
  }

  /* ── resend the "approved, please pay" email ─────────────────────────── */
  if (action === 'resend_email') {
    if (!order.owner_id) return json(422, { ok: false, error: 'no-owner' });
    const { data: owner } = await admin.from('profiles').select('email, locale').eq('id', order.owner_id).maybeSingle();
    if (!owner?.email || !order.property_id) return json(422, { ok: false, error: 'no-owner' });

    const { data: property } = await admin.from('properties').select('ref, category, status').eq('id', order.property_id).maybeSingle();
    if (!property) return json(404, { ok: false, error: 'not-found' });

    const locale = localeOf(owner);
    const title = await listingTitle(admin, order.property_id, locale, property.ref);
    const lines = (order.line_items ?? []) as OrderLine[];

    const shared = {
      ref: property.ref,
      title,
      items: linesForEmail(lines),
      discount: order.discount_cents ? `−${formatCents(order.discount_cents)}` : undefined,
      total: formatCents(order.amount_cents),
      payUrl: `${SITE_URL}/portal/properties/${order.property_id}`,
    };
    const email = property.status === 'published'
      ? templates.approvedPublished(locale, {
          ...shared,
          viewUrl: await publicUrl(property, locale),
          dueDate: order.due_at
            ? new Date(order.due_at).toLocaleDateString(locale === 'hu' ? 'hu-HU' : 'nl-NL')
            : '—',
        })
      : templates.approvedAwaitingPayment(locale, shared);
    await deliver(owner.email, email);
    return json(200, { ok: true });
  }

  return json(400, { ok: false, error: 'unknown-action' });
};
