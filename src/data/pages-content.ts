/**
 * Content pillars — the pages FODEL's old site carries and the prototype
 * dropped: transaction services with prices, the agricultural specialism, the
 * photography guide, the buying guide and the emigration hub.
 *
 * Substance and figures come from fodel.hu (szolgáltatás, tanácsok, GYIK) and
 * are FODEL's own. Prose is written for this site.
 */

import type { ContentPageData } from '~/lib/content-sections';
import type { Locale } from '~/i18n/ui';
import { AGRI_HECTARE_LIMIT, COMMISSION } from '~/config/company';

export const CONTENT: Record<Locale, Record<string, ContentPageData>> = {
  hu: {
    services: {
      metaTitle: 'Szolgáltatások — Ügyintézés, szerződés, fotózás',
      metaDescription:
        'Kétnyelvű adásvételi szerződés 150 €-tól, meghatalmazásos képviselet, földhivatali ügyintézés, energetikai tanúsítvány, ingatlanfotózás és drónfelvétel.',
      eyebrow: 'Szolgáltatások',
      title: 'Amit a hirdetésen',
      titleEm: 'túl elvégzünk',
      intro:
        'A hirdetés csak az első lépés. Az alábbi szolgáltatásokkal a teljes adásvételi folyamatot le tudjuk venni a válláról — mindkét ország szabályai szerint.',
      sections: [
        {
          type: 'steps',
          title: 'Az adásvétel lebonyolítása',
          items: [
            { n: '01', t: 'Kapcsolattartás', b: 'Telefonos és e-mailes konzultáció, kommunikáció mindkét féllel, tolmácsolással.' },
            { n: '02', t: 'A vevő minősítése', b: 'A vevőjelölt hátterének, vételi szándékának és fizetőképességének vizsgálata.' },
            { n: '03', t: 'Megtekintés', b: 'Személyes találkozók szervezése, idegen nyelvet beszélő munkatárs kíséretével.' },
            { n: '04', t: 'Áralku', b: 'A tárgyalás segítése mindkét fél nyelvén, reális ártartomány mentén.' },
            { n: '05', t: 'Szerződés', b: 'Kétnyelvű adásvételi szerződés előkészítése ügyvédi közreműködéssel.' },
            { n: '06', t: 'Ügyintézés', b: 'Földhivatali bejegyzés, közműátírás, szükség esetén meghatalmazásos képviselet.' },
          ],
        },
        {
          type: 'table',
          title: 'Kétnyelvű adásvételi szerződés',
          intro: 'Tájékoztató árak, nyelvpáronként. A pontos díj a szerződés terjedelmétől függ.',
          rows: [
            ['Magyar', '150 €-tól'],
            ['Német–magyar', '300 €-tól'],
            ['Angol–magyar', '300 €-tól'],
            ['Holland–magyar', '400 €-tól'],
          ],
        },
        {
          type: 'list',
          title: 'Kiegészítő szolgáltatások',
          intro: 'Ezekre egyedi árajánlatot adunk:',
          items: [
            'Épületenergetikai tanúsítvány beszerzése — az uniós előírás szerint a hirdetésben kötelező feltüntetni',
            'Professzionális ingatlanfotózás',
            'Drónfelvétel — nagy telkeknél és panorámás fekvésnél különösen hatásos',
            'Videós bemutató a hirdetéshez (36 €)',
          ],
        },
        {
          type: 'callout',
          title: 'Meghatalmazásos képviselet',
          body: 'A külföldi vevőnek nem kell Magyarországra utaznia az aláíráshoz: meghatalmazás alapján képviseljük a földhivatali eljárásban és a közműátírásnál is.',
        },
        {
          type: 'prose',
          title: 'Mikor kell jutalékot fizetni?',
          paragraphs: [
            `Jutalékot kizárólag akkor számítunk fel, ha a vevőt a FODEL közvetítette, írásos adásvételi szerződés jött létre és a foglaló megfizetésre került. Mértéke ${COMMISSION.percent}% nettó, de legalább ${COMMISSION.minimumEur} €, plusz ${COMMISSION.vatPercent}% holland áfa.`,
            'Ha az érdeklődő közvetlenül az Eladónál jelentkezik és nem kell segítenünk az ügymenetet, a hirdetés árán felül semmilyen más díjat nem kell megfizetni.',
          ],
        },
        {
          type: 'cta',
          title: 'Kérdése van a folyamatról?',
          body: 'Munkanapokon 09:00 és 18:00 között hívjon minket, vagy kérjen ingyenes visszahívást.',
          primary: { label: 'Kapcsolatfelvétel', to: 'contact' },
          secondary: { label: 'Gyakori kérdések', to: 'faq' },
        },
      ],
    },

    agricultural: {
      metaTitle: 'Agráringatlan — 300 hektárig vásárolhat Magyarországon',
      metaDescription:
        'Uniós állampolgár agrárvégzettséggel Magyarországon összesen 300 hektár földterület megvásárlására jogosult. A teljes procedúra leszervezését a FODEL vállalja.',
      eyebrow: 'Agráringatlan',
      title: 'Termőföld és',
      titleEm: 'agrárbirtok',
      intro:
        'A magyar termőföldpiac külön szabályozás alá esik. Aki ismeri a feltételeket, komoly lehetőségekhez jut — szőlőbirtokhoz, szántóhoz, tanyához vagy erdőhöz.',
      sections: [
        {
          type: 'prose',
          title: 'A 300 hektáros keret',
          paragraphs: [
            `Uniós állampolgár agrárvégzettséggel Magyarországon összesen ${AGRI_HECTARE_LIMIT} hektár földterület megvásárlására jogosult. Ennek a procedúrának a teljes körű leszervezését a FODEL vállalja.`,
            'A folyamat több hatósági lépésből áll, és a végzettség elismertetésével kezdődik. Munkatársaink végigkísérik az eljárást, és a szükséges dokumentumokat mindkét nyelven elkészítjük.',
          ],
        },
        {
          type: 'list',
          title: 'Mit szereznek meg külföldi ügyfeleink?',
          items: [
            'Szőlőbirtokot, működő pincészettel vagy anélkül',
            'Szántóterületet, uniós agrártámogatásra jogosultan',
            'Tanyát gazdasági épületekkel, állattartásra alkalmasan',
            'Erdőterületet és vegyes hasznosítású birtokot',
            'Nagyobb, összefüggő területet befektetési céllal',
          ],
        },
        {
          type: 'steps',
          title: 'A folyamat',
          items: [
            { n: '01', t: 'Konzultáció', b: 'Átbeszéljük, milyen hasznosítást tervez, és milyen keret áll rendelkezésre.' },
            { n: '02', t: 'Végzettség elismertetése', b: 'Az agrárvégzettség magyarországi elismerésének ügyintézése.' },
            { n: '03', t: 'Keresés', b: 'Partnereinkkel megkeressük a feltételeknek megfelelő területet.' },
            { n: '04', t: 'Hatósági eljárás', b: 'A termőföldszerzéshez szükséges engedélyek beszerzése.' },
            { n: '05', t: 'Adásvétel', b: 'Kétnyelvű szerződés, földhivatali bejegyzés, támogatási igény átvezetése.' },
          ],
        },
        {
          type: 'callout',
          title: 'Fontos',
          body: 'A termőföldszerzés szabályai időről időre változnak, és az egyedi eset körülményeitől is függenek. Az itt leírtak tájékoztató jellegűek — konkrét ügyben mindig egyeztessen velünk és a szakjogásszal.',
        },
        {
          type: 'cta',
          title: 'Agrárbirtokot keres?',
          body: 'Adja meg az igényeit, és a nem hirdetett kínálatból is keresünk Önnek.',
          primary: { label: 'Ingyenes kerestetés', to: 'searchRequest' },
          secondary: { label: 'Ingatlanok', to: 'properties' },
        },
      ],
    },

    photoGuide: {
      metaTitle: 'Fotózási útmutató — Így adja el gyorsabban az ingatlanát',
      metaDescription:
        'A jó fotó a leggyorsabb eladás egyetlen legfontosabb eszköze. A FODEL fotózási útmutatója: megvilágítás, tájolás, felbontás és a leggyakoribb hibák.',
      eyebrow: 'Eladóknak',
      title: 'Fotózási',
      titleEm: 'útmutató',
      intro:
        'A külföldi érdeklődő először a képeket látja — sokszor csak azokat. Ez a néhány szabály többet ér, mint bármilyen hirdetési szöveg.',
      sections: [
        {
          type: 'list',
          title: 'Előkészület',
          items: [
            'Fényképezés előtt mindig rakjon rendet, és teljesen világosítsa ki a lakást.',
            'Pakolja el a személyes holmikat minden helyiségből.',
            'A kertben nyírja le a füvet a fotózás előtt.',
            'Kapcsolja ki a készüléken a dátumbélyegzőt.',
          ],
        },
        {
          type: 'list',
          title: 'Megvilágítás',
          items: [
            'Napsütéses időben fényképezzen — kívül és belül egyaránt.',
            'Borult, alkonyati vagy sötétedés utáni fotózást kerülje.',
            'Kapcsolja fel a belső világítást minden helyiségben.',
            'Húzza fel a sötétítőket és a redőnyöket.',
            'A vaku használatát mindenképpen kerülje el.',
          ],
        },
        {
          type: 'list',
          title: 'Géptartás és kompozíció',
          items: [
            'Mindig vízszintesen tartsa a készüléket — függőleges tájolású képet ne készítsen.',
            'A vízszintes síkokat igazítsa párhuzamosan a kijelző felső szélével.',
            'Ha szűk a látószög, lépjen hátrébb.',
            'Kertes ház esetén készítsen felülnézeti, madártávlati képet is.',
            'Homlokzatnál mutassa be a teljes épületet.',
            'Kerülje, hogy nagy felületet foglaljon el az aszfalt, a mennyezet vagy a kerítés.',
          ],
        },
        {
          type: 'list',
          title: 'Képminőség',
          items: [
            'Mindig aktuális képeket töltsön fel, ne elavultakat.',
            'Használjon eredeti, nagyfelbontású fájlokat — legalább 3 megapixel, legalább 1500 pixel szélesség.',
            'Ne e-mailben továbbküldött, tömörített változatot töltsön fel.',
            'Exponálás előtt vegyen mély levegőt, és tartsa vissza egy másodpercig — így nem mozdul be a kép.',
            'A feldolgozás után egyesével ellenőrizze a képek élességét.',
          ],
        },
        {
          type: 'list',
          title: 'A leggyakoribb hibák',
          items: [
            'Borús időben készült, lehangoló hatású képek',
            'Túl sötét beltéri felvételek',
            'Ferde, csálé kompozíció',
            'Életlen, bemozdult vagy homályos fotók',
            'Alacsony felbontású vagy függőleges tájolású képek',
            'Ismétlődő, felesleges felvételek',
          ],
        },
        {
          type: 'callout',
          title: 'Nincs kedve bajlódni vele?',
          body: 'Professzionális ingatlanfotózást és drónfelvételt is vállalunk. Kérjen rá árajánlatot a hirdetésfeladáskor.',
        },
        {
          type: 'cta',
          title: 'Készen áll a hirdetésre?',
          primary: { label: 'Hirdetés feladása', to: 'submitAd' },
          secondary: { label: 'Árlista', to: 'priceList' },
        },
      ],
    },

    buyingGuide: {
      metaTitle: 'Vásárlás Magyarországon — a folyamat lépésről lépésre',
      metaDescription:
        'Hogyan zajlik egy ingatlan adásvétele Magyarországon külföldi vevő esetén: szerződés, foglaló, földhivatal, közművek és a várható költségek.',
      eyebrow: 'Vevőknek',
      title: 'Vásárlás',
      titleEm: 'Magyarországon',
      intro:
        'A magyar adásvételi folyamat kiszámítható, ha ismeri a lépéseit. Ez az útmutató végigveszi, mi történik és mikor.',
      sections: [
        {
          type: 'steps',
          title: 'A folyamat',
          items: [
            { n: '01', t: 'Kiválasztás', b: 'Kiválasztja az ingatlant a kínálatból, vagy kerestetést ad fel.' },
            { n: '02', t: 'Megtekintés', b: 'Megszervezzük az utat és a megtekintést, tolmáccsal.' },
            { n: '03', t: 'Ajánlat', b: 'Segítünk reális ajánlatot tenni és tárgyalni az eladóval.' },
            { n: '04', t: 'Szerződés és foglaló', b: 'Kétnyelvű adásvételi szerződés, jellemzően 10% foglalóval.' },
            { n: '05', t: 'Vételár', b: 'A fennmaradó vételár banki átutalással, a szerződés szerinti ütemezésben.' },
            { n: '06', t: 'Birtokbaadás', b: 'Földhivatali bejegyzés, közműátírás, kulcsátadás.' },
          ],
        },
        {
          type: 'list',
          title: 'Amire számítson a vételáron felül',
          items: [
            'Vagyonszerzési illeték — mértéke az ingatlan típusától és az Ön helyzetétől függ',
            'Ügyvédi díj a szerződés elkészítéséért és ellenjegyzéséért',
            'Kétnyelvű szerződés fordítása — 150 €-tól nyelvpártól függően',
            'Földhivatali eljárási díj',
            'Adott esetben a FODEL közvetítői jutaléka — ezt az eladó fizeti, nem Ön',
          ],
        },
        {
          type: 'prose',
          title: 'Nem kell Magyarországra utaznia',
          paragraphs: [
            'Meghatalmazás alapján képviseljük Önt az aláírásnál, a földhivatali eljárásban és a közművek átírásánál is. Így az adásvétel akkor is lebonyolítható, ha Ön nem tud vagy nem szeretne utazni.',
          ],
        },
        {
          type: 'callout',
          title: 'Energetikai tanúsítvány',
          body: 'Magyarországon kötelező az energetikai tanúsítvány, és az uniós előírás szerint a hirdetésben is fel kell tüntetni. Hirdetéseinknél a besorolás a jellemzők között szerepel; a „folyamatban" azt jelenti, hogy a tanúsítvány készítés alatt áll.',
        },
        {
          type: 'cta',
          title: 'Kezdjük el?',
          body: 'Böngéssze a kínálatot, vagy mondja el, mit keres — díjmentesen megkeressük.',
          primary: { label: 'Ingatlanok', to: 'properties' },
          secondary: { label: 'Ingyenes kerestetés', to: 'searchRequest' },
        },
      ],
    },

    emigration: {
      metaTitle: 'Miért költöznek a hollandok Magyarországra?',
      metaDescription:
        'Ár/érték arány, népsűrűség, megélhetési költségek és földrajzi biztonság — a négy tényező, amely a holland és belga vevőket Magyarországra hozza.',
      eyebrow: 'Háttér',
      title: 'A holland',
      titleEm: 'migráció okai',
      intro:
        'Eladóként érdemes érteni, mi mozgatja a vevőt. Több száz ügyfélbeszélgetés alapján négy tényező tér vissza újra és újra.',
      sections: [
        {
          type: 'prose',
          title: 'Ár/érték arány',
          paragraphs: [
            'A magyar vidéki ingatlankínálat ár/érték arányban Európa élmezőnyébe tartozik. Egy 125 m²-es építési telek Hollandiában nagyságrendileg 88 000 €, egy garázs 100 000 € körül mozog. Ugyanezért az összegért Magyarországon vidéken tágas családi ház vásárolható, gyakran jelentős földterülettel.',
          ],
        },
        {
          type: 'prose',
          title: 'Népsűrűség és tér',
          paragraphs: [
            'Hollandia népsűrűsége 482 fő/km², a lakosság mintegy 17 millió fő, és az ország jelentős része vízzel borított. A tér hiánya nem elvont probléma, hanem mindennapi tapasztalat — és a legtöbbször említett indok.',
          ],
        },
        {
          type: 'prose',
          title: 'Megélhetés és nyugdíj',
          paragraphs: [
            'Vásárlóink jelentős része nyugdíjas vagy nyugdíj előtt áll. Számukra a magyarországi megélhetési költség, az ingatlanadó hiánya és az elérhető egészségügyi ellátás együtt olyan életszínvonalat tesz lehetővé, amelyet ugyanabból a nyugdíjból Hollandiában nem érnének el.',
          ],
        },
        {
          type: 'prose',
          title: 'Földrajzi biztonság',
          paragraphs: [
            'Az 1953-as gátszakadás óta Hollandia hatalmas védőrendszert épített ki. A tengerszint emelkedésével kapcsolatos aggodalom sok döntésben szerepet játszik: Magyarország a kontinens közepén, a tengerszint felett fekszik.',
          ],
        },
        {
          type: 'callout',
          title: 'Mit jelent ez az eladónak?',
          body: 'Azt, hogy a vevő nem alkalmi érdeklődő. Egy magyarországi ingatlan megtekintése legalább két napjába és 200–300 eurójába kerül. Aki ezt vállalja, komolyan gondolja — és jellemzően egy összegben, banki átutalással fizet.',
        },
        {
          type: 'cta',
          title: 'Érje el ezt a vevőkört',
          primary: { label: 'Hirdetés feladása', to: 'submitAd' },
          secondary: { label: 'Árlista', to: 'priceList' },
        },
      ],
    },
  },

  nl: {
    services: {
      metaTitle: 'Diensten — Afwikkeling, contract, fotografie',
      metaDescription:
        'Tweetalige koopovereenkomst vanaf € 150, vertegenwoordiging met volmacht, inschrijving bij het kadaster, energielabel, vastgoedfotografie en drone-opnamen.',
      eyebrow: 'Diensten',
      title: 'Wat wij naast',
      titleEm: 'de advertentie doen',
      intro:
        'De advertentie is de eerste stap. Met onderstaande diensten nemen wij het volledige aankooptraject uit handen — volgens de regels van beide landen.',
      sections: [
        {
          type: 'steps',
          title: 'De afwikkeling van de koop',
          items: [
            { n: '01', t: 'Contact', b: 'Overleg per telefoon en e-mail, communicatie met beide partijen, inclusief tolken.' },
            { n: '02', t: 'Toetsing van de koper', b: 'Wij toetsen achtergrond, koopintentie en financiële gegoedheid.' },
            { n: '03', t: 'Bezichtiging', b: 'Wij plannen de afspraken en gaan mee, met een collega die uw taal spreekt.' },
            { n: '04', t: 'Onderhandeling', b: 'Ondersteuning in beide talen, binnen een realistische prijsrange.' },
            { n: '05', t: 'Contract', b: 'Tweetalige koopovereenkomst, opgesteld met een advocaat.' },
            { n: '06', t: 'Afhandeling', b: 'Kadaster, nutsvoorzieningen en indien nodig vertegenwoordiging met volmacht.' },
          ],
        },
        {
          type: 'table',
          title: 'Tweetalige koopovereenkomst',
          intro: 'Indicatieve prijzen per talencombinatie. De uiteindelijke prijs hangt af van de omvang.',
          rows: [
            ['Hongaars', 'vanaf € 150'],
            ['Duits–Hongaars', 'vanaf € 300'],
            ['Engels–Hongaars', 'vanaf € 300'],
            ['Nederlands–Hongaars', 'vanaf € 400'],
          ],
        },
        {
          type: 'list',
          title: 'Aanvullende diensten',
          intro: 'Hiervoor maken wij een offerte op maat:',
          items: [
            'Aanvragen van het energieprestatiecertificaat — volgens EU-regels verplicht in de advertentie',
            'Professionele vastgoedfotografie',
            'Drone-opnamen — vooral effectief bij grote percelen en uitzicht',
            'Video bij de advertentie (€ 36)',
          ],
        },
        {
          type: 'callout',
          title: 'Vertegenwoordiging met volmacht',
          body: 'U hoeft niet naar Hongarije te reizen om te tekenen: met een volmacht vertegenwoordigen wij u bij de ondertekening, bij het kadaster en bij het overzetten van de nutsvoorzieningen.',
        },
        {
          type: 'prose',
          title: 'Wanneer is courtage verschuldigd?',
          paragraphs: [
            `Courtage brengen wij uitsluitend in rekening wanneer FODEL de koper heeft aangebracht, er een schriftelijke koopovereenkomst is en de aanbetaling is voldaan. Het tarief is ${COMMISSION.percent}% netto met een minimum van € ${COMMISSION.minimumEur}, plus ${COMMISSION.vatPercent}% Nederlandse btw. De verkoper betaalt, niet de koper.`,
          ],
        },
        {
          type: 'cta',
          title: 'Vragen over het traject?',
          body: 'Bel ons op werkdagen tussen 09:00 en 18:00, of vraag om teruggebeld te worden.',
          primary: { label: 'Contact opnemen', to: 'contact' },
          secondary: { label: 'Veelgestelde vragen', to: 'faq' },
        },
      ],
    },

    agricultural: {
      metaTitle: `Agrarisch vastgoed — tot ${AGRI_HECTARE_LIMIT} hectare in Hongarije`,
      metaDescription: `Een EU-burger met een agrarische kwalificatie mag in Hongarije tot ${AGRI_HECTARE_LIMIT} hectare grond verwerven. FODEL regelt de volledige procedure.`,
      eyebrow: 'Agrarisch vastgoed',
      title: 'Landbouwgrond en',
      titleEm: 'landgoederen',
      intro:
        'De Hongaarse grondmarkt kent eigen regels. Wie de voorwaarden kent, krijgt toegang tot wijngaarden, akkers, boerderijen en bos.',
      sections: [
        {
          type: 'prose',
          title: `De grens van ${AGRI_HECTARE_LIMIT} hectare`,
          paragraphs: [
            `Een EU-burger met een agrarische kwalificatie mag in Hongarije in totaal ${AGRI_HECTARE_LIMIT} hectare grond verwerven. Wij regelen die procedure volledig.`,
            'Het traject bestaat uit meerdere stappen bij de autoriteiten en begint met de erkenning van uw kwalificatie. Onze medewerkers begeleiden het hele proces en stellen de benodigde documenten in beide talen op.',
          ],
        },
        {
          type: 'list',
          title: 'Wat onze klanten verwerven',
          items: [
            'Wijngaarden, met of zonder werkende kelder',
            'Akkerbouwgrond, in aanmerking komend voor EU-steun',
            'Boerderijen met bijgebouwen, geschikt voor vee',
            'Bospercelen en gemengd gebruikte landgoederen',
            'Grotere aaneengesloten percelen als belegging',
          ],
        },
        {
          type: 'steps',
          title: 'Het traject',
          items: [
            { n: '01', t: 'Adviesgesprek', b: 'Wij bespreken uw plannen en het beschikbare budget.' },
            { n: '02', t: 'Erkenning kwalificatie', b: 'Wij regelen de erkenning van uw agrarische kwalificatie in Hongarije.' },
            { n: '03', t: 'Zoeken', b: 'Met onze partners zoeken wij grond die aan de voorwaarden voldoet.' },
            { n: '04', t: 'Vergunningen', b: 'Het aanvragen van de vereiste toestemmingen voor grondverwerving.' },
            { n: '05', t: 'Aankoop', b: 'Tweetalig contract, inschrijving bij het kadaster, overdracht van steunaanvragen.' },
          ],
        },
        {
          type: 'callout',
          title: 'Belangrijk',
          body: 'De regels voor grondverwerving wijzigen van tijd tot tijd en hangen af van uw specifieke situatie. Bovenstaande is informatief — overleg bij een concreet plan altijd met ons en met een gespecialiseerde jurist.',
        },
        {
          type: 'cta',
          title: 'Op zoek naar agrarisch vastgoed?',
          body: 'Geef uw wensen door; wij zoeken ook buiten het geadverteerde aanbod.',
          primary: { label: 'Gratis zoekopdracht', to: 'searchRequest' },
          secondary: { label: 'Ons aanbod', to: 'properties' },
        },
      ],
    },

    buyingGuide: {
      metaTitle: 'Kopen in Hongarije — het traject stap voor stap',
      metaDescription:
        'Hoe een aankoop in Hongarije verloopt voor een buitenlandse koper: contract, aanbetaling, kadaster, nutsvoorzieningen en de te verwachten kosten.',
      eyebrow: 'Voor kopers',
      title: 'Kopen in',
      titleEm: 'Hongarije',
      intro:
        'Het Hongaarse aankooptraject is goed voorspelbaar zodra u de stappen kent. Deze gids loopt ze met u door.',
      sections: [
        {
          type: 'steps',
          title: 'Het traject',
          items: [
            { n: '01', t: 'Selectie', b: 'U kiest uit ons aanbod, of u plaatst een gratis zoekopdracht.' },
            { n: '02', t: 'Bezichtiging', b: 'Wij organiseren de reis en de bezichtiging, met tolk.' },
            { n: '03', t: 'Bod', b: 'Wij helpen u een realistisch bod te doen en te onderhandelen.' },
            { n: '04', t: 'Contract en aanbetaling', b: 'Tweetalige koopovereenkomst, doorgaans met 10% aanbetaling.' },
            { n: '05', t: 'Koopsom', b: 'De resterende koopsom per bankoverschrijving, volgens het contract.' },
            { n: '06', t: 'Overdracht', b: 'Inschrijving bij het kadaster, nutsvoorzieningen, sleuteloverdracht.' },
          ],
        },
        {
          type: 'list',
          title: 'Kosten naast de koopsom',
          items: [
            'Overdrachtsbelasting — het tarief hangt af van het type object en uw situatie',
            'Advocaatkosten voor het opstellen en tegentekenen van de akte',
            'Vertaling van het tweetalige contract — vanaf € 150, afhankelijk van de talencombinatie',
            'Kadasterkosten',
            'Eventuele courtage van FODEL — die betaalt de verkoper, niet u',
          ],
        },
        {
          type: 'prose',
          title: 'U hoeft er niet heen',
          paragraphs: [
            'Met een volmacht vertegenwoordigen wij u bij de ondertekening, bij het kadaster en bij het overzetten van de nutsvoorzieningen. De koop kan dus doorgaan ook als u niet kunt of wilt reizen.',
          ],
        },
        {
          type: 'callout',
          title: 'Energielabel',
          body: 'Hongarije kent een verplicht energieprestatiecertificaat, dat volgens EU-regels ook in de advertentie moet staan. Bij ons aanbod vindt u het label bij de kenmerken; “in aanvraag” betekent dat het certificaat nog wordt opgesteld.',
        },
        {
          type: 'cta',
          title: 'Zullen wij beginnen?',
          body: 'Bekijk het aanbod, of vertel ons wat u zoekt — dat kost u niets.',
          primary: { label: 'Ons aanbod', to: 'properties' },
          secondary: { label: 'Gratis zoekopdracht', to: 'searchRequest' },
        },
      ],
    },

    emigration: {
      metaTitle: 'Emigreren naar Hongarije — waarom Nederlanders de stap zetten',
      metaDescription:
        'De vier redenen waarom Nederlanders en Belgen naar Hongarije verhuizen: prijs-kwaliteitverhouding, ruimte, lagere lasten en ligging.',
      eyebrow: 'Achtergrond',
      title: 'Emigreren naar',
      titleEm: 'Hongarije',
      intro:
        'Waarom kiezen zoveel Nederlanders en Belgen voor Hongarije? Uit honderden gesprekken met onze klanten komen steeds dezelfde vier redenen terug.',
      sections: [
        {
          type: 'prose',
          title: 'Prijs-kwaliteitverhouding',
          paragraphs: [
            'Landelijk Hongaars vastgoed behoort qua prijs-kwaliteitverhouding tot de beste van Europa. Een bouwkavel van 125 m² kost in Nederland al gauw € 88.000 en een garage rond de € 100.000. Voor datzelfde bedrag koopt u op het Hongaarse platteland een ruime gezinswoning, vaak met flink wat grond.',
          ],
        },
        {
          type: 'prose',
          title: 'Ruimte',
          paragraphs: [
            'Nederland heeft een bevolkingsdichtheid van 482 inwoners per km² bij zo’n 17 miljoen inwoners, en een aanzienlijk deel van het land bestaat uit water. Het gebrek aan ruimte is geen abstract probleem maar een dagelijkse ervaring — en de meestgenoemde reden.',
          ],
        },
        {
          type: 'prose',
          title: 'Kosten van levensonderhoud',
          paragraphs: [
            'Een groot deel van onze kopers is gepensioneerd of bijna. Voor hen leveren de lagere kosten van levensonderhoud, het ontbreken van onroerendezaakbelasting en de betaalbare zorg samen een levensstandaard op die in Nederland met hetzelfde pensioen niet haalbaar is.',
          ],
        },
        {
          type: 'prose',
          title: 'Ligging',
          paragraphs: [
            'Sinds de watersnood van 1953 heeft Nederland een enorm waterkeringssysteem gebouwd. Zorgen over de stijgende zeespiegel spelen in veel afwegingen mee: Hongarije ligt midden op het continent en boven zeeniveau.',
          ],
        },
        {
          type: 'cta',
          title: 'Verkennen?',
          body: 'Bekijk ons aanbod, of laat ons zoeken naar wat u voor ogen heeft.',
          primary: { label: 'Ons aanbod', to: 'properties' },
          secondary: { label: 'Kopen in Hongarije', to: 'buyingGuide' },
        },
      ],
    },

    photoGuide: {
      metaTitle: 'Fotografiegids voor adverteerders',
      metaDescription:
        'Goede foto’s zijn het belangrijkste middel voor een snelle verkoop. De fotografiegids van FODEL: licht, oriëntatie, resolutie en de meestgemaakte fouten.',
      eyebrow: 'Adverteren',
      title: 'Fotografie',
      titleEm: 'gids',
      intro:
        'De buitenlandse geïnteresseerde ziet eerst de foto’s — vaak alleen de foto’s. Deze regels doen meer dan welke advertentietekst ook.',
      sections: [
        {
          type: 'list',
          title: 'Voorbereiding',
          items: [
            'Ruim op en doe overal het licht aan voordat u fotografeert.',
            'Haal persoonlijke spullen uit beeld.',
            'Maai het gras voordat u de tuin fotografeert.',
            'Zet de datumstempel op uw toestel uit.',
          ],
        },
        {
          type: 'list',
          title: 'Licht',
          items: [
            'Fotografeer bij zonnig weer, binnen én buiten.',
            'Vermijd bewolking, schemer en avond.',
            'Doe in elke ruimte het licht aan.',
            'Trek gordijnen open en rolluiken omhoog.',
            'Gebruik in geen geval de flitser.',
          ],
        },
        {
          type: 'list',
          title: 'Compositie',
          items: [
            'Houd het toestel altijd horizontaal — maak geen staande foto’s.',
            'Lijn horizontale vlakken uit met de bovenrand van het scherm.',
            'Doe een stap achteruit als de ruimte niet in beeld past.',
            'Maak bij een vrijstaand huis ook een opname van bovenaf.',
            'Breng bij de gevel het hele gebouw in beeld.',
            'Vermijd dat asfalt, plafond of schutting het beeld domineert.',
          ],
        },
        {
          type: 'list',
          title: 'Beeldkwaliteit',
          items: [
            'Gebruik actuele foto’s, geen oude.',
            'Upload de originele bestanden — minimaal 3 megapixel en 1500 pixels breed.',
            'Stuur geen via e-mail gecomprimeerde versies door.',
            'Adem in en houd één seconde uw adem in voordat u afdrukt; dat scheelt bewegingsonscherpte.',
            'Controleer achteraf elke foto op scherpte.',
          ],
        },
        {
          type: 'callout',
          title: 'Liever uitbesteden?',
          body: 'Wij verzorgen ook professionele vastgoedfotografie en drone-opnamen. Vraag er bij uw aanmelding naar.',
        },
        {
          type: 'cta',
          title: 'Klaar om te adverteren?',
          primary: { label: 'Advertentie plaatsen', to: 'submitAd' },
          secondary: { label: 'Tarieven', to: 'priceList' },
        },
      ],
    },
  },
};
