/**
 * Saves the service and automation switches (site_settings.services /
 * .automation, migration 0014).
 *
 * The two automations are refused server-side whatever the form sends: the
 * reminder email has no approved wording, timing, sender or legal basis yet,
 * and automatic seller invites have no agreed criteria (brief §4, §7). They
 * are stored as `false` until those decisions exist and this guard is lifted
 * deliberately in code — not by ticking a box.
 */
import type { APIRoute } from 'astro';
import { friendlyError } from '~/lib/portal/labels';

export const prerender = false;

const NOTICE_MAX = 800;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (locals.profile?.role !== 'admin') return new Response('Ehhez nincs jogosultsága.', { status: 403 });
  const back = (query: string) => redirect(`/portal/settings/services?${query}`);

  const form = await request.formData();
  const notice = {
    hu: String(form.get('notice_hu') ?? '').trim().slice(0, NOTICE_MAX),
    nl: String(form.get('notice_nl') ?? '').trim().slice(0, NOTICE_MAX),
  };

  const services = {
    valuationEntry: form.get('valuation_entry') === 'yes',
    valuationFreeConfirmed: form.get('valuation_free') === 'yes',
    valuationNotice: Object.fromEntries(Object.entries(notice).filter(([, text]) => text)),
  };
  const automation = { registrationReminder: false, inviteAutomation: false };

  const { error } = await locals.supabase.from('site_settings').update({ services, automation }).eq('id', 1);
  return back(error ? 'error=' + encodeURIComponent(friendlyError(error.message)) : 'saved=1');
};
