/**
 * The payments ledger, as the admin list and the Excel export both read it.
 *
 * One loader for both, so "the export follows the active filter" is true by
 * construction: the same parameters produce the same rows, and the export
 * gets every matching row, not the page on screen (brief §3).
 *
 * What a payment is *for* is read from its own stored lines (package, extras)
 * and the listing it belongs to — never re-derived from today's price list,
 * and never invented: an old order with no stored lines says so.
 */
import type { OrderLine } from '~/lib/orders';
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from '~/lib/portal/labels';

export type LedgerFilters = {
  status: string;
  month: string;
  packageId: string;
  owner: string;
  overdue: boolean;
};

export function ledgerFilters(params: URLSearchParams): LedgerFilters {
  const month = params.get('month') ?? '';
  return {
    status: params.get('status') ?? '',
    month: /^\d{4}-\d{2}$/.test(month) ? month : '',
    packageId: params.get('package') ?? '',
    owner: (params.get('owner') ?? '').trim(),
    overdue: params.get('view') === 'overdue',
  };
}

export type LedgerRow = {
  id: string;
  createdAt: string;
  paidAt: string | null;
  dueAt: string | null;
  refundedAt: string | null;
  status: string;
  statusLabel: string;
  method: string;
  amountCents: number;
  discountCents: number;
  currency: string;
  lines: OrderLine[];
  /** "Standard hirdetés · Fordítás ×2", or null when the order predates itemised lines. */
  items: string | null;
  propertyId: string | null;
  propertyRef: string | null;
  propertyTitle: string | null;
  settlement: string | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  billingName: string | null;
  refundRequired: boolean;
};

const PAGE = 1000;
const HARD_CAP = 20_000;

/** Every payment matching the filters, newest first. */
export async function loadLedger(supabase: any, filters: LedgerFilters): Promise<LedgerRow[]> {
  const orders: any[] = [];
  for (let from = 0; from < HARD_CAP; from += PAGE) {
    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.overdue) query = query.eq('status', 'pending').lt('due_at', new Date().toISOString());
    if (filters.month) {
      const start = new Date(`${filters.month}-01T00:00:00Z`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    orders.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const propertyIds = [...new Set(orders.map((o) => o.property_id).filter(Boolean))];
  const ownerIds = [...new Set(orders.map((o) => o.owner_id).filter(Boolean))];
  const [properties, owners] = await Promise.all([
    inChunks(propertyIds, (ids) =>
      supabase.from('properties').select('id, ref, settlement, property_translations(locale, title)').in('id', ids)
    ),
    inChunks(ownerIds, (ids) => supabase.from('profiles').select('id, full_name, email').in('id', ids)),
  ]);
  const propertyById = new Map(properties.map((p: any) => [p.id, p]));
  const ownerById = new Map(owners.map((o: any) => [o.id, o]));

  const needle = filters.owner.toLowerCase();
  return orders
    .map((o): LedgerRow => {
      const property: any = o.property_id ? propertyById.get(o.property_id) : null;
      const owner: any = o.owner_id ? ownerById.get(o.owner_id) : null;
      const lines = (Array.isArray(o.line_items) ? o.line_items : []) as OrderLine[];
      return {
        id: o.id,
        createdAt: o.created_at,
        paidAt: o.paid_at ?? null,
        dueAt: o.due_at ?? null,
        refundedAt: o.refunded_at ?? null,
        status: o.status,
        statusLabel: PAYMENT_STATUS_LABEL[o.status] ?? o.status,
        method: PAYMENT_METHOD_LABEL[o.status] ?? '—',
        amountCents: o.amount_cents,
        discountCents: o.discount_cents ?? 0,
        currency: String(o.currency ?? 'eur').toUpperCase(),
        lines,
        items: lines.length ? lines.map((l) => (l.quantity > 1 ? `${l.label} ×${l.quantity}` : l.label)).join(' · ') : null,
        propertyId: o.property_id ?? null,
        propertyRef: property?.ref ?? null,
        propertyTitle:
          (property?.property_translations as { locale: string; title: string }[] | undefined)?.find((t) => t.locale === 'hu')
            ?.title ?? null,
        settlement: property?.settlement ?? null,
        ownerId: o.owner_id ?? null,
        ownerName: owner?.full_name ?? null,
        ownerEmail: owner?.email ?? null,
        billingName: o.billing_name ?? null,
        refundRequired: Boolean(o.refund_required),
      };
    })
    .filter((row) => !filters.packageId || row.lines.find((l) => l.kind === 'package')?.id === filters.packageId)
    .filter((row) => !needle || `${row.ownerName ?? ''} ${row.ownerEmail ?? ''} ${row.billingName ?? ''}`.toLowerCase().includes(needle));
}

async function inChunks(ids: string[], run: (ids: string[]) => PromiseLike<{ data: any[] | null }>): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await run(ids.slice(i, i + 200));
    out.push(...(data ?? []));
  }
  return out;
}

export type CurrencyTotals = { currency: string; settled: number; outstanding: number; refunded: number; count: number };

/**
 * Totals per currency, each state kept apart: money received, money still
 * owed, money returned. Never one grand total across currencies — there is
 * no exchange rule to add them with.
 */
export function totalsByCurrency(rows: LedgerRow[]): CurrencyTotals[] {
  const map = new Map<string, CurrencyTotals>();
  for (const row of rows) {
    const t = map.get(row.currency) ?? { currency: row.currency, settled: 0, outstanding: 0, refunded: 0, count: 0 };
    t.count += 1;
    if (row.status === 'paid' || row.status === 'manual') t.settled += row.amountCents;
    else if (row.status === 'pending') t.outstanding += row.amountCents;
    else if (row.status === 'refunded') t.refunded += row.amountCents;
    map.set(row.currency, t);
  }
  return [...map.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

/** Amount with its own currency. EUR keeps the site's "€ 1.234" style. */
export function money(cents: number, currency: string): string {
  const value = (cents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return currency === 'EUR' ? `€ ${value}` : `${value} ${currency}`;
}
