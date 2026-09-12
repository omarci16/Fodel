/**
 * Dutch invoicing — rendered from a stored `payments` row, never re-derived
 * from today's catalogue (same invariant as src/lib/orders.ts).
 *
 * ⚠️ Built against two unresolved legal questions — see the header of
 * supabase/migrations/0008_invoicing.sql: the KvK number is still null, and
 * the VAT rate itself may be the wrong one. This exists so the mechanics can
 * be built and tested now; nothing it produces should be treated as a legally
 * final document until both are confirmed with FODEL's accountant.
 */
import type { OrderLine } from './orders';
import { formatCents } from './orders';
import { LISTING_VAT_PERCENT, COMPANY } from '~/config/company';

export type Invoice = {
  id: string;
  number: string;
  kind: 'invoice' | 'credit_note';
  corrects_id: string | null;
  payment_id: string;
  property_id: string | null;
  owner_id: string | null;
  billing_name: string;
  billing_address: string;
  line_items: OrderLine[];
  discount_cents: number;
  gross_cents: number;
  vat_rate: number;
  net_cents: number;
  vat_cents: number;
  currency: string;
  view_token: string;
  issued_at: string;
  supply_date: string;
  finalised_at: string;
};

/**
 * Issues an invoice (or, with `correctsId`, a credit note) via the
 * `issue_invoice` Postgres function — the counter allocation and the row
 * insert happen inside one function call, so they are one transaction. Never
 * split into "read the next number" then "insert the row" as two separate
 * round trips from application code, or a crash between them leaves a gap.
 *
 * @param client Must be the service-role client — `invoices` has no insert
 *   policy for anon/authenticated at all, same posture as `payments`.
 */
export async function issueInvoice(
  client: any,
  opts: {
    paymentId: string;
    kind?: 'invoice' | 'credit_note';
    propertyId: string | null;
    ownerId: string | null;
    billingName: string;
    billingAddress: string;
    lineItems: OrderLine[];
    discountCents: number;
    grossCents: number;
    correctsId?: string | null;
  }
): Promise<Invoice> {
  const { data, error } = await client.rpc('issue_invoice', {
    p_payment_id: opts.paymentId,
    p_kind: opts.kind ?? 'invoice',
    p_property_id: opts.propertyId,
    p_owner_id: opts.ownerId,
    p_billing_name: opts.billingName,
    p_billing_address: opts.billingAddress,
    p_line_items: opts.lineItems,
    p_discount_cents: opts.discountCents,
    p_gross_cents: opts.grossCents,
    p_vat_rate: LISTING_VAT_PERCENT,
    p_corrects_id: opts.correctsId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as Invoice;
}

/** Line items plus the discount, shaped for the printed/emailed invoice table. */
export function invoiceLines(invoice: Invoice): { label: string; amount: string }[] {
  const lines = invoice.line_items.map((l) => ({
    label: l.quantity > 1 ? `${l.label} ×${l.quantity}` : l.label,
    amount: formatCents(l.unitCents * l.quantity * (invoice.kind === 'credit_note' ? -1 : 1)),
  }));
  if (invoice.discount_cents > 0) {
    const sign = invoice.kind === 'credit_note' ? 1 : -1;
    lines.push({ label: 'Ajánlói kedvezmény (10%)', amount: formatCents(invoice.discount_cents * sign) });
  }
  return lines;
}

/** Dutch statutory fields this build can actually populate today. */
export function issuerDetails() {
  return {
    name: COMPANY.names.legal,
    address: COMPANY.address.oneLine,
    kvk: COMPANY.registration.kvk,
    vat: COMPANY.registration.vat,
    vatVerified: COMPANY.registration.vatVerified,
  };
}
