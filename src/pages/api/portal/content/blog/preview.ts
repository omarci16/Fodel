/**
 * Renders Markdown to the exact HTML the public article page will show —
 * the editor's live preview goes through this one endpoint rather than
 * bundling `marked` client-side, so preview and published output can never
 * diverge from the same safe (HTML-token-dropping) renderer.
 */
import type { APIRoute } from 'astro';
import { renderMarkdown } from '~/lib/markdown';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.profile?.role !== 'admin') return new Response('forbidden', { status: 403 });
  const { bodyMd } = await request.json().catch(() => ({ bodyMd: '' }));
  const html = renderMarkdown(String(bodyMd ?? ''));
  return new Response(JSON.stringify({ html }), { status: 200, headers: { 'content-type': 'application/json' } });
};
