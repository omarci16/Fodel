-- FODEL 1.0 — seed the six demo listings.
--
-- Run this in the Supabase SQL Editor straight after 0001_init.sql. It loads
-- the same six properties that used to live as Markdown files in
-- src/content/properties/, as real database rows, so the public site has
-- something to show once the code switches from reading files to querying
-- Supabase. Safe to re-run: it deletes these six ref numbers first.

delete from properties where ref in ('6412', '6518', '6733', '6845', '6902', '7118');

/* ── 6412 — Balatoni Panorámaház ──────────────────────────────────────── */

insert into properties (
  ref, status, category, settlement, county, region, lat, lng, precision,
  price_eur, price_huf, price_asof, floor_m2, plot_m2, bedrooms, bathrooms,
  year_built, renovated_in, epc_class, features, seller_contact_visible,
  seller_name, seller_phone, seller_speaks, package, featured,
  homepage_featured, homepage_order, published_at, expires_at
) values (
  '6412', 'published', 'house', 'Badacsony', 'Veszprém', 'Balaton-felvidék',
  46.7906, 17.4917, 'approximate',
  178000, 64000000, '2026-07-01', 210, 2400, 4, 2,
  1978, 2022, 'CC', array['panoramic-view','vineyard','cellar','terrace','renovated','parking'],
  true, 'Kovács Péter', '+36 30 412 8890', array['hu','de'],
  'normal-12m', true, true, 1, '2026-05-12', '2027-05-12'
);

insert into property_translations (property_id, locale, title, subtitle, description, body, condition, heating, tag)
select id, 'hu',
  'Balatoni Panorámaház', 'Felújított villa magánszőlőskerttel',
  'Lélegzetelállító panorámával rendelkező, teljesen felújított villa a Balaton-felvidéken, magánszőlőskerttel és működő borospincével. Az ingatlan 2022-ben teljes körű felújításon esett át, megtartva eredeti karakterét. A déli fekvésű terasz a teljes nyugati medencére rálát; a szőlőskert művelése rendezett, a pince azonnal használatba vehető.',
  $$A ház a badacsonyi szőlőteraszok középső sávjában áll, ahonnan a Balaton nyugati medencéje teljes szélességében belátható. Az épület 2022-ben esett át teljes felújításon: új tetőszerkezet, nyílászárók, gépészet és fürdőszobák készültek, miközben az eredeti kőfalak és a boltíves pincelejárat érintetlen maradt.

A telek 2 400 m², ebből mintegy 1 400 m² művelt szőlő. A pince 42 m², hőmérséklete egész évben állandó, jelenleg is használatban van.

Badacsonytomaj központja 3 km, a kompkikötő 6 km, Tapolca 12 km. Budapest Ferihegy 175 km, autópályán mintegy két óra.$$,
  'Teljesen felújított', 'Gázkazán + kandalló', 'Kiemelt'
from properties where ref = '6412';

-- No Dutch body text: the original site only ever authored the long-form
-- prose in Hungarian and showed that same text on both locale pages. The
-- `body` column stays empty here and the app falls back to the Hungarian
-- body, exactly matching today's behaviour — inventing a Dutch translation
-- would be new marketing copy nobody at FODEL has approved.
insert into property_translations (property_id, locale, title, subtitle, description, condition, heating, tag)
select id, 'nl',
  'Panoramavilla aan het Balatonmeer', 'Gerenoveerde villa met eigen wijngaard',
  'Volledig gerenoveerde villa op de Balatonhoogvlakte met een adembenemend panorama, een eigen wijngaard en een werkende wijnkelder. Het pand werd in 2022 grondig gerenoveerd met behoud van het oorspronkelijke karakter. Het op het zuiden gelegen terras kijkt uit over het gehele westelijke bekken; de wijngaard is goed onderhouden en de kelder is direct bruikbaar.',
  'Volledig gerenoveerd', 'Gasketel + houtkachel', 'Aanbevolen'
from properties where ref = '6412';

insert into property_media (property_id, storage_path, alt, sort_order, is_hero)
select id, 'hero.png',
  jsonb_build_object('hu', 'A Balatoni Panorámaház délnyugati homlokzata a szőlőskerttel', 'nl', 'De zuidwestgevel van de panoramavilla met de wijngaard'),
  0, true
