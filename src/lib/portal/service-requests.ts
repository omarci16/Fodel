/**
 * On-site service requests (brief 3 §F, table `service_requests`, 0015).
 *
 * One entry point for the three places a service can be asked for — the
 * public submit form, the listing editor and the valuation — so each request
 * lands in the same admin list, notifies the office the same way and gets the
 * same acknowledgement. Prices are read from the catalogue, never stored.
 *
 * Best-effort by contract, like every email here: before 0015 has run the
 * insert fails and the caller carries on — the office still has the request
 * in its notification email.
 */
import { ONSITE_SERVICES, isOnsiteServiceId, type OnsiteServiceId } from '~/config/company';
import { deliver, templates } from '~/lib/email/send';
import { officeInbox } from '~/lib/email/routing';
import { formatCents } from '~/lib/orders';
import { SITE_URL } from '~/config/site.mjs';

export type ServiceStatus = 'requested' | 'scheduled' | 'done' | 'cancelled';
export type ServiceSource = 'submit_form' | 'listing_editor' | 'valuation' | 'admin';

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  requested: 'Új igény',
  scheduled: 'Időpont egyeztetve',
  done: 'Teljesítve',
  cancelled: 'Lemondva',
};

export const SERVICE_SOURCE_LABEL: Record<ServiceSource, string> = {
  submit_form: 'Hirdetésfeladási űrlap',
  listing_editor: 'Hirdetésszerkesztő',
  valuation: 'Értékbecslés',
  admin: 'Admin',
};

export function onsiteService(id: string) {
  return ONSITE_SERVICES.find((service) => service.id === id);
}

export function serviceName(id: string, locale: 'hu' | 'nl' = 'hu'): string {
  return onsiteService(id)?.names[locale] ?? id;
}

export function servicePrice(id: string): string {
  const service = onsiteService(id);
  return service ? formatCents(service.priceEur * 100) : '—';
}

export type NewServiceRequest = {
  serviceId: OnsiteServiceId;
  source: ServiceSource;
  locale: 'hu' | 'nl';
  propertyId?: string | null;
  valuationId?: string | null;
  profileId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  /** Overrides the catalogue price in the emails — a valuation visit can be priced in admin settings. */
  priceLabel?: Record<'hu' | 'nl', string>;
};

/**
 * Stores the request, tells the office and acknowledges it to the customer.
 * Returns the new row's id, or null when it could not be stored.
 *
 * `client` decides who writes it: the service-role client for the public
 * form and the valuation (no session), the owner's own session in the editor
 * — where RLS then enforces that the listing is theirs and still editable.
 */
export async function createServiceRequest(client: any, request: NewServiceRequest): Promise<string | null> {
  if (!isOnsiteServiceId(request.serviceId)) return null;

  const { data, error } = await client
    .from('service_requests')
    .insert({
      service_id: request.serviceId,
      source: request.source,
      locale: request.locale,
      property_id: request.propertyId ?? null,
      valuation_id: request.valuationId ?? null,
      profile_id: request.profileId ?? null,
      contact_name: request.name ?? null,
      contact_email: request.email ?? null,
      contact_phone: request.phone ?? null,
      note: request.note?.slice(0, 2000) || null,
    })
    .select('id')
    .single();
  if (error) {
    console.error('[service-request] not stored', error.message);
    return null;
  }

  await deliver(
    officeInbox(),
    templates.adminServiceRequested('hu', {
      service: `${serviceName(request.serviceId, 'hu')} — ${request.priceLabel?.hu ?? servicePrice(request.serviceId)}`,
      name: request.name ?? '',
      email: request.email ?? '',
      phone: request.phone ?? '',
      source: request.source,
      note: request.note ?? '',
      url: `${SITE_URL}/portal/services`,
    }),
    request.email ?? undefined
  );

  if (request.email) {
    await deliver(
      request.email,
      templates.serviceRequested(request.locale, {
        service: serviceName(request.serviceId, request.locale),
        price: request.priceLabel?.[request.locale] ?? servicePrice(request.serviceId),
      })
    );
  }

  return data.id as string;
}
