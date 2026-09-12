/**
 * Blog — public reads, Supabase-backed since FODEL 1.2 (previously two
 * Markdown files under src/content/articles). RLS is what actually stops an
 * unpublished post being read with the anon key; this file only shapes it.
 *
 * PostgREST returns every timestamp as an ISO string, but articleSchema() /
 * formatDate() take a real `Date` — coerced once here, at the query
 * boundary, rather than at every call site that happens to read one of
 * these fields.
 */
import { getSupabase } from '~/lib/supabase';
import type { Locale } from '~/i18n/ui';

export type BlogPost = {
  id: string;
  group_id: string | null;
  locale: Locale;
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
};

const COLUMNS =
  'id, group_id, locale, slug, title, excerpt, body_md, category, cover_url, cover_alt, og_image_url, author, reading_minutes, seo_title, seo_description, featured, published, published_at, updated_at';

function coerce(row: any): BlogPost {
  return {
    ...row,
    published_at: row.published_at ? new Date(row.published_at) : null,
    updated_at: new Date(row.updated_at),
  };
}

export async function publishedPosts(locale: Locale): Promise<BlogPost[]> {
  const { data } = await getSupabase()
    .from('blog_posts')
    .select(COLUMNS)
    .eq('locale', locale)
    .eq('published', true)
    .order('published_at', { ascending: false });
  return (data ?? []).map(coerce);
}

export async function postBySlug(locale: Locale, slug: string): Promise<BlogPost | null> {
  const { data } = await getSupabase()
    .from('blog_posts')
    .select(COLUMNS)
    .eq('locale', locale)
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  return data ? coerce(data) : null;
}

/**
 * The published sibling of a post sharing its group_id — the basis for real
 * hreflang on linked posts. Returns null for an unlinked post (group_id is
 * null) or one whose sibling isn't published, which must NOT be treated as
 * an error: most posts have no translation at all.
 */
export async function siblingPost(post: BlogPost, siblingLocale: Locale): Promise<BlogPost | null> {
  if (!post.group_id) return null;
  const { data } = await getSupabase()
    .from('blog_posts')
    .select(COLUMNS)
    .eq('group_id', post.group_id)
    .eq('locale', siblingLocale)
    .eq('published', true)
    .maybeSingle();
  return data ? coerce(data) : null;
}
