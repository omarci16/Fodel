/**
 * Supabase clients for the portal (Stage 2+).
 *
 * Two clients, two very different privilege levels:
 *
 * - `createSupabaseServerClient` carries the signed-in user's own session
 *   (read from cookies). Every query made through it runs AS that user, so
 *   Row-Level Security is what actually decides what it can see or change —
 *   exactly the plan's security model ("RLS is the primary boundary, not app
 *   code"). Almost everything in the portal should use this one.
 *
 * - `createSupabaseAdminClient` uses the service-role key, which BYPASSES
 *   RLS entirely. It exists only for the handful of actions no ordinary user
 *   is allowed to do at all — creating an invited user's account, sending an
 *   admin-only invite — never for reading or writing a property. This key
 *   must never reach the browser; it is only ever used inside API routes.
 */
import { createServerClient, parseCookieHeader, type CookieOptionsWithName } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

// No generated Database type exists yet (that needs `supabase gen types
// typescript` run against a real project, which doesn't exist until Stage
// 1's setup is done) — explicit `any` generics here, matching how
// src/lib/properties.ts hand-types rows via its own interfaces + casts
// rather than a generated schema. Once a project exists, generating real
// types and dropping the `any` here is a worthwhile follow-up, not a
// blocker.
type AnyClient = SupabaseClient<any, any, any>;

const url = import.meta.env.SUPABASE_URL;
const anonKey = import.meta.env.SUPABASE_ANON_KEY;

const COOKIE_OPTIONS: CookieOptionsWithName = {
  path: '/',
  sameSite: 'lax',
  secure: import.meta.env.PROD,
  httpOnly: true,
};

function requireConfig() {
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set (see .env.example).');
  }
  return { url, anonKey };
}

/** A session-aware client, scoped to one request. Create a fresh one per request — it is cheap. */
export function createSupabaseServerClient(request: Request, cookies: AstroCookies): AnyClient {
  const { url, anonKey } = requireConfig();
  return createServerClient(url, anonKey, {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('cookie') ?? '');
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, options);
        }
      },
    },
  });
}

let adminClient: AnyClient | null = null;

/** Bypasses RLS. Use only for actions an ordinary user could never be allowed to do. */
export function createSupabaseAdminClient(): AnyClient {
  if (adminClient) return adminClient;
  const { url } = requireConfig();
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example) for admin actions.');
  }
  adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  return adminClient;
}
