/**
 * Every email FODEL sends.
 *
 * Each template returns `{ subject, html, text }` for a given locale. The
 * locale is the *recipient's* (`profiles.locale`), never the sender's or the
 * server's — a Dutch owner advertising a Hungarian farmhouse gets Dutch.
 *
 * The plain-text alternative is written by hand rather than derived from the
 * HTML. A good text email is not a stripped-down web page: the button becomes
 * a labelled URL on its own line, the fact table becomes aligned pairs. It is
 * what screen readers and watch notifications actually read, and its absence
 * is a measurable spam-score penalty.
 */
import { COMPANY } from '~/config/company';
import { HU } from './copy/hu';
import { NL } from './copy/nl';
import {
  shell,
  textShell,
  h1,
  h2,
  p,
  lead,
  small,
  button,
  quote,
  facts,
  itemisedTotal,
  esc,
  type EmailLocale,
} from './layout';

export type BuiltEmail = { subject: string; html: string; text: string };

/** A line on an approved listing's order. Amounts are pre-formatted — see src/lib/orders.ts. */
export type OrderLine = { label: string; amount: string };

const COPY = { hu: HU, nl: NL };

function copyFor(locale: EmailLocale) {
  return COPY[locale];
}

/** The signature block, identical in every email. */
function signOff(locale: EmailLocale): string {
  const c = copyFor(locale);
  return small(c.common.questions) + p(c.common.signOff);
}

/**
 * Text-mode rendering of a call to action. A raw URL on its own line is
 * clickable in every mail client and readable when it isn't.
 */
function textCta(label: string, href: string): string {
  return `${label}:\n${href}`;
}

/* ── 1. Registration confirmation (the public form's new front door) ─────── */

export function registrationConfirm(
  locale: EmailLocale,
  opts: { name: string; acceptUrl: string; settlement?: string }
): BuiltEmail {
  const c = copyFor(locale).registrationConfirm;
  const common = copyFor(locale).common;
  const settlement = opts.settlement ?? '';

  return {
    subject: c.subject,
    html: shell({
      locale,
      preheader: c.preheader,
      body:
        h1(c.heading) +
        p(common.greeting(opts.name)) +
        lead(c.intro(settlement)) +
        p(c.body) +
        button(c.cta, opts.acceptUrl) +
        small(`${common.linkFallback}<br><span style="word-break:break-all;">${esc(opts.acceptUrl)}</span>`) +
        small(c.expiry) +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${common.greeting(opts.name)}

${c.intro(settlement)}

${c.body}

${textCta(c.cta, opts.acceptUrl)}

${c.expiry}

${common.questions}

${common.signOff}`,
    }),
  };
}

/* ── 2. Invite (admin-initiated) ─────────────────────────────────────────── */

export function invite(
  locale: EmailLocale,
  opts: { role: 'admin' | 'owner'; acceptUrl: string }
): BuiltEmail {
  const c = copyFor(locale).invite;
  const common = copyFor(locale).common;
  const roleWord = opts.role === 'admin' ? c.roleAdmin : c.roleOwner;

  return {
    subject: c.subject,
    html: shell({
      locale,
      preheader: c.preheader,
      body:
        h1(c.heading) +
        lead(c.body(roleWord)) +
        button(c.cta, opts.acceptUrl) +
        small(`${common.linkFallback}<br><span style="word-break:break-all;">${esc(opts.acceptUrl)}</span>`) +
        small(c.expiry) +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${c.body(roleWord)}

${textCta(c.cta, opts.acceptUrl)}

${c.expiry}

${common.signOff}`,
    }),
  };
}

/* ── 3. Welcome ──────────────────────────────────────────────────────────── */

export function welcome(
  locale: EmailLocale,
  opts: { name: string; portalUrl: string }
): BuiltEmail {
  const c = copyFor(locale).welcome;
  const common = copyFor(locale).common;

  const steps = c.steps
    .map(
      (step: string) =>
        `<li style="margin:0 0 9px;font-family:'Jost','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#475457;">${esc(step)}</li>`
    )
    .join('');

  return {
    subject: c.subject,
    html: shell({
      locale,
      preheader: c.preheader,
      body:
        h1(c.heading(opts.name)) +
        lead(c.body) +
        h2(c.stepsTitle) +
        `<ul style="margin:0 0 24px;padding-left:20px;">${steps}</ul>` +
        button(c.cta, opts.portalUrl) +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading(opts.name)}

${c.body}

${c.stepsTitle}
${c.steps.map((s: string) => `  · ${s}`).join('\n')}

${textCta(c.cta, opts.portalUrl)}

${common.signOff}`,
    }),
  };
}

/* ── 4. Submission received (to the owner) ───────────────────────────────── */

export function submissionReceived(
  locale: EmailLocale,
  opts: { ref: string; title: string }
): BuiltEmail {
  const c = copyFor(locale).submissionReceived;
  const common = copyFor(locale).common;

  return {
    subject: c.subject(opts.ref),
    html: shell({
      locale,
      preheader: c.preheader,
      body: h1(c.heading) + lead(c.body(opts.title, opts.ref)) + p(c.timing) + small(c.note) + signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${c.body(opts.title, opts.ref)}

${c.timing}

${c.note}

${common.signOff}`,
    }),
  };
}

