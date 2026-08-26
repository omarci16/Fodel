/**
 * Completes a password reset.
 *
 * The token from the URL is hashed and matched against the stored hash — the
 * raw value never round-trips through the database, exactly as with invites.
 * Changing another user's password requires the admin client; no ordinary
 * session can do it, and the person doing this is by definition signed out.
 */
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { createSupabaseAdminClient } from '~/lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const token = String(form.get('token') ?? '');
  const password = String(form.get('password') ?? '');
  const password2 = String(form.get('password2') ?? '');

  const fail = (msg: string) => redirect(`/portal/reset/${token}?error=${encodeURIComponent(msg)}`);

  if (password.length < 8) return fail('a jelszó legalább 8 karakter legyen');
  if (password !== password2) return fail('a két jelszó nem egyezik');

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const admin = createSupabaseAdminClient();

  const { data: reset } = await admin
    .from('password_resets')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!reset || reset.used_at || new Date(reset.expires_at) < new Date()) {
    return fail('ez a link már nem érvényes — kérjen újat');
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', reset.user_id)
    .maybeSingle();
  if (!profile?.email) return fail('a fiók nem található');

  const { error } = await admin.auth.admin.updateUserById(reset.user_id, { password });
  if (error) return fail(error.message);

  // Spend the token before signing in, not after: if the sign-in below fails
  // for any reason the password has still changed, and a token that could be
  // replayed after a successful change would be a real hole.
  await admin
    .from('password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('id', reset.id);

  const { error: signInError } = await locals.supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });
  if (signInError) return redirect('/portal/login?reset=1');

  return redirect('/portal/dashboard');
};
