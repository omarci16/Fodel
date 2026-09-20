/**
 * FODEL vocabulary.
 *
 * Nav labels, category names and taglines are FODEL's own words, taken
 * verbatim from their live sites per locale (scraped 27 July 2026) — we do not
 * re-translate terminology they already own. Page copy written for the new
 * site is marked `new:` in comments where it has no upstream source.
 */

export const LOCALES = ['hu', 'nl'] as const;
export type Locale = (typeof LOCALES)[number];

/** Every market FODEL sells in. de/en/fr have brand strings ready but no routes yet. */
export const PLANNED_LOCALES = ['hu', 'nl', 'de', 'en', 'fr'] as const;
export type PlannedLocale = (typeof PLANNED_LOCALES)[number];

export const LOCALE_META = {
  hu: { htmlLang: 'hu', ogLocale: 'hu_HU', hreflang: 'hu', label: 'Magyar', short: 'HU', flag: 'hu' },
  nl: { htmlLang: 'nl', ogLocale: 'nl_NL', hreflang: 'nl', label: 'Nederlands', short: 'NL', flag: 'nl' },
  de: { htmlLang: 'de', ogLocale: 'de_DE', hreflang: 'de', label: 'Deutsch', short: 'DE', flag: 'de' },
  en: { htmlLang: 'en', ogLocale: 'en_GB', hreflang: 'en', label: 'English', short: 'EN', flag: 'gb' },
  fr: { htmlLang: 'fr', ogLocale: 'fr_FR', hreflang: 'fr', label: 'Français', short: 'FR', flag: 'fr' },
  it: { htmlLang: 'it', ogLocale: 'it_IT', hreflang: 'it', label: 'Italiano', short: 'IT', flag: 'it' },
  es: { htmlLang: 'es', ogLocale: 'es_ES', hreflang: 'es', label: 'Español', short: 'ES', flag: 'es' },
} as const;

export type SwitcherLocale = keyof typeof LOCALE_META;

/**
 * What the nav's language menu offers, and how far each market actually goes.
 *
 *   full   — the whole site exists in this language (LOCALES)
 *   bridge — one self-contained page pointing into the Dutch site
 *            (src/pages/{de,en,fr}/index.astro — see LocaleBridgePage)
 *   soon   — announced, not built. Rendered disabled, with no href.
 *
 * This drives presentation only. It deliberately does NOT widen LOCALES:
 * ROUTES and UI are typed for hu/nl, and scripts/verify-ssg.mjs enforces
 * hreflang reciprocity — emitting an alternate for a language with no page
 * behind it fails the build, and rightly so. Base.astro's `alternates` prop is
 * still the only thing that produces an hreflang tag.
 */
export const SWITCHER_LOCALES = [
  { code: 'hu', status: 'full' },
  { code: 'nl', status: 'full' },
  { code: 'en', status: 'bridge' },
  { code: 'de', status: 'bridge' },
  { code: 'fr', status: 'bridge' },
  { code: 'it', status: 'soon' },
  { code: 'es', status: 'soon' },
] as const satisfies ReadonlyArray<{
  code: SwitcherLocale;
  status: 'full' | 'bridge' | 'soon';
}>;

/** Verbatim per market. These are the lines FODEL leads with today. */
export const BRAND = {
  hu: {
    name: 'FODEL INGATLAN',
    tagline: 'Magyar ingatlanok hirdetése Hollandiában és az Unió többi országában',
    positioning: 'FODEL Ingatlan – Holland-magyar ingatlanközvetítő iroda',
    signature: 'Problémamentes, diszkrét ingatlanközvetítés',
  },
  nl: {
    name: 'FODEL VASTGOED',
    tagline: 'Onroerend goed kopen direct van de eigenaar',
    positioning: 'FODEL Vastgoed – Makelaar in Hongarije',
    signature: 'Probleemloze, discrete vastgoedbemiddeling',
  },
  de: {
    name: 'FODEL IMMOBILIEN',
    tagline: 'Immobilien Angebote in Ungarn',
    positioning: 'FODEL Immobilien – Niederländische Agentur mit Immobilien Angeboten in Ungarn',
    signature: 'Problemlose, diskrete Immobilienvermittlung',
  },
  en: {
    name: 'FODEL REAL ESTATES',
    tagline: 'Find your dream house in Hungary!',
    positioning: 'FODEL Real Estates – Estate Agent in Hungary',
    signature: 'Property direct from the owner',
  },
  fr: {
    name: 'FODEL',
    tagline: 'Trouvez la maison de vos rêves en Hongrie!',
    positioning: 'FODEL – Agence Immobilière en Hongrie',
    signature: 'Une intermédiation immobilière discrète et sans souci',
  },
} as const;

