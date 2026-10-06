import type { APIRoute } from 'astro';
import { handleForm } from '~/lib/form-handler';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { processAndUploadImage } from '~/lib/media';
import { VALUATION_QUESTIONS, questionField, pickAnswers } from '~/data/valuation-questions';
import { FEATURES } from '~/data/features';
import { CATEGORY_FALLBACK, path } from '~/i18n/ui';
import { getCompany } from '~/lib/runtime-config';
import { estimateValuation } from '~/lib/valuation/estimate';
import { createServiceRequest, serviceName, servicePrice } from '~/lib/portal/service-requests';
import { deliver, templates } from '~/lib/email/send';
import { officeInbox } from '~/lib/email/routing';
import places from '~/data/market/hu-settlements.json';
import { SITE_URL } from '~/config/site.mjs';
import { valuationActionToken } from '~/lib/valuation/action-token';
import { valuationPackage, isPayable, priceLabel } from '~/lib/valuation/packages';
import { readSessionDocuments } from '~/lib/valuation/documents';
import { isStripeEnabled } from '~/lib/stripe';
const settlements = places as [string, string, string, number][];

export const prerender = false;
const MAX_PHOTOS = 6;
const PHOTO_BUCKET = 'valuation-media';
const optional = (name: string, label: string, maxLength = 300) => ({ name, label, maxLength });
const numeric = (value: string, min = 0, max = 10000000): number | null => {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const int = (value: string, min = 0, max = 10000000): number | null => {
  const n = numeric(value, min, max);
  return n !== null && Number.isInteger(n) ? n : null;
};
const asKey = (value: string) => /^[A-Za-z0-9+-]{1,48}$/.test(value) ? value : null;
const missingColumn = (message: string) => /column|schema cache|relation .* does not exist/i.test(message);

export const POST: APIRoute = (context) => handleForm(context, {
  id: 'valuation', activityKind: 'valuation.requested', requireSuccess: true,
  skipAck: true,
  subject: 'ÉRTÉKMEGHATÁROZÁSI IGÉNY / Waardebepaling aanvraag',
  fields: [
    { name: 'name', label: 'Név', required: true, maxLength: 120 },
    { name: 'email', label: 'E-mail', type: 'email', required: true, maxLength: 160 },
    optional('phone','Telefon',40),
    { name: 'category', label: 'Típus', required: true, maxLength: 60 },
    { name: 'settlement', label: 'Település', required: true, maxLength: 120 },
    { name: 'floorM2', label: 'Alapterület (m²)', required: true, type: 'number', maxLength: 12 },
    ...['county','kshCode','countyCode','addressPrivate','plotM2','bedrooms','bathrooms','parcelCount','yearBuilt','renovatedIn','renovationExtent','conditionKey','heatingKey','epcClass','restrictionsNote','requestKind','factors','docSession'].map((name) => optional(name,name, name === 'factors' ? 8000 : 1000)),
    ...VALUATION_QUESTIONS.map((question) => optional(questionField(question.id), question.label.hu, 500)),
  ],
  onSuccess: async (values, extras, form) => {
    if (!Object.hasOwn(CATEGORY_FALLBACK, values.category)) throw new Error('invalid-category');
    const floorM2 = numeric(values.floorM2, 1, 100000);
    if (floorM2 === null) throw new Error('invalid-floor-area');
    const admin = createSupabaseAdminClient();
    const id = crypto.randomUUID();
    const locale = extras.Locale === 'nl' ? 'nl' : 'hu';
    const place = settlements.find((entry) => entry[3] !== 0 && entry[1].localeCompare(values.settlement, 'hu', { sensitivity: 'base' }) === 0);
    const county = settlements.find((entry) => entry[3] === 0 && entry[0] === place?.[2]);
    const countyName = county?.[1].replace(' vármegye','') ?? 'Ismeretlen';
    const company = await getCompany();
    // A package an admin switched off cannot be requested, whatever the form says.
    const chosen = valuationPackage(company.services, values.requestKind);
    const requestKind = chosen?.enabled ? chosen.kind : 'indicative';
    const pkg = valuationPackage(company.services, requestKind);
    const visitPrice = valuationPackage(company.services, 'expert_visit');
    const features = form.getAll('features').filter((entry): entry is string => typeof entry === 'string' && Object.hasOwn(FEATURES, entry));
    let factors: { text: string; direction: 'plus'|'minus'|'unsure' }[] = [];
    try {
      const parsed = JSON.parse(values.factors || '[]');
      if (Array.isArray(parsed)) factors = parsed.slice(0, 20).filter((item) => item && typeof item.text === 'string' && ['plus','minus','unsure'].includes(item.direction)).map((item) => ({ text: item.text.trim().slice(0,300), direction: item.direction })).filter((item) => item.text);
    } catch { /* malformed optional data is ignored */ }
    const files = form.getAll('photos').filter((entry): entry is File => entry instanceof File && entry.size > 0).slice(0, MAX_PHOTOS);
    const photos: { path: string; width: number; height: number }[] = [];
    for (const file of files) {
      try { const uploaded = await processAndUploadImage(admin, id, file, PHOTO_BUCKET); photos.push({ path: uploaded.path, width: uploaded.width, height: uploaded.height }); }
      catch (error) { console.error('[valuation] photo skipped', error); }
    }
    const documents = await readSessionDocuments(admin, values.docSession ?? '');
    const estimate = await estimateValuation(admin, { category: values.category, county: countyName, floorM2,
      kshCode: place?.[0] ?? null, countyCode: place?.[2] ?? null, wallType: values[questionField('falazat')],
      bandPercent: company.services.valuationBandPercent });
    const minCount = company.services.valuationMinCount ?? Infinity;
    const instant = Boolean(company.services.instantValuation && estimate.baseline && estimate.lowHuf !== null && estimate.highHuf !== null && estimate.baseline.count >= minCount && requestKind === 'indicative');
    const base = { id, source: 'public_lead', category: values.category, county: countyName,
      settlement: values.settlement, floor_m2: floorM2, plot_m2: numeric(values.plotM2),
      year_built: int(values.yearBuilt, 1500, 2100), condition: null, contact_name: values.name,
      contact_email: values.email, contact_phone: values.phone || null,
      status: instant ? 'approved' : 'queued' };
    const answers = { ...pickAnswers(values), restrictionsNote: values.restrictionsNote || undefined } as Record<string, string | undefined>;
    for (const key of ['bedrooms','bathrooms','parcelCount']) if (form.get(`unknown_${key}`) === 'yes') answers[key] = 'nem-tudom';
    if (form.getAll('features').includes('nem-tudom')) answers.features = 'nem-tudom';
    const expanded = { ...base, locale, answers, photos,
      bedrooms: int(values.bedrooms,0,100), bathrooms: int(values.bathrooms,0,100), parcel_count: int(values.parcelCount,0,100),
      renovated_in: int(values.renovatedIn,1500,2100), renovation_extent: ['partial','full','none','unknown'].includes(values.renovationExtent) ? values.renovationExtent : null,
      condition_key: asKey(values.conditionKey), heating_key: asKey(values.heatingKey), epc_class: asKey(values.epcClass),
      documents, features, address_private: values.addressPrivate || null, factors, request_kind: requestKind,
      ksh_code: place?.[0] ?? null, low_huf: estimate.lowHuf, mid_huf: estimate.midHuf, high_huf: estimate.highHuf,
      baseline: estimate.baseline };
    const { error } = await admin.from('valuations').insert(expanded);
    if (error) {
      if (!missingColumn(error.message)) throw error;
      // 0015 has not run. Preserve the lead in the 0014 shape and review it manually.
      const retry = await admin.from('valuations').insert({ ...base, status: 'queued', locale, answers: pickAnswers(values), photos });
      if (retry.error) throw retry.error;
      if (requestKind === 'judicial') await deliver(values.email, templates.judicialRequested(locale));
      else if (requestKind === 'expert_visit') await deliver(values.email, templates.serviceRequested(locale, {
        service: serviceName('onsite-visit', locale), price: visitPrice ? priceLabel(visitPrice, locale) : servicePrice('onsite-visit'),
      }));
      else await deliver(values.email, templates.valuationReceived(locale));
      return { instant: false, valuationId: id };
    }
    if (requestKind === 'expert_visit') await createServiceRequest(admin, { serviceId: 'onsite-visit', source: 'valuation', locale,
      valuationId: id, name: values.name, email: values.email, phone: values.phone,
      priceLabel: visitPrice ? { hu: priceLabel(visitPrice, 'hu'), nl: priceLabel(visitPrice, 'nl') } : undefined });
    if (requestKind === 'judicial') {
      await deliver(values.email, templates.judicialRequested(locale));
      await deliver(officeInbox(), templates.adminServiceRequested('hu', { service: 'Igazságügyi értékbecslési igény', name: values.name,
        email: values.email, phone: values.phone, source: 'valuation', note: '', url: `${SITE_URL}/portal/valuations/${id}` }));
    }
    if (requestKind === 'indicative' && !instant) await deliver(values.email, templates.valuationReceived(locale));
    if (instant && estimate.midHuf && estimate.lowHuf && estimate.highHuf) {
      const rate = company.services.eurHufRateDate ? company.services.eurHufRate : null;
      const display = (amount: number) => locale === 'nl' && rate
        ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount / rate)
        : new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(amount);
      const basis = estimate.baseline?.kind === 'ksh'
        ? locale === 'nl'
          ? `KSH Ingatlanadattár, ${estimate.baseline.year} (${estimate.baseline.level === 'county' ? 'provincie' : 'plaats'}, ${estimate.baseline.count} gegevens)`
          : `KSH Ingatlanadattár, ${estimate.baseline.year} (${estimate.baseline.level === 'county' ? 'vármegye' : 'település'}, ${estimate.baseline.count} adat)`
        : locale === 'nl' ? `${estimate.baseline?.count ?? 0} vergelijkbare FODEL-advertenties` : `${estimate.baseline?.count ?? 0} hasonló FODEL-hirdetés`;
      await deliver(values.email, templates.valuationReady(locale, {
        range: `${display(estimate.lowHuf)} – ${display(estimate.highHuf)}`, mid: display(estimate.midHuf),
        compCount: estimate.baseline?.kind === 'comps' ? estimate.baseline.count : 0,
        basis, sourceUrl: estimate.baseline?.kind === 'ksh' ? estimate.baseline.url : undefined,
        sourceDate: estimate.baseline?.kind === 'ksh' ? `${estimate.baseline.year}, ${locale === 'nl' ? 'opgehaald' : 'letöltve'} ${estimate.baseline.retrievedAt}` : undefined,
        rateDate: locale === 'nl' && rate ? company.services.eurHufRateDate ?? undefined : undefined,
        factors, notice: company.services.valuationNotice?.[locale],
        submitAdUrl: `${SITE_URL}${path(locale, 'submitAd')}`,
        visitUrl: `${SITE_URL}${path(locale, 'valuation')}?service=onsite-visit`,
        judicialUrl: `${SITE_URL}${path(locale, 'valuation')}?service=judicial`,
      }));
    }
    // Card payment is offered, never forced: the request is already saved and the office follows up either way.
    const pay = isStripeEnabled() && requestKind !== 'indicative' && isPayable(pkg)
      ? { label: locale === 'nl' ? `Nu betalen — ${priceLabel(pkg, 'nl')} (kaart)` : `Fizetés most — ${priceLabel(pkg, 'hu')} (bankkártya)` }
      : null;
    return { instant, valuationId: id, actionToken: instant || pay ? valuationActionToken(id) : undefined, pay,
      result: instant ? estimate : undefined,
      rate: company.services.eurHufRateDate ? company.services.eurHufRate ?? null : null,
      rateDate: company.services.eurHufRateDate ?? null,
      factors, notice: company.services.valuationNotice?.[locale] ?? null };
  },
});
