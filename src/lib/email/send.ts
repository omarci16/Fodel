/**
 * Resend wrapper for the portal's lifecycle emails.
 *
 * Same log-instead-of-fail contract as src/lib/form-handler.ts uses for the
 * public forms: with no RESEND_API_KEY the portal is still fully testable
 * offline, it just narrates what it would have sent.
 *
 * A lifecycle email is a courtesy, never the source of truth — by the time one
 * is sent, the status change that triggered it has already been committed. So
 * a send failure must never fail the request that caused it. What 1.1 adds
 * over 1.0 is that a *transient* failure now gets two more chances before we
 * accept the loss, because the most common Resend failure is a momentary 429
 * or 5xx, and one retry a second later almost always succeeds.
 *
 * What this deliberately is NOT: a durable queue with a dead-letter table. If
 * the process dies mid-retry the email is gone. Building persistence properly
 * (an outbox table, a worker, replay, idempotency keys) is its own project,
 * and a half-built queue is worse than an honest lack of one — it looks like a
 * guarantee it cannot keep. Flagged in the 1.1 plan as known and unbuilt.
 */
import { Resend } from 'resend';
import type { BuiltEmail } from './templates';
import type { EmailLocale } from './layout';

export type { EmailLocale } from './layout';
export { templates } from './templates';

const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 400;

/** Resend rejects outright on a bad payload; retrying that just wastes time. */
function isRetryable(error: unknown): boolean {
  const status = (error as { statusCode?: number; status?: number } | null)?.statusCode
    ?? (error as { status?: number } | null)?.status;
  if (typeof status !== 'number') return true; // network-level failure — worth another go
  return status === 429 || status >= 500;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Always pass it — see the note in layout.ts. */
  text?: string;
  replyTo?: string;
}): Promise<void> {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const from = import.meta.env.FODEL_FROM ?? 'FODEL Portál <portal@fodel.nl>';

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY unset — would send "${opts.subject}" to ${opts.to}`);
    return;
  }

  const resend = new Resend(apiKey);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        replyTo: opts.replyTo,
      });
      if (!error) return;
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS) {
        console.error(
          `[email] giving up on "${opts.subject}" to ${opts.to} after ${attempt} attempt(s)`,
          error
        );
        return;
      }
    } catch (error) {
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS) {
        console.error(
          `[email] giving up on "${opts.subject}" to ${opts.to} after ${attempt} attempt(s)`,
          error
        );
        return;
      }
    }
    await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
  }
}

/** Sends a template's output. The one call site shape every trigger should use. */
export async function deliver(to: string, email: BuiltEmail, replyTo?: string): Promise<void> {
  await sendEmail({ to, subject: email.subject, html: email.html, text: email.text, replyTo });
}

/**
 * Which language to write to someone in.
 *
 * `profiles.locale` is the recipient's own stated language and is always
 * populated (the column is `not null default 'hu'`). Anything outside the two
 * built markets falls back to Hungarian, which is FODEL's default and the
 * language of the office.
 */
export function localeOf(profile: { locale?: string | null } | null | undefined): EmailLocale {
  return profile?.locale === 'nl' ? 'nl' : 'hu';
}

/**
 * Every admin's address, for the "new submission" alert.
 *
 * Uses the admin (service-role) client because the person triggering it is an
 * *owner* — RLS would correctly stop them reading the admin roster, and the
 * alternative (a single hardcoded inbox) silently breaks the moment FODEL adds
 * a second reviewer. Falls back to FODEL_INBOX if no admin profile exists yet.
 */
export async function adminRecipients(adminClient: {
  from: (table: string) => any;
}): Promise<string[]> {
  const fallback = import.meta.env.FODEL_INBOX ?? 'info@fodel.nl';
  try {
    const { data } = await adminClient.from('profiles').select('email').eq('role', 'admin');
    const emails = (data ?? []).map((row: { email: string }) => row.email).filter(Boolean);
    return emails.length ? emails : [fallback];
  } catch {
    return [fallback];
  }
}