/* ── Property categories ───────────────────────────────────────────────────
   Keys are stable slugs used in content files and URLs. Labels are FODEL's
   own category names in each market, taken from their live navigation.
   ------------------------------------------------------------------------ */

export const CATEGORY_FALLBACK = {
  house: {
    hu: { label: 'Eladó ház', slug: 'haz' },
    nl: { label: 'Huis', slug: 'huis' },
    de: { label: 'Haus' },
    en: { label: 'House' },
    fr: { label: 'Maison' },
    schema: 'SingleFamilyResidence',
  },
  holiday: {
    hu: { label: 'Eladó nyaraló', slug: 'nyaralo' },
    nl: { label: 'Vakantiehuis', slug: 'vakantiehuis' },
    de: { label: 'Ferienhaus' },
    en: { label: 'Vacation house' },
    fr: { label: 'Maison de vacances' },
    schema: 'House',
  },
  farm: {
    hu: { label: 'Eladó tanya', slug: 'tanya' },
    nl: { label: 'Boerderij', slug: 'boerderij' },
    de: { label: 'Bauernhof' },
    en: { label: 'Farm' },
    fr: { label: 'Ferme' },
    schema: 'House',
  },
  land: {
    hu: { label: 'Eladó telek', slug: 'telek' },
    nl: { label: 'Perceel', slug: 'perceel' },
    de: { label: 'Grundstück' },
    en: { label: 'Land' },
    fr: { label: 'Terrain' },
    schema: 'LandForm',
  },
  commercial: {
    hu: { label: 'Üzleti ingatlan', slug: 'uzleti-ingatlan' },
    nl: { label: 'Bedrijfsaanbod', slug: 'bedrijfsaanbod' },
    de: { label: 'Geschäftsimmobilie' },
    en: { label: 'Commercial property' },
    fr: { label: 'Immobilier commercial' },
    schema: 'Place',
  },
  agricultural: {
    hu: { label: 'Agráringatlan', slug: 'agraringatlan' },
    nl: { label: 'Agrarisch onroerend goed', slug: 'agrarisch-onroerend-goed' },
    de: { label: 'Agrarimmobilie' },
    en: { label: 'Agricultural property' },
    fr: { label: 'Immobilier agricole' },
    schema: 'Place',
  },
  mansion: {
    hu: { label: 'Kúria, kastély', slug: 'kuria-kastely' },
    nl: { label: 'Landhuis, herenhuis', slug: 'landhuis' },
    de: { label: 'Landhaus, Herrenhaus' },
    en: { label: 'Country house, mansion' },
    fr: { label: 'Maison de campagne, manoir' },
    schema: 'House',
  },
  apartment: {
    hu: { label: 'Eladó lakás', slug: 'lakas' },
    nl: { label: 'Appartement', slug: 'appartement' },
    de: { label: 'Wohnung' },
    en: { label: 'Flat' },
    fr: { label: 'Appartement' },
    schema: 'Apartment',
  },
  industrial: {
    hu: { label: 'Ipari ingatlan', slug: 'ipari-ingatlan' },
    nl: { label: 'Bedrijfspand', slug: 'bedrijfspand' },
    de: { label: 'Industrieimmobilie' },
    en: { label: 'Industrial property' },
    fr: { label: 'Immobilier industriel' },
    schema: 'Place',
  },
} as const;

/* ── Route slugs ──────────────────────────────────────────────────────────
   Localised per market so each language ranks on its own keywords.
   ------------------------------------------------------------------------ */

