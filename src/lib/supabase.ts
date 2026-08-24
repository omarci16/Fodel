/**
 * Supabase client for the public site.
 *
 * This uses the "anon" key only — the same low-privilege key that is safe to
 * ship to a browser, even though every call here happens server-side (inside
 * Astro frontmatter, during SSR). Using the anon key rather than the
 * service-role key means every query is still filtered by Row-Level Security,
 * so a bug in this file's query logic cannot leak an unpublished or draft
 * listing — the database itself refuses to return it. RLS is the boundary,
 * not this file.
 *
 * The service-role key (which bypasses RLS) is deliberately not wired up
 * here. It belongs only in privileged server code — the admin/portal actions
 * that arrive in later stages — and must never reach this module.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Built lazily, not at module load. Astro's build imports every page module
 * to work out the module graph — even pages that are never prerendered —
 * so a top-level `throw` here would fail `npm run build` outright on a
 * machine that hasn't configured Supabase yet, long before any property page
 * actually renders. Deferring the check to first real use means the rest of
 * the site still builds; only a request that actually needs data fails, with
 * a clear message pointing at .env.example.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = import.meta.env.SUPABASE_URL;
  const anonKey = import.meta.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_ANON_KEY must be set (see .env.example) before ' +
        'any page that reads properties can render.'
    );
  }

  client = createClient(url, anonKey, { auth: { persistSession: false } });
  return client;
}
