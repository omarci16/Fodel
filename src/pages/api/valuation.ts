import type { APIRoute } from 'astro';
import { handleForm } from '~/lib/form-handler';
import { createSupabaseAdminClient } from '~/lib/supabase-server';

export const prerender = false;

/**
 * The public valuation lead magnet. Writes `status = 'queued'` and returns
 * immediately — the AI call (and even the deterministic comps query) never
 * runs inside this POST. An admin triggers the actual computation from
 * /portal/valuations, where a 25-30s round trip is fine and a failure is
 * visible; this endpoint's only job is to capture the lead.
 */
export const POST: APIRoute = (context) =>
  handleForm(context, {
    id: 'valuation',
    activityKind: 'valuation.requested',
    subject: 'ÉRTÉKBECSLÉS IGÉNY / Waardebepaling aanvraag',
    fields: [
      { name: 'name', label: 'Név', required: true, maxLength: 120 },
      { name: 'email', label: 'E-mail', type: 'email', required: true, maxLength: 160 },
      { name: 'phone', label: 'Telefon', type: 'tel', maxLength: 40 },
      { name: 'category', label: 'Típus', required: true, maxLength: 60 },
      { name: 'county', label: 'Megye', required: true, maxLength: 60 },
      { name: 'settlement', label: 'Település', maxLength: 120 },
      { name: 'floorM2', label: 'Alapterület (m²)', type: 'number', maxLength: 12 },
      { name: 'plotM2', label: 'Telek (m²)', type: 'number', maxLength: 12 },
      { name: 'yearBuilt', label: 'Építés éve', type: 'number', maxLength: 6 },
      { name: 'condition', label: 'Állapot', maxLength: 200 },
    ],
    onSuccess: async (values) => {
      const admin = createSupabaseAdminClient();
      await admin.from('valuations').insert({
        source: 'public_lead',
        category: values.category,
        county: values.county,
        settlement: values.settlement || null,
        floor_m2: values.floorM2 ? Number(values.floorM2) : null,
        plot_m2: values.plotM2 ? Number(values.plotM2) : null,
        year_built: values.yearBuilt ? Number(values.yearBuilt) : null,
        condition: values.condition || null,
        contact_name: values.name,
        contact_email: values.email,
        contact_phone: values.phone || null,
        status: 'queued',
      });
    },
  });
