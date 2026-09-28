/**
 * Creates an invite: a cryptographically random token, hashed at rest —
 * only the hash is ever stored, so a database leak alone can't be used to
 * accept invites. The raw token only ever exists in the email link and in
 * memory here.
 *
 * 2.1 (brief §7): the admin picks the language (hu/nl/en/de) by hand, and may
 * grant a free listing. That grant is stored on the invite row and applied by
 * the server when the invite is accepted — it is never carried in the link,
 * so it cannot be obtained by editing a URL.
 */
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { deliver } from '~/lib/email/send';
import { buildInvite, isInviteLocale } from '~/lib/portal/invites';
import { friendlyError } from '~/lib/portal/labels';
import { logEvent } from '~/lib/activity';

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
  const requestedLocale = String(form.get('locale') ?? '');
  // A free listing is a seller's entitlement; it means nothing on an admin account.
  const grantsFreeListing = role === 'owner' && form.get('free_listing') === 'yes';

  const fail = (message: string) => redirect(`/portal/users/invite?error=${encodeURIComponent(message)}`);

  if (!email || !email.includes('@')) return fail('Érvénytelen e-mail cím.');
  // No default: the language is the admin's explicit choice (brief §7).
  if (!isInviteLocale(requestedLocale)) return fail('Válassza ki a meghívó nyelvét.');
  const locale = requestedLocale;

  const { data: existing } = await locals.supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) return fail('Ez az e-mail cím már regisztrált felhasználóhoz tartozik.');

  const token = crypto.randomBytes(32).toString('hex');
  const acceptUrl = `${new URL(request.url).origin}/portal/invite/${token}`;

  // Built before anything is stored: a language without approved wording must
  // leave no half-created invite behind.
  const message = await buildInvite(locals.supabase, locale, role, acceptUrl);
  if (!message) {
    return fail('Ezen a nyelven még nincs jóváhagyott meghívószöveg. Előbb hagyja jóvá a Beállítások → Meghívólevelek oldalon.');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await locals.supabase.from('invites').insert({
    email,
    token_hash: tokenHash,
    role,
    invited_by: locals.user!.id,
    expires_at: expiresAt.toISOString(),
    grants_free_listing: grantsFreeListing,
    payload: { locale },
  });
  if (error) return fail(friendlyError(error.message));

  await deliver(email, message);

  await logEvent({
    kind: 'invite.sent',
    actorId: locals.user!.id,
    actorEmail: locals.profile?.email ?? null,
    subjectType: 'invite',
    locale,
    source: 'portal',
    payload: { role, grantsFreeListing },
  }).catch(() => {});

  return redirect(`/portal/users/invite?sent=${encodeURIComponent(email)}`);
};
