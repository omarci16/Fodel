import type { APIRoute } from 'astro';
import { logEvent } from '~/lib/activity';

export const prerender = false;

/** Crude in-process rate limit, same pattern as the public forms. */
const attempts = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  attempts.set(ip, hits);
  return hits.length > MAX_ATTEMPTS;
}

export const POST: APIRoute = async ({ request, clientAddress, locals, redirect }) => {
  if (clientAddress && rateLimited(clientAddress)) {
    return redirect('/portal/login?error=rate-limited');
  }

  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const next = String(form.get('next') ?? '/portal/dashboard');
  // Only ever redirect within the portal — never let this field send someone off-site.
  const safeNext = next.startsWith('/portal') ? next : '/portal/dashboard';

  if (!email || !password) {
    return redirect('/portal/login?error=invalid');
  }

  const { data, error } = await locals.supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return redirect('/portal/login?error=invalid');
  }

  await logEvent({
    kind: 'auth.login',
    actorId: data.user?.id ?? null,
    actorEmail: email,
    subjectType: 'profile',
    subjectId: data.user?.id ?? null,
    source: 'portal',
  }).catch(() => {});

  return redirect(safeNext);
};
