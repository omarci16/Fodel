import type { APIRoute } from 'astro';
import { handleForm } from '~/lib/form-handler';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { processAndUploadImage } from '~/lib/media';
import { VALUATION_QUESTIONS, questionField, pickAnswers } from '~/data/valuation-questions';

export const prerender = false;

/** Photos a visitor can attach. The browser scales them down first (ValuationPage). */
const MAX_PHOTOS = 6;
const PHOTO_BUCKET = 'valuation-media';

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
      // Listed as fields so the office notification shows the answers too.
      ...VALUATION_QUESTIONS.map((question) => ({
        name: questionField(question.id),
        label: question.label.hu,
        maxLength: 60,
      })),
    ],
    onSuccess: async (values, extras, form) => {
      const admin = createSupabaseAdminClient();
      const id = crypto.randomUUID();

      const base = {
        id,
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
      };

      // Every photo goes through sharp (EXIF/GPS stripped, re-encoded) into a
      // private bucket. One unreadable photo must not cost the whole lead.
      const files = form
        .getAll('photos')
        .filter((entry): entry is File => entry instanceof File && entry.size > 0)
        .slice(0, MAX_PHOTOS);
      const photos: { path: string; width: number; height: number }[] = [];
      for (const file of files) {
        try {
          const uploaded = await processAndUploadImage(admin, id, file, PHOTO_BUCKET);
          photos.push({ path: uploaded.path, width: uploaded.width, height: uploaded.height });
        } catch (error) {
          console.error('[form:valuation] photo skipped', error);
        }
      }

      const { error } = await admin.from('valuations').insert({
        ...base,
        locale: extras.Locale === 'nl' ? 'nl' : 'hu',
        answers: pickAnswers(values),
        photos,
      });
      if (!error) return;

      // Before migration 0014 the new columns do not exist yet — the lead is
      // still worth keeping without them (the office email has the answers).
      if (/column|schema cache/i.test(error.message)) {
        const retry = await admin.from('valuations').insert(base);
        if (retry.error) throw retry.error;
        return;
      }
      throw error;
    },
  });
