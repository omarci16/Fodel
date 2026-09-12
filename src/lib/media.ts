/**
 * Photo upload processing.
 *
 * Every uploaded file is re-encoded through sharp before it ever reaches
 * storage — never saved as-is. That single step does three things at once:
 * strips EXIF/GPS metadata, discards anything embedded in the file outside
 * the actual image data (a crafted payload has nothing to survive in, since
 * only decoded pixels come back out), and caps the resolution so a 40 MB
 * phone photo doesn't sit in storage at full size. Astro's own on-demand
 * image pipeline (already wired into PropertyCard and PropertyDetailPage)
 * handles generating the actual responsive srcset sizes from this master —
 * this function's job is just to produce one clean, safe original.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 2400;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const BUCKET = 'property-media';

export class MediaUploadError extends Error {
  constructor(public code: 'unsupported-type' | 'too-large' | 'unreadable-image' | 'storage-failed', message: string) {
    super(message);
  }
}

export async function processAndUploadImage(
  supabase: SupabaseClient,
  /** A path prefix, not necessarily a property id — the blog editor passes a post id into the `blog-media` bucket. */
  propertyId: string,
  file: File,
  bucket: string = BUCKET
): Promise<{ url: string; width: number; height: number }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new MediaUploadError('unsupported-type', `${file.type} is not an accepted image type`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new MediaUploadError('too-large', `File is ${(file.size / 1024 / 1024).toFixed(1)} MB (max 12 MB)`);
  }

  // sharp is imported dynamically so the (fairly heavy) native module is only
  // loaded by the one function that needs it, not by every page.
  const sharp = (await import('sharp')).default;
  const buffer = Buffer.from(await file.arrayBuffer());

  let meta;
  try {
    meta = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw new MediaUploadError('unreadable-image', 'File is not a readable image');
  }
  if (!meta.width || !meta.height) {
    throw new MediaUploadError('unreadable-image', 'Could not read image dimensions');
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(meta.width, meta.height));
  const targetWidth = Math.round(meta.width * scale);

  const output = await sharp(buffer)
    .rotate() // auto-orient from EXIF, then the metadata (including that EXIF) is dropped on encode below
    .resize({ width: targetWidth, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();
  const outMeta = await sharp(output).metadata();

  const path = `${propertyId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(bucket).upload(path, output, {
    contentType: 'image/webp',
    upsert: false,
  });
  if (error) throw new MediaUploadError('storage-failed', error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, width: outMeta.width!, height: outMeta.height! };
}

export async function deleteImage(supabase: SupabaseClient, storagePath: string, bucket: string = BUCKET): Promise<void> {
  // storagePath is the full public URL; storage.remove() wants the object
  // path relative to the bucket, which is everything after `/object/public/<bucket>/`.
  const marker = `/object/public/${bucket}/`;
  const idx = storagePath.indexOf(marker);
  if (idx === -1) return; // not a URL we manage (e.g. a local demo image) — nothing to delete
  const path = storagePath.slice(idx + marker.length);
  await supabase.storage.from(bucket).remove([path]);
}
