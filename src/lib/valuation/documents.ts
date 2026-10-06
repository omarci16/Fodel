/**
 * Customer documents on a valuation request: limits shared by the signed-URL
 * endpoint and the submit handler, and the read-back from storage.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const DOCUMENT_BUCKET = 'valuation-docs';
export const MAX_DOCUMENTS = 15;
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
export const DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'tif', 'tiff', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'dwg', 'dxf'];

export type ValuationDocument = { path: string; name: string; size: number; type: string | null };

export const isDocumentSession = (value: string) => /^[a-f0-9-]{36}$/.test(value);

/** Files the browser actually put in this session's folder — storage is the source of truth, not the form. */
export async function readSessionDocuments(admin: SupabaseClient, session: string): Promise<ValuationDocument[]> {
  if (!isDocumentSession(session)) return [];
  const { data, error } = await admin.storage.from(DOCUMENT_BUCKET).list(session, { limit: MAX_DOCUMENTS });
  if (error || !data) return [];
  return data
    .filter((file) => file.name && file.id)
    .map((file) => ({
      path: `${session}/${file.name}`,
      // The stored name is "<8 hex>-<stem>.<ext>"; show the part a person wrote.
      name: file.name.replace(/^[a-f0-9]{8}-/, ''),
      size: Number(file.metadata?.size ?? 0),
      type: (file.metadata?.mimetype as string | undefined) ?? null,
    }));
}
