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
  linkFallback,
  button,
  quote,
  facts,
  itemisedTotal,
  esc,
  type EmailLocale,
  type ShellLocale,
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
        linkFallback(common.linkFallback, opts.acceptUrl) +
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
        linkFallback(common.linkFallback, opts.acceptUrl) +
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

/**
 * The invite from an admin-approved template (email_templates, migration
 * 0014) — the wording Gábor and Éva sign off, in any of the four languages.
 * Only the link fallback and the expiry line are fixed system text, and the
 * template editor previews them, so what is approved is the whole email.
 */
export type InviteTemplate = { subject: string; heading: string; body: string; cta: string };

export const INVITE_SYSTEM_TEXT: Record<ShellLocale, { linkFallback: string; expiry: string }> = {
  hu: { linkFallback: HU.common.linkFallback, expiry: HU.invite.expiry },
  nl: { linkFallback: NL.common.linkFallback, expiry: NL.invite.expiry },
  en: {
    linkFallback: 'If the button does not work, copy this address into your browser:',
    expiry: 'The link is valid for 7 days and can be used once.',
  },
  de: {
    linkFallback: 'Falls die Schaltfläche nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:',
    expiry: 'Der Link ist 7 Tage gültig und kann einmal verwendet werden.',
  },
};

export function inviteFromTemplate(
  locale: ShellLocale,
  template: InviteTemplate,
  acceptUrl: string
): BuiltEmail {
  const system = INVITE_SYSTEM_TEXT[locale];
  return {
    subject: template.subject,
    html: shell({
      locale,
      preheader: template.heading,
      body:
        h1(template.heading) +
        lead(template.body) +
        button(template.cta, acceptUrl) +
        linkFallback(system.linkFallback, acceptUrl) +
        small(system.expiry),
    }),
    text: textShell({
      locale,
      body: `${template.heading}

${template.body}

${textCta(template.cta, acceptUrl)}

${system.expiry}`,
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
    /** Referral discount, pre-formatted with its own minus sign — see src/lib/orders.ts. */
    discount?: string;
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

  const discountLine = opts.discount ? [[c.discountLabel, opts.discount]] as [string, string][] : [];

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
        (discountLine.length ? facts(discountLine) : '') +
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
${opts.discount ? `  ${c.discountLabel}: ${opts.discount}\n` : ''}  ${c.totalLabel}: ${opts.total}
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

/** 1.3 approval: the listing is already live; billing remains fully intact. */
export function approvedPublished(
  locale: EmailLocale,
  opts: {
    ref: string; title: string; items: OrderLine[]; discount?: string; total: string;
    payUrl: string | null; viewUrl: string; dueDate: string;
  }
): BuiltEmail {
  const c = copyFor(locale).approvedPublished;
  const common = copyFor(locale).common;
  const discountLine = opts.discount ? facts([[c.discountLabel, opts.discount]]) : '';
  const cardBlock = opts.payUrl ? button(c.ctaCard, opts.payUrl) + small(c.cardNote) : '';
  const bankBlock = h2(c.bankTitle) + facts([['IBAN', COMPANY.banks.nl.iban], ['BIC', COMPANY.banks.nl.bic]]) + small(c.bankNote(`#${opts.ref}`));
  return {
    subject: c.subject(opts.ref),
    html: shell({ locale, preheader: c.preheader, body:
      h1(c.heading) + lead(c.body(opts.title, opts.ref)) + button(c.viewCta, opts.viewUrl) +
      h2(c.orderTitle) + itemisedTotal(opts.items, c.totalLabel, opts.total) + discountLine +
      facts([[c.dueLabel, opts.dueDate]]) + small(c.vatNote) + cardBlock + bankBlock + signOff(locale),
    }),
    text: textShell({ locale, body: `${c.heading}\n\n${c.body(opts.title, opts.ref)}\n\n${textCta(c.viewCta, opts.viewUrl)}\n\n${c.orderTitle}\n${opts.items.map((item) => `  ${item.label} — ${item.amount}`).join('\n')}\n${opts.discount ? `  ${c.discountLabel}: ${opts.discount}\n` : ''}  ${c.totalLabel}: ${opts.total}\n${c.dueLabel}: ${opts.dueDate}\n${c.vatNote}\n${opts.payUrl ? `\n${textCta(c.ctaCard, opts.payUrl)}\n${c.cardNote}\n` : ''}\n${c.bankTitle}\n  IBAN: ${COMPANY.banks.nl.iban}\n  BIC: ${COMPANY.banks.nl.bic}\n${c.bankNote(`#${opts.ref}`)}\n\n${common.signOff}` }),
  };
}

/* ── 8. Payment receipt ──────────────────────────────────────────────────── */

export function paymentReceipt(
  locale: EmailLocale,
  opts: {
    ref: string;
    title: string;
    items: OrderLine[];
    discount?: string;
    total: string;
    paidAt: string;
  }
): BuiltEmail {
  const c = copyFor(locale).paymentReceipt;
  const common = copyFor(locale).common;
  const discountLine = opts.discount ? [[c.discountLabel, opts.discount]] as [string, string][] : [];

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
        (discountLine.length ? facts(discountLine) : '') +
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
${opts.discount ? `  ${c.discountLabel}: ${opts.discount}\n` : ''}  ${c.totalLabel}: ${opts.total}
  ${c.paidAtLabel}: ${opts.paidAt}

${c.vatNote}

${common.signOff}`,
    }),
  };
}

/* ── 16. Valuation ready ──────────────────────────────────────────────────── */

export function valuationReceived(locale: EmailLocale): BuiltEmail {
  const hu = locale === 'hu';
  const heading = hu ? 'Értékmeghatározási kérését megkaptuk' : 'Uw aanvraag is ontvangen';
  const body = hu
    ? 'Munkatársunk ellenőrzi az ingatlan adatait és az adatalapot, majd e-mailben küldi a tájékoztató, piaci alapú értékmeghatározást.'
    : 'Onze medewerker controleert de woninggegevens en de gegevensbasis en stuurt daarna de indicatieve, marktgebaseerde waardebepaling per e-mail.';
  return { subject: heading + ' — FODEL',
    html: shell({ locale, preheader: heading, body: h1(heading) + lead(body) + signOff(locale) }),
    text: textShell({ locale, body: `${heading}\n\n${body}` }) };
}

export function valuationReady(
  locale: EmailLocale,
  opts: { range: string; compCount: number; submitAdUrl: string; mid?: string; basis?: string; sourceUrl?: string; sourceDate?: string; factors?: { text: string; direction: 'plus' | 'minus' | 'unsure' }[]; notice?: string; visitUrl?: string; judicialUrl?: string; rateDate?: string }
): BuiltEmail {
  const c = copyFor(locale).valuationReady;
  const disclaimer = opts.compCount > 0 ? c.disclaimerWithCount(opts.compCount) : c.disclaimer;
  const intro = opts.basis
    ? (locale === 'nl' ? `Op basis van de verstrekte gegevens is de indicatieve, marktgebaseerde waarde: ${opts.range}.` : `A megadott adatok alapján a tájékoztató, piaci alapú értékmeghatározás: ${opts.range}.`)
    : c.body(opts.range);

  return {
    subject: c.subject,
    html: shell({
      locale,
      preheader: c.preheader,
      body:
        h1(c.heading) +
        lead(intro) +
        (opts.mid ? p(`${locale === 'nl' ? 'Middenwaarde' : 'Középérték'}: ${opts.mid}`) : '') +
        (opts.basis ? p(`${locale === 'nl' ? 'Gegevensbasis' : 'Adatalap'}: ${opts.basis}`) : '') +
        (opts.rateDate ? p(`${locale === 'nl' ? 'Wisselkoersdatum' : 'Árfolyam dátuma'}: ${opts.rateDate}`) : '') +
        (opts.sourceUrl ? linkFallback(`${locale === 'nl' ? 'Bron' : 'Forrás'}: KSH Ingatlanadattár${opts.sourceDate ? `, ${opts.sourceDate}` : ''} · CC BY 4.0`, opts.sourceUrl) : '') +
        (opts.factors?.length ? h2(locale === 'nl' ? 'Factoren' : 'Értéket befolyásoló szempontok') + opts.factors.map((f) => p(`${f.direction === 'plus' ? '+' : f.direction === 'minus' ? '−' : '?'} ${f.text}`)).join('') : '') +
        (opts.notice ? small(opts.notice) : '') +
        small(disclaimer) +
        button(c.cta, opts.submitAdUrl) +
        (opts.visitUrl ? linkFallback(locale === 'nl' ? 'Bezoek van Gábor aanvragen' : 'Gábor helyszíni látogatása', opts.visitUrl) : '') +
        (opts.judicialUrl ? linkFallback(locale === 'nl' ? 'Officiële taxatie aanvragen' : 'Igazságügyi értékbecslés kérése', opts.judicialUrl) : '') +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}\n\n${intro}\n${opts.mid ? `\n${locale === 'nl' ? 'Middenwaarde' : 'Középérték'}: ${opts.mid}` : ''}${opts.basis ? `\n${locale === 'nl' ? 'Gegevensbasis' : 'Adatalap'}: ${opts.basis}` : ''}${opts.rateDate ? `\n${locale === 'nl' ? 'Wisselkoersdatum' : 'Árfolyam dátuma'}: ${opts.rateDate}` : ''}${opts.sourceUrl ? `\n${locale === 'nl' ? 'Bron' : 'Forrás'}: KSH Ingatlanadattár${opts.sourceDate ? `, ${opts.sourceDate}` : ''} · CC BY 4.0 — ${opts.sourceUrl}` : ''}\n${opts.factors?.map((f) => `${f.direction === 'plus' ? (locale === 'nl' ? 'Waardeverhogend' : 'Értéknövelő') : f.direction === 'minus' ? (locale === 'nl' ? 'Waardeverlagend' : 'Értékcsökkentő') : (locale === 'nl' ? 'Onzeker' : 'Bizonytalan')}: ${f.text}`).join('\n') ?? ''}\n${opts.notice ?? ''}\n${disclaimer}\n\n${textCta(c.cta, opts.submitAdUrl)}${opts.visitUrl ? `\n${locale === 'nl' ? 'Bezoek van Gábor aanvragen' : 'Gábor helyszíni látogatása'}: ${opts.visitUrl}` : ''}${opts.judicialUrl ? `\n${locale === 'nl' ? 'Officiële taxatie aanvragen' : 'Igazságügyi értékbecslés kérése'}: ${opts.judicialUrl}` : ''}`,
    }),
  };
}

export function valuationDeclined(locale: EmailLocale): BuiltEmail {
  const c = copyFor(locale).valuationDeclined;
  return {
    subject: c.subject,
    html: shell({ locale, preheader: c.preheader, body: h1(c.heading) + lead(c.body) + signOff(locale) }),
    text: textShell({ locale, body: `${c.heading}\n\n${c.body}` }),
  };
}

/** Admin asked a valuation lead for missing details. The note is the admin's own words. */
export function valuationNeedsInfo(locale: EmailLocale, opts: { note: string }): BuiltEmail {
  const c = copyFor(locale).valuationNeedsInfo;
  const common = copyFor(locale).common;
  return {
    subject: c.subject,
    html: shell({
      locale,
      preheader: c.preheader,
      body: h1(c.heading) + lead(c.body) + quote(opts.note) + p(c.after) + signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}\n\n${c.body}\n\n  "${opts.note.replace(/\n/g, '\n  ')}"\n\n${c.after}\n\n${common.signOff}`,
    }),
  };
}

/* ── On-site service requested (to the customer and to FODEL) ─────────────── */
// Brief 3 §F. No payment is taken here: the payment timing for on-site
// services is still a decision, so the email promises contact, not a charge.

export function serviceRequested(locale: EmailLocale, opts: { service: string; price: string }): BuiltEmail {
  const c = copyFor(locale).serviceRequested;
  const common = copyFor(locale).common;
  return {
    subject: c.subject,
    html: shell({
      locale,
      preheader: c.preheader,
      body: h1(c.heading) + lead(c.body(opts.service, opts.price)) + p(c.next) + small(c.payment) + small(c.cancel) + p(common.signOff),
    }),
    text: textShell({
      locale,
      body: `${c.heading}\n\n${c.body(opts.service, opts.price)}\n\n${c.next}\n\n${c.payment}\n${c.cancel}\n\n${common.signOff}`,
    }),
  };
}

/** Card payment for a valuation package — no listing, no account, so no listing wording and no VAT claim. */
export function valuationPaid(
  locale: EmailLocale,
  opts: { service: string; items: OrderLine[]; total: string; paidAt: string }
): BuiltEmail {
  const c = copyFor(locale).valuationPaid;
  const common = copyFor(locale).common;
  return {
    subject: c.subject,
    html: shell({
      locale,
      preheader: c.preheader,
      body:
        h1(c.heading) +
        lead(c.body(opts.service)) +
        h2(c.orderTitle) +
        itemisedTotal(opts.items, c.totalLabel, opts.total) +
        facts([[c.paidAtLabel, opts.paidAt]]) +
        p(c.next) +
        small(c.invoice) +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}\n\n${c.body(opts.service)}\n\n${c.orderTitle}\n${opts.items.map((i) => `  ${i.label} — ${i.amount}`).join('\n')}\n  ${c.totalLabel}: ${opts.total}\n  ${c.paidAtLabel}: ${opts.paidAt}\n\n${c.next}\n${c.invoice}\n\n${common.signOff}`,
    }),
  };
}

/** Brief 3 §D.5 — acknowledged with no price and no turnaround. */
export function judicialRequested(locale: EmailLocale): BuiltEmail {
  const c = copyFor(locale).judicialRequested;
  const common = copyFor(locale).common;
  return {
    subject: c.subject,
    html: shell({ locale, preheader: c.preheader, body: h1(c.heading) + lead(c.body) + p(c.next) + signOff(locale) }),
    text: textShell({ locale, body: `${c.heading}\n\n${c.body}\n\n${c.next}\n\n${common.signOff}` }),
  };
}

export function adminServiceRequested(
  locale: EmailLocale,
  opts: { service: string; name: string; email: string; phone: string; source: string; note: string; url: string }
): BuiltEmail {
  const c = copyFor(locale).adminServiceRequested;
  const L = c.labels;
  const where = c.sources[opts.source] ?? opts.source;
  const rows: [string, string][] = [
    [L.service, opts.service],
    [L.name, opts.name || '—'],
    [L.email, opts.email || '—'],
    [L.phone, opts.phone || '—'],
    [L.where, where],
  ];
  if (opts.note) rows.push([L.note, opts.note]);
  return {
    subject: c.subject(opts.service),
    html: shell({ locale, preheader: c.preheader, body: h1(c.heading) + facts(rows) + button(c.cta, opts.url) }),
    text: textShell({
      locale,
      body: `${c.heading}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${textCta(c.cta, opts.url)}`,
    }),
  };
}

/* ── Listing rejected ─────────────────────────────────────────────────────── */
// Terminal, unlike changesRequested: there is no edit link. Whether money goes
// back is decided by a person — the email only promises contact about it.

export function rejected(
  locale: EmailLocale,
  opts: { ref: string; title: string; note: string; refundRequired: boolean; refundPolicy?: string }
): BuiltEmail {
  const c = copyFor(locale).rejected;
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
        (opts.refundRequired ? p(c.refund) + (opts.refundPolicy ? p(opts.refundPolicy) : '') : '') +
        p(c.after) +
        p(common.signOff),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${c.body(opts.title, opts.ref)}

  "${opts.note.replace(/\n/g, '\n  ')}"
${opts.refundRequired ? `\n${c.refund}\n${opts.refundPolicy ?? ''}\n` : ''}
${c.after}

${common.signOff}`,
    }),
  };
}

/* ── 12. Invoice issued ───────────────────────────────────────────────────── */

export function invoiceIssued(
  locale: EmailLocale,
  opts: { ref: string; title: string; number: string; viewUrl: string }
): BuiltEmail {
  const c = copyFor(locale).invoiceIssued;

  return {
    subject: c.subject(opts.number),
    html: shell({
      locale,
      preheader: c.preheader,
      body: h1(c.heading) + lead(c.body(opts.title, opts.ref, opts.number)) + button(c.cta, opts.viewUrl) + signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}\n\n${c.body(opts.title, opts.ref, opts.number)}\n\n${textCta(c.cta, opts.viewUrl)}`,
    }),
  };
}

