/**
 * Photo tips — ONE source for the three moments an owner needs them
 * (brief 3 §E): the full guide page (/hu/fotozasi-utmutato, /nl/fotografiegids),
 * the listing editor at the moment of upload, and the public submit page.
 *
 * The six top tips merge Éva and Gábor's list (2026-09-29: daylight and sun,
 * tidying, curtains open, whole rooms from the right angle, wipe the lens,
 * phone horizontal, no people) with the guide FODEL already published on
 * fodel.hu. Written for a layperson with a phone: one action per tip.
 */
import { ONSITE_SERVICES } from '~/config/company';

export type TipLocale = 'hu' | 'nl';

export type PhotoTip = {
  id: string;
  /** Key of the small line icon drawn by PhotoTips.astro. */
  icon: 'sun' | 'tidy' | 'curtain' | 'corner' | 'phone' | 'nobody';
  title: Record<TipLocale, string>;
  body: Record<TipLocale, string>;
};

export const TOP_TIPS: PhotoTip[] = [
  {
    id: 'daylight',
    icon: 'sun',
    title: { hu: 'Nappal, napsütésben', nl: 'Overdag, bij zon' },
    body: {
      hu: 'Világos, lehetőleg napsütéses időben fotózzon, és kapcsoljon fel minden lámpát.',
      nl: 'Fotografeer bij daglicht, liefst bij zonnig weer, en doe overal het licht aan.',
    },
  },
  {
    id: 'tidy',
    icon: 'tidy',
    title: { hu: 'Előbb rendrakás', nl: 'Eerst opruimen' },
    body: {
      hu: 'Rakjon rendet, és pakolja el a személyes tárgyakat. A vevő a házat nézze, ne a holmit.',
      nl: 'Ruim op en haal persoonlijke spullen weg. De koper moet het huis zien, niet de spullen.',
    },
  },
  {
    id: 'curtains',
    icon: 'curtain',
    title: { hu: 'Függönyök elhúzva', nl: 'Gordijnen open' },
    body: {
      hu: 'Húzza el a függönyöket, és húzza fel a redőnyöket — minden fény számít.',
      nl: 'Trek gordijnen open en rolluiken omhoog — elk beetje licht telt.',
    },
  },
  {
    id: 'whole-room',
    icon: 'corner',
    title: { hu: 'Az egész helyiség', nl: 'De hele ruimte' },
    body: {
      hu: 'Álljon a szoba sarkába, és mellmagasságból fotózzon, hogy az egész helyiség látszódjon.',
      nl: 'Ga in een hoek van de kamer staan en fotografeer op borsthoogte, zodat de hele ruimte in beeld is.',
    },
  },
  {
    id: 'horizontal',
    icon: 'phone',
    title: { hu: 'Fekvő telefon, tiszta lencse', nl: 'Liggende telefoon, schone lens' },
    body: {
      hu: 'Tartsa a telefont vízszintesen (fekvő helyzetben), és előtte törölje meg a lencsét.',
      nl: 'Houd de telefoon horizontaal (liggend) en veeg eerst de lens schoon.',
    },
  },
  {
    id: 'no-people',
    icon: 'nobody',
    title: { hu: 'Ember nélkül', nl: 'Zonder mensen' },
    body: {
      hu: 'A képeken ne szerepeljen ember — Ön se, a tükörben sem.',
      nl: 'Zorg dat er niemand op de foto staat — ook u niet, ook niet in de spiegel.',
    },
  },
];

export const WHY_IT_MATTERS: Record<TipLocale, string> = {
  hu: 'A vevők többsége külföldről, a képek alapján dönt arról, hogy felveszi-e a kapcsolatot és vállalja-e az utat a megtekintésre. A jó fénykép közvetlenül több érdeklődést jelent.',
  nl: 'De meeste kopers zitten in het buitenland en besluiten op basis van de foto’s of ze contact opnemen en de reis voor een bezichtiging maken. Goede foto’s leveren direct meer interesse op.',
};

