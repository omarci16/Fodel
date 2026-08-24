import type { APIRoute } from 'astro';
import { deleteImage } from '~/lib/media';

export const prerender = false;

async function authorize(locals: App.Locals, propertyId: string) {
  const { supabase, profile, user } = locals;
  const { data: property } = await supabase
    .from('properties')
    .select('id, owner_id')
    .eq('id', propertyId)
    .maybeSingle();
  if (!property) return { ok: false as const, status: 404 };
  if (profile?.role !== 'admin' && property.owner_id !== user?.id) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const, supabase };
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { id, mediaId } = params;
  const auth = await authorize(locals, id!);
  if (!auth.ok) return json(auth.status, { ok: false });

  const { data: media } = await auth.supabase
    .from('property_media')
    .select('storage_path')
    .eq('id', mediaId)
    .single();
  if (media) await deleteImage(auth.supabase, media.storage_path);

  const { error } = await auth.supabase.from('property_media').delete().eq('id', mediaId);
  if (error) return json(500, { ok: false, error: error.message });
  return json(200, { ok: true });
};

/** Sets a photo as the hero. Exactly one media row per property may have is_hero = true. */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { id, mediaId } = params;
  const auth = await authorize(locals, id!);
  if (!auth.ok) return json(auth.status, { ok: false });

  const body = await request.json().catch(() => ({}));
  if (body.isHero) {
    await auth.supabase.from('property_media').update({ is_hero: false }).eq('property_id', id);
    const { error } = await auth.supabase.from('property_media').update({ is_hero: true }).eq('id', mediaId);
    if (error) return json(500, { ok: false, error: error.message });
  }
  return json(200, { ok: true });
};