export function creditNoteIssued(
  locale: EmailLocale,
  opts: { ref: string; title: string; number: string; correctsNumber: string; viewUrl: string }
): BuiltEmail {
  const c = copyFor(locale).creditNoteIssued;

  return {
    subject: c.subject(opts.number),
    html: shell({
      locale,
      preheader: c.preheader,
      body:
        h1(c.heading) +
        lead(c.body(opts.title, opts.ref, opts.number, opts.correctsNumber)) +
        button(c.cta, opts.viewUrl) +
        signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}\n\n${c.body(opts.title, opts.ref, opts.number, opts.correctsNumber)}\n\n${textCta(c.cta, opts.viewUrl)}`,
    }),
  };
}

/* ── 14. Referral registered (to the referrer) ───────────────────────────── */

export function referralRegistered(
  locale: EmailLocale,
  opts: { referredName: string }
): BuiltEmail {
  const c = copyFor(locale).referralRegistered;
  const common = copyFor(locale).common;

  return {
    subject: c.subject,
    html: shell({
      locale,
      preheader: c.preheader,
      body: h1(c.heading) + lead(c.body(opts.referredName)) + small(c.note) + signOff(locale),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${c.body(opts.referredName)}

${c.note}

${common.signOff}`,
    }),
  };
}

