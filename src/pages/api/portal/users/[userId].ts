/**
 * Admin actions on one account: change role, or deactivate.
 *
 * 1.0 could invite people and list them, and nothing else — a role set at
 * invite time was permanent, and someone who left FODEL kept their access
 * forever. Both are now fixable.
 *
 * "Deactivate" rather than "delete" is deliberate. `profiles.id` is referenced
 * by `properties.owner_id`, `review_notes.author_id` and `payments.owner_id`;
 * deleting a person would either cascade their listings away or fail on a
 * foreign key. Banning the auth user revokes access immediately while leaving
 * the record — and the audit trail of who approved what — intact.
 */
import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '~/lib/supabase-server';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Long enough to be permanent in practice; Supabase has no "forever" value. */
const BAN_DURATION = '876000h'; // 100 years

export const POST: APIRoute = async ({ params, request, locals }) => {
  // Middleware already gates /portal/users*, but this is an /api/portal route
  // reached the same way — re-check explicitly rather than inheriting a rule.
  if (locals.profile?.role !== 'admin') return json(403, { ok: false, error: 'forbidden' });

  const { userId } = params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? '');

  // An admin removing their own access, or demoting themselves, can lock the
  // last administrator out of the portal with no way back in short of the
  // Supabase SQL editor.
  if (userId === locals.user?.id) {
    return json(422, { ok: false, error: 'self' });
  }

  const admin = createSupabaseAdminClient();

  if (action === 'set_role') {
    const role = body.role === 'admin' ? 'admin' : 'owner';

    if (role === 'owner') {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');
      if ((count ?? 0) <= 1) return json(422, { ok: false, error: 'last-admin' });
    }

    const { error } = await admin.from('profiles').update({ role }).eq('id', userId);
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  if (action === 'deactivate' || action === 'reactivate') {
    const deactivating = action === 'deactivate';

    if (deactivating) {
      const { data: target } = await admin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (target?.role === 'admin') {
        const { count } = await admin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin');
        if ((count ?? 0) <= 1) return json(422, { ok: false, error: 'last-admin' });
      }
    }

    const { error } = await admin.auth.admin.updateUserById(userId!, {
      ban_duration: deactivating ? BAN_DURATION : 'none',
    });
    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  return json(400, { ok: false, error: 'unknown-action' });
};