from properties where ref = '6412';

insert into property_media (property_id, storage_path, alt, label, sort_order, is_hero)
select id, 'propertypage.png',
  jsonb_build_object('hu', 'Külső nézet a teraszról a Balatonra', 'nl', 'Buitenaanzicht vanaf het terras over het Balatonmeer'),
  jsonb_build_object('hu', 'Külső nézet', 'nl', 'Buitenaanzicht'),
  1, false
from properties where ref = '6412';

insert into property_media (property_id, storage_path, alt, label, sort_order, is_hero)
select id, 'vineyard.png',
  jsonb_build_object('hu', 'A magánszőlőskert a ház mögött', 'nl', 'De eigen wijngaard achter het huis'),
  jsonb_build_object('hu', 'Szőlőkert', 'nl', 'Wijngaard'),
  2, false
from properties where ref = '6412';

/* ── 6518 — Baranyai Kúria ─────────────────────────────────────────────── */

insert into properties (
  ref, status, category, settlement, county, region, lat, lng, precision,
  price_eur, price_huf, price_asof, floor_m2, plot_m2, bedrooms, bathrooms,
  year_built, renovated_in, epc_class, features, seller_contact_visible,
  seller_speaks, package, featured, homepage_featured, homepage_order,
  published_at, expires_at
) values (
  '6518', 'published', 'mansion', 'Pécs közelében', 'Baranya', 'Dél-Dunántúl',
  46.0727, 18.2323, 'approximate',
  320000, 115200000, '2026-07-01', 480, 32000, 7, 4,
  1874, 2019, 'FF', array['park','guesthouse','stables','original-beams','renovated','parking'],
  false, array['hu','en'],
  'normal-12m', true, true, 2, '2026-04-02', '2027-04-02'
);

insert into property_translations (property_id, locale, title, subtitle, description, body, condition, heating, tag)
select id, 'hu',
  'Baranyai Kúria', 'Kastélyszerű 19. századi rezidencia',
  'Historizáló stílusú, 19. századi kúria teljesen restaurálva. 3,2 hektáros angolparkkal, önálló vendégházzal és lovardával. Kiváló befektetési vagy turisztikai lehetőség. A főépület tizenegy helyisége eredeti stukkódíszítéssel és parkettával rendelkezik.',
  $$A kúriát 1874-ben építtette a környék akkori birtokos családja. Az épület 2017 és 2019 között műemléki felügyelet mellett újult meg: a tetőszerkezet, a homlokzati vakolatdíszek és a belső stukkók helyreállítása szakrestaurátori munkával készült.

A 3,2 hektáros park mintegy negyven idős fát számlál, köztük két platánt és egy vadgesztenyesort. A vendégház 90 m², önálló bejárattal és fürdőszobával — panzióként vagy önálló lakóegységként egyaránt hasznosítható.

Pécs belvárosa 18 km, az M6 autópálya felhajtója 24 km, Budapest 210 km.$$,
  'Restaurált', 'Vegyestüzelésű kazán + cserépkályhák', 'Exkluzív'
from properties where ref = '6518';

-- No Dutch body text — see the note on the 6412 insert above.
insert into property_translations (property_id, locale, title, subtitle, description, condition, heating, tag)
select id, 'nl',
  'Herenhuis in Baranya', 'Negentiende-eeuwse residentie in landhuisstijl',
  'Volledig gerestaureerd negentiende-eeuws herenhuis in historiserende stijl, met 3,2 hectare Engels park, een vrijstaand gastenverblijf en een paardenstal. Uitstekende investerings- of horecamogelijkheid. De elf vertrekken van het hoofdgebouw hebben nog het oorspronkelijke stucwerk en parket.',
  'Gerestaureerd', 'Combiketel + tegelkachels', 'Exclusief'
from properties where ref = '6518';

insert into property_media (property_id, storage_path, alt, sort_order, is_hero)
select id, 'kuria.jpg',
  jsonb_build_object('hu', 'A baranyai kúria főhomlokzata az angolparkból nézve', 'nl', 'De voorgevel van het herenhuis gezien vanuit het Engelse park'),
  0, true
from properties where ref = '6518';

/* ── 6733 — Alföldi Tanya ──────────────────────────────────────────────── */

