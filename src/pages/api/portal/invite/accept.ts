/**
 * Turns a valid invite into a real account: creates the Supabase Auth user
 * (the admin client is required for this — no ordinary session can create
 * another user), creates their profile row with the role the invite
 * specified, marks the invite used, then signs them in through the normal
 * session-aware client so the browser leaves with a real session cookie.
 */
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { sendEmail, templates } from '~/lib/email/send';

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
    .select('id, email, role, expires_at, accepted_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
    return fail('a meghívó már nem érvényes');
  }

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
  });
  if (profileError) {
    return fail(profileError.message);
  }

  await admin.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);

  // Establish a real session (sets cookies via the request/response pair),
  // as opposed to the admin client above, which never touches cookies.
  const { error: signInError } = await locals.supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signInError) {
    return redirect('/portal/login');
  }

  const { subject, html } = templates.welcome({ name: fullName });
  await sendEmail({ to: invite.email, subject, html });

  return redirect('/portal/dashboard');
};
