/**
 * Downscales a photo in the browser before it is uploaded.
 *
 * Why: a Vercel function accepts at most 4.5 MB per request, while a phone
 * photo is routinely 4–10 MB. The server re-encodes every upload anyway
 * (src/lib/media.ts caps the longer edge at 2400 px), so sending the full
 * original only fails the upload for no gain in quality.
 *
 * Never throws and never makes things worse: anything it cannot read, or a
 * result that is not smaller, returns the original file for the server to
 * validate and refuse with a proper message.
 */
export async function shrinkImage(file: File, maxEdge = 2400, quality = 0.88): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  if (file.size <= 1.2 * 1024 * 1024) return file;
  try {
    // from-image: phone photos are stored sideways with an EXIF rotation tag.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    // JPEG has no transparency: a transparent PNG would otherwise turn black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

declare global {
  interface Window {
    fodelShrinkImage?: typeof shrinkImage;
  }
}

/** For pages whose upload code is an inline script (it cannot import modules). */
export function exposeShrinkImage(): void {
  window.fodelShrinkImage = shrinkImage;
}
