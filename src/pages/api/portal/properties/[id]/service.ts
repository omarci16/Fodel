/**
 * An owner asks for — or withdraws — an on-site service from the listing
 * editor (brief 3 §F.2). Owners invited by an admin never see the public
 * submit page, so this is their way to the same two services.
 *
 * Asking goes through the owner's own session: RLS (0015) only lets them
 * create a fresh request on a listing they own that is still editable.
 * Withdrawing is re-checked here and then written with the service role,
 * because owners have no UPDATE policy on the table — scheduling and status
 * are the office's job, a withdrawal before scheduling is the only exception.
 */
import type { APIRoute } from 'astro';
import { isOnsiteServiceId } from '~/config/company';
import { createServiceRequest } from '~/lib/portal/service-requests';
import { createSupabaseAdminClient } from '~/lib/supabase-server';
import { OWNER_EDITABLE } from '~/lib/portal/properties';
import { logEvent } from '~/lib/activity';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { supabase, user, profile } = locals;
  if (!user) return json(401, { ok: false, error: 'Jelentkezzen be újra.' });

  const { data: property } = await supabase
    .from('properties')
    .select('id, ref, owner_id, status')
    .eq('id', params.id)
    .maybeSingle();
  if (!property) return json(404, { ok: false, error: 'A hirdetés nem található.' });
  const isOwner = property.owner_id === user.id;
  if (!isOwner) return json(403, { ok: false, error: 'Ezt csak a hirdető kérheti — adminként a Szolgáltatások oldalon kezelheti.' });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? 'request');
  const admin = createSupabaseAdminClient();

  const { data: open } = await admin
    .from('service_requests')
    .select('id, status')
    .eq('property_id', property.id)
    .in('status', ['requested', 'scheduled'])
    .maybeSingle();

  if (action === 'cancel') {
    if (!open) return json(404, { ok: false, error: 'Nincs visszavonható igény.' });
    if (open.status !== 'requested') {
      return json(409, { ok: false, error: 'Az időpontot már egyeztettük — a lemondáshoz kérjük, hívjon minket vagy válaszoljon e-mailünkre.' });
    }
    const { error } = await admin.from('service_requests').update({ status: 'cancelled' }).eq('id', open.id);
    if (error) return json(500, { ok: false, error: 'Nem sikerült visszavonni. Próbálja újra.' });
    await logEvent({
      kind: 'service.cancelled',
      actorId: user.id,
      actorEmail: profile?.email ?? null,
      subjectType: 'service_request',
      subjectId: open.id,
      propertyId: property.id,
      source: 'portal',
    }).catch(() => {});
    return json(200, { ok: true });
  }

  const serviceId = String(body.serviceId ?? '');
  if (!isOnsiteServiceId(serviceId)) return json(422, { ok: false, error: 'Válasszon szolgáltatást.' });
  if (!OWNER_EDITABLE.includes(property.status)) {
    return json(409, { ok: false, error: 'Beküldött hirdetéshez a szolgáltatást telefonon vagy e-mailben kérheti.' });
  }
  if (open) return json(409, { ok: false, error: 'Ehhez a hirdetéshez már van folyamatban lévő igény.' });

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '';
  const id = await createServiceRequest(supabase, {
    serviceId,
    source: 'listing_editor',
    locale: profile?.locale === 'nl' ? 'nl' : 'hu',
    propertyId: property.id,
    profileId: user.id,
    name: profile?.full_name ?? null,
    email: profile?.email ?? user.email ?? null,
    phone: profile?.phone ?? null,
    note,
  });
  if (!id) return json(500, { ok: false, error: 'Nem sikerült rögzíteni. Próbálja újra, vagy hívjon minket.' });

  await logEvent({
    kind: 'service.requested',
    actorId: user.id,
    actorEmail: profile?.email ?? null,
    subjectType: 'service_request',
    subjectId: id,
    propertyId: property.id,
    source: 'portal',
    payload: { serviceId },
  }).catch(() => {});

  return json(200, { ok: true });
};
