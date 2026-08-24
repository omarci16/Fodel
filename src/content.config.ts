import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const LOCALES = ['hu', 'nl'] as const;

/* ── Properties ───────────────────────────────────────────────────────────
   Properties moved to Supabase in Stage 1 of the platform build (see
   supabase/migrations/ and src/lib/properties.ts) — a logged-in seller and
   an admin approval workflow can't write to files in git. There is no
   content collection here any more; `articles` (below) stays Markdown,
   because blog posts are written by FODEL in the repo, not through a portal.
   ------------------------------------------------------------------------ */

/* ── Articles ─────────────────────────────────────────────────────────── */

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: ({ image }) =>
    z.object({
      locale: z.enum(LOCALES),
      title: z.string(),
      excerpt: z.string(),
      category: z.string(),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      readingMinutes: z.number().int().positive(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      featured: z.boolean().default(false),
      author: z.string().default('FODEL'),
      /**
       * FODEL append a standing disclaimer to translated foreign press. Set
       * this to reproduce it — they publish it verbatim on every such piece.
       */
      translatedSource: z.string().optional(),
    }),
});

/** FAQ is typed data, not markdown — see src/data/faq.ts. */
export const collections = { articles };
