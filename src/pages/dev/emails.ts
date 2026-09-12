/**
 * Email preview — development, or a signed-in admin in production.
 *
 * FODEL 1.2's architecture review recommended cutting `email_overrides`
 * entirely: a database-backed copy editor re-creates the exact bug
 * `nl.ts satisfies typeof HU` exists to prevent (an override with no
 * translated counterpart, uncaught, in production email), and has no sane
 * deep-merge semantics for `welcome.steps` (an array) or
 * `adminNewSubmission.labels` (a nested map). What FODEL actually need is to
 * *see* the emails and tell a developer what to change — so this stays the
 * one preview surface, gated instead of hard-404'd, rather than duplicated
 * behind a second, database-backed editor.
 *
 * In `astro dev` it is open to anyone, same as always. In production it 404s
 * for everyone except a signed-in admin — still renders arbitrary templates
 * with fixture data, never real customer data, so the risk is "a competitor
 * sees our email copy," not a data leak.
 *
 *   /dev/emails                            → index of everything
 *   /dev/emails?t=published&locale=nl      → rendered HTML
 *   /dev/emails?t=published&format=text    → the plain-text alternative
 */
import type { APIRoute } from 'astro';
import { templates } from '~/lib/email/templates';
import type { BuiltEmail } from '~/lib/email/templates';
import { SITE_URL } from '~/config/site.mjs';
import { createSupabaseServerClient } from '~/lib/supabase-server';

export const prerender = false;

const SAMPLE_REF = '7213';
const SAMPLE_TITLE = 'Felújított parasztház a Balaton-felvidéken';
const SAMPLE_URL = `${SITE_URL}/hu/haz-elado-${SAMPLE_REF}/`;
const SAMPLE_TOKEN = 'a'.repeat(64);

type Locale = 'hu' | 'nl';

/**
 * Order lines are stored in the *owner's* language (see buildOrderLines in
 * src/lib/orders.ts), so the fixture has to vary too — a Dutch preview showing
 * Hungarian line items would look like a bug that isn't one, and would hide a
 * real one if it ever appeared.
 */
const SAMPLE_ORDER: Record<Locale, { label: string; amount: string }[]> = {
  hu: [
    { label: 'Hirdetés — 12 hónap', amount: '€ 129' },
    { label: 'Fordítás — 2 nyelv', amount: '€ 50' },
    { label: 'Videós bemutató', amount: '€ 36' },
  ],
  nl: [
    { label: 'Advertentie — 12 maanden', amount: '€ 129' },
    { label: 'Vertaling — 2 talen', amount: '€ 50' },
    { label: 'Videopresentatie', amount: '€ 36' },
  ],
};

