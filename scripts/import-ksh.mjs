/** Refresh the checked-in KSH Ingatlanadattár snapshot by hand.
 * Usage: node scripts/import-ksh.mjs
 * Optional offline inputs: --data-file /path --settlements-file /path
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const BASE = 'https://www.ksh.hu/s/ingatlanadattar/';
const DATA_URL = `${BASE}inga-data.json`;
const LIST_URL = `${BASE}assets/teleplist.js`;
const arg = (flag) => { const index = process.argv.indexOf(flag); return index < 0 ? null : process.argv[index + 1]; };
async function source(url, flag) {
  const file = arg(flag);
  if (file) return readFile(file, 'utf8');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

const [dataText, listText] = await Promise.all([
  source(DATA_URL, '--data-file'), source(LIST_URL, '--settlements-file'),
]);
const data = JSON.parse(dataText);
// The upstream file is a JavaScript array literal, not JSON. Run only this
// trusted KSH source in an isolated VM with a short timeout.
const list = runInNewContext(`${listText}\ntelepList`, Object.create(null), { timeout: 1000 });
if (!Array.isArray(data) || !Array.isArray(list) || list.length < 3000) throw new Error('KSH data shape changed');
const year = data.reduce((latest, row) => Math.max(latest, row.ev), 0);
const settlements = list.map(({ id, nev, megye, tipus }) => [id, nev, megye, tipus]);
const rows = data.filter((row) => row.ev === year && (row.szint === 1 || (row.szint === 3 && row.kozter === 'együtt')))
  .map((row) => ({
    code: row.telaz, countyCode: row.megye, level: row.szint === 1 ? 'county' : 'settlement',
    cshaz: row.cshaz_ar ? [row.cshaz_ar, row.cshaz_db] : null,
    tobbl: row.tobbl_ar ? [row.tobbl_ar, row.tobbl_db] : null,
    panel: row.panel_ar ? [row.panel_ar, row.panel_db] : null,
    dispersionPercent: row.szoras ?? null,
  }));
if (rows.length < 1000) throw new Error('KSH latest-year coverage unexpectedly low');
const dir = resolve('src/data/market');
await mkdir(dir, { recursive: true });
await writeFile(resolve(dir, 'hu-settlements.json'), JSON.stringify(settlements));
const snapshot = JSON.stringify({
  meta: { source: 'KSH Ingatlanadattár', url: BASE, license: 'CC BY 4.0', year,
    retrievedAt: new Date().toISOString().slice(0, 10), unit: 'thousand HUF/m²; used dwelling transactions' }, rows,
});
await writeFile(resolve(dir, `ksh-lakasarak-${year}.json`), snapshot);
await writeFile(resolve(dir, 'ksh-lakasarak-latest.json'), snapshot);
console.log(`KSH ${year}: ${settlements.length} places, ${rows.length} aggregate rows`);
