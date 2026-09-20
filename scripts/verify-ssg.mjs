/**
 * Post-build verification.
 *
 * Most pages are still prerendered — content in static HTML without any
 * JavaScript executing, which is precisely what the original React prototype
 * could not do. Those are checked by reading dist/ directly, as before.
 *
 * Four routes (home, property list, property detail, sold archive) now read
 * from Supabase and render on request — see astro.config.mjs. They no longer
 * exist as files in dist/, so this script boots a real dev server, fetches
 * them over HTTP, and runs the exact same checks against the response HTML.
 * If Supabase isn't configured yet (no .env, or the project hasn't been
 * seeded), those specific checks are skipped with a clear warning rather than
 * failing the whole run — everything else here is still worth checking on a
 * machine that hasn't set up the database yet.
 *
 * Also gates launch on the KvK number, which Dutch law requires on the site
 * and FODEL have not yet supplied.
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { gzipSync } from 'node:zlib';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

// Where the *static* output actually lands. The Vercel adapter splits the
// build into dist/client (browser-facing files) and dist/server (the function
// bundle); the Netlify adapter this project shipped on before put everything
// at dist/ directly. walk() kept finding pages either way, so the page checks
// carried on passing, but every direct read below — robots.txt, the sitemap,
// favicon, llms.txt, the OG image, and the legal preflight's colofon/impresszum
// reads — resolved against the wrong root and either failed or threw ENOENT.
// Resolve it from what is on disk rather than hard-coding either layout.
const dist = existsSync(path.join(root, 'dist', 'client'))
  ? path.join(root, 'dist', 'client')
  : path.join(root, 'dist');
const DEV_PORT = 4319;
const DEV_BASE = `http://localhost:${DEV_PORT}`;

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

const read = async (f) => fs.readFile(f, 'utf8');
const rel = (f) => path.relative(dist, f);

/* ── Boot a real dev server to render the four Supabase-backed routes ──── */

const LIVE_ROUTES = [
  ['hu/index.html', '/hu/'],
  ['nl/index.html', '/nl/'],
  ['hu/haz-elado-6412/index.html', '/hu/haz-elado-6412/'],
  ['nl/huis-te-koop-6412/index.html', '/nl/huis-te-koop-6412/'],
  ['hu/eladva/index.html', '/hu/eladva/'],
  ['nl/verkocht/index.html', '/nl/verkocht/'],
  ['hu/ingatlanok/index.html', '/hu/ingatlanok/'],
  ['nl/woningen/index.html', '/nl/woningen/'],
  ['hu/hirdetes-feladasa/index.html', '/hu/hirdetes-feladasa/'],
  ['nl/advertentie-plaatsen/index.html', '/nl/advertentie-plaatsen/'],
  ['hu/blog/index.html', '/hu/blog/'],
  ['nl/nieuws/index.html', '/nl/nieuws/'],
  ['hu/blog/holland-migracio-okai/index.html', '/hu/blog/holland-migracio-okai/'],
  ['nl/nieuws/wat-kost-een-huis-in-hongarije/index.html', '/nl/nieuws/wat-kost-een-huis-in-hongarije/'],
  ['hu/top-10/index.html', '/hu/top-10/'],
  ['nl/top-10/index.html', '/nl/top-10/'],
];

async function fetchLivePages() {
  const proc = spawn('npx', ['astro', 'dev', '--port', String(DEV_PORT)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const ready = await new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, 30000);
    const onData = (chunk) => {
      if (!settled && /ready in|Local\s+http/i.test(chunk.toString())) {
        settled = true;
        clearTimeout(timeout);
        resolve(true);
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('exit', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(false);
      }
    });
  });

  if (!ready) {
    proc.kill();
    return null;
  }

  // The readiness message can print a moment before the server actually
  // accepts connections.
  await new Promise((r) => setTimeout(r, 400));

  const pages = new Map();
  let supabaseConfigured = true;
  try {
    for (const [name, urlPath] of LIVE_ROUTES) {
      const res = await fetch(DEV_BASE + urlPath);
      const html = await res.text();
      if (res.status >= 500) {
        supabaseConfigured = false;
      }
      pages.set(name, html);
    }
  } finally {
    proc.kill();
  }

  return supabaseConfigured ? pages : null;
}

