/**
 * Auth and role guard for the portal.
 *
 * Scoped to /portal and /api/portal only — every other route (the entire
 * public marketing site) returns from this middleware immediately without
 * touching Supabase at all, so it costs nothing on the pages that matter most
 * for SEO and speed.
 *
 * This is a convenience gate, not the security boundary — a bug here would
 * be embarrassing but not dangerous, because Row-Level Security enforces the
 * same rules independently at the database. See supabase/migrations/0001_init.sql.
 */
import { defineMiddleware } from 'astro/middleware';
import { createSupabaseServerClient } from '~/lib/supabase-server';

const PUBLIC_PORTAL_PATHS = [
  '/portal/login',
  '/portal/invite/', // /portal/invite/[token] — the token itself is the credential
  '/portal/forgot',
  '/portal/reset/', // /portal/reset/[token] — likewise
];

const ADMIN_ONLY_PREFIXES = ['/portal/users', '/portal/review', '/portal/payments'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (!pathname.startsWith('/portal') && !pathname.startsWith('/api/portal')) {
    return next();
  }

  const supabase = createSupabaseServerClient(context.request, context.cookies);
  context.locals.supabase = supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  context.locals.user = user;

  let profile: App.Locals['profile'] = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone, email, locale')
      .eq('id', user.id)
      .single();
    profile = data as App.Locals['profile'];
  }
  context.locals.profile = profile;

  const isPublicPortalPath = PUBLIC_PORTAL_PATHS.some((p) => pathname.startsWith(p));

  if (pathname.startsWith('/portal') && !isPublicPortalPath && !user) {
    return context.redirect(`/portal/login?next=${encodeURIComponent(pathname)}`);
  }

  // Every endpoint reachable while signed out. Each one authenticates by its
  // own means — a single-use token, or the password itself — rather than by a
  // session, which is precisely why it cannot require one.
  const isPublicPortalApi =
    pathname.startsWith('/api/portal/invite') ||
    pathname === '/api/portal/login' ||
    pathname === '/api/portal/forgot' ||
    pathname === '/api/portal/reset';
  if (pathname.startsWith('/api/portal') && !isPublicPortalApi && !user) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthenticated' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const needsAdmin = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  if (needsAdmin && profile?.role !== 'admin') {
    if (pathname.startsWith('/api/portal')) {
      return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }
    return context.redirect('/portal/dashboard');
  }

  return next();
});