insert into properties (
  ref, status, category, settlement, county, region, lat, lng, precision,
  price_eur, price_huf, price_asof, floor_m2, plot_m2, bedrooms, bathrooms,
  year_built, renovated_in, epc_class, features, seller_contact_visible,
  seller_name, seller_phone, seller_speaks, package, featured,
  homepage_featured, homepage_order, published_at, expires_at
) values (
  -- Location corrected against the old prototype, which placed Csemő in
  -- Bács-Kiskun. Csemő is in Pest county, near Cegléd — the village FODEL
  -- themselves cite as an established Dutch colony.
  '6733', 'published', 'farm', 'Csemő', 'Pest', 'Alföld',
  47.1333, 19.6833, 'approximate',
  85000, 30600000, '2026-07-01', 140, 80000, 3, 1,
  1952, 2015, 'pending', array['orchard','well','outbuildings','forest-adjacent','parking'],
  true, 'Nagy Erzsébet', '+36 20 337 5512', array['hu'],
  'normal-12m', true, true, 3, '2026-06-08', '2027-06-08'
);

insert into property_translations (property_id, locale, title, subtitle, description, body, condition, heating)
select id, 'hu',
  'Alföldi Tanya', 'Tradicionális farm 8 hektáron',
  'Autentikus alföldi tanya gazdag gyümölcsössel, kertészettel és gazdasági épületekkel. 8 hektár termőfölddel, saját kúttal. Csemő a hollandok által régóta kedvelt települések egyike, több letelepedett holland családdal.',
  $$A tanya nyolc hektáros területének nagyobb része szántó, mintegy 1,2 hektár gyümölcsös — alma, meggy és szilva, gondozott állapotban. A saját fúrt kút egész évben ad vizet, öntözésre engedélyezett.

A lakóépület 140 m², 2015-ben új tetőt és nyílászárókat kapott. A gazdasági épületek között két istálló, egy géptároló és egy nyári konyha található.

Cegléd 14 km, Budapest 75 km, Ferihegy 62 km. A terület állattartásra és lovas hasznosításra egyaránt alkalmas.$$,
  'Jó, lakható', 'Vegyestüzelés + cserépkályha'
from properties where ref = '6733';

-- No Dutch body text — see the note on the 6412 insert above.
insert into property_translations (property_id, locale, title, subtitle, description, condition, heating)
select id, 'nl',
  'Boerderij op de Hongaarse laagvlakte', 'Traditionele boerderij op 8 hectare',
  'Authentieke boerderij op de laagvlakte met een rijke boomgaard, moestuin en bijgebouwen. Inclusief 8 hectare landbouwgrond en een eigen put. Csemő is al jaren een geliefde plaats onder Nederlanders; er wonen meerdere Nederlandse gezinnen.',
  'Goed, bewoonbaar', 'Houtkachel + tegelkachel'
from properties where ref = '6733';

insert into property_media (property_id, storage_path, alt, sort_order, is_hero)
select id, 'tanya.jpg',
  jsonb_build_object('hu', 'Az alföldi tanya épülete és gazdasági udvara felülnézetből', 'nl', 'De boerderij en het erf gezien vanuit de lucht'),
  0, true
from properties where ref = '6733';

/* ── 6845 — Zalai Présház ──────────────────────────────────────────────── */

insert into properties (
  ref, status, category, settlement, county, region, lat, lng, precision,
  price_eur, price_huf, price_asof, floor_m2, plot_m2, bedrooms, bathrooms,
  year_built, renovated_in, epc_class, features, seller_contact_visible,
  seller_name, seller_phone, seller_speaks, package, featured,
  homepage_featured, published_at, expires_at
) values (
  -- Region corrected against the old prototype, which filed Zala under
  -- Dél-Dunántúl. Zala county is Nyugat-Dunántúl.
  '6845', 'published', 'house', 'Zalaegerszeg közelében', 'Zala', 'Nyugat-Dunántúl',
  46.8417, 16.8416, 'approximate',
  67000, 24100000, '2026-07-01', 118, 4500, 3, 1,
  1936, 2021, 'EE', array['cellar','hillside','terrace','renovated','original-beams','panoramic-view'],
  true, 'Horváth László', '+36 70 884 2201', array['hu','de'],
  'cheap-6m', false, false, '2026-06-20', '2026-12-20'
);

