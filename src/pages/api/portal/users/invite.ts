/**
 * Creates an invite: a cryptographically random token, hashed at rest —
 * only the hash is ever stored, so a database leak alone can't be used to
 * accept invites. The raw token only ever exists in the email link and in
 * memory here.
 */
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { deliver, templates } from '~/lib/email/send';

export const prerender = false;

const EXPIRES_DAYS = 7;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  // Middleware already enforces admin-only for /portal/users*, but this is
  // an /api/portal route reached the same way — re-check explicitly.
  if (locals.profile?.role !== 'admin') {
    return redirect('/portal/dashboard');
  }

  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const role = form.get('role') === 'admin' ? 'admin' : 'owner';
  // Which language to write the invite in. There is no profile to read a
  // preference from yet — this is the first contact — so the admin choosing
  // it on the invite form is the only signal available, and it is also what
  // seeds `profiles.locale` when the invite is accepted.
  const locale = form.get('locale') === 'nl' ? 'nl' : 'hu';

  if (!email || !email.includes('@')) {
    return redirect(`/portal/users/invite?error=${encodeURIComponent('érvénytelen e-mail cím')}`);
  }

  const { data: existing } = await locals.supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return redirect(`/portal/users/invite?error=${encodeURIComponent('ez az e-mail cím már regisztrált felhasználóhoz tartozik')}`);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await locals.supabase.from('invites').insert({
    email,
    token_hash: tokenHash,
    role,
    invited_by: locals.user!.id,
    expires_at: expiresAt.toISOString(),
    payload: { locale },
  });
  if (error) {
    return redirect(`/portal/users/invite?error=${encodeURIComponent(error.message)}`);
  }

  const acceptUrl = `${new URL(request.url).origin}/portal/invite/${token}`;
  await deliver(email, templates.invite(locale, { role, acceptUrl }));

  return redirect(`/portal/users/invite?sent=${encodeURIComponent(email)}`);
};
