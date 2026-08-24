import type { APIRoute } from 'astro';
import { processAndUploadImage, MediaUploadError } from '~/lib/media';

export const prerender = false;

export const POST: APIRoute = async ({ request, params, locals }) => {
  const { id } = params;
  const { supabase, profile, user } = locals;
  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  const { data: property } = await supabase
    .from('properties')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();
  if (!property) return json(404, { ok: false, error: 'not-found' });
  if (profile?.role !== 'admin' && property.owner_id !== user?.id) {
    return json(403, { ok: false, error: 'forbidden' });
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

    return json(200, { ok: true, id: data.id });
  } catch (e) {
    if (e instanceof MediaUploadError) return json(422, { ok: false, error: e.code });
    return json(500, { ok: false, error: 'unexpected' });
  }
};
