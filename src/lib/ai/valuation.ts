/**
 * Deterministic valuation core: comparables in SQL/JS, statistics in TS.
 * This produces the number — OpenAI, further down, only explains and nudges
 * it within a clamped ±15%. Published research on LLMs in automated real
 * estate valuation is consistent on this point, and standard AVM practice
 * agrees: comparables decide, a human reviews the edge cases.
 *
 * Deliberately NOT similarTo() from src/lib/properties.ts — that scorer reads
 * the public, content-collection-shaped `Property` (status === 'active',
 * no floor_m2 at all) and is exactly right for buyer-facing "similar
 * listings" (see src/pages/portal/database/people/[email].astro, which
 * reuses it unchanged for precisely that reason). Valuation comps need sold
 * listings too and a floor_m2 filter the public shape doesn't carry, so this
 * is a small, fresh scorer over the portal's own properties rows.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { callOpenAiJson, isAiEnabled } from './client';

const MIN_COMPS = 8;
const FLOOR_TOLERANCE = 0.35;

export type ValuationSubject = {
  category: string;
  county: string;
  region?: string | null;
  floorM2?: number | null;
};

export type Comp = {
  id: string;
  ref: string;
  priceEur: number;
  floorM2: number;
  pricePerM2: number;
  score: number;
};

export type ComparablesResult =
  | { ok: true; comps: Comp[]; medianPricePerM2: number; q1: number; q3: number }
  | { ok: false; comps: Comp[] };

/**
 * Same category; same county, falling back to region; floor_m2 within ±35%;
 * status in ('published', 'sold'); ordered by the score below; capped at 12.
 * Hard-gated at ≥8 comps — with six seeded listings this returns
 * `ok: false` far more often than not, which is the correct, expected
 * behaviour, not a bug to work around.
 */
export async function findComparables(
  client: SupabaseClient,
  subject: ValuationSubject
): Promise<ComparablesResult> {
  const { data } = await client
    .from('properties')
    .select('id, ref, category, county, region, price_eur, floor_m2')
    .eq('category', subject.category)
    .in('status', ['published', 'sold'])
    .not('floor_m2', 'is', null);

  const rows = (data ?? []) as {
    id: string;
    ref: string;
    county: string;
    region: string;
    price_eur: number;
    floor_m2: number;
  }[];

  const floor = subject.floorM2 ?? null;

  const scored = rows
    .filter((r) => {
      if (floor == null) return true;
      const ratio = r.floor_m2 / floor;
      return ratio >= 1 - FLOOR_TOLERANCE && ratio <= 1 + FLOOR_TOLERANCE;
    })
    .map((r) => {
      let score = 0;
      if (r.county === subject.county) score += 4;
      else if (subject.region && r.region === subject.region) score += 2;
      else return null; // neither county nor region matches — not a comparable at all
      if (floor != null) score += 2 - Math.abs(r.floor_m2 - floor) / floor;
      return {
        id: r.id,
        ref: r.ref,
        priceEur: r.price_eur,
        floorM2: r.floor_m2,
        pricePerM2: r.price_eur / r.floor_m2,
        score,
      };
    })
    .filter((c): c is Comp => c != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  if (scored.length < MIN_COMPS) return { ok: false, comps: scored };

  const perM2 = scored.map((c) => c.pricePerM2).sort((a, b) => a - b);
  const quantile = (p: number) => {
    const idx = (perM2.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return lo === hi ? perM2[lo] : perM2[lo] + (perM2[hi] - perM2[lo]) * (idx - lo);
  };

  return { ok: true, comps: scored, medianPricePerM2: quantile(0.5), q1: quantile(0.25), q3: quantile(0.75) };
}

export type ValuationBand = {
  lowEur: number;
  midEur: number;
  highEur: number;
  confidence: 'insufficient_data' | 'low' | 'medium' | 'high';
};

/** Confidence: a function of comp count and IQR width relative to the median — never a point estimate. */
export function bandFromComparables(result: ComparablesResult, floorM2: number): ValuationBand {
  if (!result.ok) return { lowEur: 0, midEur: 0, highEur: 0, confidence: 'insufficient_data' };

  const { medianPricePerM2, q1, q3, comps } = result;
  const iqrRatio = medianPricePerM2 > 0 ? (q3 - q1) / medianPricePerM2 : 1;

  let confidence: ValuationBand['confidence'] = 'low';
  if (comps.length >= 10 && iqrRatio < 0.3) confidence = 'high';
  else if (comps.length >= 8 && iqrRatio < 0.5) confidence = 'medium';

  return {
    lowEur: Math.round(q1 * floorM2),
    midEur: Math.round(medianPricePerM2 * floorM2),
    highEur: Math.round(q3 * floorM2),
    confidence,
  };
}

export type AiAdjustment = {
  adjustmentPercent: number;
  confidence: 'low' | 'medium' | 'high';
  rationaleHu: string;
  rationaleNl: string;
  factors: string[];
};

const SCHEMA = {
  type: 'object',
  properties: {
    adjustmentPercent: { type: 'number' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    rationaleHu: { type: 'string' },
    rationaleNl: { type: 'string' },
    factors: { type: 'array', items: { type: 'string' } },
  },
  required: ['adjustmentPercent', 'confidence', 'rationaleHu', 'rationaleNl', 'factors'],
  additionalProperties: false,
};

/**
 * Bounded to what the deterministic band already decided: this can nudge the
 * mid-point by at most ±15% and explain why in both languages. It cannot
 * invent a price — there is no code path where its output becomes the
 * number shown to anyone before an admin has reviewed it.
 */
export async function aiAdjustment(opts: {
  subject: ValuationSubject & { condition?: string | null; yearBuilt?: number | null };
  band: ValuationBand;
  comps: Comp[];
}): Promise<AiAdjustment | null> {
  if (!isAiEnabled()) return null;

  const system =
    'You are a real-estate pricing assistant for a Hungarian agency selling to Western European buyers. ' +
    'You are given a deterministic comparables-based price band that has ALREADY been computed — you do ' +
    'not set the price. Your only job is to suggest a small adjustment (-15 to 15 percent) to the mid-point ' +
    'based on facts not already reflected in the comps (condition, year built), and explain it briefly in ' +
    'both Hungarian and Dutch. Never claim a fact not given to you. Never mention an exact price beyond the ' +
    'band you were given.';

  const user = JSON.stringify({ subject: opts.subject, band: opts.band, comps: opts.comps });

  try {
    const result = await callOpenAiJson<{
      adjustmentPercent: number;
      confidence: string;
      rationaleHu: string;
      rationaleNl: string;
      factors: string[];
    }>({ system, user, schema: SCHEMA, schemaName: 'valuation_adjustment', maxTokens: 500 });

    return {
      adjustmentPercent: Math.max(-15, Math.min(15, result.adjustmentPercent)),
      confidence: (['low', 'medium', 'high'] as const).includes(result.confidence as any)
        ? (result.confidence as 'low' | 'medium' | 'high')
        : 'low',
      rationaleHu: result.rationaleHu,
      rationaleNl: result.rationaleNl,
      factors: result.factors,
    };
  } catch (error) {
    console.error('[ai] valuation adjustment failed', error);
    return null;
  }
}
