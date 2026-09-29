/**
 * The optional questions on the valuation form (brief §8).
 *
 * Extensible on purpose: add, reword or retire a question here and the public
 * form, the stored answers (`valuations.answers`, keyed by `id`) and the admin
 * detail page all follow. The list is a starting point drawn from the
 * 2026-09 meeting — Gábor still has to confirm the final wording and set.
 *
 * Rules that must hold for every question:
 * - Optional. Leaving it empty is fine; "Nem tudom" is always offered and is
 *   stored as its own answer, never read as a negative one.
 * - Objective property and surroundings facts only — never anything about
 *   the neighbours as people or any protected characteristic.
 * - No scoring. The answers inform the human reviewer; nothing here turns an
 *   answer into a price multiplier (there is no validated model for that).
 *
 * Stored values are stable Hungarian slugs, so changing a label never
 * changes what an old answer means. Retiring a question keeps its old
 * answers readable: the admin page falls back to the raw id and value.
 */

export type ValuationLocale = 'hu' | 'nl';

export interface ValuationOption {
  value: string;
  label: Record<ValuationLocale, string>;
  /** Plain-language explanation (legal chips). Never legal advice. */
  hint?: Record<ValuationLocale, string>;
}

export interface ValuationQuestion {
  id: string;
  step?: 2 | 3 | 4;
  multiple?: boolean;
  label: Record<ValuationLocale, string>;
  options: ValuationOption[];
}

export const DONT_KNOW = 'nem-tudom';

const dontKnow: ValuationOption = { value: DONT_KNOW, label: { hu: 'Nem tudom', nl: 'Weet ik niet' } };
const yes: ValuationOption = { value: 'igen', label: { hu: 'Igen', nl: 'Ja' } };
const no: ValuationOption = { value: 'nem', label: { hu: 'Nem', nl: 'Nee' } };

export const VALUATION_QUESTIONS: ValuationQuestion[] = [
  {
    id: 'megkozelites',
    label: { hu: 'Milyen úton közelíthető meg az ingatlan?', nl: 'Via wat voor weg is de woning bereikbaar?' },
    options: [
      { value: 'aszfaltozott-ut', label: { hu: 'Aszfaltozott út', nl: 'Geasfalteerde weg' } },
      { value: 'murvas-ut', label: { hu: 'Murvás / zúzottköves út', nl: 'Grind- of steenslagweg' } },
      { value: 'foldut', label: { hu: 'Földút', nl: 'Onverharde weg' } },
      dontKnow,
    ],
  },
  {
    id: 'zaj',
    label: {
      hu: 'Van jelentős zajforrás a közelben (forgalmas út, vasút, üzem)?',
      nl: 'Is er een duidelijke geluidsbron in de buurt (drukke weg, spoorlijn, bedrijf)?',
    },
    options: [yes, no, dontKnow],
  },
  {
    id: 'internet',
    label: { hu: 'Milyen internetelérés van?', nl: 'Welke internetverbinding is er?' },
    options: [
      { value: 'vezetekes', label: { hu: 'Vezetékes vagy optikai', nl: 'Vast of glasvezel' } },
      { value: 'mobil', label: { hu: 'Csak mobilinternet', nl: 'Alleen mobiel internet' } },
      { value: 'nincs', label: { hu: 'Nincs', nl: 'Geen' } },
      dontKnow,
    ],
  },
  {
    id: 'panorama',
    label: { hu: 'Van kilátás / panoráma az ingatlanból?', nl: 'Heeft de woning uitzicht / panorama?' },
    options: [yes, no, dontKnow],
  },
  {
    id: 'viz',
    label: { hu: 'Van tó, patak vagy vízpart a közelben?', nl: 'Is er een meer, beek of oever in de buurt?' },
    options: [
      { value: 'telekkel-hataros', label: { hu: 'A telekkel határos', nl: 'Grenst aan het perceel' } },
      { value: 'setatavolsagra', label: { hu: 'Sétatávolságra', nl: 'Op loopafstand' } },
      { value: 'nincs', label: { hu: 'Nincs a közelben', nl: 'Niet in de buurt' } },
      dontKnow,
    ],
  },
  {
    id: 'erdo',
    label: { hu: 'Van erdő a közelben?', nl: 'Is er bos in de buurt?' },
    options: [
      { value: 'telekkel-hataros', label: { hu: 'A telekkel határos', nl: 'Grenst aan het perceel' } },
      { value: 'setatavolsagra', label: { hu: 'Sétatávolságra', nl: 'Op loopafstand' } },
      { value: 'nincs', label: { hu: 'Nincs a közelben', nl: 'Niet in de buurt' } },
      dontKnow,
    ],
  },
  {
    id: 'mezogazdasagi-telep',
    label: {
      hu: 'Van mezőgazdasági üzem vagy állattartó telep a közelben?',
      nl: 'Is er een landbouwbedrijf of veehouderij in de buurt?',
    },
    options: [yes, no, dontKnow],
  },
  {
    id: 'magasfeszultseg',
    label: {
      hu: 'Halad magasfeszültségű vezeték az ingatlan felett vagy közelében?',
      nl: 'Loopt er een hoogspanningslijn over of vlak bij de woning?',
    },
    options: [
      { value: 'telek-felett', label: { hu: 'Igen, a telek felett', nl: 'Ja, over het perceel' } },
      { value: 'kozelben', label: { hu: 'Igen, a közelben', nl: 'Ja, in de buurt' } },
      no,
      dontKnow,
    ],
  },
];

