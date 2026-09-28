/**
 * Saves or removes one language's invite wording (email_templates).
 *
 * Approval is an explicit tick on every save, never inherited: text changed
 * after approval is sent only once someone approves the new version.
 */
import type { APIRoute } from 'astro';
import { isInviteLocale } from '~/lib/portal/invites';
import { friendlyError } from '~/lib/portal/labels';

export const prerender = false;

const LIMITS = { subject: 150, heading: 150, body: 3000, cta: 60 } as const;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (locals.profile?.role !== 'admin') return new Response('Ehhez nincs jogosultsága.', { status: 403 });

  const form = await request.formData();
  const locale = String(form.get('locale') ?? '');
  const back = (query: string) => redirect(`/portal/settings/templates?${query}#${locale}`);
  if (!isInviteLocale(locale)) return back('error=' + encodeURIComponent('Ismeretlen nyelv.'));

  if (form.get('action') === 'delete') {
    const { error } = await locals.supabase.from('email_templates').delete().eq('key', 'invite').eq('locale', locale);
    return back(error ? 'error=' + encodeURIComponent(friendlyError(error.message)) : 'saved=' + locale);
  }

  const row = {
    key: 'invite',
    locale,
    subject: String(form.get('subject') ?? '').trim(),
    heading: String(form.get('heading') ?? '').trim(),
    body: String(form.get('body') ?? '').trim(),
    cta: String(form.get('cta') ?? '').trim(),
    approved: form.get('approved') === 'yes',
    updated_by: locals.user!.id,
  };
  for (const field of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    if (!row[field]) return back('error=' + encodeURIComponent('Minden mező kitöltése kötelező.'));
    if (row[field].length > LIMITS[field]) {
      return back('error=' + encodeURIComponent(`Túl hosszú mező (legfeljebb ${LIMITS[field]} karakter).`));
    }
  }

  const { error } = await locals.supabase.from('email_templates').upsert(row, { onConflict: 'key,locale' });
  return back(error ? 'error=' + encodeURIComponent(friendlyError(error.message)) : 'saved=' + locale);
};
