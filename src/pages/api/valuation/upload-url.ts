/**
 * Hands the valuation form a one-off signed URL to upload one large document
 * (floor plan, permit, title deed…) straight to the private `valuation-docs`
 * bucket. Serverless request bodies are capped at a few MB, so these files
 * never pass through a function.
 *
 * The caller names a session id the form made up; everything else is decided
 * here: the extension must be on the list, the size within the cap, and one
 * session may hold only so many files. The path is built server-side, so the
 * browser can only ever write inside its own session folder. The submitted
 * valuation reads the folder back from storage — it never trusts a file list
 * from the browser.
 */
import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { DOCUMENT_BUCKET, DOCUMENT_EXTENSIONS, MAX_DOCUMENTS, MAX_DOCUMENT_BYTES, isDocumentSession } from '~/lib/valuation/documents';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Crude per-instance limit, like the public forms'. */
const recent = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 30;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (clientAddress && limited(clientAddress)) return json(429, { ok: false, error: 'rate-limited' });

  const body = await request.json().catch(() => ({}));
  const session = String(body.session ?? '');
  const name = String(body.name ?? '');
  const size = Number(body.size);
  if (!isDocumentSession(session)) return json(400, { ok: false, error: 'bad-session' });

  const extension = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  if (!DOCUMENT_EXTENSIONS.includes(extension)) return json(415, { ok: false, error: 'bad-type' });
  if (!Number.isFinite(size) || size < 1 || size > MAX_DOCUMENT_BYTES) return json(413, { ok: false, error: 'too-large' });

  const admin = createSupabaseAdminClient();
  const storage = admin.storage.from(DOCUMENT_BUCKET);

  const { data: existing, error: listError } = await storage.list(session, { limit: MAX_DOCUMENTS + 1 });
  if (listError) {
    console.error('[valuation] document bucket unavailable', listError.message);
    return json(503, { ok: false, error: 'unavailable' });
  }
  if ((existing ?? []).length >= MAX_DOCUMENTS) return json(409, { ok: false, error: 'too-many' });

  // Readable in the admin list, but never able to break out of the folder.
  const stem = name.slice(0, name.lastIndexOf('.')).normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'dokumentum';
  const path = `${session}/${crypto.randomUUID().slice(0, 8)}-${stem}.${extension}`;

  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) {
    console.error('[valuation] signed upload url failed', error?.message);
    return json(503, { ok: false, error: 'unavailable' });
  }
  return json(200, { ok: true, url: data.signedUrl, path });
};
