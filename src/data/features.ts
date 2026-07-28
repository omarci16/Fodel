/**
 * Property feature vocabulary.
 *
 * Keys are stored in the content files; labels are resolved per locale so the
 * same listing reads correctly in every market. The list is drawn from what
 * FODEL say Dutch and Belgian buyers actually look for (FAQ Q19 and Q21):
 * hillside views, forest edge, waterfront, land for livestock, parking.
 */

import type { Locale } from '~/i18n/ui';

export const FEATURES: Record<string, Record<Locale, string>> = {
  'panoramic-view': { hu: 'Panorámás kilátás', nl: 'Panoramisch uitzicht' },
  waterfront: { hu: 'Közvetlen vízpart', nl: 'Direct aan het water' },
  'private-jetty': { hu: 'Saját stég', nl: 'Eigen steiger' },
  boathouse: { hu: 'Csónakház', nl: 'Botenhuis' },
  hillside: { hu: 'Dombtetőn', nl: 'Op een heuvel' },
  'forest-adjacent': { hu: 'Erdő közelében', nl: 'Nabij het bos' },
  vineyard: { hu: 'Szőlőskert', nl: 'Wijngaard' },
  winery: { hu: 'Működő pincészet', nl: 'Werkend wijngoed' },
  cellar: { hu: 'Borospince', nl: 'Wijnkelder' },
  orchard: { hu: 'Gyümölcsös', nl: 'Boomgaard' },
  well: { hu: 'Saját kút', nl: 'Eigen put' },
  outbuildings: { hu: 'Gazdasági épületek', nl: 'Bijgebouwen' },
  stables: { hu: 'Lovarda, istálló', nl: 'Paardenstal' },
  guesthouse: { hu: 'Vendégház', nl: 'Gastenverblijf' },
  park: { hu: 'Park', nl: 'Park' },
  terrace: { hu: 'Terasz', nl: 'Terras' },
  'original-beams': { hu: 'Eredeti gerendázat', nl: 'Oorspronkelijke balken' },
  renovated: { hu: 'Felújított', nl: 'Gerenoveerd' },
  parking: { hu: 'Parkolás a telken', nl: 'Parkeren op eigen terrein' },
};

export function featureLabel(key: string, locale: Locale): string {
  return FEATURES[key]?.[locale] ?? key;
}

/** Hungarian counties FODEL actively market, for region landing pages. */
export const COUNTIES = [
  'Baranya',
  'Tolna',
  'Zala',
  'Somogy',
  'Veszprém',
  'Bács-Kiskun',
  'Pest',
] as const;
