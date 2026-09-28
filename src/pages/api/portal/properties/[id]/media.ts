import type { APIRoute } from 'astro';
import { processAndUploadImage, MediaUploadError, LOW_RESOLUTION_EDGE } from '~/lib/media';
import { OWNER_EDITABLE } from '~/lib/portal/properties';
import { logEvent } from '~/lib/activity';

export const prerender = false;

export const POST: APIRoute = async ({ request, params, locals }) => {
  const { id } = params;
  const { supabase, profile, user } = locals;
  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  const { data: property } = await supabase
    .from('properties')
    .select('id, owner_id, status')
    .eq('id', id)
    .maybeSingle();
  if (!property) return json(404, { ok: false, error: 'not-found' });
  const isAdmin = profile?.role === 'admin';
  if (!isAdmin && property.owner_id !== user?.id) {
    return json(403, { ok: false, error: 'forbidden' });
  }
  // A submitted or live listing's photos change only through review — a
  // re-upload must not slip past the human approval (brief §7).
  if (!isAdmin && !OWNER_EDITABLE.includes(property.status)) {
    return json(409, { ok: false, error: 'not-editable' });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return json(400, { ok: false, error: 'no-file' });

  try {
    const uploaded = await processAndUploadImage(supabase, id!, file);
    const { count } = await supabase
      .from('property_media')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', id);
    const isFirst = (count ?? 0) === 0;

    const { data, error } = await supabase
      .from('property_media')
      .insert({
        property_id: id,
        storage_path: uploaded.url,
        width: uploaded.width,
        height: uploaded.height,
        alt: {},
        sort_order: count ?? 0,
        is_hero: isFirst,
      })
      .select('id')
      .single();
    if (error) return json(500, { ok: false, error: error.message });

    await logEvent({
      kind: 'media.uploaded',
      actorId: user?.id ?? null,
      actorEmail: profile?.email ?? null,
      subjectType: 'property_media',
      subjectId: data.id,
      propertyId: id ?? null,
      source: 'portal',
    }).catch(() => {});

    // Not a rejection: a small photo is still a photo. But the seller should
    // know it will look soft on a large screen while they can still replace it.
    const lowResolution = Math.max(uploaded.originalWidth, uploaded.originalHeight) < LOW_RESOLUTION_EDGE;
    return json(200, { ok: true, id: data.id, warning: lowResolution ? 'low-resolution' : undefined });
  } catch (e) {
    if (e instanceof MediaUploadError) return json(422, { ok: false, error: e.code });
    return json(500, { ok: false, error: 'unexpected' });
  }
};
