/**
 * Cover / OG image upload for one blog post — through the *existing* sharp
 * pipeline in src/lib/media.ts (strips EXIF/GPS, caps resolution), into the
 * `blog-media` bucket rather than `property-media`. `field` picks which
 * column the resulting URL is written to.
 */
import type { APIRoute } from 'astro';
import { processAndUploadImage, deleteImage, MediaUploadError } from '~/lib/media';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { supabase, profile } = locals;
  if (profile?.role !== 'admin') return json(403, { ok: false });

  const { id } = params;
  const form = await request.formData();
  const file = form.get('file');
  const field = form.get('field') === 'og' ? 'og_image_url' : 'cover_url';
  if (!(file instanceof File)) return json(400, { ok: false, error: 'no-file' });

  const { data: post } = await supabase.from('blog_posts').select('cover_url, og_image_url').eq('id', id).maybeSingle();
  if (!post) return json(404, { ok: false, error: 'not-found' });

  try {
    const uploaded = await processAndUploadImage(supabase, id!, file, 'blog-media');
    const previous = field === 'og_image_url' ? post.og_image_url : post.cover_url;
    if (previous) await deleteImage(supabase, previous, 'blog-media');

    const { error } = await supabase.from('blog_posts').update({ [field]: uploaded.url }).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

    return json(200, { ok: true, url: uploaded.url });
  } catch (e) {
    if (e instanceof MediaUploadError) return json(422, { ok: false, error: e.code });
    return json(500, { ok: false, error: 'unexpected' });
  }
};