/** Every template with sample arguments that exercise its longest branch. */
const CASES: Record<string, (locale: Locale) => BuiltEmail> = {
  registrationConfirm: (l) =>
    templates.registrationConfirm(l, {
      name: 'Kovács Anna',
      acceptUrl: `${SITE_URL}/portal/invite/${SAMPLE_TOKEN}`,
      settlement: 'Csemő',
    }),
  invite: (l) =>
    templates.invite(l, { role: 'owner', acceptUrl: `${SITE_URL}/portal/invite/${SAMPLE_TOKEN}` }),
  welcome: (l) =>
    templates.welcome(l, { name: 'Kovács Anna', portalUrl: `${SITE_URL}/portal/dashboard` }),
  submissionReceived: (l) => templates.submissionReceived(l, { ref: SAMPLE_REF, title: SAMPLE_TITLE }),
  adminNewSubmission: (l) =>
    templates.adminNewSubmission(l, {
      ref: SAMPLE_REF,
      title: SAMPLE_TITLE,
      ownerName: 'Kovács Anna',
      ownerEmail: 'anna.kovacs@example.com',
      location: 'Csemő, Pest',
      price: '€ 178 000',
      photoCount: 14,
      languages: 'HU, NL, DE',
      reviewUrl: `${SITE_URL}/portal/review/sample`,
    }),
  changesRequested: (l) =>
    templates.changesRequested(l, {
      ref: SAMPLE_REF,
      title: SAMPLE_TITLE,
      note: 'A fényképek nagy része sötét, kérjük napos időben készítse el őket újra.\n\nAz alapterület sem stimmel: a leírásban 140 m² szerepel, a mezőben 104 m².',
      editUrl: `${SITE_URL}/portal/properties/sample`,
    }),
  approvedAwaitingPayment: (l) =>
    templates.approvedAwaitingPayment(l, {
      ref: SAMPLE_REF,
      title: SAMPLE_TITLE,
      items: SAMPLE_ORDER[l],
      total: '€ 215',
      payUrl: `${SITE_URL}/portal/properties/sample`,
    }),
  // The same email with card payment switched off — the state FODEL launches
  // in, and the one most likely to go untested.
  approvedAwaitingPaymentBankOnly: (l) =>
    templates.approvedAwaitingPayment(l, {
      ref: SAMPLE_REF,
      title: SAMPLE_TITLE,
      items: SAMPLE_ORDER[l],
      total: '€ 215',
      payUrl: null,
    }),
  paymentReceipt: (l) =>
    templates.paymentReceipt(l, {
      ref: SAMPLE_REF,
      title: SAMPLE_TITLE,
      items: SAMPLE_ORDER[l],
      total: '€ 215',
      paidAt: l === 'nl' ? '26 augustus 2026' : '2026. augusztus 26.',
    }),
  published: (l) => templates.published(l, { ref: SAMPLE_REF, title: SAMPLE_TITLE, url: SAMPLE_URL }),
  newEnquiry: (l) =>
    templates.newEnquiry(l, {
      ref: SAMPLE_REF,
      title: SAMPLE_TITLE,
      name: 'Jan de Vries',
      email: 'jan.devries@example.nl',
      phone: '+31 6 1234 5678',
      message:
        'Goedendag, wij zijn geïnteresseerd in deze woning. Is het mogelijk om eind september te komen kijken?',
    }),
  passwordReset: (l) =>
    templates.passwordReset(l, {
      name: 'Kovács Anna',
      resetUrl: `${SITE_URL}/portal/reset/${SAMPLE_TOKEN}`,
    }),
  approvedAwaitingPaymentWithDiscount: (l) =>
    templates.approvedAwaitingPayment(l, {
      ref: SAMPLE_REF,
      title: SAMPLE_TITLE,
      items: SAMPLE_ORDER[l],
      discount: '−€ 13',
      total: '€ 202',
      payUrl: `${SITE_URL}/portal/properties/sample`,
    }),
  referralRegistered: (l) => templates.referralRegistered(l, { referredName: 'Jan de Vries' }),
  referralAdminNotice: (l) =>
    templates.referralAdminNotice(l, {
      referrerName: 'Kovács Anna',
      referrerEmail: 'anna.kovacs@example.com',
      referredName: 'Jan de Vries',
      referredEmail: 'jan.devries@example.nl',
    }),
  invoiceIssued: (l) =>
    templates.invoiceIssued(l, {
      ref: SAMPLE_REF,
      title: SAMPLE_TITLE,
      number: 'FD-2026-0001',
      viewUrl: `${SITE_URL}/portal/invoices/FD-2026-0001`,
    }),
  creditNoteIssued: (l) =>
    templates.creditNoteIssued(l, {
      ref: SAMPLE_REF,
      title: SAMPLE_TITLE,
      number: 'FD-2026-0002',
      correctsNumber: 'FD-2026-0001',
      viewUrl: `${SITE_URL}/portal/invoices/FD-2026-0002`,
    }),
};

function index(): string {
  const rows = Object.keys(CASES)
    .map(
      (key) => `<tr>
        <td>${key}</td>
        <td><a href="/dev/emails?t=${key}&locale=hu">HU</a> · <a href="/dev/emails?t=${key}&locale=nl">NL</a></td>
        <td><a href="/dev/emails?t=${key}&locale=hu&format=text">HU text</a> · <a href="/dev/emails?t=${key}&locale=nl&format=text">NL text</a></td>
      </tr>`
    )
    .join('');

  return `<!doctype html><meta charset="utf-8"><title>FODEL email preview</title>
<style>
  body { font: 15px/1.7 system-ui, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 24px; color: #102a43; }
  h1 { font-size: 22px; margin-bottom: 6px; }
  p { color: #475457; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  td { padding: 9px 12px 9px 0; border-bottom: 1px solid #d0d4d6; }
  td:first-child { font-family: ui-monospace, monospace; font-size: 13px; }
  a { color: #102a43; }
</style>
<h1>Email preview</h1>
<p>Development only. Open one, then use “view source” to copy the raw HTML into
a real client — Outlook on Windows is the renderer that decides whether this
works.</p>
<table>${rows}</table>`;
}

export const GET: APIRoute = async ({ url, request, cookies }) => {
  if (!import.meta.env.DEV) {
    // Not under /portal or /api/portal, so src/middleware.ts never ran for
    // this request — the admin check has to happen here, once, rather than
    // widening that middleware's scope for one dev tool.
    const supabase = createSupabaseServerClient(request, cookies);
    const { data } = await supabase.auth.getUser();
    if (!data.user) return new Response('Not found', { status: 404 });
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    if (profile?.role !== 'admin') return new Response('Not found', { status: 404 });
  }

  const key = url.searchParams.get('t');
  if (!key) {
    return new Response(index(), { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  const build = CASES[key];
  if (!build) return new Response(`Unknown template: ${key}`, { status: 404 });

  const locale: Locale = url.searchParams.get('locale') === 'nl' ? 'nl' : 'hu';
  const email = build(locale);

  if (url.searchParams.get('format') === 'text') {
    return new Response(`Subject: ${email.subject}\n\n${email.text}`, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(email.html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
};
