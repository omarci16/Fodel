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
    .select('storage_path, is_hero')
    .eq('id', mediaId)
    .single();
  if (media) await deleteImage(auth.supabase, media.storage_path);

  const { error } = await auth.supabase.from('property_media').delete().eq('id', mediaId);
  if (error) return json(500, { ok: false, error: error.message });

  // Deleting the cover photo must not leave a listing with none. Promote the
  // next one by sort order, or the public page falls back to `media[0]`
  // anyway and the portal's "cover" badge silently disagrees with what the
  // website shows.
  if (media?.is_hero) {
    const { data: next } = await auth.supabase
      .from('property_media')
      .select('id')
      .eq('property_id', id)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await auth.supabase.from('property_media').update({ is_hero: true }).eq('id', next.id);
    }
  }

  return json(200, { ok: true });
};

/**
 * Updates one photo: which is the cover, and its description.
 *
 * The description matters more than it looks. Until 1.1 every uploaded photo
 * was stored with `alt: {}` — no description at all — which fails the site's
 * own accessibility preflight (`npm run verify:ssg` asserts alt text on every
 * image) and throws away image-search traffic on a site whose product is
 * photographs of houses.
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { id, mediaId } = params;
  const auth = await authorize(locals, id!);
  if (!auth.ok) return json(auth.status, { ok: false });

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (typeof body.alt === 'string') {
    const alt = body.alt.trim().slice(0, 160);
    // Stored per locale, same shape the public site reads through `text()`.
    // Hungarian is the language the owner writes in; the other locales fall
    // back to it exactly as titles and descriptions do.
    patch.alt = alt ? { hu: alt } : {};
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await auth.supabase.from('property_media').update(patch).eq('id', mediaId);
    if (error) return json(500, { ok: false, error: error.message });
  }

  if (body.isHero) {
    await auth.supabase.from('property_media').update({ is_hero: false }).eq('property_id', id);
    const { error } = await auth.supabase
      .from('property_media')
      .update({ is_hero: true })
      .eq('id', mediaId);
    if (error) return json(500, { ok: false, error: error.message });
  }

  return json(200, { ok: true });
};
