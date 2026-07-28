/**
 * FODEL FAQ.
 *
 * SOURCE NOTE — read before publishing.
 * The Hungarian set reproduces the 22 questions FODEL publish at
 * fodel.hu/gyik. Question headings and the passages in quotation marks are
 * their exact words. The connecting prose is a faithful restatement of their
 * answers, not a transcript, because the scrape returned their answers partly
 * summarised. Every entry carries `sourced: true` to mark that the substance
 * is FODEL's; before launch these should be diffed against the live page so
 * the wording is theirs throughout.
 *
 * The Dutch set is buyer-facing and newly written for this site. It is
 * grounded only in facts FODEL themselves publish (commission terms, contract
 * prices, the transaction services in Q13, the land registry and
 * power-of-attorney process). Nothing here is invented.
 */

import type { Locale } from '~/i18n/ui';

export type FaqAudience = 'seller' | 'buyer' | 'both';

export interface FaqEntry {
  id: string;
  question: string;
  /** Paragraphs. Rendered as <p>; a leading "- " marks a list block. */
  answer: string[];
  audience: FaqAudience;
  /** Substance comes from FODEL's own published copy. */
  sourced: boolean;
}

export const FAQ: Record<Locale, FaqEntry[]> = {
  hu: [
    {
      id: 'miert-jo-kulfoldi-vasarlo',
      question: 'Miért jó egy külföldi ingatlanvásárló?',
      answer: [
        'Külföldi érdeklődő esetén rendszerint „komoly partnerre és nem egy valós vételi szándék nélkül bámészkodóra, ún. ingatlanturistára" számíthat. Egy magyarországi ingatlan megtekintése legalább két napjába és 200–300 eurójába kerül az idelátogatónak — ezt az összeget senki nem költi el felelőtlenül.',
        'A külföldi vevő nem vesz fel banki hitelt és nem vár állami támogatásra (például CSOK-ra), hanem egy összegben, banki átutalással fizet. Nem kell arra sem várnia, hogy előbb eladja a jelenlegi otthonát.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'miert-fizetek-hirdetesert',
      question: 'Miért fizetek a hirdetésemért?',
      answer: [
        '„A FODEL egyedülálló hirdetési és kizárólagosság nélküli értékesítési modelljében minden hirdetés 5 nyelven jelenik meg 8 országban."',
        'A hirdetési díj tartalmazza a szöveg szerkesztését, a fordítást, a képfeldolgozást, a címalkotást és a hirdetés összeállítását. Munkatársaink egy-egy anyag adminisztrációjával 1–4 órát töltenek el.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'kiemelt-hirdetes',
      question: 'Mit jelent a „kiemelt hirdetés"?',
      answer: [
        '„Egy kategórián belüli kiemeléssel az adott kategóriaoldalra látogató minden érdeklődő az első hirdetmények egyikeként találkozik az Ön ingatlanával."',
        'Felára havi 15 €, legalább három hónapra kérhető.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'fooldali-kiemeles',
      question: 'Mit jelent a „főoldali kiemelés"?',
      answer: [
        '„A főoldali kiemelés aktiválásával jelentősen nő a meghirdetett ingatlan eladásának esélye." Az ingatlan fotója megjelenik a főoldali képbemutatóban.',
        'Felára havi 25 €, legalább három hónapra kérhető.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'miert-nemet-angol',
      question: 'Miért ajánlott a holland mellett a német és az angol fordítás?',
      answer: [
        'A magyar ingatlanok iránt érdeklődő külföldiek nem csak hollandok. Német és angol nyelvterületről egyaránt keresnek ingatlant Magyarországon.',
        'A 100 szavas magyar nyelvű hirdetési szöveg németre és/vagy angolra történő fordításának megrendelésével érdemben növelheti az eladás esélyét.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'idegen-nyelvu-leiras',
      question: 'Mit jelent az ingatlan szöveges leírásának idegen nyelvű megjelenítése?',
      answer: [
        '„Egy szakszerűen és lényegretörően megfogalmazott ingatlanhirdetési szöveg növeli az eladás esélyét."',
        'A magyar szöveget először szerkesztjük, majd anyanyelvi szinten fordítjuk. Díja nyelvenként 25 €.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'mikor-erdemes-forditas',
      question: 'Mikor érdemes fordítást kérni?',
      answer: [
        'Nagyobb értékű, prémium kategóriás, üzleti vagy összetett ingatlanok esetén. Akkor is, ha az ingatlan olyan előnyös tulajdonságokkal rendelkezik, amelyeket a fotók nem mutatnak be megfelelően.',
        'A javasolt sorrend: holland, német, angol, francia.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'mikor-nem-erdemes-forditas',
      question: 'Mikor nem érdemes fordítást kérni?',
      answer: [
        'Kis értékű ingatlanok, telkek vagy egyszerű, klasszikus épületek esetén.',
        '„Ha nincs hirdetési szöveg, különösen törekedjen arra, hogy a napsütéses időben, kívül-belül egyaránt világos körülmények között, kizárólag vízszintes tájolással készült éles, nagyfelbontású képek jól bemutassák az ingatlanban rejlő értékeket!"',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'mit-tartalmazzon-leiras',
      question: 'Mit tartalmazzon az ingatlan szöveges leírása?',
      answer: [
        'Érdemes felsorolni a bővítési és építési lehetőségeket, valamint a közeli infrastruktúrát: a víz, a város, a bevásárlási lehetőség, az orvosi ellátás, az autópálya és a repülőtér távolságát.',
        'Ha a repülőtér 50 km-nél távolabb van, inkább ne szerepeljen a leírásban.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'nyelvi-kommunikacio',
      question: 'Hogyan tudnak a külföldi érdeklődők kommunikálni velem, ha nem beszélünk azonos nyelvet?',
      answer: [
        '„Hirdetéseinkben feltüntetésre kerül, így minden külföldi érdeklődő előre látja, hogy Ön milyen idegen nyelven tud kommunikálni."',
        'Ha kéri a segítségünket, e-mailben és telefonon egyaránt támogatjuk az eladást fordítással, áralkuval és a szerződés előkészítésével. Ha közvetlenül egyeztet a vevővel, „sem Önnek, sem a külföldi partnerének nem kell jutalékot fizetnie".',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'egyedulallo-modell',
      question: 'Mit takar a FODEL egyedülálló hirdetési és értékesítési modellje?',
      answer: [
        '„A többnyelvű weboldalunkon megjelentetett hirdetésekben nemcsak az ingatlan pontos címe látható kiemelten, de — a FODEL elérhetősége mellett — feltüntetésre kerül az ingatlan tulajdonosának a neve, telefonszáma és e-mail címe is."',
        'Ez teszi lehetővé, hogy a külföldi érdeklődő közvetlenül Önnel vegye fel a kapcsolatot.',
      ],
      audience: 'both',
      sourced: true,
    },
    {
      id: 'jutalek-nelkul',
      question: 'Jutalékfizetés nélkül is eladhatom az ingatlanomat a weboldalukon keresztül?',
      answer: [
        'Igen. „Amennyiben sem Ön, sem az ingatlant megvásárló külföldi személy nem kéri segítségünket az adásvétel lebonyolításában", akkor „a FODEL a már korábban befizetett hirdetési költségen felül semmilyen egyéb jutalékra nem tart igényt".',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'mit-tartalmaz-jutalek',
      question: 'Ha igénybe veszem a FODEL közreműködését, pontosan milyen szolgáltatásért fizetek jutalékot?',
      answer: [
        '- Telefonos és e-mailes konzultáció, kommunikáció a felekkel',
        '- Személyes találkozók lebonyolítása',
        '- A vevőjelölt hátterének, vételi szándékának és fizetőképességének vizsgálata',
        '- Repülőjegy rendelése, szükség esetén autóbérlés',
        '- Idegen nyelvet beszélő munkatársunk odautazása',
        '- Az áralku segítése',
        '- A többnyelvű szerződés előkészítése',
        '- Az adásvételi procedúra lebonyolítása',
        '- Az új tulajdonos földhivatali bejegyeztetése és a közműátírások intézése',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'terhelt-ingatlan',
      question: 'Eladhatom-e banki vagy más teherrel bíró ingatlanomat a FODEL-en keresztül?',
      answer: [
        'Igen. „Egy terhelt ingatlan eladása rendszerint nem okoz gondot."',
        'Az adásvételi szerződésben kell rendezni, hogy a vételár első része az ingatlant érintő teher rendezésére fordítódjon, a maradék része pedig az eladót illesse meg.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'erdemes-e',
      question: 'Érdemes-e meghirdetnem az ingatlanomat Önöknél?',
      answer: [
        'Olvassa végig az oldalunkat — a díjszabás, a modell és a folyamat minden eleme nyilvános.',
        'Ha ezután is bizonytalan, kérjen ingyenes visszahívást és tanácsadást a Kapcsolat oldalunkon. Ha e-mailt ír, jelezze, mikor hívhatjuk.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'milyen-gyorsan',
      question: 'Milyen gyorsan tudom értékesíteni az ingatlanomat Önökön keresztül?',
      answer: [
        '„Az eladás gyorsasága az ingatlan valós piaci árának és a hirdetésben megjelenő eladási árnak a viszonyától függ."',
        'Kérje ingatlanszakértő véleményét. „Még a külföldi vevők sem vesznek túlárazott ingatlanokat Magyarországon." Ha rövid a határidő, adjon meg piaci érték alatti árat.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'mennyiert-kinaljam',
      question: 'Mennyiért kínáljam az ingatlanomat?',
      answer: [
        'Tájékozódjon az azonos régióban lévő, hasonló ingatlanok árairól, és kérje hivatalos ingatlan-értékbecslő felmérését.',
        'Ne feledje: ha valaki néhány hét alatt eladott egy hasonló ingatlant, az valószínűleg áron alul történt. Túlárazás esetén „a hirdetések akár évekig is futhatnak érdemi érdeklődés nélkül". Minden platformon azonos áron kínálja az ingatlant.',
      ],
      audience: 'seller',
      sourced: true,
    },
    {
      id: 'miert-vesznek-hollandok',
      question: 'Miért vesznek hollandok és belgák ingatlanokat Magyarországon?',
      answer: [
        '- Olcsóbbak az ingatlanok és alacsonyabbak a megélhetési költségek',
        '- Magyarországon rendszerint nem kell ingatlanadót fizetni',
        '- Jobb az időjárás, több a napsütés',
        '- „Mert a tengerszint felett és a kontinens közepén vagyunk, így nálunk nem fenyeget a tengerszintek globális emelkedése"',
        '- Magyarország uniós tagország',
        '- „Mert a magyar ingatlanok csaknem 100%-ban saját tulajdonú területen találhatóak"',
      ],
      audience: 'both',
      sourced: true,
    },
    {
      id: 'mit-keresnek',
      question: 'Mit keresnek a hollandok és belgák Magyarországon?',
      answer: [
        '- Vidéki, olcsó és reális árú ingatlanokat',
        '- Hegyvidéki ingatlanokat kilátással',
        '- Erdőszéli, erdőközeli ingatlanokat',
        '- Kiadható nyaralókat és vízparti ingatlanokat',
        '- Kempingeket, állattartásra és lótartásra alkalmas ingatlanokat',
        '- Tanyákat, vállalkozásra alkalmas ingatlanokat, hoteleket és moteleket',
        '- Nagy földterületeket',
        '- Budapesti, belvárosi, kiadható ingatlanokat',
        '- Ferihegyhez jó közlekedéssel rendelkező ingatlanokat',
        '- A Dunántúlon lévő ingatlanokat',
      ],
      audience: 'both',
      sourced: true,
    },
    {
      id: 'mit-nem-keresnek',
      question: 'Mi az, amit nem keresnek?',
      answer: [
        '- Túlárazott ingatlanokat',
        '- Panellakásokat',
        '- Ipari üzemek közelében lévő ingatlanokat',
        '- Zajos területen fekvő ingatlanokat',
      ],
      audience: 'both',
      sourced: true,
    },
    {
      id: 'mi-a-vonzo',
      question: 'Mi a fontos, a vonzó számukra?',
      answer: [
        '- Jó közlekedés és közeli bevásárlási lehetőség',
        '- Élővíz közelsége, nyugodt környezet',
        '- Jó internetelérés (mobilinternet is megfelel)',
        '- Parkolási lehetőség',
        '- A kerékpározás lehetősége életvitelszerűen',
        '- Bevásárlóközpontok, nagyáruházak közelsége',
        '- Biztonság, vagyonbiztonság',
      ],
      audience: 'both',
      sourced: true,
    },
    {
      id: 'mire-szamitsak',
      question: 'Mire számítsak holland érdeklődő esetén?',
      answer: [
        'Arra, hogy a környék ingatlankínálatát az interneten és a helyszínen egyaránt alaposan feltérképezi, hogy az ingatlant körültekintően körüljárja — és hogy korrektül fizet.',
      ],
      audience: 'seller',
      sourced: true,
    },
  ],

  nl: [
    {
      id: 'direct-van-de-eigenaar',
      question: 'Wat betekent “direct van de eigenaar”?',
      answer: [
        'Bij een groot deel van ons aanbod publiceren wij naast onze eigen gegevens ook de naam en het telefoonnummer van de eigenaar. U kunt dus rechtstreeks contact opnemen met de verkoper.',
        'Neemt u rechtstreeks contact op en regelt u de koop zelf, dan betaalt niemand courtage — noch u, noch de verkoper. Wij zijn dan alleen betaald voor de advertentie.',
      ],
      audience: 'buyer',
      sourced: true,
    },
    {
      id: 'courtage',
      question: 'Wat kost uw bemiddeling?',
      answer: [
        'Onze courtage bedraagt 4% netto met een minimum van € 2.000, vermeerderd met 21% Nederlandse btw. Die wordt betaald door de Hongaarse verkoper, niet door u.',
        'Er wordt alleen gefactureerd als aan alle drie de voorwaarden is voldaan: er is een schriftelijke koopovereenkomst, de koper is door FODEL aangebracht, en de aanbetaling is voldaan.',
      ],
      audience: 'buyer',
      sourced: true,
    },
    {
      id: 'als-buitenlander-kopen',
      question: 'Kan ik als Nederlander of Belg een woning kopen in Hongarije?',
      answer: [
        'Ja. Als EU-burger koopt u woningen en percelen in Hongarije op vrijwel dezelfde voorwaarden als een Hongaar. Bijna 100% van het Hongaarse vastgoed staat op eigen grond — erfpacht zoals in Nederland komt er nauwelijks voor.',
        'Voor landbouwgrond gelden aparte regels. Een EU-burger met een agrarische kwalificatie mag in Hongarije tot 300 hectare verwerven; die procedure regelen wij volledig.',
      ],
      audience: 'buyer',
      sourced: true,
    },
    {
      id: 'moet-ik-erheen',
      question: 'Moet ik naar Hongarije reizen om te tekenen?',
      answer: [
        'Nee. Wij kunnen u met een volmacht in Hongarije vertegenwoordigen, zodat u niet hoeft over te komen voor de ondertekening.',
        'De inschrijving bij het Hongaarse kadaster en het overzetten van de nutsvoorzieningen regelen wij eveneens.',
      ],
      audience: 'buyer',
      sourced: true,
    },
    {
      id: 'tweetalig-contract',
      question: 'In welke taal wordt de koopovereenkomst opgesteld?',
      answer: [
        'Wij laten tweetalige koopovereenkomsten opstellen, zodat u leest wat u tekent.',
        'Prijsindicatie: Hongaars vanaf € 150, Duits–Hongaars en Engels–Hongaars vanaf € 300, Nederlands–Hongaars vanaf € 400.',
      ],
      audience: 'buyer',
      sourced: true,
    },
    {
      id: 'wat-regelt-fodel',
      question: 'Wat regelt FODEL precies bij een aankoop?',
      answer: [
        '- Overleg per telefoon en e-mail, en de communicatie tussen beide partijen',
        '- Persoonlijke afspraken en bezichtigingen ter plaatse',
        '- Een Nederlands- of Duitssprekende collega die met u meereist',
        '- Ondersteuning bij de prijsonderhandeling',
        '- Het voorbereiden van de meertalige overeenkomst',
        '- De volledige afwikkeling van de koop',
        '- Inschrijving van de nieuwe eigenaar en het overzetten van de nutsvoorzieningen',
      ],
      audience: 'buyer',
      sourced: true,
    },
    {
      id: 'waarom-hongarije',
      question: 'Waarom kopen Nederlanders en Belgen in Hongarije?',
      answer: [
        '- Vastgoed en de kosten van levensonderhoud liggen aanzienlijk lager',
        '- In Hongarije wordt doorgaans geen onroerendezaakbelasting geheven',
        '- Meer zon en een aangenamer klimaat',
        '- Het land ligt boven zeeniveau, midden op het continent',
        '- Hongarije is EU-lidstaat',
        '- Bijna al het vastgoed staat op eigen grond',
      ],
      audience: 'buyer',
      sourced: true,
    },
    {
      id: 'energielabel',
      question: 'Heeft een Hongaarse woning een energielabel?',
      answer: [
        'Ja. Hongarije kent een verplicht energieprestatiecertificaat (energiatanúsítvány) en dat moet in de advertentie worden vermeld. Bij ons aanbod staat het label bij de kenmerken; “in aanvraag” betekent dat het certificaat nog wordt opgesteld.',
        'Wij kunnen het certificaat desgewenst voor de verkoper laten opstellen.',
      ],
      audience: 'buyer',
      sourced: true,
    },
    {
      id: 'zoekdienst',
      question: 'Wat is de zoekdienst en wat kost die?',
      answer: [
        'De zoekdienst is gratis. U geeft door wat u zoekt — type, streek, budget en wensen — en wij gaan voor u op zoek, ook buiten het aanbod op deze site om.',
        'Onze Hongaarssprekende collega’s helpen bij de onderhandeling en zorgen dat de overeenkomst juridisch correct wordt opgesteld. U ontvangt per e-mail bericht zodra er iets passends is.',
      ],
      audience: 'buyer',
      sourced: true,
    },
    {
      id: 'welke-streken',
      question: 'In welke streken heeft u aanbod?',
      answer: [
        'Het zwaartepunt ligt in Transdanubië — de comitaten Baranya, Tolna, Zala, Somogy en Veszprém — plus het Balatonmeer en de Balatonhoogvlakte.',
        'Daarnaast hebben wij aanbod op de laagvlakte en in gebieden met een goede verbinding naar de luchthaven van Boedapest.',
      ],
      audience: 'buyer',
      sourced: true,
    },
    {
      id: 'taalbarriere',
      question: 'Ik spreek geen Hongaars. Is dat een probleem?',
      answer: [
        'Nee. Bij elke advertentie staat vermeld welke talen de eigenaar spreekt, zodat u dat vooraf weet.',
        'Onze medewerkers spreken Nederlands, Duits, Engels, Frans en Hongaars, en gaan mee naar de bezichtiging.',
      ],
      audience: 'buyer',
      sourced: true,
    },
    {
      id: 'bereikbaarheid',
      question: 'Wanneer kan ik u bereiken?',
      answer: [
        'Op werkdagen tussen 09:00 en 18:00. Vraagt u om teruggebeld te worden, dan bellen wij tot 21:00 uur, ook in het weekend.',
        'Het terugbellen kost u niets — wij betalen het gesprek.',
      ],
      audience: 'buyer',
      sourced: true,
    },
  ],
};

/** FAQPage structured data expects plain text, not markup. */
export function faqAnswerText(entry: FaqEntry): string {
  return entry.answer.map((p) => p.replace(/^- /, '• ')).join(' ');
}

export function faqFor(locale: Locale, audience?: FaqAudience): FaqEntry[] {
  const all = FAQ[locale] ?? [];
  if (!audience) return all;
  return all.filter((e) => e.audience === audience || e.audience === 'both');
}
