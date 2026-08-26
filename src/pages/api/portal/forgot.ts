/**
 * Starts a password reset.
 *
 * Two things worth stating about the design:
 *
 * 1. **The response never reveals whether an account exists.** Success and
 *    "no such address" return the identical redirect. An endpoint that says
 *    "no account with that email" is a free account-enumeration oracle, and
 *    the whole point of an invite-only portal is that its membership isn't
 *    public.
 *
 * 2. **Supabase's own resetPasswordForEmail is deliberately not used.** It
 *    sends Supabase's template — unbranded and English. Every other message
 *    FODEL sends is branded and in the reader's language, and a password reset
 *    is the single email most likely to be mistaken for phishing. It is the
 *    worst possible place to break the pattern. So this mints its own token
 *    with the same hashed, single-use, expiring design as `invites`.
 */
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { deliver, localeOf, templates } from '~/lib/email/send';

export const prerender = false;

const EXPIRES_MINUTES = 60;

/** Crude in-process rate limit, same pattern as the login endpoint. */
const attempts = new Map<string, number[]>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  attempts.set(ip, hits);
  return hits.length > MAX_ATTEMPTS;
}

export const POST: APIRoute = async ({ request, clientAddress, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();

  // Identical for every outcome below — see note 1.
  const done = () => redirect('/portal/forgot?sent=1');

  if (clientAddress && rateLimited(clientAddress)) return done();
  if (!email || !email.includes('@')) return done();

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, locale')
    .eq('email', email)
    .maybeSingle();

  if (!profile) return done();

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Any earlier outstanding request is spent: asking twice must leave exactly
  // one working link, not two.
  await admin
    .from('password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', profile.id)
    .is('used_at', null);

  const { error } = await admin.from('password_resets').insert({
    user_id: profile.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + EXPIRES_MINUTES * 60_000).toISOString(),
  });
  if (error) {
    console.error('[forgot] could not create reset token', error);
    return done();
  }

  const origin = new URL(request.url).origin;
  await deliver(
    profile.email,
    templates.passwordReset(localeOf(profile), {
      name: profile.full_name ?? profile.email,
      resetUrl: `${origin}/portal/reset/${token}`,
    })
  );

  return done();
};
