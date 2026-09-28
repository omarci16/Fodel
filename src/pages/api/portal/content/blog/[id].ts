/**
 * Save, publish/unpublish, link or create language versions of, or delete one
 * blog post or case study.
 *
 * 2.1 (brief §5):
 * - four languages (hu/nl/en/de), each version its own row;
 * - "create language versions" makes linked, empty drafts for the chosen
 *   languages — marking a language is not translating into it, so nothing is
 *   copied across and nothing can be published until someone writes it;
 * - publishing refuses an empty post, a placeholder title, and a body that is
 *   identical to a linked version in another language (Hungarian text
 *   published as a Dutch article, say).
 */
import type { APIRoute } from 'astro';
import { logEvent } from '~/lib/activity';
import { isBlogLocale, PLACEHOLDER_PREFIX } from '~/lib/blog';
import { friendlyError } from '~/lib/portal/labels';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const slugify = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

const normalise = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { supabase, profile, user } = locals;
  if (profile?.role !== 'admin') return json(403, { ok: false, error: 'Ehhez a művelethez nincs jogosultsága.' });

  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? 'save');

  const { data: current } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (!current) return json(404, { ok: false, error: 'A cikk nem található — lehet, hogy közben törölték.' });

  if (action === 'delete') {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) return json(500, { ok: false, error: friendlyError(error.message) });
    return json(200, { ok: true });
  }

  if (action === 'save') {
    if (!isBlogLocale(body.locale)) return json(422, { ok: false, error: 'Ismeretlen nyelv.' });
    const kind = body.kind === 'case_study' ? 'case_study' : 'article';
    const bodyMd = String(body.bodyMd ?? '');
    const patch: Record<string, unknown> = {
      locale: body.locale,
      slug: slugify(body.slug),
      title: String(body.title ?? '').trim(),
      excerpt: String(body.excerpt ?? '').trim(),
      body_md: bodyMd,
      category: String(body.category ?? '').trim(),
      seo_title: String(body.seoTitle ?? '').trim() || null,
      seo_description: String(body.seoDescription ?? '').trim() || null,
      featured: Boolean(body.featured),
      reading_minutes: Math.max(1, Math.round(bodyMd.split(/\s+/).filter(Boolean).length / 200)),
    };
    // Only written once migration 0014 has added the columns.
    if ('kind' in current) {
      patch.kind = kind;
      patch.case_sources = String(body.caseSources ?? '').trim() || null;
      patch.case_method = String(body.caseMethod ?? '').trim() || null;
      patch.case_results = String(body.caseResults ?? '').trim() || null;
    }
    if (!patch.slug || !patch.title) return json(422, { ok: false, error: 'A cím és az URL (slug) kötelező.' });

    // A published version may not quietly change language: its URL and its
    // sibling links are language-specific.
    if (current.published && body.locale !== current.locale) {
      return json(422, { ok: false, error: 'Publikus cikk nyelve nem módosítható. Vonja vissza, vagy hozzon létre új nyelvi változatot.' });
    }
    if (current.group_id && body.locale !== current.locale) {
      const { data: clash } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('group_id', current.group_id)
        .eq('locale', body.locale)
        .neq('id', id)
        .limit(1);
      if (clash?.length) return json(422, { ok: false, error: 'Ennek a cikknek ezen a nyelven már van változata.' });
    }

    const { error } = await supabase.from('blog_posts').update(patch).eq('id', id);
    if (error) return json(500, { ok: false, error: friendlyError(error.message) });
    return json(200, { ok: true, readingMinutes: patch.reading_minutes });
  }

  if (action === 'publish' || action === 'unpublish') {
    const publishing = action === 'publish';

    if (publishing) {
      const problems: string[] = [];
      if (!String(current.title ?? '').trim() || String(current.title).startsWith(PLACEHOLDER_PREFIX)) {
        problems.push('a cím még nincs megírva ezen a nyelven');
      }
      if (!String(current.excerpt ?? '').trim()) problems.push('hiányzik a kivonat');
      if (String(current.body_md ?? '').trim().length < 40) problems.push('hiányzik a szöveg');
      if (!String(current.category ?? '').trim()) problems.push('nincs kategória');

      if (current.group_id && !problems.length) {
        const { data: siblings } = await supabase
          .from('blog_posts')
          .select('locale, body_md, title')
          .eq('group_id', current.group_id)
          .neq('id', id);
        const copy = (siblings ?? []).find(
          (sibling: { body_md: string; title: string }) =>
            normalise(sibling.body_md) === normalise(current.body_md) || normalise(sibling.title) === normalise(current.title)
        );
        if (copy) {
          problems.push(`a szöveg vagy a cím azonos a(z) ${String(copy.locale).toUpperCase()} változatéval — ez még nem fordítás`);
        }
      }
      if (problems.length) {
        return json(422, { ok: false, error: `Nem publikálható: ${problems.join('; ')}.` });
      }
    }

    const patch: Record<string, unknown> = { published: publishing };
    // published_at is set once, on first publish, and never moved after —
    // republishing an edited post must not read as a brand-new article.
    if (publishing && !current.published_at) patch.published_at = new Date().toISOString();

    const { error } = await supabase.from('blog_posts').update(patch).eq('id', id);
    if (error) return json(500, { ok: false, error: friendlyError(error.message) });

    await logEvent({
      kind: publishing ? 'blog.published' : 'blog.unpublished',
      actorId: user?.id ?? null,
      actorEmail: profile?.email ?? null,
      subjectType: 'blog_post',
      subjectId: id,
      locale: current.locale,
      source: 'portal',
    }).catch(() => {});

    return json(200, { ok: true });
  }

  if (action === 'create_versions') {
    const wanted = (Array.isArray(body.locales) ? body.locales : [])
      .filter(isBlogLocale)
      .filter((locale: string) => locale !== current.locale);
    if (!wanted.length) return json(422, { ok: false, error: 'Nincs kiválasztott nyelv.' });

    const groupId = current.group_id ?? crypto.randomUUID();
    if (!current.group_id) {
      const { error } = await supabase.from('blog_posts').update({ group_id: groupId }).eq('id', id);
      if (error) return json(500, { ok: false, error: friendlyError(error.message) });
    }

    const { data: existing } = await supabase.from('blog_posts').select('locale').eq('group_id', groupId);
    const have = new Set((existing ?? []).map((row: { locale: string }) => row.locale));
    const missing = wanted.filter((locale: string) => !have.has(locale));

    const rows = missing.map((locale: string) => ({
      group_id: groupId,
      locale,
      // Same slug is allowed across languages (unique per locale); the editor
      // can localise it. A clash with an unrelated post in that language is
      // avoided by suffixing the language.
      slug: `${current.slug}-${locale}`,
      title: `${PLACEHOLDER_PREFIX} ${current.title}`,
      excerpt: '',
      body_md: '',
      category: '',
      published: false,
      created_by: user?.id ?? null,
      ...('kind' in current ? { kind: current.kind } : {}),
    }));
    if (rows.length) {
      const { error } = await supabase.from('blog_posts').insert(rows);
      if (error) return json(500, { ok: false, error: friendlyError(error.message) });
    }
    return json(200, { ok: true, created: missing });
  }

  if (action === 'link_translation') {
    const targetId = typeof body.targetId === 'string' ? body.targetId : null;
    if (!targetId) {
      // An independent article has no translation group at all.
      const { error } = await supabase.from('blog_posts').update({ group_id: null }).eq('id', id);
      if (error) return json(500, { ok: false, error: friendlyError(error.message) });
      return json(200, { ok: true });
    }

    const { data: target } = await supabase.from('blog_posts').select('id, group_id, locale').eq('id', targetId).maybeSingle();
    if (!target) return json(404, { ok: false, error: 'A kiválasztott cikk nem található.' });
    if (target.locale === current.locale) return json(422, { ok: false, error: 'Csak másik nyelvű cikk kapcsolható össze.' });

    const groupId = target.group_id ?? current.group_id ?? crypto.randomUUID();
    const { data: members } = await supabase.from('blog_posts').select('id, locale').eq('group_id', groupId);
    const locales = new Set((members ?? []).filter((m: { id: string }) => m.id !== id).map((m: { locale: string }) => m.locale));
    if (locales.has(current.locale)) {
      return json(422, { ok: false, error: 'A csoportban már van ilyen nyelvű változat.' });
    }

    await supabase.from('blog_posts').update({ group_id: groupId }).eq('id', targetId);
    const { error } = await supabase.from('blog_posts').update({ group_id: groupId }).eq('id', id);
    if (error) return json(500, { ok: false, error: friendlyError(error.message) });
    return json(200, { ok: true });
  }

  return json(400, { ok: false, error: 'Ismeretlen művelet.' });
};
