/**
 * Marks an enquiry handled, or back to open.
 *
 * `enquiries` has a read policy for owners and admins but no update policy at
 * all, so this goes through the service-role client — and therefore has to do
 * the authorisation itself, which is the one situation where app-level checks
 * are the boundary rather than a convenience. The rule mirrors the read policy
 * in 0001_init.sql exactly: an admin, or the owner of the listing the enquiry
 * is about.
 */
import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '~/lib/supabase-server';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { profile, user } = locals;
  if (!user) return json(401, { ok: false, error: 'unauthenticated' });

  const { enquiryId } = params;
  const body = await request.json().catch(() => ({}));
  const handled = Boolean(body.handled);

  const admin = createSupabaseAdminClient();
  const { data: enquiry } = await admin
    .from('enquiries')
    .select('id, property_id')
    .eq('id', enquiryId)
    .maybeSingle();
  if (!enquiry) return json(404, { ok: false, error: 'not-found' });

  if (profile?.role !== 'admin') {
    if (!enquiry.property_id) return json(403, { ok: false, error: 'forbidden' });
    const { data: property } = await admin
      .from('properties')
      .select('owner_id')
      .eq('id', enquiry.property_id)
      .maybeSingle();
    if (property?.owner_id !== user.id) return json(403, { ok: false, error: 'forbidden' });
  }

  const { error } = await admin.from('enquiries').update({ handled }).eq('id', enquiryId);
  if (error) return json(500, { ok: false, error: error.message });
  return json(200, { ok: true });
};
