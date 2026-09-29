/**
 * Compute, approve or reject one valuation. `compute` is the one place the
 * AI call happens — always admin-triggered, never inside the public form's
 * POST (see src/pages/api/valuation.ts), because a strict-JSON-schema OpenAI
 * call routinely takes 10-30s and Vercel's Hobby tier caps a function at 10s.
 */
import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { findComparables, bandFromComparables, aiAdjustment } from '~/lib/ai/valuation';
import { deliver, templates } from '~/lib/email/send';
import { eur } from '~/lib/format';
import { logEvent } from '~/lib/activity';
import { SITE_URL } from '~/config/site.mjs';
import { path } from '~/i18n/ui';
import { friendlyError } from '~/lib/portal/labels';
import { estimateValuation } from '~/lib/valuation/estimate';
import { getCompany } from '~/lib/runtime-config';
import places from '~/data/market/hu-settlements.json';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { profile, user } = locals;
  if (profile?.role !== 'admin') return json(403, { ok: false });

  const { id } = params;
  const admin = createSupabaseAdminClient();
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? '');

  const { data: valuation } = await admin.from('valuations').select('*').eq('id', id).maybeSingle();
  if (!valuation) return json(404, { ok: false, error: 'A becslés nem található.' });

  // The lead's own language, from the form they filled in (migration 0014).
  // Rows from before 0014 have no locale and were Hungarian-form leads.
  const leadLocale = valuation.locale === 'nl' ? 'nl' : 'hu';
  const isLead = valuation.source === 'public_lead' && Boolean(valuation.contact_email);

  if (action === 'request_info') {
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '';
    if (!note) return json(422, { ok: false, error: 'Írja le, milyen adatot vagy képet kér az ügyféltől.' });
    if (!isLead) return json(422, { ok: false, error: 'Ennek a becslésnek nincs ügyfél e-mail címe — hiánypótlás nem kérhető.' });

    const { error } = await admin
      .from('valuations')
      .update({ status: 'needs_info', info_request: note, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: friendlyError(error.message) });

    await deliver(valuation.contact_email, templates.valuationNeedsInfo(leadLocale, { note }));
    await logEvent({
      kind: 'valuation.info_requested',
      actorId: user?.id ?? null,
      actorEmail: profile?.email ?? null,
      subjectType: 'valuation',
      subjectId: id,
      locale: leadLocale,
      source: 'portal',
    }).catch(() => {});
    return json(200, { ok: true, status: 'needs_info' });
  }

  if (action === 'compute') {
    if ('baseline' in valuation && valuation.floor_m2) {
      const company = await getCompany();
      const estimate = await estimateValuation(admin, { category: valuation.category, county: valuation.county,
        floorM2: valuation.floor_m2, kshCode: valuation.ksh_code,
        countyCode: (places as [string,string,string,number][]).find((entry) => entry[0] === valuation.ksh_code)?.[2]
          ?? (places as [string,string,string,number][]).find((entry) => entry[3] === 0 && entry[1].replace(' vármegye','') === valuation.county)?.[0],
        wallType: valuation.answers?.falazat, bandPercent: company.services.valuationBandPercent });
      const rate = company.services.eurHufRateDate ? company.services.eurHufRate : null;
      const { error } = await admin.from('valuations').update({
        status: estimate.midHuf ? 'needs_review' : 'insufficient_data',
        low_huf: estimate.lowHuf, mid_huf: estimate.midHuf, high_huf: estimate.highHuf,
        low_eur: rate && estimate.lowHuf ? Math.round(estimate.lowHuf / rate) : null,
        mid_eur: rate && estimate.midHuf ? Math.round(estimate.midHuf / rate) : null,
        high_eur: rate && estimate.highHuf ? Math.round(estimate.highHuf / rate) : null,
        baseline: estimate.baseline, comp_count: estimate.baseline?.kind === 'comps' ? estimate.baseline.count : 0,
        ai_adjustment_percent: null,
      }).eq('id', id);
      return error ? json(500, { ok: false, error: friendlyError(error.message) }) : json(200, { ok: true, status: estimate.midHuf ? 'needs_review' : 'insufficient_data' });
    }
    const subject = {
      category: valuation.category,
      county: valuation.county,
      region: valuation.region,
      floorM2: valuation.floor_m2,
    };
    const result = await findComparables(admin, subject);

    if (!result.ok || !valuation.floor_m2) {
      await admin
        .from('valuations')
        .update({ status: 'insufficient_data', comps: result.comps, comp_count: result.comps.length })
        .eq('id', id);
      return json(200, { ok: true, status: 'insufficient_data' });
    }

    const band = bandFromComparables(result, valuation.floor_m2);
    const adjustment = await aiAdjustment({
      subject: { ...subject, condition: valuation.condition, yearBuilt: valuation.year_built },
      band,
      comps: result.comps,
    });

    const { error } = await admin
      .from('valuations')
      .update({
        status: 'needs_review',
        comps: result.comps,
        comp_count: result.comps.length,
        median_eur_per_m2: result.medianPricePerM2,
        low_eur: band.lowEur,
        mid_eur: band.midEur,
        high_eur: band.highEur,
        ai_adjustment_percent: adjustment?.adjustmentPercent ?? null,
        ai_confidence: adjustment?.confidence ?? null,
        ai_rationale_hu: adjustment?.rationaleHu ?? null,
        ai_rationale_nl: adjustment?.rationaleNl ?? null,
        ai_factors: adjustment?.factors ?? null,
      })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: friendlyError(error.message) });

    return json(200, { ok: true, status: 'needs_review' });
  }

  if (action === 'approve' || action === 'reject') {
    const hasHuf = 'low_huf' in valuation;
    const lowHuf = typeof body.lowHuf === 'number' ? body.lowHuf : valuation.low_huf;
    const midHuf = typeof body.midHuf === 'number' ? body.midHuf : valuation.mid_huf;
    const highHuf = typeof body.highHuf === 'number' ? body.highHuf : valuation.high_huf;
    const lowEur = typeof body.lowEur === 'number' ? body.lowEur : valuation.low_eur;
    const midEur = typeof body.midEur === 'number' ? body.midEur : valuation.mid_eur;
    const highEur = typeof body.highEur === 'number' ? body.highEur : valuation.high_eur;
    const note = typeof body.note === 'string' ? body.note : valuation.admin_note;

    // Nothing goes out without a price band a person has looked at.
    if (action === 'approve') {
      const values = hasHuf ? [lowHuf, midHuf, highHuf] : [lowEur, midEur, highEur];
      const valid = values.every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0);
      if (!valid || values[0] > values[1] || values[1] > values[2]) {
        return json(422, { ok: false, error: 'Jóváhagyás előtt adjon meg érvényes ár-sávot (alsó ≤ közép ≤ felső, mind nagyobb nullánál).' });
      }
    }

    const { error } = await admin
      .from('valuations')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        low_eur: lowEur,
        mid_eur: midEur,
        high_eur: highEur,
        ...(hasHuf ? { low_huf: lowHuf, mid_huf: midHuf, high_huf: highHuf } : {}),
        admin_note: note,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: friendlyError(error.message) });

    await logEvent({
      kind: action === 'approve' ? 'valuation.approved' : 'valuation.rejected',
      actorId: user?.id ?? null,
      actorEmail: profile?.email ?? null,
      subjectType: 'valuation',
      subjectId: id,
      propertyId: valuation.property_id,
      source: 'portal',
    }).catch(() => {});

    // Only the public-lead surface has a contact to email — an admin-review
    // valuation on an existing listing is for the admin's own pricing
    // decision, not a message to the seller.
    if (isLead) {
      if (action === 'approve') {
        const company = await getCompany();
        const rate = company.services.eurHufRateDate ? company.services.eurHufRate : null;
        const display = (huf: number, euro: number) => leadLocale === 'nl' && rate && hasHuf && huf > 0
          ? eur(Math.round(huf / rate)) : hasHuf ? new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(huf) : eur(euro);
        const baseline = valuation.baseline as { kind?: string; count?: number; year?: number; level?: string; url?: string; retrievedAt?: string } | null;
        const basis = baseline?.kind === 'ksh'
          ? leadLocale === 'nl' ? `KSH Ingatlanadattár, ${baseline.year} (${baseline.level === 'county' ? 'provincie' : 'plaats'}, ${baseline.count} gegevens)`
            : `KSH Ingatlanadattár, ${baseline.year} (${baseline.level === 'county' ? 'vármegye' : 'település'}, ${baseline.count} adat)`
          : baseline?.kind === 'comps' ? leadLocale === 'nl' ? `${baseline.count} vergelijkbare FODEL-advertenties` : `${baseline.count} hasonló FODEL-hirdetés` : undefined;
        await deliver(
          valuation.contact_email,
          templates.valuationReady(leadLocale, {
            range: `${display(lowHuf, lowEur)} – ${display(highHuf, highEur)}`,
            mid: display(midHuf, midEur), basis,
            sourceUrl: baseline?.kind === 'ksh' ? baseline.url : undefined,
            sourceDate: baseline?.kind === 'ksh' ? `${baseline.year}, ${leadLocale === 'nl' ? 'opgehaald' : 'letöltve'} ${baseline.retrievedAt ?? '—'}` : undefined,
            rateDate: leadLocale === 'nl' && rate ? company.services.eurHufRateDate ?? undefined : undefined,
            factors: Array.isArray(valuation.factors) ? valuation.factors : [],
            notice: company.services.valuationNotice?.[leadLocale],
            compCount: valuation.comp_count ?? 0,
            submitAdUrl: `${SITE_URL}${path(leadLocale, 'submitAd')}`,
            visitUrl: `${SITE_URL}${path(leadLocale, 'valuation')}?service=onsite-visit`,
            judicialUrl: `${SITE_URL}${path(leadLocale, 'valuation')}?service=judicial`,
          })
        );
      } else {
        await deliver(valuation.contact_email, templates.valuationDeclined(leadLocale));
      }
    }

    return json(200, { ok: true });
  }

  return json(400, { ok: false, error: 'Ismeretlen művelet.' });
};
