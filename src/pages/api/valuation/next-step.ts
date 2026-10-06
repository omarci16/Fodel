import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { validValuationActionToken } from '~/lib/valuation/action-token';
import { createServiceRequest } from '~/lib/portal/service-requests';
import { deliver, templates } from '~/lib/email/send';
import { officeInbox } from '~/lib/email/routing';
import { SITE_URL } from '~/config/site.mjs';
import { getCompany } from '~/lib/runtime-config';
import { valuationPackage, isPayable, priceLabel } from '~/lib/valuation/packages';
import { isStripeEnabled } from '~/lib/stripe';

export const prerender = false;
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? '');
  const token = String(body.token ?? '');
  const kind = String(body.kind ?? '');
  if (!/^[a-f0-9-]{36}$/.test(id) || !['expert_visit','judicial'].includes(kind) || !validValuationActionToken(id, token)) return json(403, { ok: false });
  const admin = createSupabaseAdminClient();
  const { data: row } = await admin.from('valuations').select('id,status,request_kind,locale,contact_name,contact_email,contact_phone').eq('id', id).maybeSingle();
  if (!row || row.status !== 'approved' || !row.contact_email) return json(404, { ok: false });
  const locale = row.locale === 'nl' ? 'nl' : 'hu';
  const company = await getCompany();
  const pkg = valuationPackage(company.services, kind);
  if (!pkg?.enabled) return json(409, { ok: false });
  const pay = isStripeEnabled() && isPayable(pkg)
    ? { label: locale === 'nl' ? `Nu betalen — ${priceLabel(pkg, 'nl')} (kaart)` : `Fizetés most — ${priceLabel(pkg, 'hu')} (bankkártya)` }
    : null;
  if (row.request_kind === kind) return json(200, { ok: true, already: true, pay });
  if (row.request_kind !== 'indicative') return json(409, { ok: false });
  const { data: claimed, error: claimError } = await admin.from('valuations')
    .update({ request_kind: kind }).eq('id', id).eq('request_kind', 'indicative').select('id').maybeSingle();
  if (claimError) return json(500, { ok: false });
  if (!claimed) return json(409, { ok: false });
  if (kind === 'expert_visit') {
    const serviceId = await createServiceRequest(admin, { serviceId: 'onsite-visit', source: 'valuation', locale,
      valuationId: id, name: row.contact_name, email: row.contact_email, phone: row.contact_phone,
      priceLabel: { hu: priceLabel(pkg, 'hu'), nl: priceLabel(pkg, 'nl') } });
    if (!serviceId) {
      await admin.from('valuations').update({ request_kind: 'indicative' }).eq('id', id).eq('request_kind', kind);
      return json(500, { ok: false });
    }
  } else {
    await deliver(row.contact_email, templates.judicialRequested(locale));
    await deliver(officeInbox(), templates.adminServiceRequested('hu', { service: 'Igazságügyi értékbecslési igény',
      name: row.contact_name ?? '', email: row.contact_email, phone: row.contact_phone ?? '', source: 'valuation', note: '',
      url: `${SITE_URL}/portal/valuations/${id}` }));
  }
  return json(200, { ok: true, pay });
};