export const ROUTES = {
  hu: {
    home: '',
    properties: 'ingatlanok',
    sellers: 'eladoknak',
    buyers: 'vevoknek',
    about: 'rolunk',
    contact: 'kapcsolat',
    blog: 'blog',
    priceList: 'arlista',
    submitAd: 'hirdetes-feladasa',
    searchRequest: 'kerestetes',
    valuation: 'ertekbecsles',
    services: 'szolgaltatasok',
    agricultural: 'agraringatlan',
    faq: 'gyik',
    photoGuide: 'fotozasi-utmutato',
    buyingGuide: 'vasarlas-magyarorszagon',
    emigration: 'holland-koltozes',
    sold: 'eladva',
    map: 'terkep',
    top10: 'top-10',
    privacy: 'adatvedelem',
    terms: 'aszf',
    cookies: 'cookie-tajekoztato',
    imprint: 'impresszum',
    accessibility: 'akadalymentesites',
    /** Detail pattern mirrors fodel.nl's own `woonhuis-te-koop-1550`. */
    detail: (categorySlug: string, ref: string) => `${categorySlug}-elado-${ref}`,
  },
  nl: {
    home: '',
    properties: 'woningen',
    sellers: 'adverteren',
    buyers: 'kopers',
    about: 'over-ons',
    contact: 'contact',
    blog: 'nieuws',
    priceList: 'tarieven',
    submitAd: 'advertentie-plaatsen',
    searchRequest: 'zoekdienst',
    valuation: 'waardebepaling',
    services: 'diensten',
    agricultural: 'agrarisch-vastgoed',
    faq: 'veelgestelde-vragen',
    photoGuide: 'fotografiegids',
    buyingGuide: 'kopen-in-hongarije',
    emigration: 'emigreren',
    sold: 'verkocht',
    map: 'kaart',
    top10: 'top-10',
    privacy: 'privacy',
    terms: 'voorwaarden',
    cookies: 'cookies',
    imprint: 'colofon',
    accessibility: 'toegankelijkheid',
    detail: (categorySlug: string, ref: string) => `${categorySlug}-te-koop-${ref}`,
  },
} as const;

export type RouteKey = Exclude<keyof (typeof ROUTES)['hu'], 'detail'>;

/* ── UI strings ───────────────────────────────────────────────────────── */

