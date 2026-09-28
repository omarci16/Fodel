/**
 * Revoke or resend a pending invite.
 *
 * Resending mints a fresh token rather than re-mailing the old one: only a
 * hash is stored, so the original raw token no longer exists anywhere to be
 * sent. That is the mechanism working as intended, not a limitation — and it
 * means a resend also invalidates a link that may have been forwarded on.
 */
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { deliver } from '~/lib/email/send';
import { buildInvite, isInviteLocale } from '~/lib/portal/invites';

export const prerender = false;

const EXPIRES_DAYS = 7;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (locals.profile?.role !== 'admin') return json(403, { ok: false, error: 'forbidden' });

  const { inviteId } = params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? '');

  const admin = createSupabaseAdminClient();
  const { data: invite } = await admin
    .from('invites')
    .select('id, email, role, accepted_at, payload')
    .eq('id', inviteId)
    .maybeSingle();

  if (!invite) return json(404, { ok: false, error: 'not-found' });
  if (invite.accepted_at) return json(409, { ok: false, error: 'already-accepted' });

  if (action === 'revoke') {
    const { error } = await admin.from('invites').delete().eq('id', inviteId);
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  if (action === 'resend') {
    const stored = (invite.payload as { locale?: string } | null)?.locale;
    const locale = isInviteLocale(stored) ? stored : 'hu';
    const token = crypto.randomBytes(32).toString('hex');
    const acceptUrl = `${new URL(request.url).origin}/portal/invite/${token}`;
    const message = await buildInvite(admin, locale, invite.role, acceptUrl);
    if (!message) return json(422, { ok: false, error: 'no-template' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    const { error } = await admin
      .from('invites')
      .update({ token_hash: tokenHash, expires_at: expiresAt.toISOString() })
      .eq('id', inviteId);
    if (error) return json(500, { ok: false, error: error.message });

    await deliver(invite.email, message);

    return json(200, { ok: true });
  }

  return json(400, { ok: false, error: 'unknown-action' });
};
