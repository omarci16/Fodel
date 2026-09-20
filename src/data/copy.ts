/**
 * Page copy, both locales.
 *
 * Hungarian keeps FODEL's own register: formal ("Ön"), reassuring,
 * explanatory, and their exact CTAs ("Forduljon hozzánk bizalommal!").
 * Verbatim FODEL lines are marked. Dutch leads with their own published
 * positioning, "Onroerend goed kopen direct van de eigenaar".
 *
 * Facts used here are locked in src/config/company.ts — 8 countries,
 * 5 languages, 4% + 21% VAT, 09:00–18:00. Nothing is claimed that FODEL do
 * not publish.
 */

import type { Locale } from '~/i18n/ui';
import { COMPANY, formatHours, foundedInLabel } from '~/config/company';

const REACH_COUNTRIES = COMPANY.reach.countries;
const REACH_LANGUAGES = COMPANY.reach.languages;

export interface Step {
  num: string;
  title: string;
  body: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface Persona {
  title: string;
  body: string;
}

export const COPY: Record<Locale, any> = {
  hu: {
    home: {
      meta: {
        title: 'FODEL Ingatlan — Magyar ingatlanok hirdetése Nyugat-Európában',
        description:
          `Hirdesse magyar ingatlanát ${REACH_LANGUAGES} nyelven, ${REACH_COUNTRIES} országban — kizárólagossági szerződés nélkül. Készpénzes holland, belga és német vevők. Jutalék csak sikeres eladás esetén.`,
      },
      hero: {
        eyebrow: `Alapítva 2013 — ${foundedInLabel('hu')}`,
        title: ['Magyar', 'Ingatlanok', 'Nyugat-Európában'],
        emphasis: 1,
        body: `Egyedülálló hirdetési modell: ${REACH_LANGUAGES} nyelven, ${REACH_COUNTRIES} országban — kizárólagossági szerződés nélkül. Komoly, készpénzes külföldi vevők.`,
        primary: 'Ingatlanok',
        secondary: 'Hirdessen nálunk',
        featuredLabel: 'Kiemelt ingatlan',
      },
      audiences: [
        {
          eyebrow: 'Eladóknak',
          title: 'Hirdesse ingatlanát\nNyugat-Európában',
          body: `Kizárólagossági szerződés nélkül. Hirdetése ${REACH_LANGUAGES} nyelven jelenik meg ${REACH_COUNTRIES} országban, célzottan holland, belga és német készpénzes vevőknek.`,
          cta: 'Tudjon meg többet',
          to: 'sellers',
        },
        {
          eyebrow: 'Vevőknek',
          title: 'Ingatlan közvetlenül\na tulajdonostól',
          body: 'Autentikus magyar házak, birtokok, gazdaságok és szőlők. Lépjen kapcsolatba közvetlenül a tulajdonosokkal, vagy bízza a FODEL-re a teljes folyamatot.',
          cta: 'Ingatlanok böngészése',
          to: 'properties',
        },
      ],
      featured: { eyebrow: 'Válogatás', title: 'Kiemelt Ingatlanok' },
      // Verbatim FODEL, from their own editorial copy.
      quote: '„A hollandok gyakran nem hisznek a szemüknek, amikor megtudják, hogy Magyarországon mit és milyen áron vásárolhatnak."',
      quoteSource: 'FODEL INGATLAN — fodel.nl',
      how: { eyebrow: 'Egyedülálló modell', title: 'Így működik a FODEL' },
      cta: {
        eyebrow: 'Lépjen kapcsolatba velünk',
        title: 'Forduljon hozzánk',
        titleEm: 'bizalommal!',
        body: `${formatHours('hu')} · A visszahívás ingyenes.`,
      },
      referral: {
        eyebrow: 'Ajánlói program',
        title: 'Ajánljon egy hirdetőt,',
        titleEm: 'kapjon 10%-ot',
        body: 'Ha valaki az Ön ajánlására ad fel hirdetést a FODEL-nél, 10% kedvezményt kap a csomagjából — és Önnek 10% jóváírást írunk a következő hirdetésére. Ha már hirdetett nálunk, saját ajánlói kódját a portál Beállítások menüjében találja.',
        steps: [
          'Ajánlja ismerősét — a lenti űrlappal, vagy adja meg a saját linkjét a portálon',
          'Munkatársunk felveszi vele a kapcsolatot',
          'Ha hirdet, ő 10%-ot spórol, Ön 10%-ot jóváírunk',
        ],
        formTitle: 'Ajánljon egy ismerőst',
        fields: {
          referrerName: 'Az Ön neve',
          referrerEmail: 'Az Ön e-mail címe',
          referredName: 'Ajánlott neve',
          referredEmail: 'Ajánlott e-mail címe',
        },
        submit: 'Ajánlás elküldése',
      },
    },

    steps: [
      {
        num: '01',
        title: `Hirdetés ${REACH_COUNTRIES} országban`,
        body: `Ingatlanát ${REACH_LANGUAGES} nyelven hirdetjük meg Hollandiában, Belgiumban, Németországban, Angliában és más uniós országokban — kizárólagossági szerződés nélkül.`,
      },
      {
        num: '02',
        title: 'Minősített vevők',
        body: 'Külföldi érdeklődőink jellemzően készpénzes vevők. Banki hitel és állami támogatás nélkül, egy összegben fizetnek. Csak komoly partnert közvetítünk.',
      },
      {
        num: '03',
        title: 'Teljes körű ügyintézés',
        body: 'Kétnyelvű adásvételi szerződés, meghatalmazásos képviselet, földhivatali ügyintézés és közüzemi átírás — mindent elvégzünk Ön helyett.',
      },
    ] as Step[],

    stats: [
      { value: '2013', label: 'Alapítva' },
      { value: '8', label: 'Ország' },
      { value: '5', label: 'Nyelv' },
      { value: '4%', label: 'Jutalék' },
    ] as Stat[],

    sellers: {
      meta: {
        title: 'Eladóknak — Hirdesse ingatlanát Nyugat-Európában',
        description:
          'Hirdesse magyar ingatlanát holland, belga és német vevőknek. 69 €-tól, kizárólagosság nélkül. Jutalék csak akkor, ha mi hozzuk a vevőt: 4% + 21% holland áfa.',
      },
      hero: {
        eyebrow: 'Eladóknak',
        title: 'Hirdesse ingatlanát',
        titleEm: 'Nyugat-Európában',
        body: `A FODEL egyedülálló hirdetési modelljével ingatlana ${REACH_LANGUAGES} nyelven jelenik meg ${REACH_COUNTRIES} országban — kizárólagossági szerződés nélkül. Csak komoly, készpénzes külföldi vevőkkel dolgozunk.`,
        cta: 'Hirdetés feladása',
        secondary: 'Árlista megtekintése',
      },
      benefits: {
        eyebrow: 'Az előnyök',
        title: 'Miért érdemes külföldi vevőt keresni?',
        points: [
          'Készpénzes vevők — nincs bankihitel-várakozás, nincs CSOK-ügyintézés.',
          'Egy összegben, banki átutalással fizetnek — gyors és biztonságos.',
          'Komoly szándék: egy megtekintés legalább 2 napba és 200–300 €-ba kerül nekik.',
          'Stabil, reális vételár — nem alkudoznak irreálisan.',
          'A FODEL a vevőt személyesen minősíti, Önhöz csak komoly partnert küldünk.',
        ],
      },
      personas: {
        eyebrow: 'A vevők',
        title: 'Kik a FODEL vásárlói?',
        items: [
          {
            title: 'Kisnyugdíjasok',
            body: 'Alacsonyabb megélhetési költségeket, adókedvezményt és elérhető egészségügyi ellátást keresnek Magyarországon.',
          },
          {
            title: 'Családok',
            body: 'Teret, természetet és vidéki életet keresnek. Jellemzően farmot, tanyát vagy nyaralót vásárolnak.',
          },
          {
            title: 'Befektetők',
            body: 'Kereskedelmi ingatlanokat, szőlőbirtokokat és mezőgazdasági területeket keresnek.',
          },
          {
            title: 'Életstílus-emigránsok',
            body: 'Holland adók és magas ingatlanárak elől menekülnek. Autentikus európai életmódot keresnek.',
          },
        ] as Persona[],
      },
      how: { eyebrow: 'Lépésről lépésre', title: 'Az egyedülálló FODEL-modell' },
      commission: {
        eyebrow: 'Díjszabás',
        title: 'Jutalék csak sikeres\ntranzakció esetén',
        body: 'Ha a vevő közvetlenül veszi fel Önnel a kapcsolatot és nincs szükség a segítségünkre, a hirdetési díjon felül semmilyen más díjat nem kell fizetnie. FODEL közvetítésnél: 4% nettó (min. 2.000 €) + 21% holland áfa.',
        cta: 'Árlista megtekintése',
      },
    },

    buyers: {
      meta: {
        title: 'Vevőknek — Ingatlan közvetlenül a tulajdonostól',
        description:
          'Autentikus magyar ingatlanok holland-magyar közvetítéssel. Kétnyelvű szerződés, meghatalmazásos képviselet, földhivatali ügyintézés. Ingyenes kerestetés.',
      },
      hero: {
        eyebrow: 'Vevőknek',
        title: 'Ingatlan közvetlenül',
        titleEm: 'a tulajdonostól',
        body: 'Hirdetéseinkben a FODEL elérhetősége mellett gyakran a tulajdonos neve és telefonszáma is szerepel. Közvetlenül tárgyalhat — vagy ránk bízhatja a teljes folyamatot.',
        cta: 'Ingatlanok böngészése',
        secondary: 'Ingyenes kerestetés',
      },
      services: {
        eyebrow: 'Amit elvégzünk',
        title: 'Teljes körű ügyintézés',
        points: [
          'A vevőjelölt és az eladó közötti kommunikáció, tolmácsolással.',
          'Megtekintések megszervezése, idegen nyelvet beszélő munkatárs kíséretével.',
          'Az áralku segítése és a többnyelvű szerződés előkészítése.',
          'Meghatalmazásos képviselet — nem kell Magyarországra utaznia az aláíráshoz.',
          'Földhivatali bejegyzés és a közművek átírása.',
        ],
      },
      reasons: {
        eyebrow: 'Miért Magyarország',
        title: 'Amit a nyugat-európai vevők keresnek',
      },
    },

    about: {
      meta: {
        title: 'Rólunk — Egy híd két világ között',
        description:
          '2013 óta segítjük a magyar ingatlan-eladókat abban, hogy megtalálják a megfelelő nyugat-európai vevőt. Diszkréten, átláthatóan, kizárólagossági szerződés nélkül.',
      },
      hero: {
        eyebrow: 'Rólunk',
        title: 'Egy híd két',
        titleEm: 'világ között',
        body: '2013 óta segítjük a magyar ingatlan-eladókat abban, hogy megtalálják a megfelelő külföldi vevőt — diszkréten, hatékonyan, kizárólagossági szerződés nélkül.',
      },
      origin: {
        eyebrow: 'A kezdetek — Almere-Buiten, 2013',
        quote:
          '„Almere-Buitenben élve láttuk, hogy a hollandok mennyire vágynak autentikus európai életmódra — míg Magyarországon a legjobb ingatlanok ismeretlenül várnak gazdára."',
      },
      values: {
        eyebrow: 'Értékeink',
        title: 'Amire minden munkánkban támaszkodunk',
        items: [
          {
            num: '01',
            title: 'Diszkréció',
            body: 'Az eladók és vevők adatait a legnagyobb diszkrécióval kezeljük. Az ingatlan és a tulajdonos személyes adatai kizárólag az Ön hozzájárulásával jelennek meg.',
          },
          {
            num: '02',
            title: 'Átláthatóság',
            body: 'Nincsenek rejtett díjak. A hirdetési árak és a jutalék mértéke nyilvános, és a folyamat minden lépésénél tájékoztatjuk ügyfeleinket.',
          },
          {
            num: '03',
            title: 'Kétnyelvűség',
            body: 'Mindkét piac jogi hátterét, szokásait és elvárásait ismerjük. Munkatársaink hollandul, németül, angolul, franciául és magyarul beszélnek.',
          },
        ],
      },
      approach: {
        eyebrow: 'A mi megközelítésünk',
        title: 'Nem vagyunk nagy iroda.',
        titleEm: 'Ez az előnyünk.',
        points: [
          'Minden ügyféllel személyesen foglalkozunk — nincs call center, nincs anonim ügyintézés.',
          'Mindkét kultúrát belülről ismerjük: holland és magyar szemmel egyaránt értékeljük az ingatlanokat.',
          'Az ingatlan és a vevő összeillesztése a mi felelősségünk — nem a szerencsén múlik.',
          'Kizárólagossági szerződés nélkül dolgozunk, mert bízunk abban, hogy eredménnyel bizonyítunk.',
        ],
      },
      story: {
        eyebrow: foundedInLabel('hu'),
        title: 'A híd, amelyet',
        titleEm: 'megépítettünk',
        paragraphs: [
          'A FODEL Hollandiában élő magyarok által alapított ingatlanközvetítő iroda. Almere-Buitenben indultunk el 2013-ban, ahol rájöttünk: rengeteg holland és belga érdeklődő szeretne autentikus magyar ingatlant vásárolni — de nem tudja, hogyan fogjon hozzá.',
          `Ma ${REACH_COUNTRIES} országban hirdetünk, ${REACH_LANGUAGES} nyelven — és minden tranzakciót elejétől a végéig kísérünk. Kétnyelvű adásvételi szerződéssel, meghatalmazásos képviselettel, földhivatali ügyintézéssel. Irodánk ma Hágában működik.`,
        ],
      },
    },

    contact: {
      meta: {
        title: 'Kapcsolat — Forduljon hozzánk bizalommal',
        description:
          `Hívjon minket munkanapokon ${COMPANY.hours.weekdays.from} és ${COMPANY.hours.weekdays.to} között, vagy kérjen ingyenes visszahívást. A hívást mi fizetjük.`,
      },
      hero: {
        eyebrow: 'Kapcsolat',
        title: 'Forduljon hozzánk',
        titleEm: 'bizalommal',
      },
      formTitle: 'Ingyenes visszahívás kérése',
      subjects: [
        'Hirdetési érdeklődés',
        'Vételi érdeklődés',
        'Árlista kérése',
        'Visszahívás kérése',
        'Egyéb',
      ],
      note: 'A visszahívást mi fizetjük — Önnek semmibe nem kerül. Magyarul beszélő munkatársunk egy holland számról fog jelentkezni.',
    },
  },

  nl: {
    home: {
      meta: {
        title: 'FODEL Vastgoed — Onroerend goed kopen direct van de eigenaar',
        description:
          'Huizen, boerderijen en landgoederen in Hongarije, vaak rechtstreeks van de eigenaar. Nederlandse begeleiding en tweetalige contracten.',
      },
      hero: {
        eyebrow: `Sinds 2013 — ${foundedInLabel('nl')}`,
        title: ['Vastgoed', 'in Hongarije', 'direct van de eigenaar'],
        emphasis: 1,
        body: 'Bij een groot deel van ons aanbod staat de eigenaar er zelf bij vermeld. U onderhandelt rechtstreeks — of laat de hele afwikkeling aan ons over.',
        primary: 'Woningen bekijken',
        secondary: 'Gratis zoekopdracht',
        featuredLabel: 'Uitgelicht',
      },
      audiences: [
        {
          eyebrow: 'Voor kopers',
          title: 'Vastgoed direct\nvan de eigenaar',
          body: 'Authentieke Hongaarse huizen, boerderijen, landgoederen en wijngaarden. Neem rechtstreeks contact op met de eigenaar, of laat FODEL het volledige traject regelen.',
          cta: 'Woningen bekijken',
          to: 'properties',
        },
        {
          eyebrow: 'Adverteren',
          title: 'Uw Hongaarse woning\nin West-Europa',
          body: `Adverteer in ${REACH_LANGUAGES} talen in ${REACH_COUNTRIES} landen, zonder exclusiviteitscontract. Courtage alleen wanneer wij de koper aanbrengen.`,
          cta: 'Meer informatie',
          to: 'sellers',
        },
      ],
      featured: { eyebrow: 'Selectie', title: 'Uitgelicht aanbod' },
      quote:
        '“Nederlanders geloven hun ogen vaak niet wanneer ze zien wat je in Hongarije voor welk bedrag kunt kopen.”',
      quoteSource: 'FODEL VASTGOED — fodel.nl',
      how: { eyebrow: 'Hoe het werkt', title: 'Zo werkt FODEL' },
      cta: {
        eyebrow: 'Neem contact op',
        title: 'Wij bellen u',
        titleEm: 'graag terug',
        body: `${formatHours('nl')} · Terugbellen kost u niets.`,
      },
      referral: {
        eyebrow: 'Aanbevelingsprogramma',
        title: 'Beveel een adverteerder aan,',
        titleEm: 'ontvang 10%',
        body: 'Plaatst iemand op uw aanbeveling een advertentie bij FODEL, dan krijgt hij 10% korting op zijn pakket — en wij schrijven 10% bij op uw volgende advertentie. Adverteert u al bij ons? Uw eigen aanbevelingscode vindt u onder Instellingen in het portaal.',
        steps: [
          'Beveel een kennis aan — met het formulier hieronder, of deel uw eigen link uit het portaal',
          'Onze medewerker neemt contact op',
          'Plaatst hij een advertentie, dan bespaart hij 10% en schrijven wij u 10% bij',
        ],
        formTitle: 'Beveel een kennis aan',
        fields: {
          referrerName: 'Uw naam',
          referrerEmail: 'Uw e-mailadres',
          referredName: 'Naam van de aanbevolen persoon',
          referredEmail: 'E-mailadres van de aanbevolen persoon',
        },
        submit: 'Aanbeveling versturen',
      },
    },

    steps: [
      {
        num: '01',
        title: `Aanbod in ${REACH_COUNTRIES} landen`,
        body: `Wij adverteren in ${REACH_LANGUAGES} talen in Nederland, België, Duitsland, Engeland en andere EU-landen — zonder exclusiviteitscontract met de verkoper.`,
      },
      {
        num: '02',
        title: 'Rechtstreeks contact',
        body: 'Bij veel advertenties staan naast onze gegevens ook de naam en het nummer van de eigenaar. Regelt u het samen, dan betaalt niemand courtage.',
      },
      {
        num: '03',
        title: 'Volledige afwikkeling',
        body: 'Tweetalige koopovereenkomst, vertegenwoordiging met volmacht, inschrijving bij het kadaster en het overzetten van de nutsvoorzieningen.',
      },
    ] as Step[],

    stats: [
      { value: '2013', label: 'Opgericht' },
      { value: '8', label: 'Landen' },
      { value: '5', label: 'Talen' },
      { value: '4%', label: 'Courtage' },
    ] as Stat[],

    sellers: {
      meta: {
        title: 'Adverteren — Uw Hongaarse woning in West-Europa',
        description:
          `Adverteer uw Hongaarse woning in ${REACH_LANGUAGES} talen in ${REACH_COUNTRIES} landen, vanaf € 69 en zonder exclusiviteit. Courtage alleen als FODEL de koper aanbrengt: 4% + 21% btw.`,
      },
      hero: {
        eyebrow: 'Adverteren',
        title: 'Uw woning',
        titleEm: 'in West-Europa',
        body: `Met het model van FODEL verschijnt uw woning in ${REACH_LANGUAGES} talen in ${REACH_COUNTRIES} landen — zonder exclusiviteitscontract. Wij werken uitsluitend met serieuze kopers.`,
        cta: 'Advertentie plaatsen',
        secondary: 'Tarieven bekijken',
      },
      benefits: {
        eyebrow: 'De voordelen',
        title: 'Waarom een buitenlandse koper?',
        points: [
          'Kopers met eigen geld — geen wachten op een hypotheek of subsidie.',
          'Betaling ineens per bankoverschrijving — snel en veilig.',
          'Serieuze intentie: één bezichtiging kost hen twee dagen en € 200–300.',
          'Realistische prijsvorming — er wordt niet onredelijk onderhandeld.',
          'FODEL beoordeelt de koper persoonlijk voordat er een afspraak komt.',
        ],
      },
      personas: {
        eyebrow: 'De kopers',
        title: 'Wie koopt er via FODEL?',
        items: [
          {
            title: 'Gepensioneerden',
            body: 'Zoeken lagere vaste lasten, fiscale voordelen en betaalbare zorg in Hongarije.',
          },
          {
            title: 'Gezinnen',
            body: 'Zoeken ruimte, natuur en landelijk wonen. Vaak een boerderij, hoeve of vakantiehuis.',
          },
          {
            title: 'Investeerders',
            body: 'Zoeken bedrijfspanden, wijngaarden en landbouwgrond.',
          },
          {
            title: 'Lifestyle-emigranten',
            body: 'Ontvluchten hoge woonlasten en drukte, en zoeken een authentieke Europese leefstijl.',
          },
        ] as Persona[],
      },
      how: { eyebrow: 'Stap voor stap', title: 'Het model van FODEL' },
      commission: {
        eyebrow: 'Tarieven',
        title: 'Courtage alleen bij\neen geslaagde verkoop',
        body: 'Neemt de koper rechtstreeks contact met u op en heeft u onze hulp niet nodig, dan betaalt u niets bovenop de advertentiekosten. Bemiddelt FODEL wel: 4% netto (min. € 2.000) + 21% Nederlandse btw.',
        cta: 'Tarieven bekijken',
      },
    },

    buyers: {
      meta: {
        title: 'Voor kopers — Een woning kopen in Hongarije',
        description:
          'Zo koopt u veilig een woning in Hongarije: tweetalig contract, vertegenwoordiging met volmacht, inschrijving bij het kadaster. Plus een gratis zoekdienst.',
      },
      hero: {
        eyebrow: 'Voor kopers',
        title: 'Kopen in Hongarije,',
        titleEm: 'zonder verrassingen',
        body: 'Bij veel van ons aanbod staat de eigenaar er zelf bij. U onderhandelt rechtstreeks — of laat de volledige afwikkeling aan ons over.',
        cta: 'Woningen bekijken',
        secondary: 'Gratis zoekopdracht',
      },
      services: {
        eyebrow: 'Wat wij regelen',
        title: 'Volledige begeleiding',
        points: [
          'De communicatie tussen u en de verkoper, inclusief tolken.',
          'Bezichtigingen, met een Nederlands- of Duitssprekende collega erbij.',
          'Ondersteuning bij de prijsonderhandeling en het opstellen van het tweetalige contract.',
          'Vertegenwoordiging met volmacht — u hoeft niet naar Hongarije voor de ondertekening.',
          'Inschrijving bij het kadaster en het overzetten van de nutsvoorzieningen.',
        ],
      },
      reasons: {
        eyebrow: 'Waarom Hongarije',
        title: 'Wat West-Europese kopers zoeken',
      },
    },

    about: {
      meta: {
        title: 'Over ons — Een brug tussen twee werelden',
        description:
          'Sinds 2013 brengen wij Hongaarse verkopers en West-Europese kopers bij elkaar. Discreet, transparant en zonder exclusiviteitscontract.',
      },
      hero: {
        eyebrow: 'Over ons',
        title: 'Een brug tussen',
        titleEm: 'twee werelden',
        body: 'Sinds 2013 helpen wij Hongaarse verkopers de juiste buitenlandse koper te vinden — discreet, doeltreffend en zonder exclusiviteitscontract.',
      },
      origin: {
        eyebrow: 'Het begin — Almere-Buiten, 2013',
        quote:
          '“Wonend in Almere-Buiten zagen wij hoezeer Nederlanders verlangen naar een authentieke Europese leefstijl — terwijl in Hongarije het mooiste vastgoed onopgemerkt op een eigenaar wacht.”',
      },
      values: {
        eyebrow: 'Onze uitgangspunten',
        title: 'Waar wij op bouwen',
        items: [
          {
            num: '01',
            title: 'Discretie',
            body: 'Gegevens van verkopers en kopers behandelen wij met de grootst mogelijke zorg. Persoonsgegevens verschijnen uitsluitend met toestemming.',
          },
          {
            num: '02',
            title: 'Transparantie',
            body: 'Geen verborgen kosten. Onze tarieven en courtage staan openbaar op deze site, en wij informeren u bij elke stap.',
          },
          {
            num: '03',
            title: 'Tweetaligheid',
            body: 'Wij kennen beide markten van binnenuit. Onze medewerkers spreken Nederlands, Duits, Engels, Frans en Hongaars.',
          },
        ],
      },
      approach: {
        eyebrow: 'Onze aanpak',
        title: 'Wij zijn geen groot kantoor.',
        titleEm: 'Dat is onze kracht.',
        points: [
          'Iedere klant krijgt persoonlijk contact — geen callcenter, geen anoniem loket.',
          'Wij kennen beide culturen van binnenuit en beoordelen vastgoed met Nederlandse én Hongaarse ogen.',
          'Het samenbrengen van woning en koper is onze verantwoordelijkheid, geen kwestie van toeval.',
          'Wij werken zonder exclusiviteit, omdat wij liever met resultaat overtuigen.',
        ],
      },
      story: {
        eyebrow: foundedInLabel('nl'),
        title: 'De brug die wij',
        titleEm: 'hebben gebouwd',
        paragraphs: [
          'FODEL is opgericht door in Nederland wonende Hongaren. Wij begonnen in 2013 in Almere-Buiten, waar wij merkten hoeveel Nederlanders en Belgen een authentieke Hongaarse woning wilden kopen — maar niet wisten hoe ze moesten beginnen.',
          `Vandaag adverteren wij in ${REACH_COUNTRIES} landen en ${REACH_LANGUAGES} talen, en begeleiden wij elke transactie van begin tot eind: tweetalig koopcontract, vertegenwoordiging met volmacht en inschrijving bij het kadaster. Ons kantoor is gevestigd in Den Haag.`,
        ],
      },
    },

    contact: {
      meta: {
        title: 'Contact — Wij bellen u graag terug',
        description:
          `Bel ons op werkdagen tussen ${COMPANY.hours.weekdays.from} en ${COMPANY.hours.weekdays.to}, of vraag om teruggebeld te worden. Het gesprek kost u niets.`,
      },
      hero: { eyebrow: 'Contact', title: 'Wij bellen u', titleEm: 'graag terug' },
      formTitle: 'Vraag om teruggebeld te worden',
      subjects: [
        'Vraag over een woning',
        'Adverteren',
        'Tarieven opvragen',
        'Terugbelverzoek',
        'Anders',
      ],
      note: 'Terugbellen kost u niets — wij betalen het gesprek. Ook in het weekend bellen wij tot 21:00 uur.',
    },
  },
};

export function copy(locale: Locale) {
  return COPY[locale];
}
