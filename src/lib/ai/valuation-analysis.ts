/**
 * Qualitative AI review of one valuation request: what the customer wrote,
 * their photos and documents (floor plans, permits…), the statistical
 * baseline and the OpenStreetMap surroundings, read together.
 *
 * It is a second pair of eyes for the person who sets the band, not a source
 * of numbers: the schema has no price and no percentage in it, and nothing
 * here is shown to a customer. Server-side only — keys and prompts never
 * reach the browser. Always admin-triggered (see the valuation action route),
 * never inside the public form's POST.
 */
import { callOpenAiJson, isAiEnabled, AiError } from './client';

export type AnalysisDriver = {
  text: string;
  direction: 'plus' | 'minus' | 'unsure';
  source: 'customer' | 'photos' | 'documents' | 'location' | 'statistics';
};

export type ValuationAnalysis = {
  summaryHu: string;
  valueDrivers: AnalysisDriver[];
  inconsistencies: string[];
  missingInfo: string[];
  documentsReviewed: { name: string; finding: string }[];
  photoObservations: string[];
  bandPosition: 'lower' | 'middle' | 'upper' | 'unclear';
  confidence: 'low' | 'medium' | 'high';
  /** What the model actually saw — shown beside the result so a reviewer knows its limits. */
  inputs: { photos: number; documents: string[]; documentsNotRead: string[] };
};

const SCHEMA = {
  type: 'object',
  properties: {
    summaryHu: { type: 'string' },
    valueDrivers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          direction: { type: 'string', enum: ['plus', 'minus', 'unsure'] },
          source: { type: 'string', enum: ['customer', 'photos', 'documents', 'location', 'statistics'] },
        },
        required: ['text', 'direction', 'source'],
        additionalProperties: false,
      },
    },
    inconsistencies: { type: 'array', items: { type: 'string' } },
    missingInfo: { type: 'array', items: { type: 'string' } },
    documentsReviewed: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, finding: { type: 'string' } },
        required: ['name', 'finding'],
        additionalProperties: false,
      },
    },
    photoObservations: { type: 'array', items: { type: 'string' } },
    bandPosition: { type: 'string', enum: ['lower', 'middle', 'upper', 'unclear'] },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
  required: ['summaryHu', 'valueDrivers', 'inconsistencies', 'missingInfo', 'documentsReviewed', 'photoObservations', 'bandPosition', 'confidence'],
  additionalProperties: false,
};

const SYSTEM =
  'You assist a Hungarian real-estate agency reviewing an indicative valuation request. Write in Hungarian. ' +
  'You receive: the customer\'s own answers, a statistical price band (KSH statistics or comparable FODEL listings) ' +
  'that was ALREADY computed, a summary of the surroundings from OpenStreetMap, and possibly photos and documents. ' +
  'You do NOT set, adjust or estimate any price: never output an amount, a percentage or a multiplier. ' +
  'Your job: (1) list factors that plausibly push the value up or down and say where each comes from; ' +
  '(2) flag anything where the customer\'s statements disagree with the photos or documents, or with each other; ' +
  '(3) list information still missing that a valuer would need; (4) say what each document shows; ' +
  '(5) say whether the property seems to sit in the lower, middle or upper part of the statistical band, or "unclear". ' +
  'State only what the provided material shows. If a document or photo is unreadable or irrelevant, say so. ' +
  'This is an internal working note for a human reviewer, not an official valuation.';

export type AnalysisInput = {
  facts: Record<string, unknown>;
  baseline: unknown;
  band: { lowHuf: number | null; midHuf: number | null; highHuf: number | null };
  nearby: unknown;
  /** Public-reachable (signed, short-lived) image URLs. */
  imageUrls: string[];
  pdfs: { name: string; base64: string }[];
  /** Documents listed to the model by name only — too large or a type it cannot read. */
  documentsNotRead: string[];
};

export async function analyseValuation(input: AnalysisInput): Promise<ValuationAnalysis> {
  if (!isAiEnabled()) throw new AiError('ai-disabled');

  const parts: Record<string, unknown>[] = [
    ...input.imageUrls.map((url) => ({ type: 'image_url', image_url: { url, detail: 'low' } })),
    ...input.pdfs.map((pdf) => ({ type: 'file', file: { filename: pdf.name, file_data: `data:application/pdf;base64,${pdf.base64}` } })),
  ];

  const result = await callOpenAiJson<Omit<ValuationAnalysis, 'inputs'>>({
    system: SYSTEM,
    user: JSON.stringify({
      customerFacts: input.facts,
      statisticalBand: { ...input.band, basis: input.baseline },
      surroundings: input.nearby,
      attachments: {
        photosAttached: input.imageUrls.length,
        pdfsAttached: input.pdfs.map((pdf) => pdf.name),
        documentsNotOpened: input.documentsNotRead,
      },
    }),
    userParts: parts,
    schema: SCHEMA,
    schemaName: 'valuation_review',
    maxTokens: 1400,
    timeoutMs: 45_000,
    retry: false,
  });

  const clean = (list: unknown) => (Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : []);
  return {
    summaryHu: String(result.summaryHu ?? ''),
    valueDrivers: Array.isArray(result.valueDrivers) ? result.valueDrivers.filter((driver) => driver?.text) : [],
    inconsistencies: clean(result.inconsistencies),
    missingInfo: clean(result.missingInfo),
    documentsReviewed: Array.isArray(result.documentsReviewed) ? result.documentsReviewed.filter((doc) => doc?.name) : [],
    photoObservations: clean(result.photoObservations),
    bandPosition: (['lower', 'middle', 'upper', 'unclear'] as const).includes(result.bandPosition) ? result.bandPosition : 'unclear',
    confidence: (['low', 'medium', 'high'] as const).includes(result.confidence) ? result.confidence : 'low',
    inputs: { photos: input.imageUrls.length, documents: input.pdfs.map((pdf) => pdf.name), documentsNotRead: input.documentsNotRead },
  };
}