/* ── 5. New submission (to FODEL) ────────────────────────────────────────── */
// Closes a real gap in 1.0: the owner was told "we received it" and nobody at
// FODEL was told anything. Reviews only happened if an admin thought to look.

export function adminNewSubmission(
  locale: EmailLocale,
  opts: {
    ref: string;
    title: string;
    ownerName: string;
    ownerEmail: string;
    location: string;
    price: string;
    photoCount: number;
    languages: string;
    reviewUrl: string;
  }
): BuiltEmail {
  const c = copyFor(locale).adminNewSubmission;
  const L = c.labels;

  return {
    subject: c.subject(opts.ref),
    html: shell({
      locale,
      preheader: `${opts.title} — ${opts.location}`,
      body:
        h1(c.heading) +
        facts([
          [L.ref, `#${opts.ref}`],
          [L.title, opts.title],
          [L.owner, opts.ownerName],
          [L.email, opts.ownerEmail],
          [L.location, opts.location],
          [L.price, opts.price],
          [L.photos, String(opts.photoCount)],
          [L.languages, opts.languages],
        ]) +
        button(c.cta, opts.reviewUrl),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${L.ref}: #${opts.ref}
${L.title}: ${opts.title}
${L.owner}: ${opts.ownerName} <${opts.ownerEmail}>
${L.location}: ${opts.location}
${L.price}: ${opts.price}
${L.photos}: ${opts.photoCount}
${L.languages}: ${opts.languages}

${textCta(c.cta, opts.reviewUrl)}`,
    }),
  };
}

/* ── 6. Changes requested ────────────────────────────────────────────────── */

export function changesRequested(
  locale: EmailLocale,
  opts: { ref: string; title: string; note: string; editUrl: string }
): BuiltEmail {
  const c = copyFor(locale).changesRequested;
  const common = copyFor(locale).common;

  return {
    subject: c.subject(opts.ref),
    html: shell({
      locale,
      preheader: c.preheader,
      body:
        h1(c.heading) +
        lead(c.body(opts.title, opts.ref)) +
        quote(opts.note) +
        p(c.after) +
        button(c.cta, opts.editUrl) +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${c.body(opts.title, opts.ref)}

  "${opts.note.replace(/\n/g, '\n  ')}"

${c.after}

${textCta(c.cta, opts.editUrl)}

${common.signOff}`,
    }),
  };
}

/* ── 7. Approved — pay to publish ────────────────────────────────────────── */
// FODEL 1.1's payment model: approve first, charge second. The listing is
// already accepted at this point, so this email is good news with an action
// attached, not an invoice with a condition attached.

export function approvedAwaitingPayment(
  locale: EmailLocale,
  opts: {
    ref: string;
    title: string;
    items: OrderLine[];
    total: string;
    payUrl: string | null;
  }
): BuiltEmail {
  const c = copyFor(locale).approvedAwaitingPayment;
  const common = copyFor(locale).common;
  const iban = COMPANY.banks.nl.iban;

  const cardBlock = opts.payUrl
    ? button(c.ctaCard, opts.payUrl) + small(c.cardNote)
    : '';

  const bankBlock =
    h2(c.bankTitle) +
    facts([
      ['IBAN', iban],
      ['BIC', COMPANY.banks.nl.bic],
    ]) +
    small(c.bankNote(`#${opts.ref}`));

  return {
    subject: c.subject(opts.ref),
    html: shell({
      locale,
      preheader: c.preheader,
      body:
        h1(c.heading) +
        lead(c.body(opts.title, opts.ref)) +
        h2(c.orderTitle) +
        itemisedTotal(opts.items, c.totalLabel, opts.total) +
        small(c.vatNote) +
        cardBlock +
        bankBlock +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${c.body(opts.title, opts.ref)}

${c.orderTitle}
${opts.items.map((i) => `  ${i.label} — ${i.amount}`).join('\n')}
  ${c.totalLabel}: ${opts.total}
${c.vatNote}
${opts.payUrl ? `\n${textCta(c.ctaCard, opts.payUrl)}\n${c.cardNote}\n` : ''}
${c.bankTitle}
  IBAN: ${iban}
  BIC: ${COMPANY.banks.nl.bic}
${c.bankNote(`#${opts.ref}`)}

${common.signOff}`,
    }),
  };
}

/* ── 8. Payment receipt ──────────────────────────────────────────────────── */

export function paymentReceipt(
  locale: EmailLocale,
  opts: { ref: string; title: string; items: OrderLine[]; total: string; paidAt: string }
): BuiltEmail {
  const c = copyFor(locale).paymentReceipt;
  const common = copyFor(locale).common;

  return {
    subject: c.subject(opts.ref),
    html: shell({
      locale,
      preheader: c.preheader,
      body:
        h1(c.heading) +
        lead(c.body(opts.title, opts.ref)) +
        h2(c.orderTitle) +
        itemisedTotal(opts.items, c.totalLabel, opts.total) +
        facts([[c.paidAtLabel, opts.paidAt]]) +
        small(c.vatNote) +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${c.body(opts.title, opts.ref)}

${c.orderTitle}
${opts.items.map((i) => `  ${i.label} — ${i.amount}`).join('\n')}
  ${c.totalLabel}: ${opts.total}
  ${c.paidAtLabel}: ${opts.paidAt}

${c.vatNote}

${common.signOff}`,
    }),
  };
}

