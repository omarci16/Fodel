#!/usr/bin/env node
/**
 * Builds the self-hosted Hungary basemap (Stage 7).
 *
 * This is a real data-engineering step, not something that runs as part of
 * `npm run build` — it downloads ~150 MB of OpenStreetMap data and produces
 * a few hundred MB of map tiles, which is why it's a separate one-off script
 * rather than something that happens automatically. Run it once, upload the
 * result to Cloudflare R2, and only re-run when the basemap itself needs
 * refreshing (OSM data changes, not FODEL's listings — those are a separate
 * live layer fetched from Supabase by the browse map, see
 * src/pages/api/map/properties.geojson.ts).
 *
 * Requires:
 *   - Java 17+ (for Planetiler — https://github.com/onthegomap/planetiler,
 *     the actively-maintained OSM → PMTiles/MBTiles builder; simpler to run
 *     than compiling tippecanoe from source, and this is exactly the job it
 *     exists for)
 *   - ~4 GB of free disk and RAM
 *   - Internet access to Geofabrik's OSM extract mirror
 *
 * Usage: node scripts/build-pmtiles.mjs
 * Then:  upload dist-pmtiles/hungary.pmtiles to a Cloudflare R2 bucket,
 *        make it publicly readable, and set PMTILES_URL to its public URL.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('dist-pmtiles');
const PLANETILER_JAR = path.join(OUT_DIR, 'planetiler.jar');
const PLANETILER_VERSION = 'v0.9.2';
const PLANETILER_URL = `https://github.com/onthegomap/planetiler/releases/download/${PLANETILER_VERSION}/planetiler.jar`;
const OUTPUT_FILE = path.join(OUT_DIR, 'hungary.pmtiles');

// z0–13: sellers publish approximate coordinates by default (see
// properties.location.precision), so street-level zoom is never needed —
// this is the correction the build plan made to an earlier size estimate.
const MAX_ZOOM = 13;

function checkPrereqs() {
  try {
    execSync('java -version', { stdio: 'ignore' });
  } catch {
    console.error('Java is required (17+). Install it, then re-run this script.');
    process.exit(1);
  }
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function downloadPlanetiler() {
  if (fs.existsSync(PLANETILER_JAR)) return;
  console.log(`Downloading Planetiler ${PLANETILER_VERSION}…`);
  execSync(`curl -L -o "${PLANETILER_JAR}" "${PLANETILER_URL}"`, { stdio: 'inherit' });
}

function build() {
  console.log('Building the Hungary PMTiles extract (this downloads OSM data itself, ~150 MB, and takes several minutes)…');
  execSync(
    [
      'java -Xmx2g -jar', `"${PLANETILER_JAR}"`,
      '--area=hungary --bounds=16,45.7,22.9,48.6', // matches the lat/lng validation range in supabase/migrations/0001_init.sql
      `--maxzoom=${MAX_ZOOM}`,
      `--output="${OUTPUT_FILE}"`,
      `--download --download-dir="${OUT_DIR}/sources"`,
    ].join(' '),
    { stdio: 'inherit' }
  );
}

checkPrereqs();
ensureOutDir();
downloadPlanetiler();
build();

const sizeMb = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(0);
console.log(`\nDone: ${OUTPUT_FILE} (${sizeMb} MB)`);
console.log('\nNext steps:');
console.log('  1. Upload this file to a Cloudflare R2 bucket (free tier: 10 GB storage, no egress fees).');
console.log('  2. Make the bucket/object publicly readable (or set up an R2 public custom domain).');
console.log('  3. Set PMTILES_URL in .env to that public URL.');
console.log('  4. The map on the site (src/components/Map.astro) picks it up automatically — no code change needed.');
