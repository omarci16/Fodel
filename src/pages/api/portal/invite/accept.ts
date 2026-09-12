/**
 * Turns a valid invite into a real account.
 *
 * Creates the Supabase Auth user (the admin client is required — no ordinary
 * session may create another user), creates their profile row with the role
 * the invite specified, marks the invite used, then signs them in through the
 * normal session-aware client so the browser leaves with a real session cookie.
 *
 * FODEL 1.1 adds one branch: an invite may carry a `payload` from the public
 * ad-submission form. When it does, the answers that person already typed on
 * the website become a pre-filled draft listing, and they land inside it
 * rather than on an empty dashboard. Asking someone to retype the settlement,
 * price and description they just submitted is the fastest way to lose them
 * between the form and the portal.
 */
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { deliver, templates } from '~/lib/email/send';
import { createDraft, applyIntake, type ListingIntake } from '~/lib/portal/properties';
import { SITE_URL } from '~/config/site.mjs';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const token = String(form.get('token') ?? '');
  const fullName = String(form.get('full_name') ?? '').trim();
  const password = String(form.get('password') ?? '');

  const fail = (msg: string) => redirect(`/portal/invite/${token}?error=${encodeURIComponent(msg)}`);

  if (!fullName || password.length < 8) {
    return fail('adja meg a nevét és egy legalább 8 karakteres jelszót');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const admin = createSupabaseAdminClient();

  const { data: invite } = await admin
    .from('invites')
    .select('id, email, role, expires_at, accepted_at, payload')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
    return fail('a meghívó már nem érvényes');
  }

  const payload = (invite.payload ?? {}) as Partial<ListingIntake> & { locale?: string };
  const locale = payload.locale === 'nl' ? 'nl' : 'hu';

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return fail(createError?.message ?? 'nem sikerült létrehozni a fiókot');
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    role: invite.role,
    full_name: fullName,
    email: invite.email,
    phone: payload.phone ?? null,
    locale,
  });
  if (profileError) {
    return fail(profileError.message);
  }

  await admin.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);

  // Establish a real session (sets cookies via the request/response pair), as
  // opposed to the admin client above, which never touches cookies.
  const { error: signInError } = await locals.supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signInError) {
    return redirect('/portal/login');
  }

  await deliver(
    invite.email,
    templates.welcome(locale, { name: fullName, portalUrl: `${SITE_URL}/portal/dashboard` })
  );

  // A self-service registration carries the listing they described on the
  // public form. Build it now, through the admin client, because the draft is
  // written before the freshly-created session has propagated.
  if (payload.settlement || payload.description) {
    try {
      const draftId = await createDraft(admin, created.user.id);
      await applyIntake(admin, draftId, payload as ListingIntake);

      const referralId = (payload as { referralId?: string | null }).referralId;
      if (referralId) {
        await admin.from('referrals').update({ referred_property_id: draftId }).eq('id', referralId);
      }

      return redirect(`/portal/properties/${draftId}`);
    } catch (error) {
      // A failed pre-fill must never cost someone their account — they are
      // signed in and can start a listing by hand.
      console.error('[invite] failed to pre-fill draft from intake payload', error);
    }
  }

  return redirect('/portal/dashboard');
};
