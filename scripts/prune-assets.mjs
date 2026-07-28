/**
 * Removes unreferenced source images from dist/_astro.
 *
 * Astro emits the original PNG/JPG alongside the optimised WebP/AVIF variants
 * because the content-collection `image()` helper imports them. Nothing links
 * to the originals — every <img> points at a generated variant — but they add
 * ~9 MB to the deploy.
 *
 * Deliberately conservative: it scans every HTML, CSS, JS, JSON, XML and TXT
 * file in dist first, and deletes only raster files inside _astro whose exact
 * filename appears nowhere. If a file is referenced, it stays.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const dist = path.join(root, 'dist');
const astro = path.join(dist, '_astro');

const TEXTUAL = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.map']);
const PRUNABLE = new Set(['.png', '.jpg', '.jpeg']);

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const all = await walk(dist);

// Everything that could reference an asset, including the server bundle.
const haystack = (
  await Promise.all(
    all
      .filter((f) => TEXTUAL.has(path.extname(f)))
      .map((f) => fs.readFile(f, 'utf8').catch(() => ''))
  )
).join('\n');

const candidates = (await walk(astro)).filter((f) => PRUNABLE.has(path.extname(f)));

let removed = 0;
let bytes = 0;
const kept = [];

for (const file of candidates) {
  const name = path.basename(file);
  if (haystack.includes(name)) {
    kept.push(name);
    continue;
  }
  bytes += (await fs.stat(file)).size;
  await fs.rm(file);
  removed++;
}

console.log(
  `prune: removed ${removed} unreferenced original${removed === 1 ? '' : 's'} ` +
    `(${(bytes / 1024 / 1024).toFixed(1)} MB)` +
    (kept.length ? `, kept ${kept.length} still referenced` : '')
);
