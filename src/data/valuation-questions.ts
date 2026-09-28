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
}

export interface ValuationQuestion {
  id: string;
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

/** The form field name a question posts under. */
export const questionField = (id: string) => `q_${id}`;

/** Keeps only known questions with a known answer — whatever else was posted is dropped. */
export function pickAnswers(values: Record<string, string>): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const question of VALUATION_QUESTIONS) {
    const value = values[questionField(question.id)];
    if (value && question.options.some((option) => option.value === value)) answers[question.id] = value;
  }
  return answers;
}

/** Hungarian question and answer text for the admin; unknown ids/values fall back to the raw key. */
export function describeAnswer(id: string, value: string): { question: string; answer: string } {
  const question = VALUATION_QUESTIONS.find((q) => q.id === id);
  const option = question?.options.find((o) => o.value === value);
  return { question: question?.label.hu ?? id, answer: option?.label.hu ?? value };
}
