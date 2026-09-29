/**
 * Admin update of one on-site service request: status, date, internal note.
 * Admin-only (middleware ADMIN_ONLY_PREFIXES + the check below + RLS).
 */
import type { APIRoute } from 'astro';
import { logEvent } from '~/lib/activity';
import { friendlyError } from '~/lib/portal/labels';

export const prerender = false;

const STATUSES = ['requested', 'scheduled', 'done', 'cancelled'];
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { supabase, profile, user } = locals;
  if (profile?.role !== 'admin') return json(403, { ok: false, error: 'Ehhez nincs jogosultsága.' });

  const body = await request.json().catch(() => ({}));
  const status = String(body.status ?? '');
  if (!STATUSES.includes(status)) return json(422, { ok: false, error: 'Ismeretlen állapot.' });
  const scheduledFor = typeof body.scheduledFor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.scheduledFor) ? body.scheduledFor : null;
  const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim().slice(0, 2000) || null : null;

  const { error } = await supabase
    .from('service_requests')
    .update({ status, scheduled_for: scheduledFor, admin_note: adminNote })
    .eq('id', params.id);
  if (error) return json(500, { ok: false, error: friendlyError(error.message) });

  await logEvent({
    kind: 'service.updated',
    actorId: user?.id ?? null,
    actorEmail: profile?.email ?? null,
    subjectType: 'service_request',
    subjectId: params.id,
    source: 'portal',
    payload: { status, scheduledFor },
  }).catch(() => {});

  return json(200, { ok: true });
};
