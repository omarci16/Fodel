/** Shared by VideoEmbed.astro (rendering) and PropertyDetailPage.astro (VideoObject JSON-LD) — one extraction, not two. */
export function extractYouTubeId(videoUrl: string): string | null {
  try {
    const u = new URL(videoUrl);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.searchParams.has('v')) return u.searchParams.get('v');
    const shortsMatch = u.pathname.match(/\/(shorts|embed)\/([\w-]+)/);
    if (shortsMatch) return shortsMatch[2];
    return null;
  } catch {
    return null;
  }
}
