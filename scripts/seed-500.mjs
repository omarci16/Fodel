/**
 * Generates 500 synthetic listings so search/pagination can be tested at the
 * scale the plan calls for (Stage 6/9), without waiting for real inventory.
 * Safe to re-run: it deletes anything it previously generated first (refs
 * 9000–9499, reserved for this purpose — never used by real or demo data).
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (the service key
 * because this writes rows with no owner, which RLS's owner-scoped policies
 * wouldn't otherwise allow).
 *
 * Usage: node scripts/seed-500.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

// No dotenv dependency — this project's scripts stay zero-dependency where
// possible (see scripts/preview.mjs). A minimal manual parse is enough here.
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example) before running this.');
  process.exit(1);
}
const supabase = createClient(url, key);

const REGIONS = [
  { region: 'Balaton', county: 'Veszprém', settlements: ['Badacsony', 'Balatonfüred', 'Tihany'] },
  { region: 'Balaton-felvidék', county: 'Veszprém', settlements: ['Nemesvámos', 'Vászoly'] },
  { region: 'Dél-Dunántúl', county: 'Baranya', settlements: ['Pécs közelében', 'Villány'] },
  { region: 'Dél-Dunántúl', county: 'Tolna', settlements: ['Szekszárd közelében', 'Bonyhád'] },
  { region: 'Nyugat-Dunántúl', county: 'Zala', settlements: ['Zalaegerszeg közelében', 'Keszthely'] },
  { region: 'Alföld', county: 'Pest', settlements: ['Csemő', 'Cegléd közelében'] },
  { region: 'Alföld', county: 'Bács-Kiskun', settlements: ['Kecskemét közelében', 'Kalocsa'] },
  { region: 'Dél-Dunántúl', county: 'Somogy', settlements: ['Kaposvár közelében', 'Siófok'] },
];
const TITLES_HU = [
  'Family ház', 'Vidéki tanya', 'Panorámás villa', 'Hangulatos présház', 'Szőlőbirtok',
  'Kúria', 'Nyaraló', 'Építési telek', 'Üzleti ingatlan', 'Agráringatlan',
];

function rand(n) { return Math.floor(Math.random() * n); }
function pick(arr) { return arr[rand(arr.length)]; }

async function main() {
  const { data: categoryTerms, error: categoryError } = await supabase.from('taxonomy_terms').select('key').eq('group_key', 'category').eq('enabled', true);
  if (categoryError || !categoryTerms?.length) throw categoryError ?? new Error('Run migration 0011 before seed:500');
  const categories = categoryTerms.map((term) => term.key);
  console.log('Removing any previously generated synthetic listings…');
  await supabase.from('properties').delete().gte('ref', '9000').lte('ref', '9499');

  console.log('Generating 500 listings…');
  for (let batch = 0; batch < 10; batch++) {
    const rows = [];
    for (let i = 0; i < 50; i++) {
      const n = batch * 50 + i;
      const ref = String(9000 + n);
      const place = pick(REGIONS);
      const category = pick(categories);
      const priceEur = 40000 + rand(60) * 5000;
      rows.push({
        ref,
        status: 'published',
        category,
        settlement: pick(place.settlements),
        county: place.county,
        region: place.region,
        lat: 46.2 + Math.random() * 2.2,
        lng: 17 + Math.random() * 4,
        precision: 'approximate',
        price_eur: priceEur,
        price_huf: priceEur * 360,
        price_asof: new Date().toISOString().slice(0, 10),
        floor_m2: 60 + rand(300),
        plot_m2: 500 + rand(50000),
        bedrooms: 1 + rand(6),
        bathrooms: 1 + rand(3),
        year_built: 1920 + rand(100),
        epc_class: pick(['AA', 'BB', 'CC', 'DD', 'EE', 'pending']),
        features: [],
        package: pick(['cheap-6m', 'normal-12m']),
        featured: false,
        homepage_featured: false,
        published_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 180 * 86400000).toISOString(),
      });
    }

    const { data: inserted, error } = await supabase.from('properties').insert(rows).select('id, ref');
    if (error) throw error;

    const translations = inserted.map((p) => {
      const title = `${pick(TITLES_HU)} #${p.ref}`;
      return {
        property_id: p.id,
        locale: 'hu',
        title,
        description: `Teszt célú, generált hirdetés (${p.ref}) a keresés teljesítményének méréséhez.`,
        body: 'Ez egy automatikusan generált hirdetés, valós ingatlant nem takar.',
      };
    });
    const { error: trError } = await supabase.from('property_translations').insert(translations);
    if (trError) throw trError;

    const media = inserted.map((p) => ({
      property_id: p.id,
      // Reuses an existing demo photo — good enough for a load-test listing
      // that will never be shown to a real visitor.
      storage_path: 'hero.png',
      alt: { hu: 'Teszt ingatlan' },
      sort_order: 0,
      is_hero: true,
    }));
    const { error: mediaError } = await supabase.from('property_media').insert(media);
    if (mediaError) throw mediaError;

    console.log(`  batch ${batch + 1}/10 done`);
  }

  console.log('\n500 synthetic listings created (refs 9000–9499).');
  console.log('Try: /hu/ingatlanok/?region=Balaton or any other filter, and check response time.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
