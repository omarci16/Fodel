/**
 * Saves the FODEL Top 10 — Gábor's editorial selection, in order.
 *
 * Deliberately knows nothing about payments: a paid homepage or category
 * highlight never earns a place here (brief §1/A). The whole ranking is
 * replaced by one database call (set_editors_pick, migration 0014), so the
 * homepage can never read a half-saved order.
 *
 * A listing can only be *added* while it is live and not reserved. One that
 * is already in the selection may stay after it sells or is withdrawn — the
 * public block hides it on its own — so an admin tidying the order is never
 * forced to drop an entry at the same time.
 */
import type { APIRoute } from 'astro';
import { logEvent } from '~/lib/activity';
import { friendlyError } from '~/lib/portal/labels';

export const prerender = false;

const MAX = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase, profile, user } = locals;
  if (profile?.role !== 'admin') return json(403, { ok: false, error: 'Ehhez nincs jogosultsága.' });

  const body = await request.json().catch(() => ({}));
  const raw: unknown[] = Array.isArray(body.ids) ? body.ids : [];
  const ids = [...new Set(raw.map(String).filter((id) => UUID.test(id)))];
  if (ids.length !== raw.length) return json(422, { ok: false, error: 'Érvénytelen vagy ismétlődő tétel a listában.' });
  if (ids.length > MAX) return json(422, { ok: false, error: `Legfeljebb ${MAX} ingatlan választható ki.` });

  const { data: rows, error: readError } = ids.length
    ? await supabase.from('properties').select('id, ref, status, reserved, editors_pick').in('id', ids)
    : { data: [], error: null };
  if (readError) return json(500, { ok: false, error: friendlyError(readError.message) });
  if ((rows ?? []).length !== ids.length) return json(422, { ok: false, error: 'Az egyik ingatlan már nem létezik — frissítse az oldalt.' });

  const ineligible = (rows ?? []).filter((row) => !row.editors_pick && (row.status !== 'published' || row.reserved));
  if (ineligible.length) {
    return json(422, {
      ok: false,
      error: `Csak élő, nem foglalt hirdetés vehető fel: ${ineligible.map((row) => `#${row.ref}`).join(', ')}.`,
    });
  }

  const { error } = await supabase.rpc('set_editors_pick', { p_ids: ids });
  if (error) return json(500, { ok: false, error: friendlyError(error.message) });

  await logEvent({
    kind: 'listing.curation',
    actorId: user?.id ?? null,
    actorEmail: profile?.email ?? null,
    subjectType: 'top10',
    source: 'portal',
    payload: { refs: ids.map((id) => rows?.find((row) => row.id === id)?.ref) },
  }).catch(() => {});

  return json(200, { ok: true });
};
