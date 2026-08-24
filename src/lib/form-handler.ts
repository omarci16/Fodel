/**
 * Shared handling for all four forms.
 *
 * Responsibilities: validate server-side (never trust the client), reject
 * bots, deliver to FODEL, acknowledge to the sender, and answer both fetch
 * (JSON) and native form POST (303 redirect) so the forms work without
 * JavaScript.
 *
 * Validation is hand-rolled rather than pulling in a schema library — the
 * rules are a dozen lines and this keeps the server bundle to almost nothing.
 */

import type { APIContext } from 'astro';
import { Resend } from 'resend';
import { COMPANY } from '~/config/company';

export type FieldRule = {
  name: string;
  required?: boolean;
  type?: 'text' | 'email' | 'tel' | 'number';
  maxLength?: number;
  /** Shown to FODEL in the email; keeps the message readable. */
  label: string;
};

export interface FormDefinition {
  id: string;
  /** Subject line prefix in the notification email. */
  subject: string;
  fields: FieldRule[];
  /**
   * Fires after FODEL's notification email is sent, before the response goes
   * out. Used by the enquiry form to also persist to Supabase and notify the
   * property's owner — a side effect specific to one form, so it lives here
   * as an opt-in hook rather than complicating this shared handler.
   */
  onSuccess?: (values: Record<string, string>, extras: Record<string, string>) => Promise<void>;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/** Humans do not complete and submit a form in under three seconds. */
const MIN_FILL_MS = 3000;

/** Crude in-process rate limit. Serverless resets it per instance, which is fine. */
const recent = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > RATE_MAX;
}

export interface ValidationResult {
  ok: boolean;
  values: Record<string, string>;
  errors: Record<string, string>;
}

export function validate(form: FormData, def: FormDefinition): ValidationResult {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const field of def.fields) {
    const raw = form.get(field.name);
    const value = typeof raw === 'string' ? raw.trim() : '';

    if (field.required && !value) {
      errors[field.name] = 'required';
      continue;
    }
    if (value && field.type === 'email' && !EMAIL_RE.test(value)) {
      errors[field.name] = 'email';
      continue;
    }
    if (field.maxLength && value.length > field.maxLength) {
      errors[field.name] = 'too-long';
      continue;
    }
    values[field.name] = value;
  }

  if (form.get('consent') !== 'yes') errors.consent = 'required';

  return { ok: Object.keys(errors).length === 0, values, errors };
}