insert into property_translations (property_id, locale, title, subtitle, description, body, condition, heating)
select id, 'hu',
  'Zalai Présház', 'Felújított parasztház borospincével',
  'Hagyományos zalai présház teljesen felújítva, eredeti gerendás mennyezettel. Működő pince, tágas terasz, ápolt kert. Csendes dombtetőn áll, a szomszédos telkek beépítetlenek.',
  $$A présház a dombtető déli lejtőjén áll, előtte a völgyre nyíló kilátással. A 2021-es felújítás során a tetőt, a villamos hálózatot és a vizesblokkot újították fel, az eredeti tölgyfa gerendázat és a kőfalak megmaradtak.

A pince 28 m², boltíves, természetes szellőzésű. A 4 500 m²-es telken gyümölcsfák és mintegy 300 tő szőlő található.

Zalaegerszeg 11 km, Hévíz 38 km, a szlovén határ 45 km. Az osztrák határ és Graz mintegy két óra.$$,
  'Felújított', 'Kandalló + elektromos rásegítés'
from properties where ref = '6845';

-- No Dutch body text — see the note on the 6412 insert above.
insert into property_translations (property_id, locale, title, subtitle, description, condition, heating)
select id, 'nl',
  'Wijnboerderij in Zala', 'Gerenoveerde boerenwoning met wijnkelder',
  'Traditionele Zala-wijnboerderij, volledig gerenoveerd met het oorspronkelijke balkenplafond. Werkende kelder, ruim terras en een verzorgde tuin. Rustig op een heuveltop gelegen, de aangrenzende percelen zijn onbebouwd.',
  'Gerenoveerd', 'Houtkachel + elektrische bijverwarming'
from properties where ref = '6845';

insert into property_media (property_id, storage_path, alt, sort_order, is_hero)
select id, 'vevoknek.jpg',
  jsonb_build_object('hu', 'A zalai présház felújított belső tere gerendás mennyezettel', 'nl', 'Het gerenoveerde interieur met balkenplafond'),
  0, true
from properties where ref = '6845';

/* ── 6902 — Tolnai Szőlőbirtok ─────────────────────────────────────────── */

insert into properties (
  ref, status, category, settlement, county, region, lat, lng, precision,
  price_eur, price_huf, price_asof, floor_m2, plot_m2, bedrooms, bathrooms,
  year_built, renovated_in, epc_class, features, seller_contact_visible,
  seller_speaks, package, featured, homepage_featured, published_at, expires_at
) values (
  '6902', 'published', 'agricultural', 'Szekszárd közelében', 'Tolna', 'Dél-Dunántúl',
  46.35, 18.705, 'approximate',
  245000, 88200000, '2026-07-01', 290, 125000, 5, 2,
  1968, 2018, 'pending', array['vineyard','winery','cellar','outbuildings','hillside','parking'],
  false, array['hu','de','en'],
  'normal-12m', false, false, '2026-03-18', '2027-03-18'
);

insert into property_translations (property_id, locale, title, subtitle, description, body, condition, heating, tag)
select id, 'hu',
  'Tolnai Szőlőbirtok', 'Működő szőlészet pinceházzal',
  'Tradicionális szekszárdi szőlőbirtok 12,5 hektáron, teljes felszereléssel. Pincészet, lakóépület, gazdasági épületek. Kiváló minőségű vörösbor-termőterület, jelenleg is termelésben. Az eszközpark és a hordókészlet az árban benne foglaltatik.',
  $$A birtok 12,5 hektárja a szekszárdi borvidék déli lejtőin fekszik, ebből 9,8 hektár termő szőlő — kékfrankos, merlot és cabernet franc. A telepítés 2004 és 2011 között történt, az ültetvény jó állapotú.

A pinceház 290 m², benne 120 m² feldolgozótér, présházzal és rozsdamentes tartályparkkal. A hordókészlet 180 hektoliter. A lakórész önálló bejáratú, öt hálószobával.

Szekszárd 9 km, az M6 autópálya 12 km, Budapest 155 km. Uniós agrártámogatás a területre igényelhető.