/* ── 15. Referral admin notice (to FODEL) ─────────────────────────────────── */

export function referralAdminNotice(
  locale: EmailLocale,
  opts: { referrerName: string; referrerEmail: string; referredName: string; referredEmail: string }
): BuiltEmail {
  const c = copyFor(locale).referralAdminNotice;
  const L = c.labels;

  return {
    subject: c.subject(opts.referrerName),
    html: shell({
      locale,
      preheader: `${opts.referrerName} → ${opts.referredName}`,
      body:
        h1(c.heading) +
        facts([
          [L.referrerName, opts.referrerName],
          [L.referrerEmail, opts.referrerEmail],
          [L.referredName, opts.referredName],
          [L.referredEmail, opts.referredEmail],
        ]) +
        p(c.advice),
    }),
    text: textShell({
      locale,
      body: `${c.heading}

${L.referrerName}: ${opts.referrerName}
${L.referrerEmail}: ${opts.referrerEmail}
${L.referredName}: ${opts.referredName}
${L.referredEmail}: ${opts.referredEmail}

${c.advice}`,
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
        linkFallback(common.linkFallback, opts.resetUrl) +
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
  inviteFromTemplate,
  welcome,
  submissionReceived,
  adminNewSubmission,
  changesRequested,
  approvedAwaitingPayment,
  approvedPublished,
  paymentReceipt,
  published,
  newEnquiry,
  passwordReset,
  referralRegistered,
  referralAdminNotice,
  invoiceIssued,
  creditNoteIssued,
  valuationReady,
  valuationReceived,
  valuationDeclined,
  valuationNeedsInfo,
  serviceRequested,
  valuationPaid,
  judicialRequested,
  adminServiceRequested,
  rejected,
};
