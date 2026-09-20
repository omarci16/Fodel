/**
 * Legal pages.
 *
 * ⚠️ THESE ARE DRAFTS. FODEL already publish an ÁSZF and an adatvédelmi
 * tájékoztató as PDFs on fodel.hu/dokumentumok. Before launch these pages must
 * be reconciled against those documents and reviewed by counsel — nothing here
 * is legal advice, and the site should not go live on my wording alone.
 *
 * What is factual (address, VAT, commission terms, hours, banks) comes from
 * src/config/company.ts and is FODEL's own published data.
 */

import type { ContentPageData } from '~/lib/content-sections';
import type { Locale } from '~/i18n/ui';
import { COMPANY, COMMISSION } from '~/config/company';

const UPDATED = { hu: '2026. július 27.', nl: '27 juli 2026' };

const kvk = COMPANY.registration.kvk ?? '—';

export const LEGAL: Record<Locale, Record<string, ContentPageData>> = {
  hu: {
    imprint: {
      metaTitle: 'Impresszum — Cégadatok',
      metaDescription: `${COMPANY.names.legal} cégadatai: székhely, adószám, kamarai nyilvántartási szám és elérhetőségek.`,
      eyebrow: 'Impresszum',
      title: 'Cégadatok',
      updated: UPDATED.hu,
      sections: [
        {
          type: 'table',
          title: 'A szolgáltató adatai',
          rows: [
            ['Cégnév', COMPANY.names.legal],
            ['Székhely', COMPANY.address.oneLine],
            ['Holland adószám (BTW)', COMPANY.registration.vat],
            ['Kamarai nyilvántartási szám (KvK)', kvk],
            ['Képviselő', COMPANY.principal],
            ['E-mail', COMPANY.email.primary],
            ['Telefon', COMPANY.phones.slice(0, 2).map((p) => p.display).join(' · ')],
            ['Alapítás éve', String(COMPANY.founded)],
          ],
        },
        {
          type: 'table',
          title: 'Bankszámlaszámok',
          rows: [
            ['Hollandia', `${COMPANY.banks.nl.iban} (${COMPANY.banks.nl.bic})`],
            ['Magyarország', COMPANY.banks.hu.account],
          ],
        },
        {
          type: 'prose',
          title: 'Tárhelyszolgáltató',
          paragraphs: [
            'A weboldal statikus oldalakként kerül kiszolgálásra. A tárhelyszolgáltató adatai a szolgáltatóváltáskor frissülnek — kérdés esetén forduljon hozzánk az info@fodel.nl címen.',
          ],
        },
        {
          type: 'callout',
          title: 'Vitarendezés',
          body: 'Fogyasztói jogvita esetén az Európai Bizottság online vitarendezési platformja is igénybe vehető: ec.europa.eu/consumers/odr',
        },
      ],
    },

    privacy: {
      metaTitle: 'Adatvédelmi tájékoztató',
      metaDescription:
        'Hogyan kezeli a FODEL a személyes adatait: milyen adatokat gyűjtünk, mennyi ideig őrizzük, és milyen jogai vannak a GDPR alapján.',
      eyebrow: 'Adatvédelem',
      title: 'Adatvédelmi',
      titleEm: 'tájékoztató',
      intro:
        'Ez a tájékoztató azt írja le, hogyan kezeljük a weboldalon megadott személyes adatokat, az EU általános adatvédelmi rendelete (GDPR) szerint.',
      updated: UPDATED.hu,
      sections: [
        {
          type: 'table',
          title: 'Adatkezelő',
          rows: [
            ['Adatkezelő', COMPANY.names.legal],
            ['Székhely', COMPANY.address.oneLine],
            ['E-mail', COMPANY.email.primary],
          ],
        },
        {
          type: 'list',
          title: 'Milyen adatokat kezelünk?',
          intro: 'Kizárólag azokat az adatokat, amelyeket Ön az űrlapjainkon önként megad:',
          items: [
            'Név, e-mail cím és telefonszám — hogy válaszolni tudjunk a megkeresésére',
            'A megkeresés tárgya és üzenete',
            'Hirdetésfeladás esetén az ingatlan adatai és a számlázási adatok',
            'Kerestetés esetén a keresési feltételei',
            'Belső nyilvántartás céljából: mikor és milyen űrlapot töltött ki, mikor jelentkezett be a portálra — nyers IP-cím rögzítése nélkül',
          ],
        },
        {
          type: 'table',
          title: 'Az adatkezelés jogalapja és időtartama',
          rows: [
            ['Kapcsolatfelvétel, visszahívás', 'Hozzájárulás (GDPR 6. cikk (1) a) — 12 hónapig'],
            ['Hirdetésfeladás', 'Szerződés teljesítése (6. cikk (1) b) — a számviteli előírások szerint 8 évig'],
            ['Kerestetés', 'Hozzájárulás — a keresés lezárásáig, legfeljebb 24 hónapig'],
            ['Belső aktivitási napló', 'Jogos érdek (6. cikk (1) f) — a nyilvántartás rendezettsége és a visszaélések felderítése — legfeljebb 24 hónapig'],
          ],
        },
        {
          type: 'list',
          title: 'Kinek továbbítjuk?',
          intro:
            'Személyes adatait nem adjuk el és nem adjuk át harmadik félnek marketing célból. Adatfeldolgozóink:',
          items: [
            'A levelezést kiszolgáló e-mail szolgáltatónk (EU-n belüli adatkezeléssel)',
            'A weboldal tárhelyszolgáltatója',
            'Ingatlan adásvétele esetén — kizárólag az Ön kifejezett kérésére — a másik fél, illetve az eljáró ügyvéd',
          ],
        },
        {
          type: 'callout',
          title: 'Az ingatlanhirdetésekről',
          body: 'Ha Ön hirdetőként hozzájárul, a hirdetésben megjelenítjük a nevét és telefonszámát, hogy a külföldi érdeklődő közvetlenül felvehesse Önnel a kapcsolatot. Ez a hozzájárulás bármikor visszavonható, ilyenkor az adatokat eltávolítjuk a hirdetésből.',
        },
        {
          type: 'list',
          title: 'Az Ön jogai',
          items: [
            'Tájékoztatás kérése a kezelt adatokról',
            'Helyesbítés és törlés kérése',
            'Az adatkezelés korlátozása, illetve tiltakozás az adatkezelés ellen',
            'Adathordozhatóság',
            'A hozzájárulás visszavonása bármikor, a korábbi adatkezelés jogszerűségének érintése nélkül',
            'Panasz benyújtása a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH), illetve a holland Autoriteit Persoonsgegevens hatósághoz',
          ],
        },
        {
          type: 'prose',
          title: 'Kapcsolat adatvédelmi ügyekben',
          paragraphs: [
            `Adatvédelmi kérdéseit és kéréseit az ${COMPANY.email.primary} címre küldheti. Kérésére legfeljebb 30 napon belül válaszolunk.`,
          ],
        },
      ],
    },

    cookies: {
      metaTitle: 'Cookie-tájékoztató',
      metaDescription:
        'Milyen sütiket használ a fodel.nl, és hogyan módosíthatja a hozzájárulását.',
      eyebrow: 'Sütik',
      title: 'Cookie-',
      titleEm: 'tájékoztató',
      updated: UPDATED.hu,
      sections: [
        {
          type: 'prose',
          paragraphs: [
            'Ez a weboldal jelenleg kizárólag a működéshez feltétlenül szükséges technikai tárolást használja. Nem futtatunk hirdetési vagy nyomkövető szkriptet, és nem osztunk meg adatot közösségi platformokkal.',
          ],
        },
        {
          type: 'table',
          title: 'Amit tárolunk',
          rows: [
            [
              'fodel:consent',
              'A sütikre vonatkozó döntése (elfogadás vagy elutasítás). A böngészőjében tárolódik, nem kerül hozzánk. Élettartam: 12 hónap.',
            ],
          ],
        },
        {
          type: 'prose',
          title: 'Statisztikai mérés',
          paragraphs: [
            'Amennyiben a jövőben látogatottsági statisztikát vezetünk be, azt kizárólag az Ön előzetes, kifejezett hozzájárulásával aktiváljuk. A hozzájárulás megtagadása semmilyen módon nem korlátozza az oldal használatát.',
          ],
        },
        {
          type: 'prose',
          title: 'Hozzájárulás módosítása',
          paragraphs: [
            'Döntését bármikor megváltoztathatja a böngészője tárolt adatainak törlésével, ezt követően a sütisáv újra megjelenik.',
          ],
        },
      ],
    },

    terms: {
      metaTitle: 'Általános Szerződési Feltételek',
      metaDescription:
        'A FODEL hirdetési és közvetítői szolgáltatásának feltételei: díjak, jutalék, felmondás és felelősség.',
      eyebrow: 'ÁSZF',
      title: 'Általános Szerződési',
      titleEm: 'Feltételek',
      updated: UPDATED.hu,
      sections: [
        {
          type: 'callout',
          title: 'Figyelem',
          body: 'Ez az oldal a weboldalon elérhető összefoglaló. A teljes, hatályos ÁSZF a Dokumentumok oldalon letölthető PDF formájában; eltérés esetén a PDF-ben foglaltak az irányadók.',
        },
        {
          type: 'prose',
          title: '1. A szolgáltatás tárgya',
          paragraphs: [
            'A FODEL magyarországi ingatlanok hirdetését végzi saját, többnyelvű weboldalain, valamint — külön megállapodás alapján — közreműködik az adásvétel lebonyolításában.',
            'A hirdetési szolgáltatás nem jár kizárólagossággal: az Eladó az ingatlant bármely más csatornán is hirdetheti és értékesítheti.',
          ],
        },
        {
          type: 'list',
          title: '2. A hirdetés megrendelése',
          ordered: true,
          items: [
            'Az Eladó kitölti a hirdetésfeladási űrlapot.',
            'A FODEL díjbekérőt küld a választott csomagról.',
            'Az Eladó banki átutalással teljesíti a díjat.',
            'Az átutalás beérkezése után az Eladó képfeltöltési jogosultságot kap.',
            'A FODEL elkészíti a fordítást és közzéteszi a hirdetést.',
          ],
        },
        {
          type: 'table',
          title: '3. Díjak',
          intro: 'Minden ár tartalmazza a 21%-os holland áfát. A részletes árlista az Árlista oldalon található.',
          rows: [
            ['Olcsó hirdetés (6 hónap)', '69 €'],
            ['Normál hirdetés (12 hónap)', '129 € / 179 €'],
            ['Fordítás', '25 € / nyelv'],
            ['Kiemelés', '15–25 € / hó (min. 3 hónap)'],
          ],
        },
        {
          type: 'prose',
          title: '4. Közvetítői jutalék',
          paragraphs: [
            `Jutalék kizárólag akkor illeti meg a FODEL-t, ha együttesen teljesül: írásos adásvételi szerződés jött létre, a vevőt a FODEL közvetítette, és a foglaló megfizetésre került.`,
            `A jutalék mértéke ${COMMISSION.percent}% nettó, de legalább ${COMMISSION.minimumEur} €, amelyre ${COMMISSION.vatPercent}% holland áfa kerül felszámításra.`,
            'Amennyiben az érdeklődő közvetlenül az Eladónál jelentkezik és nem kell segítenünk az adásvétel ügymenetét, a hirdetés árán felül semmilyen más díjat nem kell megfizetni.',
          ],
        },
        {
          type: 'prose',
          title: '5. A hirdetés visszavonása',
          paragraphs: [
            'Az Eladó a hirdetést a lejárat előtt bármikor visszavonhatja. A már megfizetett hirdetési díj ilyen esetben nem kerül visszatérítésre.',
          ],
        },
        {
          type: 'prose',
          title: '6. Felelősség',
          paragraphs: [
            'Az ingatlanra vonatkozó adatok valóságtartalmáért az Eladó felel. A FODEL a hirdetésben közölt adatokat az Eladótól kapott formában jeleníti meg, és nem vállal felelősséget azok pontosságáért.',
            'A weboldalon megjelenő fordítások tájékoztató jellegűek; jogvita esetén a magyar nyelvű változat az irányadó.',
          ],
        },
        {
          type: 'prose',
          title: '7. Elállási jog',
          paragraphs: [
            'A fogyasztónak minősülő Eladót a távollévők között kötött szerződésekre vonatkozó uniós szabályok szerinti elállási jog illeti meg. Ha az Eladó kifejezetten kéri a szolgáltatás azonnali megkezdését, az elállási jog a szolgáltatás teljesítésének megkezdésével arányosan csökken.',
          ],
        },
      ],
    },

    accessibility: {
      metaTitle: 'Akadálymentesítési nyilatkozat',
      metaDescription:
        'A fodel.nl akadálymentességi szintje, a vállalt szabvány és a visszajelzés módja.',
      eyebrow: 'Akadálymentesítés',
      title: 'Akadálymentesítési',
      titleEm: 'nyilatkozat',
      updated: UPDATED.hu,
      sections: [
        {
          type: 'prose',
          paragraphs: [
            'Célunk, hogy a weboldal mindenki számára használható legyen — beleértve a képernyőolvasót, billentyűzetes navigációt vagy nagyítást használó látogatókat is.',
            'A weboldalt a WCAG 2.2 AA szintjének megfelelően fejlesztjük. Ügyfeleink jelentős része nyugdíjas korú, ezért a szövegméretet, a kontrasztarányt és a billentyűzetes használhatóságot kiemelt szempontként kezeljük.',
          ],
        },
        {
          type: 'list',
          title: 'Amit megvalósítottunk',
          items: [
            'Minden szöveg legalább 4,5:1 kontrasztarányú a háttérrel szemben',
            'Teljes billentyűzetes használhatóság, látható fókuszjelöléssel',
            'Ugrás a tartalomra hivatkozás minden oldal elején',
            'Minden képhez érdemi alternatív szöveg tartozik',
            'Az űrlapmezők címkézettek, a hibaüzenetek szövegesen is megjelennek',
            'A mozgás csökkentését kérő rendszerbeállítást tiszteletben tartjuk',
            'Az oldal JavaScript nélkül is olvasható és használható',
          ],
        },
        {
          type: 'prose',
          title: 'Ismert korlátok',
          paragraphs: [
            'A külső szolgáltatók (például térképszolgáltató) tartalmának akadálymentességére nincs ráhatásunk.',
          ],
        },
        {
          type: 'prose',
          title: 'Visszajelzés',
          paragraphs: [
            `Ha akadályba ütközött az oldal használata során, kérjük jelezze az ${COMPANY.email.primary} címen vagy telefonon. Igyekszünk a bejelentést mielőbb orvosolni.`,
          ],
        },
      ],
    },
  },

  nl: {
    imprint: {
      metaTitle: 'Colofon — Bedrijfsgegevens',
      metaDescription: `Bedrijfsgegevens van ${COMPANY.names.legal}: vestigingsadres, btw-nummer, KvK-nummer en contactgegevens.`,
      eyebrow: 'Colofon',
      title: 'Bedrijfsgegevens',
      updated: UPDATED.nl,
      sections: [
        {
          type: 'table',
          title: 'Gegevens van de dienstverlener',
          rows: [
            ['Bedrijfsnaam', COMPANY.names.legal],
            ['Vestigingsadres', COMPANY.address.oneLine],
            ['Btw-nummer', COMPANY.registration.vat],
            ['KvK-nummer', kvk],
            ['Vertegenwoordiger', COMPANY.principal],
            ['E-mail', COMPANY.email.primary],
            ['Telefoon', COMPANY.phones.slice(0, 2).map((p) => p.display).join(' · ')],
            ['Opgericht', String(COMPANY.founded)],
          ],
        },
        {
          type: 'table',
          title: 'Bankrekeningen',
          rows: [
            ['Nederland', `${COMPANY.banks.nl.iban} (${COMPANY.banks.nl.bic})`],
            ['Hongarije', COMPANY.banks.hu.account],
          ],
        },
        {
          type: 'callout',
          title: 'Geschillen',
          body: 'Bij een consumentengeschil kunt u ook gebruikmaken van het Europese ODR-platform: ec.europa.eu/consumers/odr',
        },
      ],
    },

    privacy: {
      metaTitle: 'Privacyverklaring',
      metaDescription:
        'Hoe FODEL omgaat met uw persoonsgegevens: welke gegevens wij verwerken, hoe lang wij ze bewaren en welke rechten u heeft onder de AVG.',
      eyebrow: 'Privacy',
      title: 'Privacy',
      titleEm: 'verklaring',
      intro:
        'Deze verklaring beschrijft hoe wij omgaan met de persoonsgegevens die u via deze website aan ons verstrekt, conform de AVG (GDPR).',
      updated: UPDATED.nl,
      sections: [
        {
          type: 'table',
          title: 'Verwerkingsverantwoordelijke',
          rows: [
            ['Verantwoordelijke', COMPANY.names.legal],
            ['Adres', COMPANY.address.oneLine],
            ['E-mail', COMPANY.email.primary],
          ],
        },
        {
          type: 'list',
          title: 'Welke gegevens verwerken wij?',
          intro: 'Uitsluitend de gegevens die u zelf via onze formulieren invult:',
          items: [
            'Naam, e-mailadres en telefoonnummer — om uw vraag te kunnen beantwoorden',
            'Het onderwerp en de inhoud van uw bericht',
            'Bij een advertentie: de gegevens van de woning en uw factuurgegevens',
            'Bij een zoekopdracht: uw zoekcriteria',
            'Voor interne administratie: wanneer en welk formulier u invulde, wanneer u inlogde op het portaal — zonder een IP-adres op te slaan',
          ],
        },
        {
          type: 'table',
          title: 'Grondslag en bewaartermijn',
          rows: [
            ['Contact en terugbelverzoek', 'Toestemming (art. 6 lid 1 a AVG) — 12 maanden'],
            ['Advertentieopdracht', 'Uitvoering overeenkomst (art. 6 lid 1 b) — 7 jaar, fiscale bewaarplicht'],
            ['Zoekopdracht', 'Toestemming — tot afronding, maximaal 24 maanden'],
            ['Interne activiteitenlog', 'Gerechtvaardigd belang (art. 6 lid 1 f) — ordelijke administratie en misbruikdetectie — maximaal 24 maanden'],
          ],
        },
        {
          type: 'list',
          title: 'Met wie delen wij gegevens?',
          intro:
            'Wij verkopen uw gegevens niet en delen ze niet voor marketingdoeleinden. Onze verwerkers zijn:',
          items: [
            'Onze e-mailprovider, met verwerking binnen de EU',
            'De hostingpartij van deze website',
            'Bij een aankoop en uitsluitend op uw verzoek: de wederpartij en de betrokken advocaat',
          ],
        },
        {
          type: 'callout',
          title: 'Over de advertenties',
          body: 'Als adverteerder kunt u ons toestemming geven om uw naam en telefoonnummer bij de advertentie te tonen, zodat geïnteresseerden u rechtstreeks kunnen benaderen. U kunt die toestemming altijd intrekken; wij verwijderen de gegevens dan uit de advertentie.',
        },
        {
          type: 'list',
          title: 'Uw rechten',
          items: [
            'Inzage in de gegevens die wij van u verwerken',
            'Rectificatie en verwijdering',
            'Beperking van of bezwaar tegen de verwerking',
            'Overdraagbaarheid van gegevens',
            'Het intrekken van uw toestemming, op elk moment',
            'Een klacht indienen bij de Autoriteit Persoonsgegevens',
          ],
        },
        {
          type: 'prose',
          title: 'Contact over privacy',
          paragraphs: [
            `Vragen of verzoeken kunt u sturen naar ${COMPANY.email.primary}. Wij reageren uiterlijk binnen 30 dagen.`,
          ],
        },
      ],
    },

    cookies: {
      metaTitle: 'Cookieverklaring',
      metaDescription: 'Welke cookies fodel.nl gebruikt en hoe u uw keuze wijzigt.',
      eyebrow: 'Cookies',
      title: 'Cookie',
      titleEm: 'verklaring',
      updated: UPDATED.nl,
      sections: [
        {
          type: 'prose',
          paragraphs: [
            'Deze website gebruikt op dit moment uitsluitend technisch noodzakelijke opslag. Wij draaien geen advertentie- of trackingscripts en delen niets met sociale platforms.',
          ],
        },
        {
          type: 'table',
          title: 'Wat wij opslaan',
          rows: [
            [
              'fodel:consent',
              'Uw keuze over cookies (akkoord of geweigerd). Wordt in uw browser bewaard en bereikt ons niet. Bewaartermijn: 12 maanden.',
            ],
          ],
        },
        {
          type: 'prose',
          title: 'Statistieken',
          paragraphs: [
            'Mochten wij in de toekomst bezoekersstatistieken bijhouden, dan activeren wij die uitsluitend met uw voorafgaande, uitdrukkelijke toestemming. Weigeren beperkt het gebruik van de site op geen enkele manier.',
          ],
        },
        {
          type: 'prose',
          title: 'Keuze wijzigen',
          paragraphs: [
            'U kunt uw keuze altijd wijzigen door de opgeslagen browsergegevens voor deze site te wissen; daarna verschijnt de cookiemelding opnieuw.',
          ],
        },
      ],
    },

    terms: {
      metaTitle: 'Algemene voorwaarden',
      metaDescription:
        'De voorwaarden van de advertentie- en bemiddelingsdienst van FODEL: tarieven, courtage, opzegging en aansprakelijkheid.',
      eyebrow: 'Voorwaarden',
      title: 'Algemene',
      titleEm: 'voorwaarden',
      updated: UPDATED.nl,
      sections: [
        {
          type: 'callout',
          title: 'Let op',
          body: 'Deze pagina is een samenvatting. De volledige, geldende voorwaarden zijn als pdf beschikbaar; bij afwijking prevaleert de pdf.',
        },
        {
          type: 'prose',
          title: '1. De dienst',
          paragraphs: [
            'FODEL adverteert Hongaars vastgoed op haar eigen meertalige websites en werkt, op basis van een aparte afspraak, mee aan de afwikkeling van de koop.',
            'De advertentiedienst kent geen exclusiviteit: de verkoper mag de woning ook via andere kanalen aanbieden en verkopen.',
          ],
        },
        {
          type: 'list',
          title: '2. Een advertentie plaatsen',
          ordered: true,
          items: [
            'De verkoper vult het aanmeldformulier in.',
            'FODEL stuurt een betaalverzoek voor het gekozen pakket.',
            'De verkoper betaalt per bankoverschrijving.',
            'Na ontvangst krijgt de verkoper rechten om foto’s te uploaden.',
            'FODEL verzorgt de vertaling en publiceert de advertentie.',
          ],
        },
        {
          type: 'table',
          title: '3. Tarieven',
          intro: 'Alle prijzen zijn inclusief 21% Nederlandse btw. Zie de pagina Tarieven voor het volledige overzicht.',
          rows: [
            ['Voordelige advertentie (6 maanden)', '€ 69'],
            ['Normale advertentie (12 maanden)', '€ 129 / € 179'],
            ['Vertaling', '€ 25 per taal'],
            ['Uitlichten', '€ 15–25 per maand (min. 3 maanden)'],
          ],
        },
        {
          type: 'prose',
          title: '4. Courtage',
          paragraphs: [
            'Courtage is uitsluitend verschuldigd wanneer cumulatief is voldaan aan: een schriftelijke koopovereenkomst, een door FODEL aangebrachte koper, en een voldane aanbetaling.',
            `De courtage bedraagt ${COMMISSION.percent}% netto met een minimum van € ${COMMISSION.minimumEur}, vermeerderd met ${COMMISSION.vatPercent}% Nederlandse btw.`,
            'Meldt de geïnteresseerde zich rechtstreeks bij de verkoper en is onze hulp bij de afwikkeling niet nodig, dan is er buiten de advertentiekosten niets verschuldigd.',
          ],
        },
        {
          type: 'prose',
          title: '5. Intrekken van de advertentie',
          paragraphs: [
            'De verkoper kan de advertentie vóór de vervaldatum intrekken. Reeds betaalde advertentiekosten worden in dat geval niet terugbetaald.',
          ],
        },
        {
          type: 'prose',
          title: '6. Aansprakelijkheid',
          paragraphs: [
            'De verkoper is verantwoordelijk voor de juistheid van de gegevens over de woning. FODEL geeft de aangeleverde gegevens weer en aanvaardt geen aansprakelijkheid voor de juistheid daarvan.',
            'Vertalingen op deze website zijn informatief; bij een geschil prevaleert de Hongaarse versie.',
          ],
        },
        {
          type: 'prose',
          title: '7. Herroepingsrecht',
          paragraphs: [
            'Een verkoper die consument is, heeft het wettelijke herroepingsrecht bij op afstand gesloten overeenkomsten. Vraagt de verkoper uitdrukkelijk om directe uitvoering, dan vermindert het herroepingsrecht naar rato van de reeds geleverde dienst.',
          ],
        },
      ],
    },

    accessibility: {
      metaTitle: 'Toegankelijkheidsverklaring',
      metaDescription:
        'Het toegankelijkheidsniveau van fodel.nl, de gehanteerde standaard en hoe u ons bereikt met feedback.',
      eyebrow: 'Toegankelijkheid',
      title: 'Toegankelijkheids',
      titleEm: 'verklaring',
      updated: UPDATED.nl,
      sections: [
        {
          type: 'prose',
          paragraphs: [
            'Wij willen dat deze website voor iedereen bruikbaar is — ook voor bezoekers die een schermlezer, het toetsenbord of vergroting gebruiken.',
            'Wij ontwikkelen de site volgens WCAG 2.2 niveau AA. Een aanzienlijk deel van onze bezoekers is gepensioneerd; tekstgrootte, contrast en toetsenbordbediening hebben daarom voorrang.',
          ],
        },
        {
          type: 'list',
          title: 'Wat is geregeld',
          items: [
            'Alle tekst heeft minimaal een contrastverhouding van 4,5:1',
            'Volledige toetsenbordbediening met zichtbare focusindicatie',
            'Een “naar de inhoud”-link boven aan iedere pagina',
            'Betekenisvolle alt-teksten bij alle afbeeldingen',
            'Formuliervelden met gekoppelde labels en tekstuele foutmeldingen',
            'Respect voor de systeeminstelling “verminder beweging”',
            'De site is leesbaar en bruikbaar zonder JavaScript',
          ],
        },
        {
          type: 'prose',
          title: 'Bekende beperkingen',
          paragraphs: [
            'Op de toegankelijkheid van inhoud van derden, zoals een kaartdienst, hebben wij geen invloed.',
          ],
        },
        {
          type: 'prose',
          title: 'Feedback',
          paragraphs: [
            `Loopt u tegen een drempel aan? Laat het ons weten via ${COMPANY.email.primary} of telefonisch. Wij lossen meldingen zo snel mogelijk op.`,
          ],
        },
      ],
    },
  },
};
