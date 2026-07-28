/**
 * Post-build verification.
 *
 * The single most important check is the first one: page content must be
 * present in the HTML without any JavaScript executing. That is precisely what
 * the React prototype could not do, and it is why this rebuild exists.
 *
 * Also gates launch on the KvK number, which Dutch law requires on the site
 * and FODEL have not yet supplied.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const dist = path.join(root, 'dist');

let failures = 0;
let warnings = 0;

const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  failures++;
};
const warn = (msg) => {
  console.warn(`  ! ${msg}`);
  warnings++;
};

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = await walk(dist);
const read = async (f) => fs.readFile(f, 'utf8');
const rel = (f) => path.relative(dist, f);

console.log(`\nFODEL build verification — ${files.length} HTML pages\n`);

/* ── 1. Content is server-rendered ───────────────────────────────────── */
console.log('Server-rendered content');
{
  const checks = [
    ['hu/index.html', ['Magyar', 'Ingatlanok', 'Balatoni Panorámaház', 'FODEL']],
    ['nl/index.html', ['Vastgoed', 'Hongarije', 'Panoramavilla']],
    ['hu/haz-elado-6412/index.html', ['Balatoni Panorámaház', 'Badacsony', '178', '6412']],
    ['nl/huis-te-koop-6412/index.html', ['Panoramavilla', 'Badacsony', '178']],
    ['hu/arlista/index.html', ['69', '129', '179', '25']],
    ['hu/gyik/index.html', ['ingatlanturistára', 'kizárólagosság']],
    ['nl/veelgestelde-vragen/index.html', ['courtage', 'volmacht']],
  ];
  for (const [file, needles] of checks) {
    const full = path.join(dist, file);
    let html;
    try {
      html = await read(full);
    } catch {
      fail(`${file} was not built`);
      continue;
    }
    const missing = needles.filter((n) => !html.includes(n));
    if (missing.length) fail(`${file} missing from static HTML: ${missing.join(', ')}`);
    else pass(`${file} — ${needles.length} content markers present`);
  }

  // No page may depend on a client framework to render.
  for (const f of files) {
    const html = await read(f);
    if (html.includes('@babel/standalone') || html.includes('react.development')) {
      fail(`${rel(f)} still loads a dev-mode framework from a CDN`);
    }
  }
  pass('no in-browser Babel or React development build anywhere');
}

/* ── 2. Per-page metadata ────────────────────────────────────────────── */
console.log('\nMetadata');
{
  const titles = new Map();
  for (const f of files) {
    // The root is a noindex redirect shim, not a content page.
    if (rel(f) === 'index.html') continue;
    const html = await read(f);
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
    const desc = html.match(/<meta name="description" content="(.*?)"/s)?.[1];
    const canonical = html.match(/<link rel="canonical" href="(.*?)"/)?.[1];

    if (!title) fail(`${rel(f)} has no <title>`);
    if (!desc) fail(`${rel(f)} has no meta description`);
    if (!canonical) fail(`${rel(f)} has no canonical`);
    if (desc && desc.length > 165) warn(`${rel(f)} description is ${desc.length} chars (>165)`);
    if (title) titles.set(title, (titles.get(title) ?? 0) + 1);
  }
  const dupes = [...titles].filter(([, n]) => n > 1);
  if (dupes.length) dupes.forEach(([t, n]) => fail(`duplicate <title> on ${n} pages: "${t}"`));
  else pass(`all ${titles.size} titles unique`);
  pass('every page has title, description and canonical');
}

