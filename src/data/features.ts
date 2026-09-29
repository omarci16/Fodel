/**
 * Property feature vocabulary.
 *
 * Keys are stored in the content files; labels are resolved per locale so the
 * same listing reads correctly in every market. The list is drawn from what
 * FODEL say Dutch and Belgian buyers actually look for (FAQ Q19 and Q21):
 * hillside views, forest edge, waterfront, land for livestock, parking.
 */

import type { Locale } from '~/i18n/ui';

export const FEATURES: Record<string, Record<Locale, string> & Partial<Record<'en' | 'de', string>>> = {
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
  garage: { hu: 'Garázs', nl: 'Garage', en: 'Garage', de: 'Garage' },
  pool: { hu: 'Medence', nl: 'Zwembad', en: 'Pool', de: 'Pool' },
  balcony: { hu: 'Erkély', nl: 'Balkon', en: 'Balcony', de: 'Balkon' },
  carport: { hu: 'Fedett beálló', nl: 'Carport', en: 'Carport', de: 'Carport' },
  'storage-building': { hu: 'Tárolóépület', nl: 'Opslaggebouw', en: 'Storage building', de: 'Lagergebäude' },
  'barn-hall': { hu: 'Csarnok', nl: 'Schuur of hal', en: 'Barn or hall', de: 'Scheune oder Halle' },
  'animal-housing': { hu: 'Állattartásra alkalmas épület', nl: 'Dierenverblijf', en: 'Animal housing', de: 'Tierstall' },
  gazebo: { hu: 'Szaletli', nl: 'Prieel', en: 'Gazebo', de: 'Gartenpavillon' },
  'outdoor-oven': { hu: 'Kerti sütőde / kemence', nl: 'Buitenoven', en: 'Outdoor oven', de: 'Außenofen' },
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
