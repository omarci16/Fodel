/**
 * Excel export of the payments ledger (brief §3).
 *
 * Same filters, same loader as /portal/payments, so the file holds exactly
 * the rows the admin filtered — all of them, not the page on screen. Amounts
 * are numbers in their own currency column, and the summary sheet keeps each
 * currency and each state (received / outstanding / refunded) apart.
 *
 * Admin-only twice over: middleware (ADMIN_ONLY_PREFIXES covers
 * /api/portal/payments) and the check below; RLS limits the reads again.
 */
import type { APIRoute } from 'astro';
import { loadLedger, ledgerFilters, totalsByCurrency } from '~/lib/portal/payments';
import { buildWorkbook, type Cell } from '~/lib/xlsx';
import { logEvent } from '~/lib/activity';
import { friendlyError } from '~/lib/portal/labels';

export const prerender = false;

const MISSING_ITEMS = 'Hiányzó tételadat (régi rendelés)';

export const GET: APIRoute = async ({ url, locals }) => {
  const { supabase, profile, user } = locals;
  if (profile?.role !== 'admin') return new Response('Ehhez nincs jogosultsága.', { status: 403 });

  let rows;
  try {
    rows = await loadLedger(supabase, ledgerFilters(url.searchParams));
  } catch (error) {
    return new Response(friendlyError((error as Error).message), { status: 500 });
  }

  const text = (v: string | null | undefined): Cell => ({ t: 'text', v });
  const amount = (cents: number): Cell => ({ t: 'number', v: cents / 100, format: 'money' });
  const date = (v: string | null): Cell => ({ t: 'date', v });

  const ledger = {
    name: 'Fizetések',
    columns: [
      { header: 'Létrehozva', width: 17 },
      { header: 'Fizetés tárgya', width: 44 },
      { header: 'Hirdetés', width: 10 },
      { header: 'Hirdetés címe', width: 36 },
      { header: 'Település', width: 16 },
      { header: 'Ügyfél', width: 24 },
      { header: 'Ügyfél e-mail', width: 28 },
      { header: 'Számlázási név', width: 24 },
      { header: 'Fizetési mód', width: 20 },
      { header: 'Állapot', width: 20 },
      { header: 'Pénznem', width: 9 },
      { header: 'Összeg', width: 12 },
      { header: 'Kedvezmény', width: 12 },
      { header: 'Esedékes', width: 17 },
      { header: 'Fizetve', width: 17 },
      { header: 'Visszatérítve', width: 17 },
      { header: 'Visszatérítés szükséges', width: 12 },
      { header: 'Rendelés azonosító', width: 38 },
    ],
    rows: rows.map((row): Cell[] => [
      date(row.createdAt),
      text(row.items ?? MISSING_ITEMS),
      text(row.propertyRef ? `#${row.propertyRef}` : null),
      text(row.propertyTitle),
      text(row.settlement),
      text(row.ownerName),
      text(row.ownerEmail),
      text(row.billingName),
      text(row.method),
      text(row.statusLabel),
      text(row.currency),
      amount(row.amountCents),
      amount(row.discountCents),
      date(row.dueAt),
      date(row.paidAt),
      date(row.refundedAt),
      text(row.refundRequired ? 'igen' : ''),
      text(row.id),
    ]),
  };

  const summary = {
    name: 'Összesítés',
    columns: [
      { header: 'Pénznem', width: 10 },
      { header: 'Tételek', width: 10 },
      { header: 'Beérkezett', width: 14 },
      { header: 'Kintlévőség', width: 14 },
      { header: 'Visszatérítve', width: 14 },
    ],
    rows: totalsByCurrency(rows).map((t): Cell[] => [
      text(t.currency),
      { t: 'number', v: t.count, format: 'integer' },
      amount(t.settled),
      amount(t.outstanding),
      amount(t.refunded),
    ]),
  };

  const file = buildWorkbook([ledger, summary]);

  await logEvent({
    kind: 'payments.exported',
    actorId: user?.id ?? null,
    actorEmail: profile?.email ?? null,
    subjectType: 'payments',
    source: 'portal',
    payload: { rowCount: rows.length, filters: Object.fromEntries(url.searchParams) },
  }).catch(() => {});

  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="fizetesek-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      'cache-control': 'no-store',
    },
  });
};
