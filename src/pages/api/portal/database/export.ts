/**
 * CSV export of the activity log, under the current filter.
 *
 * Independently re-checks the admin role rather than trusting
 * ADMIN_ONLY_PREFIXES alone — the plan calls this out explicitly as the
 * easiest check to forget on a route that only reads. Capped at 10 000 rows:
 * a Vercel function streaming a few hundred thousand rows into memory is an
 * OOM waiting to happen, and 10k under any one filter is already far more
 * than a human opens in a spreadsheet.
 *
 * The export itself is logged (GDPR: exporting a table full of personal data
 * is an event worth being able to answer "who pulled this, and when").
 */
import type { APIRoute } from 'astro';
import { logEvent } from '~/lib/activity';

export const prerender = false;

const EXPORT_CAP = 10_000;

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET: APIRoute = async ({ url, locals }) => {
  const { supabase, profile, user } = locals;
  if (profile?.role !== 'admin') {
    return new Response('forbidden', { status: 403 });
  }

  const params = url.searchParams;
  let query = supabase
    .from('activity_events')
    .select('occurred_at, kind, actor_email, subject_type, subject_id, property_id, locale, source, payload')
    .order('occurred_at', { ascending: false })
    .limit(EXPORT_CAP);

  const kind = params.get('kind');
  const locale = params.get('locale');
  const source = params.get('source');
  const actor = params.get('actor');
  const from = params.get('from');
  const to = params.get('to');
  if (kind) query = query.eq('kind', kind);
  if (locale) query = query.eq('locale', locale);
  if (source) query = query.eq('source', source);
  if (actor) query = query.ilike('actor_email', `%${actor}%`);
  if (from) query = query.gte('occurred_at', new Date(from).toISOString());
  if (to) query = query.lte('occurred_at', new Date(`${to}T23:59:59`).toISOString());

  const { data, error } = await query;
  if (error) return new Response(error.message, { status: 500 });

  const rows = data ?? [];
  const header = ['occurred_at', 'kind', 'actor_email', 'subject_type', 'subject_id', 'property_id', 'locale', 'source', 'payload'];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.occurred_at,
        row.kind,
        row.actor_email,
        row.subject_type,
        row.subject_id,
        row.property_id,
        row.locale,
        row.source,
        JSON.stringify(row.payload ?? {}),
      ]
        .map(csvCell)
        .join(',')
    );
  }

  await logEvent({
    kind: 'activity.exported',
    actorId: user?.id ?? null,
    actorEmail: profile?.email ?? null,
    subjectType: 'activity_events',
    source: 'portal',
    payload: { rowCount: rows.length, filters: Object.fromEntries(params) },
  }).catch(() => {});

  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="activity-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
};
