/* ── Content collections ─────────────────────────────────────────────────
   Properties moved to Supabase in Stage 1 of the platform build (see
   supabase/migrations/ and src/lib/properties.ts) — a logged-in seller and
   an admin approval workflow can't write to files in git. Articles moved to
   Supabase too, in FODEL 1.2 (see supabase/migrations/0009_blog.sql and
   src/lib/blog.ts) — FODEL can now publish or fix a typo without a deploy.
   There is no content collection of any kind here any more.

   FAQ is typed data, not markdown — see src/data/faq.ts.
   ------------------------------------------------------------------------ */

export const collections = {};
