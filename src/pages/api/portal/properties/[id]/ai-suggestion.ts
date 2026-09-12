/**
 * Request, accept, edit-and-accept, or reject a description-rewrite
 * suggestion for one property/locale. Owner or admin — RLS on
 * `ai_suggestions` decides who may touch which row; this only adds the
 * server-side re-check the rest of the property editor already does.
 */
import type { APIRoute } from 'astro';
import { suggestDescription } from '~/lib/ai/description';
import { isAiEnabled, AiError } from '~/lib/ai/client';
import { logEvent } from '~/lib/activity';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { supabase, profile, user } = locals;
  const { id } = params;

  const { data: property } = await supabase.from('properties').select('id, owner_id').eq('id', id).maybeSingle();
  if (!property) return json(404, { ok: false, error: 'not-found' });
  const isAdmin = profile?.role === 'admin';
  if (!isAdmin && property.owner_id !== user?.id) return json(403, { ok: false });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? 'request');
  const locale = body.locale === 'nl' ? 'nl' : 'hu';

  if (action === 'request') {
    if (!isAiEnabled()) return json(503, { ok: false, error: 'ai-disabled' });

    const { data: translation } = await supabase
      .from('property_translations')
      .select('title, subtitle, description, body')
      .eq('property_id', id)
      .eq('locale', locale)
      .maybeSingle();
    if (!translation) return json(404, { ok: false, error: 'no-translation' });

    let suggestion;
    try {
      suggestion = await suggestDescription(locale, translation);
    } catch (e) {
      const code = e instanceof AiError ? e.code : 'unexpected';
      // A failed rewrite must never block the seller's own editing — the row
      // simply isn't created, and the button stays available to retry.
      return json(502, { ok: false, error: code });
    }

    // Supersede any earlier pending suggestion for this property/locale —
    // asking again after editing replaces the old one, never leaves two live.
    await supabase.from('ai_suggestions').delete().eq('property_id', id).eq('locale', locale).eq('status', 'pending');

    const { data: row, error } = await supabase
      .from('ai_suggestions')
      .insert({
        property_id: id,
        locale,
        original: translation,
        suggested: { title: suggestion.title, subtitle: suggestion.subtitle, description: suggestion.description, body: suggestion.body },
        issues: suggestion.issues,
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) return json(500, { ok: false, error: error.message });

    return json(200, { ok: true, suggestion: row });
  }

  if (action === 'accept' || action === 'accept_edited' || action === 'reject') {
    const suggestionId = String(body.suggestionId ?? '');
    const { data: suggestion } = await supabase.from('ai_suggestions').select('*').eq('id', suggestionId).maybeSingle();
    if (!suggestion) return json(404, { ok: false, error: 'not-found' });

    if (action === 'reject') {
      await supabase.from('ai_suggestions').update({ status: 'rejected' }).eq('id', suggestionId);
      return json(200, { ok: true });
    }

    const fields =
      action === 'accept_edited' && body.edited
        ? {
            title: String(body.edited.title ?? suggestion.suggested.title),
            subtitle: body.edited.subtitle ? String(body.edited.subtitle) : null,
            description: String(body.edited.description ?? suggestion.suggested.description),
            body: String(body.edited.body ?? suggestion.suggested.body),
          }
        : suggestion.suggested;

    const { error } = await supabase
      .from('property_translations')
      .update(fields)
      .eq('property_id', id)
      .eq('locale', suggestion.locale);
    if (error) return json(500, { ok: false, error: error.message });

    await supabase
      .from('ai_suggestions')
      .update({ status: action === 'accept_edited' ? 'accepted_edited' : 'accepted' })
      .eq('id', suggestionId);

    await logEvent({
      kind: 'ai_suggestion.accepted',
      actorId: user?.id ?? null,
      actorEmail: profile?.email ?? null,
      subjectType: 'ai_suggestion',
      subjectId: suggestionId,
      propertyId: id,
      locale: suggestion.locale,
      source: 'portal',
    }).catch(() => {});

    return json(200, { ok: true });
  }

  return json(400, { ok: false, error: 'unknown-action' });
};
