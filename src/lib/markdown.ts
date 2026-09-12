/**
 * Markdown → HTML for blog posts, server-side only.
 *
 * `marked` passes raw HTML tokens through unchanged and Astro's `set:html`
 * does not sanitise — so without this override, one stolen admin session
 * becomes persistent XSS on the highest-traffic SEO pages on the site.
 * Authoring is admin-only, which is the argument for not pulling in a full
 * sanitiser library; dropping the `html` token type is a zero-dependency fix
 * for the actual risk (raw HTML in the Markdown body), not a general
 * sanitiser, and is applied to every render — the public article page and
 * the admin's own live preview both go through this one function.
 */
import { marked } from 'marked';

const renderer = new marked.Renderer();
renderer.html = () => '';

marked.setOptions({ renderer });

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}