/** The detailed guide, grouped as on the guide page. */
export const GUIDE_SECTIONS: { title: Record<TipLocale, string>; items: Record<TipLocale, string[]> }[] = [
  {
    title: { hu: 'Előkészület', nl: 'Voorbereiding' },
    items: {
      hu: [
        'Fényképezés előtt mindig rakjon rendet, és teljesen világosítsa ki a lakást.',
        'Pakolja el a személyes holmikat minden helyiségből.',
        'A kertben nyírja le a füvet a fotózás előtt.',
        'Kapcsolja ki a készüléken a dátumbélyegzőt.',
        'Törölje meg a telefon lencséjét — a zsíros, homályos lencse a leggyakoribb oka a fátyolos képnek.',
      ],
      nl: [
        'Ruim op en doe overal het licht aan voordat u fotografeert.',
        'Haal persoonlijke spullen uit beeld.',
        'Maai het gras voordat u de tuin fotografeert.',
        'Zet de datumstempel op uw toestel uit.',
        'Veeg de lens van uw telefoon schoon — een vettige lens is de meest voorkomende oorzaak van wazige foto’s.',
      ],
    },
  },
  {
    title: { hu: 'Megvilágítás', nl: 'Licht' },
    items: {
      hu: [
        'Napsütéses időben fényképezzen — kívül és belül egyaránt.',
        'Borult, alkonyati vagy sötétedés utáni fotózást kerülje.',
        'Kapcsolja fel a belső világítást minden helyiségben.',
        'Húzza el a függönyöket, húzza fel a sötétítőket és a redőnyöket.',
        'A vaku használatát mindenképpen kerülje el.',
      ],
      nl: [
        'Fotografeer bij zonnig weer, binnen én buiten.',
        'Vermijd bewolking, schemer en avond.',
        'Doe in elke ruimte het licht aan.',
        'Trek gordijnen open en rolluiken omhoog.',
        'Gebruik in geen geval de flitser.',
      ],
    },
  },
  {
    title: { hu: 'Géptartás és kompozíció', nl: 'Compositie' },
    items: {
      hu: [
        'Mindig vízszintesen (fekvő helyzetben) tartsa a telefont — függőleges tájolású képet ne készítsen.',
        'Álljon a helyiség sarkába, és mellmagasságból fotózzon: így az egész szoba látszik.',
        'A vízszintes síkokat igazítsa párhuzamosan a kijelző felső szélével.',
        'Ha szűk a látószög, lépjen hátrébb.',
        'Kertes ház esetén készítsen felülnézeti, madártávlati képet is.',
        'Homlokzatnál mutassa be a teljes épületet.',
        'Kerülje, hogy nagy felületet foglaljon el az aszfalt, a mennyezet vagy a kerítés.',
        'A képeken ne szerepeljen ember — tükörben, ablaküvegben sem.',
      ],
      nl: [
        'Houd het toestel altijd horizontaal (liggend) — maak geen staande foto’s.',
        'Ga in een hoek van de ruimte staan en fotografeer op borsthoogte: zo is de hele kamer in beeld.',
        'Lijn horizontale vlakken uit met de bovenrand van het scherm.',
        'Doe een stap achteruit als de ruimte niet in beeld past.',
        'Maak bij een vrijstaand huis ook een opname van bovenaf.',
        'Breng bij de gevel het hele gebouw in beeld.',
        'Vermijd dat asfalt, plafond of schutting het beeld domineert.',
        'Zorg dat er niemand op de foto staat — ook niet in een spiegel of ruit.',
      ],
    },
  },
  {
    title: { hu: 'Képminőség', nl: 'Beeldkwaliteit' },
    items: {
      hu: [
        'Mindig aktuális képeket töltsön fel, ne elavultakat.',
        'Használjon eredeti, nagyfelbontású fájlokat — legalább 3 megapixel, legalább 1500 pixel szélesség.',
        'Ne e-mailben továbbküldött, tömörített változatot töltsön fel.',
        'Exponálás előtt vegyen mély levegőt, és tartsa vissza egy másodpercig — így nem mozdul be a kép.',
        'A feldolgozás után egyesével ellenőrizze a képek élességét.',
      ],
      nl: [
        'Gebruik actuele foto’s, geen oude.',
        'Upload de originele bestanden — minimaal 3 megapixel en 1500 pixels breed.',
        'Stuur geen via e-mail gecomprimeerde versies door.',
        'Adem in en houd één seconde uw adem in voordat u afdrukt; dat scheelt bewegingsonscherpte.',
        'Controleer achteraf elke foto op scherpte.',
      ],
    },
  },
  {
    title: { hu: 'A leggyakoribb hibák', nl: 'De meestgemaakte fouten' },
    items: {
      hu: [
        'Borús időben készült, lehangoló hatású képek',
        'Túl sötét beltéri felvételek',
        'Ferde, csálé kompozíció',
        'Életlen, bemozdult vagy homályos fotók',
        'Alacsony felbontású vagy függőleges tájolású képek',
        'Emberek a képen',
        'Ismétlődő, felesleges felvételek',
      ],
      nl: [
        'Sombere foto’s bij bewolkt weer',
        'Te donkere binnenopnamen',
        'Scheve compositie',
        'Onscherpe, bewogen of wazige foto’s',
        'Foto’s met een lage resolutie of staand formaat',
        'Mensen in beeld',
        'Herhalende, overbodige opnamen',
      ],
    },
  },
];

/** "€ 150 — Helyszíni profi fotózás…" lines for the guide page callout. */
export function onsiteServiceLines(locale: TipLocale): string[] {
  return ONSITE_SERVICES.map((service) => `${service.names[locale]} — € ${service.priceEur}`);
}