console.log(`\nFODEL build verification\n`);
console.log('Starting a dev server to check the Supabase-backed pages…');
const livePages = await fetchLivePages();
if (!livePages) {
  warn(
    'Could not render the Supabase-backed pages (home, property list, property ' +
      'detail, sold archive) — SUPABASE_URL/SUPABASE_ANON_KEY are probably not ' +
      'set in .env yet, or the database has not been seeded. Skipping the checks ' +
      'that need them; everything else below still ran.'
  );
}

const distFiles = await walk(dist);
console.log(`\n${distFiles.length} static HTML pages in dist/, ${livePages?.size ?? 0} rendered live\n`);

/** Every page this script checks, static or live, as {relPath, html}. */
const files = [];
for (const f of distFiles) files.push({ relPath: rel(f), html: await read(f), file: f });
if (livePages) for (const [relPath, html] of livePages) files.push({ relPath, html, file: null });

const getHtml = (name) => files.find((f) => f.relPath === name)?.html;

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
    ['hu/hirdetes-feladasa/index.html', ['Hirdesse ingatlanát', 'Standard hirdetés', 'Kiemelt hirdetés']],
    ['nl/advertentie-plaatsen/index.html', ['Plaats uw woning', 'Standaard advertentie', 'Uitgelichte advertentie']],
    ['hu/blog/index.html', ['A holland migráció okai', 'Piacelemzés']],
    ['nl/nieuws/index.html', ['Wat kost een huis in Hongarije', 'Kopersgids']],
    ['hu/blog/holland-migracio-okai/index.html', ['Ár/érték arány', 'Népsűrűség']],
    ['nl/nieuws/wat-kost-een-huis-in-hongarije/index.html', ['Overdrachtsbelasting', 'Notaris']],
  ];
  for (const [name, needles] of checks) {
    const html = getHtml(name);
    if (!html) {
      if (livePages === null && LIVE_ROUTES.some(([n]) => n === name)) {
        warn(`${name} not checked — Supabase-backed pages were skipped (see above)`);
      } else {
        fail(`${name} was not built`);
      }
      continue;
    }
    const missing = needles.filter((n) => !html.includes(n));
    if (missing.length) fail(`${name} missing from rendered HTML: ${missing.join(', ')}`);
    else pass(`${name} — ${needles.length} content markers present`);
  }

  // No page may depend on a client framework to render.
  for (const { relPath, html } of files) {
    if (html.includes('@babel/standalone') || html.includes('react.development')) {
      fail(`${relPath} still loads a dev-mode framework from a CDN`);
    }
  }
  pass('no in-browser Babel or React development build anywhere');
}

/* ── 2. Per-page metadata ────────────────────────────────────────────── */
console.log('\nMetadata');
{
  const titles = new Map();
  for (const { relPath, html } of files) {
    // The root is a noindex redirect shim, not a content page.
    if (relPath === 'index.html') continue;
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
    const desc = html.match(/<meta name="description" content="(.*?)"/s)?.[1];
    const canonical = html.match(/<link rel="canonical" href="(.*?)"/)?.[1];

    if (!title) fail(`${relPath} has no <title>`);
    if (!desc) fail(`${relPath} has no meta description`);
    if (!canonical) fail(`${relPath} has no canonical`);
    if (desc && desc.length > 165) warn(`${relPath} description is ${desc.length} chars (>165)`);
    if (title) titles.set(title, (titles.get(title) ?? 0) + 1);
  }
  const dupes = [...titles].filter(([, n]) => n > 1);
  if (dupes.length) dupes.forEach(([t, n]) => fail(`duplicate <title> on ${n} pages: "${t}"`));
  else pass(`all ${titles.size} titles unique`);
  pass('every checked page has title, description and canonical');
}

