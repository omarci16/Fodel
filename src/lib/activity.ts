/**
 * The admin "Database" — a single append-only log of everything that happens,
 * so /portal/database can answer "who has asked about farmhouses in Zala this
 * year" without a query-time UNION of five different tables.
 *
 * Deliberately few call sites (five, not one per table): the four public
 * forms all funnel through src/lib/form-handler.ts and are logged there once;
 * listing status transitions are logged from status.ts; publication is logged
 * exclusively inside publishProperty() (never also in the Stripe webhook,
 * which calls it — logging in both would double-count every card payment);
 * edits/uploads from the property editor; auth from login and invite/accept.
 *
 * `logEvent` itself does not swallow errors — every call site is written as
 * `await logEvent(...).catch(() => {})`. A bare `void logEvent(...)` looks
 * the same in a local dev server but is silently killed on Vercel the moment
 * the function returns, which is a real, not theoretical, way to lose events.
 */
import { createSupabaseAdminClient } from '~/lib/supabase-server';

export type ActivityEvent = {
  kind: string;
  actorId?: string | null;
  actorEmail?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  propertyId?: string | null;
  locale?: string | null;
  source?: string | null;
  payload?: Record<string, unknown>;
  /** The Stripe event id, when this write is triggered by a webhook retry. */
  dedupeKey?: string | null;
};

export async function logEvent(event: ActivityEvent): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('activity_events').insert({
    kind: event.kind,
    actor_id: event.actorId ?? null,
    actor_email: event.actorEmail ?? null,
    subject_type: event.subjectType ?? null,
    subject_id: event.subjectId ?? null,
    property_id: event.propertyId ?? null,
    locale: event.locale ?? null,
    source: event.source ?? null,
    payload: event.payload ?? {},
    dedupe_key: event.dedupeKey ?? null,
  });
  // A duplicate dedupe_key is not a bug — it is a Stripe retry correctly being
  // refused a second log line. Surfacing it as a thrown error (caught by
  // every call site's own .catch) rather than special-casing it here keeps
  // this function honest: it either wrote the row or it didn't.
  if (error) throw new Error(error.message);
}
