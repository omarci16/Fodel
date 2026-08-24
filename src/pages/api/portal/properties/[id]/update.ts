/**
 * Saves the editor's field values. Never changes `status` — that is a
 * separate, deliberate action (see status.ts, Stage 4) so "I edited some
 * text" and "I am submitting this for review" can never be conflated.
 *
 * This is server-side re-validation on top of RLS, per the plan's security
 * section: RLS already refuses the UPDATE outright if the caller doesn't own
 * the row or the row isn't in an editable status, but re-checking here first
 * means the seller gets a clear message instead of a silent no-op.
 */
import type { APIRoute } from 'astro';
import { LOCALE_OPTIONS } from '~/lib/portal/properties';

export const prerender = false;

const str = (form: FormData, key: string): string => String(form.get(key) ?? '').trim();
const num = (form: FormData, key: string): number | null => {
  const v = str(form, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const POST: APIRoute = async ({ request, params, locals, redirect }) => {
  const { id } = params;
  const { supabase, profile, user } = locals;
  const form = await request.formData();

  const back = (query: string) => redirect(`/portal/properties/${id}?${query}`);

  const { data: existing, error: fetchError } = await supabase
    .from('properties')
    .select('id, owner_id, status')
    .eq('id', id)
    .maybeSingle();
  if (fetchError || !existing) return back('error=not-found');

  const isAdmin = profile?.role === 'admin';
  const isOwner = existing.owner_id === user?.id;
  if (!isAdmin && !isOwner) return back('error=forbidden');
  if (!isAdmin && !['draft', 'changes_requested'].includes(existing.status)) {
    return back('error=' + encodeURIComponent('ez a hirdetés jelenleg nem szerkeszthető'));
  }

  const patch = {
    category: str(form, 'category'),
    settlement: str(form, 'settlement'),
    county: str(form, 'county'),
    region: str(form, 'region'),
    lat: num(form, 'lat'),
    lng: num(form, 'lng'),
    precision: str(form, 'precision') || 'approximate',
    price_eur: num(form, 'price_eur') ?? 0,
    price_huf: num(form, 'price_huf') ?? 0,
    price_asof: str(form, 'price_asof') || new Date().toISOString().slice(0, 10),
    price_negotiable: form.get('price_negotiable') === 'yes',
    floor_m2: num(form, 'floor_m2'),
    plot_m2: num(form, 'plot_m2') ?? 0,
    bedrooms: num(form, 'bedrooms'),
    bathrooms: num(form, 'bathrooms'),
    year_built: num(form, 'year_built'),
    renovated_in: num(form, 'renovated_in'),
    epc_class: str(form, 'epc_class') || 'pending',
    features: form.getAll('features').map(String),
    video_url: str(form, 'video_url') || null,
    seller_contact_visible: form.get('seller_contact_visible') === 'yes',
    seller_name: str(form, 'seller_name') || null,
    seller_phone: str(form, 'seller_phone') || null,
    seller_speaks: form.getAll('seller_speaks').map(String),
    ...(form.has('reserved') || existing.status === 'published'
      ? { reserved: form.get('reserved') === 'yes' }
      : {}),
  };

  if (!patch.settlement || !patch.county || !patch.region || patch.lat == null || patch.lng == null) {
    return back('error=' + encodeURIComponent('minden helyszín mező kitöltése kötelező'));
  }

  const { error: updateError } = await supabase.from('properties').update(patch).eq('id', id);
  if (updateError) return back('error=' + encodeURIComponent(updateError.message));

  for (const { value: locale } of LOCALE_OPTIONS) {
    const title = str(form, `title_${locale}`);
    const description = str(form, `description_${locale}`);

    if (locale === 'hu' && (!title || !description)) {
      return back('error=' + encodeURIComponent('a magyar cím és leírás kitöltése kötelező'));
    }

    if (!title && !description) {
      // Nothing entered for this locale — make sure no stale translation lingers.
      await supabase.from('property_translations').delete().eq('property_id', id).eq('locale', locale);
      continue;
    }

    const row = {
      property_id: id,
      locale,
      title: title || description.slice(0, 60),
      subtitle: str(form, `subtitle_${locale}`) || null,
      description,
      body: str(form, `body_${locale}`),
      condition: str(form, `condition_${locale}`) || null,
      heating: str(form, `heating_${locale}`) || null,
      tag: str(form, `tag_${locale}`) || null,
    };
    const { error: trError } = await supabase
      .from('property_translations')
      .upsert(row, { onConflict: 'property_id,locale' });
    if (trError) return back('error=' + encodeURIComponent(trError.message));
  }

  return back('saved=1');
};
