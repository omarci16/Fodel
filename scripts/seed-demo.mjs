/**
 * Reversible FODEL 1.3 demo dataset.
 *
 * Markers are intentionally conspicuous and collision-resistant:
 *   properties 9500–9599, users *@fodel.test, blog slugs demo-*, invoices
 *   DEMO-*, and activity payload.demo === 'true'. No email can be delivered
 *   to the reserved .test TLD and no real FD invoice number is allocated.
 *
 * Usage: npm run seed:demo
 *        npm run seed:demo -- --clean
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env before running this.');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const cleanOnly = process.argv.includes('--clean');
const PASSWORD = 'demo-only-password-ChangeMe-13!';
const now = new Date();
const isoDate = now.toISOString().slice(0, 10);

function daysFromNow(days) {
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}

async function must(label, promise) {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function demoUsers() {
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.filter((user) => user.email?.endsWith('@fodel.test'));
}

async function clean() {
  console.log('Removing demo data…');
  const users = await demoUsers();
  const userIds = users.map((user) => user.id);
  const properties = await must('find demo listings', db.from('properties').select('id').gte('ref', '9500').lte('ref', '9599'));
  const propertyIds = properties.map((property) => property.id);

  await must('delete demo credit notes', db.from('invoices').delete().like('number', 'DEMO-%').eq('kind', 'credit_note'));
  await must('delete demo invoices', db.from('invoices').delete().like('number', 'DEMO-%'));
  await must('delete demo activity', db.from('activity_events').delete().contains('payload', { demo: 'true' }));
  await must('delete demo blog posts', db.from('blog_posts').delete().like('slug', 'demo-%'));
  await must('delete demo enquiries', db.from('enquiries').delete().like('email', '%@fodel.test'));
  await must('delete demo searches', db.from('search_requests').delete().like('email', '%@fodel.test'));
  await must('delete demo valuations', db.from('valuations').delete().like('contact_email', '%@fodel.test'));
  await must('delete demo referrals', db.from('referrals').delete().like('referrer_email', '%@fodel.test'));
  if (userIds.length) await must('delete demo payments', db.from('payments').delete().in('owner_id', userIds));
  if (propertyIds.length) await must('delete demo properties', db.from('properties').delete().in('id', propertyIds));
  await must('delete demo invites', db.from('invites').delete().like('email', '%@fodel.test'));

  for (const user of users) {
    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`delete auth user ${user.email}: ${error.message}`);
  }
  console.log(`  removed ${propertyIds.length} listings and ${users.length} accounts`);
}

async function ensureAccounts() {
  const existing = await demoUsers();
  const accounts = [];
  for (let n = 1; n <= 8; n += 1) {
    const email = `demo+${n}@fodel.test`;
    let user = existing.find((candidate) => candidate.email === email);
    if (!user) {
      const { data, error } = await db.auth.admin.createUser({
        email, password: PASSWORD, email_confirm: true,
        user_metadata: { demo: true },
      });
      if (error) throw new Error(`create ${email}: ${error.message}`);
      user = data.user;
    }
    await must(`profile ${email}`, db.from('profiles').upsert({
      id: user.id,
      role: n === 8 ? 'admin' : 'owner',
      full_name: n === 8 ? 'Demo Beheerder' : `Demo ügyfél ${n}`,
      phone: `+36 70 555 95${String(n).padStart(2, '0')}`,
      email,
      locale: n % 2 === 0 ? 'nl' : 'hu',
    }));
    accounts.push(user);
  }
  return accounts;
}

const places = [
  ['Badacsony', 'Veszprém', 'Balaton', 46.80, 17.50],
  ['Pécs', 'Baranya', 'Dél-Dunántúl', 46.07, 18.23],
  ['Keszthely', 'Zala', 'Nyugat-Dunántúl', 46.77, 17.25],
  ['Siófok', 'Somogy', 'Balaton', 46.91, 18.05],
  ['Cegléd', 'Pest', 'Alföld', 47.17, 19.80],
  ['Kecskemét', 'Bács-Kiskun', 'Alföld', 46.90, 19.69],
  ['Szekszárd', 'Tolna', 'Dél-Dunántúl', 46.35, 18.70],
];
const categories = ['house', 'holiday', 'farm', 'land', 'commercial', 'agricultural', 'mansion', 'apartment', 'industrial'];
const statuses = ['draft', 'submitted', 'changes_requested', 'awaiting_payment', 'published', 'sold', 'archived'];
const huCategory = {
  house: 'családi ház', holiday: 'nyaraló', farm: 'tanya', land: 'telek', commercial: 'üzleti ingatlan',
  agricultural: 'agrárbirtok', mansion: 'kúria', apartment: 'lakás', industrial: 'ipari ingatlan',
};
const nlCategory = {
  house: 'woning', holiday: 'vakantiehuis', farm: 'boerderij', land: 'perceel', commercial: 'bedrijfspand',
  agricultural: 'agrarisch object', mansion: 'landhuis', apartment: 'appartement', industrial: 'industrieel pand',
};

async function createListings(accounts) {
  const rows = Array.from({ length: 25 }, (_, index) => {
    const ref = String(9500 + index);
    const category = categories[index % categories.length];
    const status = statuses[index % statuses.length];
    const [settlement, county, region, lat, lng] = places[index % places.length];
    const published = status === 'published';
    return {
      ref,
      owner_id: accounts[index % 7].id,
      status,
      category,
      country: 'HU',
      settlement,
      county,
      region,
      lat: lat + (index % 4) * 0.015,
      lng: lng + (index % 3) * 0.015,
      precision: 'approximate',
      price_eur: 45_000 + index * 9_500,
      price_huf: (45_000 + index * 9_500) * 395,
      price_asof: isoDate,
      price_negotiable: index % 3 === 0,
      floor_m2: category === 'land' ? null : 55 + index * 7,
      plot_m2: 420 + index * 830,
      bedrooms: category === 'land' ? null : 1 + (index % 6),
      bathrooms: category === 'land' ? null : 1 + (index % 3),
      year_built: category === 'land' ? null : 1920 + (index % 10) * 10,
      epc_class: ['AA', 'BB', 'CC', 'DD', 'pending'][index % 5],
      features: [['panoramic-view'], ['waterfront', 'terrace'], ['orchard', 'well'], ['forest-adjacent']][index % 4],
      condition_key: ['new', 'renovated', 'good', 'needs-renovation'][index % 4],
      heating_key: ['gas', 'electric', 'wood', 'heat-pump'][index % 4],
      package: index % 2 ? 'normal-12m' : 'cheap-6m',
      featured: published && index % 2 === 0,
      homepage_featured: published && index % 3 === 0,
      published_at: published ? daysFromNow(-20 - index) : null,
      expires_at: published ? daysFromNow(index % 2 ? 345 : 165) : null,
      submitted_at: ['submitted', 'changes_requested', 'awaiting_payment', 'published'].includes(status) ? daysFromNow(-30) : null,
      editors_pick: published && index < 22,
      editors_pick_order: published ? index + 1 : 99,
      bargain: published && index >= 11,
      bargain_since: published && index >= 11 ? daysFromNow(-index) : null,
    };
  });
  const inserted = await must('insert demo listings', db.from('properties').insert(rows).select('id,ref,category,status,owner_id'));
  const translations = [];
  const media = [];
  for (const property of inserted) {
    const n = Number(property.ref) - 9500;
    const place = places[n % places.length][0];
    translations.push({
      property_id: property.id,
      locale: 'hu',
      title: `Demo ${huCategory[property.category]} ${place} közelében`,
      description: 'Teljesen fiktív teszthirdetés a FODEL kezelőfelület kipróbálásához.',
      body: 'Ez az ingatlan nem létezik. A 9500–9599 referenciaszám-tartomány kizárólag visszavonható demóadat.',
      condition: 'Jó állapotú', heating: 'Egyedi fűtés', tag: n % 4 === 0 ? 'Demó ajánlat' : null,
    });
    if (n % 3 !== 0) translations.push({
      property_id: property.id,
      locale: 'nl',
      title: `Demo ${nlCategory[property.category]} bij ${place}`,
      description: 'Volledig fictieve testadvertentie voor het uitproberen van het FODEL-portaal.',
      body: 'Deze woning bestaat niet. Referenties 9500–9599 zijn uitsluitend verwijderbare demogegevens.',
      condition: 'Goede staat', heating: 'Eigen verwarming', tag: n % 4 === 0 ? 'Demo-aanbod' : null,
    });
    media.push({
      property_id: property.id,
      storage_path: 'hero.png',
      alt: { hu: 'Fiktív demóingatlan', nl: 'Fictief demopand' },
      sort_order: 0,
      is_hero: true,
    });
  }
  await must('insert demo translations', db.from('property_translations').insert(translations));
  await must('insert demo media', db.from('property_media').insert(media));
  return inserted;
}

async function createCommercialData(accounts, properties) {
  const payable = properties.slice(0, 6);
  const referralRows = await must('insert demo referrals', db.from('referrals').insert([
    { referrer_id: accounts[0].id, referrer_name: 'Demo Ajánló', referrer_email: 'demo+1@fodel.test', referred_name: 'Demo Új ügyfél', referred_email: 'demo+4@fodel.test', referred_property_id: properties[3].id, status: 'pending' },
    { referrer_id: accounts[1].id, referrer_name: 'Demo Verwijzer', referrer_email: 'demo+2@fodel.test', referred_name: 'Demo klant', referred_email: 'demo+5@fodel.test', referred_property_id: properties[4].id, status: 'applied' },
    { referrer_id: accounts[2].id, referrer_name: 'Demo Ajánló 2', referrer_email: 'demo+3@fodel.test', referred_name: 'Demo ügyfél', referred_email: 'demo+6@fodel.test', referred_property_id: properties[5].id, status: 'credited' },
  ]).select('id,status'));

  const lineItems = [{ kind: 'package', id: 'cheap-6m', quantity: 1, unitCents: 6900, label: 'Standard hirdetés' }];
  const paymentRows = [
    { status: 'pending', due_at: daysFromNow(10) },
    { status: 'paid', paid_at: daysFromNow(-8), due_at: daysFromNow(-10) },
    { status: 'manual', paid_at: daysFromNow(-3), due_at: daysFromNow(-5) },
    { status: 'cancelled', due_at: daysFromNow(4) },
    { status: 'pending', due_at: daysFromNow(-20) },
    { status: 'paid', paid_at: daysFromNow(-1), due_at: daysFromNow(-2), discount_cents: 690 },
  ].map((values, index) => ({
    property_id: payable[index].id,
    owner_id: payable[index].owner_id,
    amount_cents: index === 5 ? 6210 : 6900,
    currency: 'eur',
    line_items: lineItems,
    billing_name: `Demo ügyfél ${index + 1}`,
    billing_address: `Demo utca ${index + 1}, 1000 Budapest, Magyarország`,
    // PostgREST's bulk insert derives its column list from the union of keys
    // across the whole array; a row that omits a key present on a sibling row
    // gets that column inserted as NULL rather than falling back to the
    // table's own DEFAULT. discount_cents must be explicit on every row for
    // that reason — only index 5 actually has a discount.
    discount_cents: 0,
    ...values,
  }));
  const payments = await must('insert demo payments', db.from('payments').insert(paymentRows).select('id,property_id,owner_id,status,line_items,amount_cents,discount_cents,billing_name,billing_address'));
  await must('link discounted referral', db.from('payments').update({ referral_id: referralRows[1].id }).eq('id', payments[5].id));
  await must('mark referral use', db.from('referrals').update({ discount_applied_to: payments[5].id }).eq('id', referralRows[1].id));

  const invoiceBase = {
    payment_id: payments[1].id,
    property_id: payments[1].property_id,
    owner_id: payments[1].owner_id,
    billing_name: payments[1].billing_name,
    billing_address: payments[1].billing_address,
    line_items: payments[1].line_items,
    discount_cents: 0,
    gross_cents: payments[1].amount_cents,
    vat_rate: 21,
    net_cents: 5702,
    vat_cents: 1198,
    currency: 'eur',
  };
  const invoice = await must('insert DEMO invoice', db.from('invoices').insert({
    ...invoiceBase, number: `DEMO-${now.getFullYear()}-0001`, kind: 'invoice',
  }).select('id').single());
  await must('insert DEMO credit note', db.from('invoices').insert({
    ...invoiceBase,
    number: `DEMO-${now.getFullYear()}-CN01`,
    kind: 'credit_note',
    corrects_id: invoice.id,
    gross_cents: -invoiceBase.gross_cents,
    net_cents: -invoiceBase.net_cents,
    vat_cents: -invoiceBase.vat_cents,
  }));
}

async function createContentAndLeads(accounts, properties) {
  const linkedGroup = crypto.randomUUID();
  await must('insert demo blog posts', db.from('blog_posts').insert([
    { group_id: linkedGroup, locale: 'hu', slug: 'demo-balaton-piac', title: 'Demó: Balatoni piaci körkép', excerpt: 'Fiktív magyar cikk a többnyelvű szerkesztőség teszteléséhez.', body_md: '## Demócikk\n\nEz kizárólag teszttartalom.', category: 'Piacelemzés', published: true, published_at: daysFromNow(-20), created_by: accounts[7].id },
    { group_id: linkedGroup, locale: 'nl', slug: 'demo-balaton-markt', title: 'Demo: de markt rond het Balatonmeer', excerpt: 'Fictieve Nederlandse vertaling voor de koppelworkflow.', body_md: '## Demoartikel\n\nDit is uitsluitend testinhoud.', category: 'Marktanalyse', published: true, published_at: daysFromNow(-18), created_by: accounts[7].id },
    { locale: 'hu', slug: 'demo-videki-elet', title: 'Demó: Vidéki élet Magyarországon', excerpt: 'Önálló magyar szerkesztőségi téma.', body_md: 'Fiktív, önálló magyar tartalom.', category: 'Hírek', published: true, published_at: daysFromNow(-12), created_by: accounts[7].id },
    { locale: 'hu', slug: 'demo-felujitasi-tippek', title: 'Demó: Felújítási tippek', excerpt: 'Magyar piszkozat.', body_md: 'Fiktív piszkozat.', category: 'Vevői útmutató', published: false, created_by: accounts[7].id },
    { locale: 'nl', slug: 'demo-aankoopgids', title: 'Demo: aankoopgids voor Hongarije', excerpt: 'Zelfstandige Nederlandse contentstrategie.', body_md: 'Fictieve Nederlandse gids.', category: 'Kopersgids', published: true, published_at: daysFromNow(-6), created_by: accounts[7].id },
    { locale: 'nl', slug: 'demo-emigratie', title: 'Demo: emigreren naar Hongarije', excerpt: 'Nederlandse concepttekst.', body_md: 'Fictief concept.', category: 'Nieuws', published: false, created_by: accounts[7].id },
  ]));

  await must('insert demo enquiries', db.from('enquiries').insert([
    { property_id: properties[4].id, name: 'Demo Érdeklődő', email: 'lead+1@fodel.test', phone: '+36 70 000 0001', message: 'Fiktív érdeklődés.', locale: 'hu', handled: false },
    { property_id: properties[11].id, name: 'Demo Koper', email: 'lead+2@fodel.test', message: 'Fictieve aanvraag.', locale: 'nl', handled: true, handled_at: daysFromNow(-1) },
  ]));
  await must('insert demo searches', db.from('search_requests').insert([
    // handled is explicit on both rows — PostgREST's bulk insert derives its
    // column list from the union of keys across the array, so a row that
    // omits a key a sibling row sets gets NULL there instead of the table's
    // own DEFAULT (see the discount_cents comment above for the same trap).
    { name: 'Demo Kereső', email: 'search+1@fodel.test', type: 'house', region: 'Balaton', budget_min: 80_000, budget_max: 180_000, requirements: 'Fiktív keresés.', locale: 'hu', handled: false },
    { name: 'Demo Zoeker', email: 'search+2@fodel.test', type: 'farm', region: 'Dél-Dunántúl', budget_min: 60_000, budget_max: 220_000, requirements: 'Fictieve zoekopdracht.', locale: 'nl', handled: true },
  ]));
  await must('insert demo valuations', db.from('valuations').insert([
    { source: 'public_lead', category: 'house', county: 'Pest', region: 'Alföld', settlement: 'Cegléd', floor_m2: 110, plot_m2: 1200, condition: 'good', year_built: 1985, contact_name: 'Demo Becsültető', contact_email: 'value+1@fodel.test', comps: [], comp_count: 0, status: 'insufficient_data' },
    { property_id: properties[4].id, source: 'admin_review', category: properties[4].category, county: 'Pest', region: 'Alföld', settlement: 'Cegléd', floor_m2: 90, plot_m2: 900, condition: 'renovated', year_built: 1995, comps: [], comp_count: 4, median_eur_per_m2: 1250, low_eur: 95_000, mid_eur: 112_000, high_eur: 130_000, status: 'needs_review' },
  ]));
  await must('insert demo AI suggestion', db.from('ai_suggestions').insert({
    property_id: properties[0].id,
    locale: 'hu',
    original: { title: 'Demo eredeti', description: 'Rövid leírás' },
    suggested: { title: 'Panorámás demóingatlan', description: 'Szerkesztett, de fiktív leírás.' },
    issues: ['demo'],
    status: 'pending',
  }));
  await must('insert demo invites', db.from('invites').insert([
    { email: 'invite+pending@fodel.test', token_hash: `demo-${crypto.randomUUID()}`, role: 'owner', invited_by: accounts[7].id, expires_at: daysFromNow(7), payload: { demo: true } },
    { email: 'invite+expired@fodel.test', token_hash: `demo-${crypto.randomUUID()}`, role: 'owner', invited_by: accounts[7].id, expires_at: daysFromNow(-7), payload: { demo: true } },
  ]));

  const kinds = ['listing.submit', 'listing.approve', 'listing.published', 'payment.manual', 'invoice.issued', 'blog.published', 'auth.login', 'valuation.approved'];
  await must('insert demo activity', db.from('activity_events').insert(kinds.map((kind, index) => ({
    occurred_at: daysFromNow(-index),
    kind,
    actor_id: accounts[index % accounts.length].id,
    actor_email: accounts[index % accounts.length].email,
    subject_type: index < 3 ? 'property' : 'demo',
    subject_id: index < 3 ? properties[index].id : `demo-${index}`,
    property_id: index < 5 ? properties[index].id : null,
    locale: index % 2 ? 'nl' : 'hu',
    source: 'seed-demo',
    payload: { demo: 'true', note: 'Fictitious FODEL 1.3 test event' },
    dedupe_key: `demo-${now.getTime()}-${index}`,
  }))));
}

async function main() {
  await clean();
  if (cleanOnly) {
    console.log('Demo cleanup complete.');
    return;
  }
  console.log('Creating demo accounts and records…');
  const accounts = await ensureAccounts();
  const properties = await createListings(accounts);
  await createCommercialData(accounts, properties);
  await createContentAndLeads(accounts, properties);
  console.log(`Demo seed complete: ${accounts.length} accounts, ${properties.length} listings, 6 articles, payments and leads.`);
  console.log('All records are fictitious and removable with: npm run seed:demo -- --clean');
}

main().catch((error) => { console.error(error); process.exit(1); });
