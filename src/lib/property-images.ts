/**
 * Maps a stored image filename to Astro's optimised image asset.
 *
 * The six demo listings' photos are still plain files checked into the repo
 * (src/assets/properties/, plus one shared with the marketing site under
 * src/assets/site/). The database only stores which filename belongs to
 * which property — this module is the one place that turns that filename
 * back into the real, build-time-optimised image Astro's <Image> component
 * needs.
 *
 * This is a deliberately small stand-in for real uploads. Stage 3 replaces it
 * with photos sellers actually upload to Supabase Storage, processed by sharp
 * on the way in; nothing downstream (PropertyCard, PropertyDetailPage) will
 * need to change when that happens, because both read `property.data.media`
 * the same way regardless of where the image came from.
 */
import type { ImageMetadata } from 'astro';

// Relative paths, not the `~` tsconfig alias — import.meta.glob's pattern is
// statically analysed at build time and relative globs are guaranteed to
// resolve correctly everywhere.
const properties = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/properties/*.{png,jpg,jpeg,webp}',
  { eager: true }
);
const site = import.meta.glob<{ default: ImageMetadata }>('../assets/site/*.{png,jpg,jpeg,webp}', {
  eager: true,
});

const registry = new Map<string, ImageMetadata>();
for (const modules of [properties, site]) {
  for (const [path, mod] of Object.entries(modules)) {
    registry.set(path.split('/').pop()!, mod.default);
  }
}

export function resolveImage(filename: string): ImageMetadata {
  const image = registry.get(filename);
  if (!image) {
    throw new Error(
      `No local image found for "${filename}". Known files: ${[...registry.keys()].join(', ')}`
    );
  }
  return image;
}
