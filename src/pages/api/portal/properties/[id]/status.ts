/**
 * The status machine (Stage 4):
 *
 *   draft ──submit──▶ submitted ──approve──▶ published ──▶ sold | archived
 *                         │
 *                         └──request_changes──▶ changes_requested ──▶ (owner edits, submits again)
 *
 * Every transition is re-checked here even though RLS also constrains who
 * may UPDATE a row at all — RLS can't express "only when moving from exactly
 * this status to exactly that one", so that part of the rule lives here.
 */
import type { APIRoute } from 'astro';
import { sendEmail, templates } from '~/lib/email/send';
import { CATEGORIES, ROUTES } from '~/i18n/ui';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function notifyOwner(supabase: any, ownerId: string | null, build: (email: string) => { subject: string; html: string }) {
  if (!ownerId) return;
  const { data: owner } = await supabase.from('profiles').select('email').eq('id', ownerId).maybeSingle();
  if (owner?.email) {
    const { subject, html } = build(owner.email);
    await sendEmail({ to: owner.email, subject, html });
  }
}

function publicUrl(property: { category: string; ref: string }): string {
  const slug = (CATEGORIES as any)[property.category]?.hu?.slug ?? property.category;
  return `https://fodel.nl/hu/${ROUTES.hu.detail(slug, property.ref)}/`;
}

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { id } = params;
  const { supabase, profile, user } = locals;
  const isAdmin = profile?.role === 'admin';

  const { data: property } = await supabase
    .from('properties')
    .select('id, ref, category, status, owner_id, package')
    .eq('id', id)
    .maybeSingle();
  if (!property) return json(404, { ok: false, error: 'not-found' });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? '');
  const isOwner = property.owner_id === user?.id;

  const title = async () => {
    const { data } = await supabase
      .from('property_translations')
      .select('title')
      .eq('property_id', id)
      .eq('locale', 'hu')
      .maybeSingle();
    return data?.title ?? `Ingatlan #${property.ref}`;
  };

  if (action === 'submit') {
    if (!isOwner && !isAdmin) return json(403, { ok: false });
    if (!['draft', 'changes_requested'].includes(property.status)) {
      return json(409, { ok: false, error: 'not-editable' });
    }
    const { count: mediaCount } = await supabase
      .from('property_media')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', id);
    if (!mediaCount) return json(422, { ok: false, error: 'no-photos' });

    const { error } = await supabase
      .from('properties')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

    const t = await title();
    await notifyOwner(supabase, property.owner_id, () => templates.submissionReceived({ ref: property.ref, title: t }));
    return json(200, { ok: true });
  }

  if (action === 'approve') {
    if (!isAdmin) return json(403, { ok: false });
    if (property.status !== 'submitted') return json(409, { ok: false, error: 'not-submitted' });

    const months = property.package === 'normal-12m' ? 12 : 6;
    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + months);

    const { error } = await supabase
      .from('properties')
      .update({
        status: 'published',
        published_at: now.toISOString(),
        approved_at: now.toISOString(),
        approved_by: user!.id,
        expires_at: expires.toISOString(),
      })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

    const t = await title();
    await notifyOwner(supabase, property.owner_id, () =>
      templates.approved({ ref: property.ref, title: t, url: publicUrl(property) })
    );
    return json(200, { ok: true });
  }

  if (action === 'request_changes') {
    if (!isAdmin) return json(403, { ok: false });
    if (property.status !== 'submitted') return json(409, { ok: false, error: 'not-submitted' });
    const note = String(body.note ?? '').trim();
    if (!note) return json(422, { ok: false, error: 'note-required' });

    const { error } = await supabase.from('properties').update({ status: 'changes_requested' }).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

    await supabase.from('review_notes').insert({ property_id: id, author_id: user!.id, note });

    const t = await title();
    await notifyOwner(supabase, property.owner_id, () => templates.changesRequested({ ref: property.ref, title: t, note }));
    return json(200, { ok: true });
  }

  if (action === 'mark_sold') {
    if (!isAdmin && !isOwner) return json(403, { ok: false });
    if (property.status !== 'published') return json(409, { ok: false, error: 'not-published' });
    const { error } = await supabase.from('properties').update({ status: 'sold' }).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  if (action === 'archive') {
    if (!isAdmin) return json(403, { ok: false });
    const { error } = await supabase.from('properties').update({ status: 'archived' }).eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  return json(400, { ok: false, error: 'unknown-action' });
};
