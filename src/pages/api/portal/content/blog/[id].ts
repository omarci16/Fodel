/** Save, publish/unpublish, link a translation, or delete one blog post. */
import type { APIRoute } from 'astro';
import { logEvent } from '~/lib/activity';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { supabase, profile, user } = locals;
  if (profile?.role !== 'admin') return json(403, { ok: false });

  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? 'save');

  if (action === 'delete') {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  if (action === 'save') {
    const patch: Record<string, unknown> = {
      locale: body.locale === 'nl' ? 'nl' : 'hu',
      slug: String(body.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''),
      title: String(body.title ?? '').trim(),
      excerpt: String(body.excerpt ?? '').trim(),
      body_md: String(body.bodyMd ?? ''),
      category: String(body.category ?? '').trim(),
      seo_title: String(body.seoTitle ?? '').trim() || null,
      seo_description: String(body.seoDescription ?? '').trim() || null,
      featured: Boolean(body.featured),
      reading_minutes: Math.max(1, Math.round(String(body.bodyMd ?? '').split(/\s+/).filter(Boolean).length / 200)),
    };
    if (!patch.slug || !patch.title) return json(422, { ok: false, error: 'title-and-slug-required' });

    const { error } = await supabase.from('blog_posts').update(patch).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true, readingMinutes: patch.reading_minutes });
  }

  if (action === 'publish' || action === 'unpublish') {
    const publishing = action === 'publish';
    const { data: current } = await supabase.from('blog_posts').select('published_at').eq('id', id).maybeSingle();
    const patch: Record<string, unknown> = { published: publishing };
    // published_at is set once, on first publish, and never moved after —
    // republishing an edited post must not read as a brand-new article.
    if (publishing && !current?.published_at) patch.published_at = new Date().toISOString();

    const { error } = await supabase.from('blog_posts').update(patch).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

    await logEvent({
      kind: publishing ? 'blog.published' : 'blog.unpublished',
      actorId: user?.id ?? null,
      actorEmail: profile?.email ?? null,
      subjectType: 'blog_post',
      subjectId: id,
      source: 'portal',
    }).catch(() => {});

    return json(200, { ok: true });
  }

  if (action === 'link_translation') {
    const targetId = typeof body.targetId === 'string' ? body.targetId : null;
    if (!targetId) {
      // An independent article has no translation group at all.
      const { error } = await supabase.from('blog_posts').update({ group_id: null }).eq('id', id);
      if (error) return json(500, { ok: false, error: error.message });
      return json(200, { ok: true });
    }

    const { data: target } = await supabase.from('blog_posts').select('id, group_id, locale').eq('id', targetId).maybeSingle();
    if (!target) return json(404, { ok: false, error: 'target-not-found' });

    const groupId = target.group_id ?? crypto.randomUUID();
    await supabase.from('blog_posts').update({ group_id: groupId }).eq('id', targetId);
    const { error } = await supabase.from('blog_posts').update({ group_id: groupId }).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  return json(400, { ok: false, error: 'unknown-action' });
};