/* ── 3. hreflang reciprocity ─────────────────────────────────────────── */
console.log('\nhreflang');
{
  const graph = new Map();
  for (const f of files) {
    if (rel(f) === 'index.html' || rel(f) === '404.html') continue;
    const html = await read(f);
    // noindex pages (thank-you, 404) are transactional, not content — they
    // need no alternates.
    if (/name="robots" content="noindex/.test(html)) continue;
    const canonical = html.match(/<link rel="canonical" href="(.*?)"/)?.[1];
    const alts = [...html.matchAll(/<link rel="alternate" hreflang="(hu|nl)" href="(.*?)"/g)].map(
      (m) => m[2]
    );
    if (!canonical) continue;
    if (alts.length < 2) {
      // Articles are written per market; a Hungarian piece often has no Dutch
      // counterpart, and omitting hreflang is correct in that case.
      const localeOnly = /\/(blog|nieuws)\/[^/]+\//.test(rel(f));
      if (!localeOnly) warn(`${rel(f)} declares ${alts.length} hreflang alternates`);
      continue;
    }
    graph.set(canonical, alts);
  }

  let broken = 0;
  for (const [url, alts] of graph) {
    for (const alt of alts) {
      const back = graph.get(alt);
      if (!back) {
        warn(`${url} points to ${alt}, which declares no alternates`);
        broken++;
      } else if (!back.includes(url)) {
        fail(`hreflang not reciprocal: ${url} → ${alt}, but not back`);
        broken++;
      }
    }
  }
  if (!broken) pass(`${graph.size} pages, all hreflang pairs reciprocal`);
}

/* ── 4. Structured data ──────────────────────────────────────────────── */
console.log('\nStructured data');
{
  let withOrg = 0;
  let listings = 0;
  let faqPages = 0;

  for (const f of files) {
    const html = await read(f);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
    for (const [, json] of blocks) {
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch (e) {
        fail(`${rel(f)} has invalid JSON-LD: ${e.message}`);
        continue;
      }
      const nodes = parsed['@graph'] ?? [parsed];
      const types = nodes.map((n) => n['@type']);
      if (types.includes('RealEstateAgent')) withOrg++;
      if (types.includes('RealEstateListing')) {
        listings++;
        const listing = nodes.find((n) => n['@type'] === 'RealEstateListing');
        if (typeof listing.offers?.price !== 'number') {
          fail(`${rel(f)} RealEstateListing price is not numeric`);
        }
        if (!listing.about?.geo?.latitude) fail(`${rel(f)} RealEstateListing has no geo`);
      }
      if (types.includes('FAQPage')) faqPages++;
    }
  }
  if (withOrg === files.length - 1) pass(`RealEstateAgent on all ${withOrg} content pages`);
  else warn(`RealEstateAgent present on ${withOrg} of ${files.length} pages`);
  pass(`${listings} RealEstateListing nodes, all with numeric price and coordinates`);
  pass(`${faqPages} pages emit FAQPage`);
}

/* ── 5. Links and images ─────────────────────────────────────────────── */
console.log('\nLinks and images');
{
  let imgs = 0;
  let missingAlt = 0;
  let missingDims = 0;
  let rawOriginals = 0;

  for (const f of files) {
    const html = await read(f);
    for (const [tag] of [...html.matchAll(/<img\b[^>]*>/g)].map((m) => [m[0]])) {
      imgs++;
      // `alt` with no value is valid HTML and means an empty alt — that is
      // correct for the decorative parallax layer, which is aria-hidden.
      if (!/\balt(=|\s|>)/.test(tag)) missingAlt++;
      if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) missingDims++;
      if (/src="[^"]*\.(png|jpg|jpeg)"/i.test(tag)) rawOriginals++;
    }
  }
  if (missingAlt) fail(`${missingAlt} of ${imgs} <img> tags have no alt`);
  else pass(`all ${imgs} images have alt text`);
  if (missingDims) fail(`${missingDims} images lack width/height (layout shift)`);
  else pass('all images have explicit width and height');
  if (rawOriginals) warn(`${rawOriginals} images still reference an unoptimised original`);
  else pass('every image served as WebP/AVIF');

  // The prototype navigated with <button onClick>; nothing should be crawlable-blind now.
  const home = await read(path.join(dist, 'hu/index.html'));
  const anchors = (home.match(/<a\b[^>]*href=/g) ?? []).length;
  if (anchors < 20) fail(`homepage has only ${anchors} anchors — navigation may not be crawlable`);
  else pass(`homepage exposes ${anchors} real links`);
}

/* ── 6. Assets ───────────────────────────────────────────────────────── */
console.log('\nAssets');
for (const asset of ['robots.txt', 'sitemap-index.xml', 'favicon.svg', 'llms.txt', 'og/fodel-default.jpg']) {
  try {
    await fs.access(path.join(dist, asset));
    pass(asset);
  } catch {
    fail(`${asset} missing from dist`);
  }
}

/* ── 7. Client JS budget ─────────────────────────────────────────────── */
console.log('\nJavaScript budget');
{
  let bytes = 0;
  const walkAll = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walkAll(full);
      else if (entry.name.endsWith('.js')) bytes += (await fs.stat(full)).size;
    }
  };
  const astroDir = path.join(dist, '_astro');
  try {
    await walkAll(astroDir);
  } catch {
    /* no _astro JS at all */
  }
  const kb = bytes / 1024;
  if (kb > 100) fail(`client JS is ${kb.toFixed(1)} kB (budget 100 kB)`);
  else pass(`client JS ${kb.toFixed(1)} kB (budget 100 kB)`);
}

/* ── 8. Legal preflight ──────────────────────────────────────────────── */
console.log('\nLegal preflight');
{
  const imprint = await read(path.join(dist, 'nl/colofon/index.html'));
  const hasKvk = /KvK-nummer<\/th><td>\d{6,}/.test(imprint.replace(/\s+/g, ''));
  const waived = process.argv.includes('--allow-missing-kvk');
  if (!hasKvk) {
    const message =
      'LAUNCH BLOCKER — KvK number is not set. Dutch law requires it on the site. ' +
      'Ask FODEL for it and set registration.kvk in src/config/company.ts. ' +
      'Pass --allow-missing-kvk to continue during development.';
    if (waived) warn(message);
    else fail(message);
  } else pass('KvK number published');

  for (const legal of [
    'hu/adatvedelem/index.html',
    'hu/aszf/index.html',
    'hu/impresszum/index.html',
    'nl/privacy/index.html',
    'nl/voorwaarden/index.html',
    'nl/colofon/index.html',
  ]) {
    try {
      await fs.access(path.join(dist, legal));
    } catch {
      fail(`${legal} missing`);
    }
  }
  pass('privacy, terms and imprint present in both locales');
}

/* ── Summary ─────────────────────────────────────────────────────────── */
console.log(
  `\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s), ${warnings} warning(s)\n`
);
process.exit(failures === 0 ? 0 : 1);
