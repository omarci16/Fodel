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
  if (!valuation) return json(404, { ok: false, error: 'not-found' });

  if (action === 'compute') {
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
    if (error) return json(500, { ok: false, error: error.message });

    return json(200, { ok: true, status: 'needs_review' });
  }

  if (action === 'approve' || action === 'reject') {
    const lowEur = typeof body.lowEur === 'number' ? body.lowEur : valuation.low_eur;
    const midEur = typeof body.midEur === 'number' ? body.midEur : valuation.mid_eur;
    const highEur = typeof body.highEur === 'number' ? body.highEur : valuation.high_eur;
    const note = typeof body.note === 'string' ? body.note : valuation.admin_note;

    const { error } = await admin
      .from('valuations')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        low_eur: lowEur,
        mid_eur: midEur,
        high_eur: highEur,
        admin_note: note,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) return json(500, { ok: false, error: error.message });

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
    if (valuation.source === 'public_lead' && valuation.contact_email) {
      const locale = 'hu' as const; // the public form has no locale field to read back; hu is FODEL's own default
      if (action === 'approve') {
        await deliver(
          valuation.contact_email,
          templates.valuationReady(locale, {
            range: `${eur(lowEur)} – ${eur(highEur)}`,
            compCount: valuation.comp_count,
            submitAdUrl: `https://fodel.hu/hu/hirdetes-feladasa/`,
          })
        );
      } else {
        await deliver(valuation.contact_email, templates.valuationDeclined(locale));
      }
    }

    return json(200, { ok: true });
  }

  return json(400, { ok: false, error: 'unknown-action' });
};