/* ── 9. Published ────────────────────────────────────────────────────────── */

export function published(
  locale: EmailLocale,
  opts: { ref: string; title: string; url: string }
): BuiltEmail {
  const c = copyFor(locale).published;
  const common = copyFor(locale).common;

  return {
    subject: c.subject(opts.ref),
    html: shell({
      locale,
      preheader: c.preheader,
      body:
        h1(c.heading) +
        lead(c.body(opts.title, opts.ref)) +
        button(c.cta, opts.url) +
        p(c.next) +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${c.body(opts.title, opts.ref)}

${textCta(c.cta, opts.url)}

${c.next}

${common.signOff}`,
    }),
  };
}

/* ── 10. New enquiry ─────────────────────────────────────────────────────── */

export function newEnquiry(
  locale: EmailLocale,
  opts: {
    ref: string;
    title: string;
    name: string;
    email: string;
    phone?: string;
    message?: string;
  }
): BuiltEmail {
  const c = copyFor(locale).newEnquiry;
  const common = copyFor(locale).common;

  const rows: [string, string][] = [
    [c.labels.name, opts.name],
    [c.labels.email, opts.email],
  ];
  if (opts.phone) rows.push([c.labels.phone, opts.phone]);

  return {
    subject: c.subject(opts.ref),
    html: shell({
      locale,
      preheader: `${opts.name} — ${opts.title}`,
      body:
        h1(c.heading) +
        lead(c.body(opts.title, opts.ref)) +
        facts(rows) +
        (opts.message ? h2(c.messageTitle) + quote(opts.message) : '') +
        p(c.advice) +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${c.body(opts.title, opts.ref)}

  ${c.labels.name}: ${opts.name}
  ${c.labels.email}: ${opts.email}${opts.phone ? `\n  ${c.labels.phone}: ${opts.phone}` : ''}
${opts.message ? `\n${c.messageTitle}:\n  "${opts.message.replace(/\n/g, '\n  ')}"\n` : ''}
${c.advice}

${common.signOff}`,
    }),
  };
}

/* ── 11. Password reset ──────────────────────────────────────────────────── */

export function passwordReset(
  locale: EmailLocale,
  opts: { name: string; resetUrl: string }
): BuiltEmail {
  const c = copyFor(locale).passwordReset;
  const common = copyFor(locale).common;

  return {
    subject: c.subject,
    html: shell({
      locale,
      preheader: c.preheader,
      body:
        h1(c.heading) +
        p(common.greeting(opts.name)) +
        lead(c.body) +
        button(c.cta, opts.resetUrl) +
        small(`${common.linkFallback}<br><span style="word-break:break-all;">${esc(opts.resetUrl)}</span>`) +
        small(c.expiry) +
        small(c.ignore) +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${common.greeting(opts.name)}

${c.body}

${textCta(c.cta, opts.resetUrl)}

${c.expiry}

${c.ignore}

${common.signOff}`,
    }),
  };
}

/**
 * Kept as a namespace so existing call sites read the same as they did in 1.0
 * (`templates.welcome(...)`), while every template now takes a locale first.
 */
export const templates = {
  registrationConfirm,
  invite,
  welcome,
  submissionReceived,
  adminNewSubmission,
  changesRequested,
  approvedAwaitingPayment,
  paymentReceipt,
  published,
  newEnquiry,
  passwordReset,
};
