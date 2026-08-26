/**
 * Email preview — development only.
 *
 * Eleven templates in two languages is twenty-two pieces of HTML that have to
 * survive Outlook, and none of it can be judged by reading the source. This
 * renders any of them with realistic sample data so they can be looked at in a
 * browser, and — more importantly — so the raw HTML can be copied into a real
 * client for the tests that actually matter (Outlook on Windows, Gmail's
 * clipper, dark mode).
 *
 * Hard 404 outside `astro dev`. This is a developer tool, not a portal
 * feature, and it must not exist in production: it renders arbitrary
 * templates and does not authenticate.
 *
 *   /dev/emails                            → index of everything
 *   /dev/emails?t=published&locale=nl      → rendered HTML
 *   /dev/emails?t=published&format=text    → the plain-text alternative
 */
import type { APIRoute } from 'astro';
import { templates } from '~/lib/email/templates';
import type { BuiltEmail } from '~/lib/email/templates';
import { SITE_URL } from '~/config/site.mjs';

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

export const GET: APIRoute = ({ url }) => {
  if (!import.meta.env.DEV) return new Response('Not found', { status: 404 });

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