/** Returns a reason if the submission looks automated. */
export function spamReason(form: FormData): string | null {
  if (typeof form.get('company') === 'string' && String(form.get('company')).length > 0) {
    return 'honeypot';
  }
  const renderedAt = Number(form.get('renderedAt'));
  if (Number.isFinite(renderedAt) && Date.now() - renderedAt < MIN_FILL_MS) {
    return 'too-fast';
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmail(def: FormDefinition, values: Record<string, string>, extras: Record<string, string>) {
  const rows = def.fields
    .filter((f) => values[f.name])
    .map(
      (f) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#5E6E72;vertical-align:top;white-space:nowrap">${escapeHtml(
          f.label
        )}</td><td style="padding:6px 0;color:#102A43">${escapeHtml(values[f.name]).replace(/\n/g, '<br>')}</td></tr>`
    )
    .join('');

  const extraRows = Object.entries(extras)
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#8C9AA0;white-space:nowrap">${escapeHtml(
          k
        )}</td><td style="padding:6px 0;color:#5E6E72">${escapeHtml(v)}</td></tr>`
    )
    .join('');

  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px">
  <h2 style="font-size:18px;color:#102A43;margin:0 0 4px">${escapeHtml(def.subject)}</h2>
  <p style="font-size:13px;color:#5E6E72;margin:0 0 20px">fodel.nl</p>
  <table style="font-size:14px;line-height:1.6;border-collapse:collapse">${rows}</table>
  ${extraRows ? `<hr style="border:none;border-top:1px solid #D0D4D6;margin:20px 0"><table style="font-size:12px;line-height:1.6;border-collapse:collapse">${extraRows}</table>` : ''}
</div>`;
}

const ACK = {
  hu: {
    subject: 'Köszönjük megkeresését — FODEL',
    body: (name: string) =>
      `<p>Kedves ${escapeHtml(name || 'Érdeklődőnk')}!</p>
       <p>Köszönjük, hogy felvette velünk a kapcsolatot. Üzenetét megkaptuk, és munkanapokon 09:00 és 18:00 között válaszolunk.</p>
       <p>Ha sürgős, hívjon minket: +36 70 225 5255 vagy +31 6 4400 5550.</p>
       <p>Üdvözlettel,<br>FODEL Ingatlan</p>`,
  },
  nl: {
    subject: 'Bedankt voor uw bericht — FODEL',
    body: (name: string) =>
      `<p>Beste ${escapeHtml(name || 'bezoeker')},</p>
       <p>Bedankt voor uw bericht. Wij hebben het ontvangen en reageren op werkdagen tussen 09:00 en 18:00 uur.</p>
       <p>Heeft u haast? Bel ons op +31 6 4400 5550.</p>
       <p>Met vriendelijke groet,<br>FODEL Vastgoed</p>`,
  },
} as const;

export async function handleForm(
  context: APIContext,
  def: FormDefinition
): Promise<Response> {
  const { request, clientAddress, url } = context;
  const form = await request.formData();
  const wantsJson = request.headers.get('accept')?.includes('application/json');

  const locale = form.get('locale') === 'nl' ? 'nl' : 'hu';
  const returnTo = String(form.get('returnTo') ?? `/${locale}/`);

  const respond = (status: number, body: Record<string, unknown>) => {
    if (wantsJson) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }
    // Without JS: redirect to a real confirmation page. A prerendered page
    // cannot read a query string, so the thank-you state needs its own URL.
    const thanks = locale === 'hu' ? '/hu/koszonjuk/' : '/nl/bedankt/';
    const target = status < 400 ? `${thanks}?form=${def.id}` : `${returnTo}?error=1`;
    return new Response(null, { status: 303, headers: { location: target } });
  };

  // Silently accept bot submissions — a 200 tells them nothing.
  const spam = spamReason(form);
  if (spam) {
    console.info(`[form:${def.id}] discarded (${spam})`);
    return respond(200, { ok: true });
  }

  if (clientAddress && rateLimited(clientAddress)) {
    return respond(429, { ok: false, error: 'rate-limited' });
  }

  const result = validate(form, def);
  if (!result.ok) {
    return respond(422, { ok: false, errors: result.errors });
  }

  const extras: Record<string, string> = {
    Locale: locale,
    Page: returnTo,
    Form: def.id,
  };
  for (const key of ['propertyRef', 'propertyTitle', 'package', 'languages']) {
    const value = form.get(key);
    if (typeof value === 'string' && value) extras[key] = value;
  }

  const html = buildEmail(def, result.values, extras);
  const apiKey = import.meta.env.RESEND_API_KEY;
  const inbox = import.meta.env.FODEL_INBOX ?? COMPANY.email.primary;
  const from = import.meta.env.FODEL_FROM ?? 'FODEL Website <website@fodel.nl>';

  if (!apiKey) {
    // Local development: log rather than fail, so forms are testable offline.
    console.warn(`[form:${def.id}] RESEND_API_KEY unset — submission logged, not sent`);
    console.info(result.values, extras);
    return respond(200, { ok: true, delivered: false });
  }

  try {
    const resend = new Resend(apiKey);
    const subject = extras.propertyRef
      ? `${def.subject} — #${extras.propertyRef}`
      : def.subject;

    await resend.emails.send({
      from,
      to: inbox,
      subject,
      html,
      replyTo: result.values.email || undefined,
    });

    // Acknowledge to the sender so they know it arrived.
    if (result.values.email) {
      const ack = ACK[locale];
      await resend.emails.send({
        from,
        to: result.values.email,
        subject: ack.subject,
        html: ack.body(result.values.name ?? ''),
      });
    }

    if (def.onSuccess) {
      // Best-effort — a failure here shouldn't turn a successfully-delivered
      // enquiry into an error response for the visitor who submitted it.
      try {
        await def.onSuccess(result.values, extras);
      } catch (error) {
        console.error(`[form:${def.id}] onSuccess hook failed`, error);
      }
    }

    return respond(200, { ok: true, delivered: true });
  } catch (error) {
    console.error(`[form:${def.id}] delivery failed`, error);
    return respond(502, { ok: false, error: 'delivery-failed' });
  }
}