export const UI = {
  hu: {
    skipToContent: 'Ugrás a tartalomra',
    menu: 'Menü',
    close: 'Bezárás',
    language: 'Nyelv',
    comingSoon: 'Hamarosan',

    nav: {
      home: 'Kezdőlap',
      properties: 'Ingatlanok',
      sellers: 'Eladóknak',
      buyers: 'Vevőknek',
      about: 'Rólunk',
      blog: 'Blog',
      contact: 'Kapcsolat',
    },

    cta: {
      contact: 'Kapcsolat',
      login: 'Bejelentkezés',
      callback: 'Ingyenes visszahívás',
      allProperties: 'Összes ingatlan',
      viewProperty: 'Megtekintés',
      learnMore: 'Tudjon meg többet',
      browseProperties: 'Ingatlanok böngészése',
      advertise: 'Hirdessen nálunk',
      priceList: 'Árlista megtekintése',
      submitAd: 'Hirdetés feladása',
      searchRequest: 'Ingyenes kerestetés',
      freeConsult: 'Ingyenes konzultáció',
      send: 'Üzenet küldése',
      readMore: 'Tovább olvasom',
      getInTouch: 'Vegye fel velünk a kapcsolatot',
    },

    property: {
      reference: 'Azonosító',
      price: 'Irányár',
      beds: 'Szobák',
      baths: 'Fürdők',
      area: 'Alapterület',
      land: 'Telek',
      epc: 'Energetikai besorolás',
      epcMissing: 'Folyamatban',
      yearBuilt: 'Építés éve',
      condition: 'Állapot',
      heating: 'Fűtés',
      features: 'Jellemzők',
      description: 'Leírás',
      location: 'Elhelyezkedés',
      similar: 'Hasonló ingatlanok',
      similarInRegion: 'A régióban',
      gallery: 'Galéria',
      video: 'Videó',
      prevImage: 'Előző kép',
      nextImage: 'Következő kép',
      sold: 'Eladva',
      reserved: 'Foglalt',
      ownerContact: 'A tulajdonos elérhetősége',
      ownerContactNote:
        'Ennél az ingatlannál a tulajdonos neve és elérhetősége is megjelenik — közvetlenül felveheti vele a kapcsolatot, jutalék nélkül.',
      enquire: 'Érdeklődjön',
      enquireTitle: 'Kérek tájékoztatást erről az ingatlanról',
      priceOnRequest: 'Ár egyeztetés alapján',
    },

    filters: {
      title: 'Ingatlanok szűrése',
      /** Bold intro line above the homepage search card, separate from it. */
      heroHeading: 'Találja meg álmai ingatlanát',
      type: 'Típus',
      region: 'Régió',
      price: 'Ár',
      area: 'Alapterület',
      land: 'Telek',
      beds: 'Szobák',
      all: 'Mind',
      any: 'Mindegy',
      sort: 'Rendezés',
      sortFeatured: 'Kiemeltek elöl',
      sortPriceAsc: 'Ár szerint növekvő',
      sortPriceDesc: 'Ár szerint csökkenő',
      sortAreaDesc: 'Alapterület szerint',
      search: 'Keresés',
      reset: 'Szűrők törlése',
      results: (n: number) => (n === 1 ? '1 ingatlan' : `${n} ingatlan`),
      noResults: 'Nincs a szűrésnek megfelelő ingatlan.',
      noResultsHint: 'Próbálja tágabb feltételekkel, vagy kérjen ingyenes kerestetést.',
      county: 'Megye',
      country: 'Ország',
      settlement: 'Település',
      areaFrom: 'Alapterület ettől',
      areaTo: 'Alapterület eddig',
      landFrom: 'Telek ettől',
      landTo: 'Telek eddig',
      entireCountry: 'Egész ország',
      bargain: 'Alkalmi vételek',
      viewMap: 'Megtekintés térképen',
      viewList: 'Vissza a listához',
      /** Shown on the map page when a bounding box came from "search this area". */
      areaFiltered: 'A térkép kijelölt területére szűrve',
    },

    form: {
      name: 'Név',
      email: 'E-mail cím',
      phone: 'Telefon',
      subject: 'Tárgy',
      message: 'Üzenet',
      messagePlaceholder: 'Írja le kérdését vagy igényét…',
      required: 'kötelező',
      optional: 'nem kötelező',
      consent:
        'Hozzájárulok, hogy a FODEL a megadott adataimat a megkeresésem megválaszolása céljából kezelje.',
      consentLink: 'Adatvédelmi tájékoztató',
      submit: 'Üzenet küldése',
      sending: 'Küldés…',
      successTitle: 'Köszönjük!',
      successBody:
        'Üzenetét megkaptuk. Munkatársunk munkanapokon 09:00 és 18:00 között veszi fel Önnel a kapcsolatot.',
      errorTitle: 'Nem sikerült elküldeni',
      errorBody: 'Kérjük próbálja újra, vagy hívjon minket a +36 70 225 5255 számon.',
      errorRequired: 'Kérjük töltse ki ezt a mezőt.',
      errorEmail: 'Kérjük adjon meg érvényes e-mail címet.',
      errorConsent: 'A folytatáshoz kérjük fogadja el az adatkezelési tájékoztatót.',
    },

    footer: {
      navigation: 'Navigáció',
      categories: 'Kategóriák',
      contact: 'Elérhetőség',
      legal: 'Jogi információk',
      companyDetails: 'Cégadatok',
      hours: 'Nyitvatartás',
      callbackNote: 'A visszahívást mi fizetjük — Önnek semmibe nem kerül.',
      /** Portal entry point. Until 1.1 nothing on the public site linked to
       *  /portal at all, so an owner could not find their own login page. */
      portalLogin: 'Hirdetői belépés',
    },

    a11y: {
      breadcrumb: 'Morzsamenü',
      mainNav: 'Fő navigáció',
      langSwitch: 'Nyelvváltás',
      imageOf: (n: number, total: number) => `${n}. kép a(z) ${total}-ból`,
    },
  },

  nl: {
    skipToContent: 'Naar de inhoud',
    menu: 'Menu',
    close: 'Sluiten',
    language: 'Taal',
    comingSoon: 'Binnenkort',

    nav: {
      home: 'Home',
      properties: 'Vastgoed',
      sellers: 'Adverteren',
      buyers: 'Voor kopers',
      about: 'Over ons',
      blog: 'Nieuws',
      contact: 'Contact',
    },

    cta: {
      contact: 'Contact',
      login: 'Inloggen',
      callback: 'Gratis teruggebeld worden',
      allProperties: 'Alle woningen',
      viewProperty: 'Bekijken',
      learnMore: 'Meer informatie',
      browseProperties: 'Woningen bekijken',
      advertise: 'Adverteer bij ons',
      priceList: 'Tarieven bekijken',
      submitAd: 'Advertentie plaatsen',
      searchRequest: 'Gratis zoekopdracht',
      freeConsult: 'Gratis advies',
      send: 'Bericht versturen',
      readMore: 'Verder lezen',
      getInTouch: 'Neem contact met ons op',
    },

    property: {
      reference: 'Referentie',
      price: 'Vraagprijs',
      beds: 'Slaapkamers',
      baths: 'Badkamers',
      area: 'Woonoppervlak',
      land: 'Perceel',
      epc: 'Energielabel',
      epcMissing: 'In aanvraag',
      yearBuilt: 'Bouwjaar',
      condition: 'Staat',
      heating: 'Verwarming',
      features: 'Kenmerken',
      description: 'Omschrijving',
      location: 'Ligging',
      similar: 'Vergelijkbaar aanbod',
      similarInRegion: 'In de regio',
      gallery: 'Galerij',
      video: 'Video',
      prevImage: 'Vorige foto',
      nextImage: 'Volgende foto',
      sold: 'Verkocht',
      reserved: 'Onder optie',
      ownerContact: 'Contact met de eigenaar',
      ownerContactNote:
        'Bij deze woning tonen wij ook de naam en het telefoonnummer van de eigenaar — u kunt rechtstreeks contact opnemen, zonder courtage.',
      enquire: 'Interesse?',
      enquireTitle: 'Ik wil informatie over deze woning',
      priceOnRequest: 'Prijs op aanvraag',
    },

    filters: {
      title: 'Gefilterde zoekopdracht',
      /** Bold intro line above the homepage search card, separate from it. */
      heroHeading: 'Vind uw droomwoning',
      type: 'Type',
      region: 'Regio',
      price: 'Prijs',
      area: 'Woonoppervlak',
      land: 'Perceel',
      beds: 'Slaapkamers',
      all: 'Alle',
      any: 'Maakt niet uit',
      sort: 'Sorteren',
      sortFeatured: 'Aanbevolen eerst',
      sortPriceAsc: 'Prijs oplopend',
      sortPriceDesc: 'Prijs aflopend',
      sortAreaDesc: 'Oppervlakte',
      search: 'Zoeken',
      reset: 'Filters wissen',
      results: (n: number) => (n === 1 ? '1 woning' : `${n} woningen`),
      noResults: 'Geen woningen gevonden met deze filters.',
      noResultsHint: 'Probeer ruimere criteria, of plaats een gratis zoekopdracht.',
      county: 'Provincie',
      country: 'Land',
      settlement: 'Plaats',
      areaFrom: 'Woonoppervlak vanaf',
      areaTo: 'Woonoppervlak tot',
      landFrom: 'Perceel vanaf',
      landTo: 'Perceel tot',
      entireCountry: 'Heel Hongarije',
      bargain: 'Buitenkansen',
      viewMap: 'Op de kaart bekijken',
      viewList: 'Terug naar de lijst',
      areaFiltered: 'Gefilterd op het gekozen kaartgebied',
    },

    form: {
      name: 'Naam',
      email: 'E-mailadres',
      phone: 'Telefoon',
      subject: 'Onderwerp',
      message: 'Bericht',
      messagePlaceholder: 'Beschrijf uw vraag of wens…',
      required: 'verplicht',
      optional: 'optioneel',
      consent:
        'Ik ga ermee akkoord dat FODEL mijn gegevens gebruikt om mijn vraag te beantwoorden.',
      consentLink: 'Privacyverklaring',
      submit: 'Bericht versturen',
      sending: 'Versturen…',
      successTitle: 'Dank u wel!',
      successBody:
        'Wij hebben uw bericht ontvangen. Op werkdagen tussen 09:00 en 18:00 nemen wij contact met u op.',
      errorTitle: 'Versturen mislukt',
      errorBody: 'Probeer het opnieuw, of bel ons op +31 6 4400 5550.',
      errorRequired: 'Vul dit veld in.',
      errorEmail: 'Vul een geldig e-mailadres in.',
      errorConsent: 'Ga akkoord met de privacyverklaring om verder te gaan.',
    },

    footer: {
      navigation: 'Navigatie',
      categories: 'Categorieën',
      contact: 'Contact',
      legal: 'Juridisch',
      companyDetails: 'Bedrijfsgegevens',
      hours: 'Openingstijden',
      callbackNote: 'Wij bellen u terug — dat kost u niets.',
      portalLogin: 'Inloggen voor adverteerders',
    },

    a11y: {
      breadcrumb: 'Kruimelpad',
      mainNav: 'Hoofdnavigatie',
      langSwitch: 'Taal wijzigen',
      imageOf: (n: number, total: number) => `Foto ${n} van ${total}`,
    },
  },
} as const;

/* ── Helpers ──────────────────────────────────────────────────────────── */

export function t(locale: Locale) {
  return UI[locale];
}

/** Build an absolute, locale-prefixed path. `path('hu', 'properties')` → `/hu/ingatlanok/` */
export function path(locale: Locale, key: RouteKey, ...rest: string[]): string {
  const slug = ROUTES[locale][key];
  const segments = [locale, slug, ...rest].filter(Boolean);
  return `/${segments.join('/')}/`.replace(/\/{2,}/g, '/');
}

/** Detail URL for a property, in FODEL's existing `type-te-koop-ref` shape. */
export function propertyPath(locale: Locale, categorySlug: string, ref: string): string {
  return `/${locale}/${ROUTES[locale].detail(categorySlug, ref)}/`;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