const option = (value: string, hu: string, nl: string): ValuationOption => ({ value, label: { hu, nl } });
const legal = (value: string, hu: string, nl: string, hintHu: string, hintNl: string): ValuationOption =>
  ({ value, label: { hu, nl }, hint: { hu: hintHu, nl: hintNl } });
const question = (id: string, step: 2 | 3 | 4, hu: string, nl: string, choices: ValuationOption[], multiple = false): ValuationQuestion =>
  ({ id, step, label: { hu, nl }, options: [...choices, dontKnow], multiple });

VALUATION_QUESTIONS.push(
  question('falazat', 2, 'Falazat', 'Muurmateriaal', [option('tegla','Tégla','Baksteen'),option('valyog','Vályog','Leem'),option('panel','Panel','Paneel'),option('fa','Fa / könnyűszerkezet','Hout / lichte bouw'),option('ko','Kő','Steen'),option('vegyes','Vegyes','Gemengd')]),
  question('fodem', 2, 'Födém', 'Vloerconstructie', [option('beton','Beton','Beton'),option('fa','Fa','Hout'),option('vegyes','Vegyes','Gemengd')]),
  question('tetoszerkezet', 2, 'Tetőszerkezet', 'Dakconstructie', [option('fa','Fa','Hout'),option('beton','Beton','Beton'),option('egyeb','Egyéb','Anders')]),
  question('tetofedes', 2, 'Tetőfedés', 'Dakbedekking', [option('cserép','Cserép','Dakpan'),option('lemez','Lemez','Metaal'),option('pala','Pala','Leien'),option('egyeb','Egyéb','Anders')]),
  question('tetofedes-allapot', 2, 'Tető állapota', 'Staat van het dak', [option('jo','Jó','Goed'),option('felujitando','Felújítandó','Renovatie nodig')]),
  question('nyilaszarok', 2, 'Nyílászárók kora', 'Ouderdom van ramen en deuren', [option('uj','Újak / korszerűek','Nieuw / modern'),option('regi','Régiek','Oud'),option('vegyes','Vegyes','Gemengd')]),
  question('nyilaszarok-anyag', 2, 'Nyílászárók anyaga', 'Materiaal van ramen en deuren', [option('muanyag','Műanyag','Kunststof'),option('fa','Fa','Hout'),option('aluminium','Alumínium','Aluminium'),option('vegyes','Vegyes','Gemengd')]),
  question('szigeteles', 2, 'Szigetelés', 'Isolatie', [option('van','Van','Aanwezig'),option('nincs','Nincs','Geen'),option('reszleges','Részleges','Gedeeltelijk')]),
  question('hutes', 2, 'Hűtés', 'Koeling', [option('klima','Klíma','Airconditioning'),option('egyeb','Egyéb','Anders'),option('nincs','Nincs','Geen')]),
  question('kozmuvek', 2, 'Közművek', 'Nutsvoorzieningen', [option('villany','Villany','Elektriciteit'),option('viz','Víz','Water'),option('csatorna','Csatorna','Riolering'),option('gaz','Gáz','Gas'),option('emeszto','Emésztő','Septische tank'),option('kut','Kút','Put')], true),
  question('napelem', 2, 'Napelem', 'Zonnepanelen', [yes,no]),
  question('tajolas', 3, 'Tájolás, benapozottság', 'Oriëntatie en zonlicht', [option('napos','Napos','Zonnig'),option('arnyekos','Árnyékos','Schaduwrijk'),option('vegyes','Vegyes','Gemengd')]),
  question('szolgaltatasok', 3, 'Központ és szolgáltatások', 'Centrum en voorzieningen', [option('seta','Sétatávolságra','Loopafstand'),option('auto','Autóval elérhető','Met de auto'),option('tavol','Távol','Ver weg')]),
  question('kornyezet-jellege', 3, 'Környező területhasználat', 'Grondgebruik in de omgeving', [option('lako','Lakóövezet','Woongebied'),option('udulo','Üdülőövezet','Recreatiegebied'),option('kulterulet','Külterület / tanyás','Buitengebied'),option('mezogazdasagi','Mezőgazdasági','Agrarisch'),option('ipari-vegyes','Ipari / vegyes','Industrieel / gemengd')]),
  question('szomszedos-epuletek', 3, 'Szomszédos épületek állapota', 'Staat van aangrenzende gebouwen', [option('jo','Jó','Goed'),option('vegyes','Vegyes','Gemengd'),option('romos','Leromlott','Slecht')]),
  question('zavaro-letesitmeny', 3, 'Zavaró létesítmény a közelben', 'Storende faciliteit in de buurt', [yes,no]),
  question('kert-kerites', 4, 'Kert és kerítés állapota', 'Staat van tuin en hek', [option('jo','Jó','Goed'),option('felujitando','Rendezést igényel','Onderhoud nodig'),option('nincs','Nincs','Geen')]),
  question('bovites', 4, 'Bővítési lehetőség', 'Uitbreidingsmogelijkheid', [yes,no]),
  question('korlatozasok', 4, 'Ismert jogi korlátozások', 'Bekende juridische beperkingen', [
    legal('haszonelvezet','Haszonélvezeti jog','Vruchtgebruik','Valaki másnak joga van használni és hasznosítani az ingatlant.','Iemand anders mag de woning gebruiken en de vruchten ervan genieten.'),
    legal('jelzalog','Jelzálog / teher','Hypotheek / last','Az ingatlan hitel vagy más követelés fedezete.','De woning dient als onderpand voor een lening of andere vordering.'),
    legal('elovasarlas','Elővásárlási jog','Voorkeursrecht','Meghatározott személy a vevőt megelőzve vásárolhat.','Een bepaalde persoon mag vóór andere kopers kopen.'),
    legal('szolgalom','Szolgalom','Erfdienstbaarheid','Másnak joga van áthaladni vagy másként használni a telket.','Iemand anders mag over of anderszins gebruikmaken van het perceel.'),
    legal('osztatlan','Osztatlan közös tulajdon','Ongedeeld eigendom','Több tulajdonos osztozik, a részek nincsenek külön helyrajzi számon.','Meerdere eigenaren delen het object zonder aparte kadastrale nummers.'),
    legal('vedettseg','Műemléki / természetvédelmi védettség','Beschermde status','Az épület vagy a terület védett, a változtatás engedélyhez kötött.','Gebouw of gebied is beschermd; wijzigingen vragen om toestemming.'),
    legal('termofold','Termőföld-forgalmi korlátozás','Landbouwgrondbeperking','A földforgalmi szabályok korlátozhatják, ki veheti meg.','De landbouwwet kan beperken wie mag kopen.'),
    option('nincs','Nincs ismert','Geen bekend'),
  ], true),
);

