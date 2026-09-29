/** Deterministic, unadjusted valuation baseline. No invented multipliers. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { findComparables } from '~/lib/ai/valuation';
import snapshot from '~/data/market/ksh-lakasarak-latest.json';

type Row = (typeof snapshot.rows)[number];
type Category = 'cshaz' | 'tobbl' | 'panel';
export type Baseline = {
  kind: 'comps' | 'ksh'; source: string; year: number | null; count: number;
  level: 'county' | 'settlement' | 'comps'; category: Category | null;
  dispersionPercent?: number | null; url?: string;
  retrievedAt?: string;
};
export type Estimate = { lowHuf: number | null; midHuf: number | null; highHuf: number | null; baseline: Baseline | null };

export function kshCategory(category: string, wallType?: string | null): Category | null {
  if (category === 'apartment') return wallType === 'panel' ? 'panel' : 'tobbl';
  if (['house', 'holiday', 'farm', 'mansion'].includes(category)) return 'cshaz';
  return null;
}

export function kshEstimate(input: { category: string; floorM2: number; kshCode?: string | null; countyCode?: string | null; wallType?: string | null; bandPercent?: number | null }): Estimate {
  const empty: Estimate = { lowHuf: null, midHuf: null, highHuf: null, baseline: null };
  const kind = kshCategory(input.category, input.wallType);
  if (!kind || !Number.isFinite(input.floorM2) || input.floorM2 <= 0) return empty;
  const rows = snapshot.rows as Row[];
  const use = (row: Row | undefined) => row && row[kind] && row[kind]![0] > 0 ? row : null;
  const settlement = use(rows.find((row) => row.level === 'settlement' && row.code === input.kshCode));
  const row = settlement ?? use(rows.find((entry) => entry.level === 'county' && entry.code === input.countyCode));
  if (!row) return empty;
  const [thousandHufM2, count] = row[kind]!;
  const midHuf = Math.round(thousandHufM2 * 1000 * input.floorM2);
  const band = input.bandPercent && input.bandPercent > 0 ? input.bandPercent / 100 : null;
  return {
    lowHuf: band === null ? null : Math.round(midHuf * (1 - band)),
    midHuf,
    highHuf: band === null ? null : Math.round(midHuf * (1 + band)),
    baseline: { kind: 'ksh', source: snapshot.meta.source, year: snapshot.meta.year, count,
      level: row.level as 'county' | 'settlement', category: kind,
      dispersionPercent: row.dispersionPercent, url: snapshot.meta.url, retrievedAt: snapshot.meta.retrievedAt },
  };
}

export async function estimateValuation(client: SupabaseClient, input: {
  category: string; county: string; floorM2: number; kshCode?: string | null;
  countyCode?: string | null; wallType?: string | null; bandPercent?: number | null;
}): Promise<Estimate> {
  const comps = await findComparables(client, { category: input.category, county: input.county, floorM2: input.floorM2 });
  if (comps.ok) {
    const values = comps.comps.map((c) => c.priceHuf / c.floorM2).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
    if (values.length >= 8) {
      const q = (p: number) => { const i = (values.length - 1) * p; const lo = Math.floor(i); const hi = Math.ceil(i); return values[lo] + (values[hi] - values[lo]) * (i - lo); };
      return { lowHuf: Math.round(q(.25) * input.floorM2), midHuf: Math.round(q(.5) * input.floorM2),
        highHuf: Math.round(q(.75) * input.floorM2), baseline: { kind: 'comps', source: 'FODEL hirdetések', year: null,
          count: values.length, level: 'comps', category: null } };
    }
  }
  return kshEstimate(input);
}