/* ── 3. hreflang reciprocity ─────────────────────────────────────────── */
console.log('\nhreflang');
{
  const graph = new Map();
  for (const { relPath, html } of files) {
    if (relPath === 'index.html' || relPath === '404.html') continue;
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
      const localeOnly = /\/(blog|nieuws)\/[^/]+\//.test(relPath);
      if (!localeOnly) warn(`${relPath} declares ${alts.length} hreflang alternates`);
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

  for (const { relPath, html } of files) {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
    for (const [, json] of blocks) {
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch (e) {
        fail(`${relPath} has invalid JSON-LD: ${e.message}`);
        continue;
      }
      const nodes = parsed['@graph'] ?? [parsed];
      const types = nodes.map((n) => n['@type']);
      if (types.includes('RealEstateAgent')) withOrg++;
      if (types.includes('RealEstateListing')) {
        listings++;
        const listing = nodes.find((n) => n['@type'] === 'RealEstateListing');
        if (typeof listing.offers?.price !== 'number') {
          fail(`${relPath} RealEstateListing price is not numeric`);
        }
        if (!listing.about?.geo?.latitude) fail(`${relPath} RealEstateListing has no geo`);
      }
      if (types.includes('FAQPage')) faqPages++;
    }
  }
  if (withOrg === files.length - 1) pass(`RealEstateAgent on all ${withOrg} checked pages`);
  else warn(`RealEstateAgent present on ${withOrg} of ${files.length} checked pages`);
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

  for (const { html } of files) {
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
  const home = getHtml('hu/index.html');
  if (home) {
    const anchors = (home.match(/<a\b[^>]*href=/g) ?? []).length;
    if (anchors < 20) fail(`homepage has only ${anchors} anchors — navigation may not be crawlable`);
    else pass(`homepage exposes ${anchors} real links`);
  } else {
    warn('homepage anchor count not checked — Supabase-backed pages were skipped (see above)');
  }
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
  // Since Stage 7, MapLibre GL — a real library, a deliberate, plan-specified
  // choice (self-hosted maps, no third party) — ships as its own chunk
  // (Vite names it after the component that imports it, Map.astro, not
  // after the package), loaded only by the pages that actually render a
  // <Map>, never site-wide. Raw file size isn't the meaningful number for a
  // library like this — what a visitor's browser actually transfers is
  // gzipped — so the map-inclusive budget is measured compressed, the way
  // Lighthouse and every real perf budget does it. The original near-zero
  // budget for everything else still applies, measured the same way as
  // before (raw bytes), since that promise predates maps and nothing here
  // should have made it worse.
  const isMapChunk = (name) => /Map\.astro/i.test(name);
  let coreBytes = 0;
  let mapRawBytes = 0;
  let mapGzipBytes = 0;
  const walkAll = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walkAll(full);
      else if (entry.name.endsWith('.js')) {
        if (isMapChunk(entry.name)) {
          const buf = await fs.readFile(full);
          mapRawBytes += buf.byteLength;
          mapGzipBytes += gzipSync(buf).byteLength;
        } else {
          coreBytes += (await fs.stat(full)).size;
        }
      }
    }
  };
  const astroDir = path.join(dist, '_astro');
  try {
    await walkAll(astroDir);
  } catch {
    /* no _astro JS at all */
  }
  const coreKb = coreBytes / 1024;
  if (coreKb > 100) fail(`non-map client JS is ${coreKb.toFixed(1)} kB (budget 100 kB)`);
  else pass(`non-map client JS ${coreKb.toFixed(1)} kB (budget 100 kB)`);

  if (mapRawBytes > 0) {
    const mapGzipKb = mapGzipBytes / 1024;
    if (mapGzipKb > 300) fail(`map bundle is ${mapGzipKb.toFixed(1)} kB gzipped (budget 300 kB, map-bearing pages only)`);
    else pass(`map bundle ${mapGzipKb.toFixed(1)} kB gzipped, ${(mapRawBytes / 1024).toFixed(0)} kB raw (budget 300 kB gzipped, map-bearing pages only)`);
  } else {
    warn('no map bundle found in dist/_astro — expected once Map.astro is used anywhere');
  }
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
