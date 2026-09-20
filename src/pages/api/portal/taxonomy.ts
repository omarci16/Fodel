/**
 * Admin vocabulary writes. Stable keys and group membership are intentionally
 * absent from the save path: changing either is a data migration, never an
 * inline convenience edit. Slugs lock once used because they are permanent,
 * indexed and already present in emailed links.
 */
import type { APIRoute } from 'astro';

export const prerender = false;
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function usage(supabase: any, term: any) {
  if (term.group_key === 'blog_category') {
    const labels = Object.values(term.labels ?? {}).filter(Boolean);
    const { data, count } = await supabase.from('blog_posts').select('id, published', { count: 'exact' }).in('category', labels);
    return { total: count ?? 0, live: (data ?? []).filter((row: any) => row.published).length };
  }
  let query = supabase.from('properties').select('id, status', { count: 'exact' });
  if (term.group_key === 'category') query = query.eq('category', term.key);
  else if (term.group_key === 'feature') query = query.contains('features', [term.key]);
  else if (term.group_key === 'condition') query = query.eq('condition_key', term.key);
  else if (term.group_key === 'heating') query = query.eq('heating_key', term.key);
  else if (term.group_key === 'county') query = query.in('county', Object.values(term.labels ?? {}).filter(Boolean));
  else if (term.group_key === 'region') query = query.in('region', Object.values(term.labels ?? {}).filter(Boolean));
  else return { total: 0, live: 0 };
  const { data, count } = await query;
  return { total: count ?? 0, live: (data ?? []).filter((row: any) => ['published', 'sold'].includes(row.status)).length };
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.profile?.role !== 'admin') return json(403, { ok: false });
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? '');
  const { supabase } = locals;

  if (action === 'create') {
    const groupKey = String(body.groupKey ?? '');
    const key = String(body.key ?? '').trim();
    if (!/^[a-z0-9][a-z0-9-]{0,48}$/.test(key)) return json(422, { ok: false, error: 'invalid-key' });
    const row = { group_key: groupKey, key, labels: body.labels, slugs: body.slugs ?? {}, schema_type: body.schemaType || null, sort_order: Number(body.sortOrder ?? 100), enabled: true };
    const { error } = await supabase.from('taxonomy_terms').insert(row);
    return error ? json(422, { ok: false, error: error.message }) : json(201, { ok: true });
  }

  const id = String(body.id ?? '');
  const { data: term } = await supabase.from('taxonomy_terms').select('*').eq('id', id).maybeSingle();
  if (!term) return json(404, { ok: false, error: 'not-found' });
  const counts = await usage(supabase, term);

  if (action === 'delete') {
    if (counts.total > 0) return json(409, { ok: false, error: 'in-use', count: counts.total });
    const { error } = await supabase.from('taxonomy_terms').delete().eq('id', id);
    return error ? json(422, { ok: false, error: error.message }) : json(200, { ok: true });
  }

  if (action === 'save') {
    const enabled = Boolean(body.enabled);
    if (term.group_key === 'category' && !enabled && term.enabled) {
      const { count } = await supabase.from('taxonomy_terms').select('id', { count: 'exact', head: true }).eq('group_key', 'category').eq('enabled', true).neq('id', id);
      if (!count) return json(422, { ok: false, error: 'last-category' });
    }
    const patch: Record<string, unknown> = { labels: body.labels, sort_order: Number(body.sortOrder ?? term.sort_order), enabled };
    if (counts.total === 0) {
      patch.slugs = body.slugs ?? {};
      patch.schema_type = body.schemaType || null;
    }
    const { error } = await supabase.from('taxonomy_terms').update(patch).eq('id', id);
    return error ? json(422, { ok: false, error: error.message }) : json(200, { ok: true });
  }
  return json(400, { ok: false, error: 'unknown-action' });
};
