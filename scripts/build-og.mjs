/**
 * Generates the default Open Graph card (1200x630).
 *
 * Property links get pasted into WhatsApp and Facebook groups constantly in
 * this market — the OG image is doing real marketing work, and the prototype
 * had none at all.
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const source = path.join(root, 'src/assets/site/cta.png');
const outDir = path.join(root, 'public/og');
const out = path.join(outDir, 'fodel-default.jpg');

const overlay = Buffer.from(`
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#102A43" opacity="0.62"/>
  <g fill="#F4F4F2" font-family="DM Sans, Helvetica Neue, sans-serif">
    <text x="80" y="300" font-size="72" font-weight="500" letter-spacing="26">FODEL</text>
    <rect x="80" y="330" width="360" height="2" opacity="0.9"/>
    <text x="80" y="380" font-size="21" letter-spacing="9" opacity="0.85">VASTGOED · INGATLAN</text>
    <text x="80" y="470" font-size="30" opacity="0.95">Onroerend goed kopen direct van de eigenaar</text>
    <text x="80" y="516" font-size="26" opacity="0.78">Magyar ingatlanok hirdetése Nyugat-Európában</text>
  </g>
</svg>`);

await fs.mkdir(outDir, { recursive: true });
await sharp(source)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .composite([{ input: overlay, top: 0, left: 0 }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(out);

const { size } = await fs.stat(out);
console.log(`og: ${path.relative(root, out)} (${(size / 1024).toFixed(0)} kB)`);
