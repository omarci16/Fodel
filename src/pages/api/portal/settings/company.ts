import type { APIRoute } from 'astro';
export const prerender = false;
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (locals.profile?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const form = await request.formData();
  const current = await locals.supabase.from('site_settings').select('*').eq('id', 1).single();
  if (current.error) return redirect('/portal/settings/company?error=' + encodeURIComponent(current.error.message));
  const row = current.data;
  const phones = [0,1,2].map((index) => ({
    ...(row.phones?.[index] ?? {}),
    display: String(form.get(`phone_${index}`) ?? '').trim(),
    href: `tel:${String(form.get(`phone_${index}`) ?? '').replace(/[^+\d]/g, '')}`,
    public: form.get(`phone_${index}_public`) === 'yes',
  })).filter((phone) => phone.display);
  const patch = {
    names: {
      ...row.names,
      legal: String(form.get('name_legal') ?? '').trim(),
      hu: String(form.get('name_hu') ?? '').trim(),
      nl: String(form.get('name_nl') ?? '').trim(),
    },
    phones,
    emails: { ...row.emails, primary: String(form.get('email') ?? '').trim() },
    founded: Number(form.get('founded')),
    founded_in: String(form.get('founded_in') ?? '').trim(),
    principal: String(form.get('principal') ?? '').trim(),
    registration: {
      ...row.registration,
      kvk: String(form.get('kvk') ?? '').trim() || null,
      vat: String(form.get('vat') ?? '').trim(),
      vatVerified: form.get('vat_verified') === 'yes',
    },
    address: { ...row.address, street: String(form.get('street') ?? '').trim(), postalCode: String(form.get('postal_code') ?? '').trim(), city: String(form.get('city') ?? '').trim(), oneLine: String(form.get('address_one_line') ?? '').trim() },
    hours: {
      weekdays: { from: String(form.get('hours_from') ?? ''), to: String(form.get('hours_to') ?? '') },
      callback: { to: String(form.get('callback_to') ?? ''), includesWeekends: form.get('callback_weekends') === 'yes' },
    },
    banks: {
      nl: { iban: String(form.get('iban') ?? '').trim(), bic: String(form.get('bic') ?? '').trim() },
      hu: { account: String(form.get('hu_account') ?? '').trim() },
    },
    social: {
      youtube: String(form.get('youtube') ?? '').trim(),
      facebookNl: String(form.get('facebook_nl') ?? '').trim(),
      facebookHu: String(form.get('facebook_hu') ?? '').trim(),
    },
    reach: { countries: Number(form.get('reach_countries')), languages: Number(form.get('reach_languages')) },
  };
  const { error } = await locals.supabase.from('site_settings').update(patch).eq('id', 1);
  return redirect(error ? '/portal/settings/company?error=' + encodeURIComponent(error.message) : '/portal/settings/company?saved=1');
};
