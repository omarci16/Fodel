/**
 * Blog and case studies — public reads, Supabase-backed since FODEL 1.2.
 * RLS is what actually stops an unpublished or future-dated post being read
 * with the anon key (migration 0014); this file only shapes it, and applies
 * the same "published and already due" rule again so the query is honest
 * even on a database where 0014 has not run yet.
 *
 * 2.1 (brief §5): four languages, each version its own row, linked through
 * `group_id` but written and published separately — a missing translation is
 * simply a missing row, never a fallback to another language. Case studies
 * are the same rows with `kind = 'case_study'`, so they share the language
 * and publishing rules, and never mix into the article lists by accident.
 *
 * PostgREST returns every timestamp as an ISO string, but articleSchema() /
 * formatDate() take a real `Date` — coerced once here, at the query boundary.
 */
import { getSupabase } from '~/lib/supabase';

export const BLOG_LOCALES = ['hu', 'nl', 'en', 'de'] as const;
export type BlogLocale = (typeof BLOG_LOCALES)[number];
export type BlogKind = 'article' | 'case_study';

/** Title of a language version that exists only as a slot, waiting for its own text. Never publishable. */
export const PLACEHOLDER_PREFIX = '[Fordításra vár]';

export function isBlogLocale(value: unknown): value is BlogLocale {
  return (BLOG_LOCALES as readonly unknown[]).includes(value);
}

/** Public index per language. hu/nl live inside the full site; en/de beside their bridge pages. */
export const BLOG_PATH: Record<BlogLocale, string> = {
  hu: '/hu/blog/',
  nl: '/nl/nieuws/',
  en: '/en/blog/',
  de: '/de/blog/',
};

export function postPath(post: { locale: BlogLocale; slug: string }): string {
  return `${BLOG_PATH[post.locale]}${post.slug}/`;
}

export type BlogPost = {
  id: string;
  group_id: string | null;
  locale: BlogLocale;
  kind: BlogKind;
  slug: string;
  title: string;
  excerpt: string;
  body_md: string;
  category: string;
  cover_url: string | null;
  cover_alt: string | null;
  og_image_url: string | null;
  author: string;
  reading_minutes: number;
  seo_title: string | null;
  seo_description: string | null;
  featured: boolean;
  published: boolean;
  published_at: Date | null;
  updated_at: Date;
  case_sources: string | null;
  case_method: string | null;
  case_results: string | null;
};

function coerce(row: any): BlogPost {
  return {
    ...row,
    kind: row.kind === 'case_study' ? 'case_study' : 'article',
    case_sources: row.case_sources ?? null,
    case_method: row.case_method ?? null,
    case_results: row.case_results ?? null,
    published_at: row.published_at ? new Date(row.published_at) : null,
    updated_at: new Date(row.updated_at),
  };
}

/** Published, and its publication time has arrived. */
function live(query: any) {
  return query.eq('published', true).not('published_at', 'is', null).lte('published_at', new Date().toISOString());
}

/**
 * Every live post in one language, newest publication first. The order is the
 * publication date, never the last edit — fixing a typo must not lift an old
 * piece to the top.
 */
export async function publishedPosts(locale: BlogLocale, opts: { kind?: BlogKind } = {}): Promise<BlogPost[]> {
  // A failed read yields an empty list, never an error page: every caller
  // (homepage band, bridge pages, index) already renders "no posts" correctly.
  try {
    const { data, error } = await live(getSupabase().from('blog_posts').select('*').eq('locale', locale)).order(
      'published_at',
      { ascending: false }
    );
    if (error) throw new Error(error.message);
    const posts = (data ?? []).map(coerce);
    return opts.kind ? posts.filter((post: BlogPost) => post.kind === opts.kind) : posts;
  } catch (error) {
    console.error('[blog] could not read posts', error);
    return [];
  }
}

/** The homepage band: the newest `limit` articles in this language — case studies excluded. */
export async function latestArticles(locale: BlogLocale, limit = 3): Promise<BlogPost[]> {
  return (await publishedPosts(locale, { kind: 'article' })).slice(0, limit);
}

export async function postBySlug(locale: BlogLocale, slug: string): Promise<BlogPost | null> {
  const { data } = await live(getSupabase().from('blog_posts').select('*').eq('locale', locale).eq('slug', slug)).maybeSingle();
  return data ? coerce(data) : null;
}

/**
 * The live sibling of a post in another language — the basis for real
 * hreflang. Null for an unlinked post or an unpublished sibling, which is the
 * normal case, not an error: most posts have no translation at all.
 */
export async function siblingPost(post: BlogPost, siblingLocale: BlogLocale): Promise<BlogPost | null> {
  if (!post.group_id) return null;
  const { data } = await live(
    getSupabase().from('blog_posts').select('*').eq('group_id', post.group_id).eq('locale', siblingLocale)
  ).maybeSingle();
  return data ? coerce(data) : null;
}