// Keep the original IDs stable; these groups only affect presentation.
for (const item of VALUATION_QUESTIONS) {
  if (!item.step) item.step = ['megkozelites','zaj','panorama','viz','erdo','mezogazdasagi-telep','magasfeszultseg'].includes(item.id) ? 3 : 2;
}

/** The form field name a question posts under. */
export const questionField = (id: string) => `q_${id}`;

/** Keeps only known questions with a known answer — whatever else was posted is dropped. */
export function pickAnswers(values: Record<string, string>): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const question of VALUATION_QUESTIONS) {
    const value = values[questionField(question.id)];
    if (value) {
      const selected = value.split(',').filter((part) => question.options.some((option) => option.value === part));
      if (selected.length) answers[question.id] = selected.join(',');
    }
  }
  return answers;
}

/** Wizard-step extras stored in `answers` (not in VALUATION_QUESTIONS). */
export const EXTRA_ANSWER_LABELS: Record<string, { question: string; step: 1 | 2 | 3 | 4 }> = {
  bedrooms: { question: 'Szobák', step: 1 },
  bathrooms: { question: 'Fürdőszobák', step: 1 },
  parcelCount: { question: 'Helyrajzi számok', step: 1 },
  features: { question: 'Melléképületek és extrák', step: 4 },
  restrictionsNote: { question: 'Egyéb korlátozás vagy megjegyzés', step: 4 },
};

/** Hungarian question and answer text for the admin; unknown ids/values fall back to the raw key. */
export function describeAnswer(id: string, value: string): { question: string; answer: string; step: 1 | 2 | 3 | 4 } {
  const question = VALUATION_QUESTIONS.find((q) => q.id === id);
  const extra = EXTRA_ANSWER_LABELS[id];
  const answer = value.split(',').map((part) => {
    if (part === DONT_KNOW) return dontKnow.label.hu;
    return question?.options.find((o) => o.value === part)?.label.hu ?? part;
  }).join(', ');
  return {
    question: question?.label.hu ?? extra?.question ?? id,
    answer,
    step: question?.step ?? extra?.step ?? 4,
  };
}
