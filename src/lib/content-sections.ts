/**
 * Section model for the long-form content pages (services, guides, legal).
 *
 * Kept in a .ts module rather than the .astro frontmatter: Astro compiles
 * frontmatter with esbuild, which does not accept exported multi-line union
 * types there.
 */

import type { RouteKey } from '~/i18n/ui';

export type Section =
  | { type: 'prose'; title?: string; paragraphs: string[] }
  | { type: 'list'; title?: string; intro?: string; items: string[]; ordered?: boolean }
  | { type: 'steps'; title?: string; items: { n: string; t: string; b: string }[] }
  | { type: 'table'; title?: string; intro?: string; rows: [string, string][] }
  | { type: 'callout'; title: string; body: string }
  | {
      type: 'cta';
      title: string;
      body?: string;
      primary: { label: string; to: RouteKey };
      secondary?: { label: string; to: RouteKey };
    };

export interface ContentPageData {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  titleEm?: string;
  intro?: string;
  updated?: string;
  sections: Section[];
}