Uniós állampolgár agrárvégzettséggel Magyarországon összesen 300 hektár földterület megvásárlására jogosult. Ennek a procedúrának a teljes körű leszervezését a FODEL vállalja.$$,
  'Jó, termelésben', 'Gázkazán', 'Egyedi'
from properties where ref = '6902';

-- No Dutch body text — see the note on the 6412 insert above.
insert into property_translations (property_id, locale, title, subtitle, description, condition, heating, tag)
select id, 'nl',
  'Wijngoed in Tolna', 'Werkend wijngoed met kelderhuis',
  'Traditioneel wijngoed bij Szekszárd van 12,5 hectare, compleet uitgerust. Wijnkelder, woonhuis en bedrijfsgebouwen. Uitstekend rodewijngebied, nu nog in productie. De apparatuur en de vatenvoorraad zijn bij de prijs inbegrepen.',
  'Goed, in productie', 'Gasketel', 'Uniek'
from properties where ref = '6902';

insert into property_media (property_id, storage_path, alt, sort_order, is_hero)
select id, 'vineyard.png',
  jsonb_build_object('hu', 'A tolnai szőlőbirtok sorai a pinceház felől nézve', 'nl', 'De wijngaardrijen gezien vanaf het kelderhuis'),
  0, true
from properties where ref = '6902';

/* ── 7118 — Balatonberényi Nyaraló ────────────────────────────────────── */

insert into properties (
  ref, status, category, settlement, county, region, lat, lng, precision,
  price_eur, price_huf, price_asof, floor_m2, plot_m2, bedrooms, bathrooms,
  year_built, renovated_in, epc_class, features, seller_contact_visible,
  seller_name, seller_phone, seller_speaks, package, featured,
  homepage_featured, published_at, expires_at
) values (
  '7118', 'published', 'holiday', 'Balatonberény', 'Somogy', 'Balaton',
  46.7086, 17.3078, 'approximate',
  195000, 70200000, '2026-07-01', 165, 1800, 4, 2,
  1989, 2022, 'CC', array['waterfront','private-jetty','boathouse','terrace','renovated','parking'],
  true, 'Szabó Márta', '+36 30 771 4408', array['hu','nl','de'],
  'normal-12m', false, false, '2026-05-30', '2027-05-30'
);

insert into property_translations (property_id, locale, title, subtitle, description, body, condition, heating, tag)
select id, 'hu',
  'Balatonberényi Nyaraló', 'Közvetlen vízparti nyaraló',
  'Közvetlen vízparti nyaraló saját stéggel és csónakházzal. Teljesen felújítva 2022-ben. Nappalin, konyhán és 4 hálószobán kívül fedett terasz és saját parkoló. Kiadásra kiválóan alkalmas, a szezonban folyamatos kereslet.',
  $$Az ingatlan közvetlenül a vízparton fekszik, saját stéggel és csónakházzal. A 2022-es felújítás során hőszivattyús fűtés, új nyílászárók és teljes belső felújítás készült.

A 165 m²-es épület négy hálószobával, két fürdőszobával és fedett terasszal rendelkezik. A telek 1 800 m², a partszakasz 18 méter.

Balatonberény központja 1,5 km, Keszthely 14 km, Hévíz 20 km. Budapest 185 km, Bécs 245 km.$$,
  'Teljesen felújított', 'Hőszivattyú', 'Vízpart'
from properties where ref = '7118';

-- No Dutch body text — see the note on the 6412 insert above.
insert into property_translations (property_id, locale, title, subtitle, description, condition, heating, tag)
select id, 'nl',
  'Vakantiehuis in Balatonberény', 'Vakantiehuis direct aan het water',
  'Vakantiehuis direct aan het water met een eigen steiger en botenhuis. In 2022 volledig gerenoveerd. Naast de woonkamer, keuken en vier slaapkamers is er een overdekt terras en eigen parkeergelegenheid. Uitstekend geschikt voor verhuur; in het seizoen is er doorlopend vraag.',
  'Volledig gerenoveerd', 'Warmtepomp', 'Aan het water'
from properties where ref = '7118';

insert into property_media (property_id, storage_path, alt, sort_order, is_hero)
select id, 'cta.png',
  jsonb_build_object('hu', 'A balatonberényi nyaraló vízparti kertje a stéggel', 'nl', 'De tuin aan het water met de eigen steiger'),
  0, true
from properties where ref = '7118';
