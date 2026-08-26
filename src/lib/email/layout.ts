/**
 * The shell every FODEL email renders into, plus the small set of blocks the
 * templates compose from.
 *
 * Why this is written the way it is — email HTML is not web HTML, and almost
 * every constraint below exists because a specific client breaks without it:
 *
 * - **Tables, not divs.** Outlook on Windows renders through Microsoft Word's
 *   engine, which has no flexbox, no grid, and unreliable `max-width`. Nested
 *   tables with fixed widths are the only layout primitive that survives.
 * - **Inline styles only.** Gmail strips `<style>` blocks in several contexts
 *   (notably forwarded mail and the Android app), so anything that must render
 *   is on the element itself. The one `<style>` block below carries progressive
 *   enhancement only — nothing in it is load-bearing.
 * - **The wordmark is text, not an image.** Every major client blocks remote
 *   images by default. An image logo means most recipients open a FODEL email
 *   and see a broken-image box where the brand should be. FODEL's mark is
 *   already pure type (see src/components/Logo.astro) — letterspaced uppercase,
 *   a hairline rule, a sub-label — so it costs nothing to set it in text and
 *   it renders for everyone, always.
 * - **Web fonts do not load, and neither typeface is actually serif.**
 *   `DM Sans` and `Jost` will resolve for almost nobody, so both fallback
 *   stacks land on Helvetica/Arial — matching what the website itself
 *   renders for anyone without the webfonts, not a separate "email look".
 *   (The site's own CSS variable is confusingly named `--serif`, but DM Sans
 *   is a geometric sans-serif; an actual Georgia/Times fallback here would
 *   have put real serifs in the email that never appear anywhere on
 *   fodel.nl — the opposite of matching the brand.)
 * - **No pure #ffffff or #000000.** Dark-mode clients (Outlook, Apple Mail)
 *   forcibly invert colours they read as "plain", and pure values invert
 *   hardest. FODEL's palette is already off-white and navy, which survives the
 *   transform recognisably.
 *
 * Colours are the design tokens from src/styles/tokens.css, hard-coded here
 * because an email cannot reference a stylesheet. They are the only place in
 * the codebase where these hex values are legitimately repeated.
 */
import { COMPANY } from '~/config/company';
import { BRAND } from '~/i18n/ui';

export type EmailLocale = 'hu' | 'nl';

/* ── Palette (mirrors src/styles/tokens.css) ─────────────────────────────── */
const INK = '#102a43';
const CREAM = '#f4f4f2';
const LINEN = '#ecedef';
const TAUPE = '#475457';
const BORDER = '#d0d4d6';

// Mirrors src/styles/tokens.css's --serif / --sans tokens exactly. Despite
// the site's own "--serif" name, DM Sans is a sans-serif display face — the
// website never renders an actual serif anywhere, and the email shouldn't
// either. Fallbacks stay sans-serif for both, matching what a recipient
// without either webfont installed actually sees on fodel.nl.
const DISPLAY = "'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SANS = "'Jost', 'Helvetica Neue', Helvetica, Arial, sans-serif";

const SITE = 'https://fodel.nl';

/** Escapes text interpolated into an email. Owner-supplied strings (titles, review notes) reach these templates. */
export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Paragraph breaks from a plain-text field, escaped. */
function paragraphs(value: string): string {
  return esc(value).replace(/\n/g, '<br>');
}

/* ── Blocks ──────────────────────────────────────────────────────────────── */

export function h1(text: string): string {
  return `<h1 style="margin:0 0 18px;font-family:${DISPLAY};font-size:24px;line-height:1.25;font-weight:700;color:${INK};">${esc(text)}</h1>
<div style="width:48px;height:1px;background-color:${INK};font-size:0;line-height:0;margin:0 0 24px;">&nbsp;</div>`;
}

export function h2(text: string): string {
  return `<h2 style="margin:32px 0 14px;font-family:${DISPLAY};font-size:17px;line-height:1.3;font-weight:700;color:${INK};">${esc(text)}</h2>`;
}

export function p(text: string): string {
  return `<p style="margin:0 0 18px;font-family:${SANS};font-size:15px;line-height:1.75;color:${TAUPE};">${paragraphs(text)}</p>`;
}

/** Body copy that carries weight — the sentence the whole email exists to deliver. */
export function lead(text: string): string {
  return `<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:1.7;color:${INK};">${paragraphs(text)}</p>`;
}

export function small(text: string): string {
  return `<p style="margin:0 0 14px;font-family:${SANS};font-size:13px;line-height:1.7;color:${TAUPE};">${paragraphs(text)}</p>`;
}

/**
 * A "bulletproof" button: the clickable thing is a table cell with a
 * background, not a styled anchor. Outlook ignores padding and background on
 * an `<a>`, which silently turns a designed call to action into bare blue
 * underlined text — the single most common way a transactional email falls apart.
 */
export function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td align="center" bgcolor="${INK}" style="background-color:${INK};">
      <a href="${esc(href)}" style="display:inline-block;padding:14px 32px;font-family:${SANS};font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:${CREAM};text-decoration:none;">${esc(label)}</a>
    </td>
  </tr>
</table>`;
}

/** The admin's note, or any quoted passage. Mirrors the site's blockquote treatment. */
export function quote(text: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;">
  <tr>
    <td style="border-left:2px solid ${INK};padding:4px 0 4px 18px;font-family:${SANS};font-size:15px;line-height:1.75;color:${INK};">${paragraphs(text)}</td>
  </tr>
</table>`;
}

/** Label/value pairs — listing facts, enquiry details. */
export function facts(rows: [string, string][]): string {
  const cells = rows
    .map(
      ([label, value]) => `<tr>
      <td style="padding:9px 16px 9px 0;font-family:${SANS};font-size:11.5px;letter-spacing:0.16em;text-transform:uppercase;color:${TAUPE};border-bottom:1px solid ${BORDER};white-space:nowrap;vertical-align:top;">${esc(label)}</td>
      <td style="padding:9px 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${INK};border-bottom:1px solid ${BORDER};">${paragraphs(value)}</td>
    </tr>`
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-collapse:collapse;">${cells}</table>`;
}

/** An itemised order with a total. Used by the pay-to-publish and receipt emails. */
export function itemisedTotal(
  items: { label: string; amount: string }[],
  totalLabel: string,
  total: string
): string {
  const lines = items
    .map(
      (item) => `<tr>
      <td style="padding:10px 16px 10px 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${INK};border-bottom:1px solid ${BORDER};">${esc(item.label)}</td>
      <td align="right" style="padding:10px 0;font-family:${SANS};font-size:15px;color:${INK};border-bottom:1px solid ${BORDER};white-space:nowrap;">${esc(item.amount)}</td>
    </tr>`
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;border-collapse:collapse;">
  ${lines}
  <tr>
    <td style="padding:14px 16px 0 0;font-family:${SANS};font-size:11.5px;letter-spacing:0.16em;text-transform:uppercase;color:${TAUPE};">${esc(totalLabel)}</td>
    <td align="right" style="padding:14px 0 0;font-family:${DISPLAY};font-size:20px;font-weight:700;color:${INK};white-space:nowrap;">${esc(total)}</td>
  </tr>
</table>`;
}

/* ── The shell ───────────────────────────────────────────────────────────── */

const FOOTER_COPY = {
  hu: {
    why: 'Ezt az e-mailt azért kapja, mert FODEL-fiókkal rendelkezik, vagy hirdetést adott fel nálunk.',
    contact: 'Kapcsolat',
  },
  nl: {
    why: 'U ontvangt deze e-mail omdat u een FODEL-account heeft of een advertentie bij ons heeft geplaatst.',
    contact: 'Contact',
  },
} as const;

function wordmark(locale: EmailLocale): string {
  // BRAND[locale].name is "FODEL INGATLAN" / "FODEL VASTGOED" — the sub-label
  // is whatever follows the wordmark, exactly as src/components/Logo.astro
  // derives it. Same rule, one source.
  const sub = BRAND[locale].name.replace('FODEL', '').trim() || 'VASTGOED';
  return `<a href="${SITE}/${locale}/" style="text-decoration:none;">
  <span style="display:block;font-family:${DISPLAY};font-size:19px;font-weight:500;letter-spacing:0.34em;text-transform:uppercase;color:${INK};">FODEL</span>
  <span style="display:block;width:34px;height:1px;background-color:${INK};font-size:0;line-height:0;margin:9px 0 8px;">&nbsp;</span>
  <span style="display:block;font-family:${SANS};font-size:9.5px;font-weight:400;letter-spacing:0.30em;text-transform:uppercase;color:${TAUPE};">${esc(sub)}</span>
</a>`;
}

/**
 * @param preheader The inbox preview line. Always pass a deliberate one — left
 *   empty, clients scrape the first visible words plus whatever whitespace
 *   follows, which is how "Kedves Gábor, ‌ ‌ ‌ ‌ ‌ ‌" ends up in an inbox.
 */
export function shell(opts: {
  locale: EmailLocale;
  preheader: string;
  body: string;
}): string {
  const { locale, preheader, body } = opts;
  const footer = FOOTER_COPY[locale];
  const mail = locale === 'hu' ? COMPANY.email.hu : COMPANY.email.primary;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${locale}">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>FODEL</title>
<style type="text/css">
  /* Progressive enhancement only — nothing here is required for the email to
     read correctly, because Gmail discards this block in several contexts. */
  a { color: ${INK}; }
  @media only screen and (max-width: 620px) {
    .fodel-pad { padding-left: 24px !important; padding-right: 24px !important; }
    .fodel-shell { width: 100% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${LINEN};-webkit-font-smoothing:antialiased;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(preheader)}</div>
<!-- Word-joiner run: stops clients padding the preview line with the first words of the body. -->
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">&#8288;&zwnj;&nbsp;&#8288;&zwnj;&nbsp;&#8288;&zwnj;&nbsp;&#8288;&zwnj;&nbsp;&#8288;&zwnj;&nbsp;&#8288;&zwnj;&nbsp;&#8288;&zwnj;&nbsp;&#8288;&zwnj;&nbsp;</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${LINEN};">
  <tr>
    <td align="center" style="padding:32px 12px;">

      <table role="presentation" class="fodel-shell" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:${CREAM};border:1px solid ${BORDER};">
        <tr>
          <td class="fodel-pad" style="padding:38px 44px 0;">
            ${wordmark(locale)}
          </td>
        </tr>
        <tr>
          <td class="fodel-pad" style="padding:34px 44px 8px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td class="fodel-pad" style="padding:8px 44px 38px;">
            <div style="height:1px;background-color:${BORDER};font-size:0;line-height:0;margin:14px 0 20px;">&nbsp;</div>
            <p style="margin:0 0 6px;font-family:${SANS};font-size:12px;line-height:1.7;color:${TAUPE};">
              <strong style="color:${INK};font-weight:500;">${esc(BRAND[locale].name)}</strong><br />
              ${esc(COMPANY.address.oneLine)}<br />
              <a href="mailto:${mail}" style="color:${TAUPE};text-decoration:underline;">${mail}</a> &nbsp;·&nbsp; ${esc(COMPANY.phones[0].display)}
            </p>
            <p style="margin:14px 0 0;font-family:${SANS};font-size:11px;line-height:1.6;color:${TAUPE};">
              ${esc(footer.why)}
            </p>
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Plain-text alternative.
 *
 * Not optional and not a formality: a missing text/plain part is a measurable
 * spam-score penalty at most filters, and it is what a screen reader and a
 * watch notification actually read out. Templates build this by hand rather
 * than stripping tags from the HTML, because a good plain-text email is
 * written, not generated — the button becomes a labelled URL on its own line.
 */
export function textShell(opts: { locale: EmailLocale; body: string }): string {
  const { locale, body } = opts;
  const mail = locale === 'hu' ? COMPANY.email.hu : COMPANY.email.primary;
  const sub = BRAND[locale].name.replace('FODEL', '').trim();
  return `FODEL ${sub}
${'—'.repeat(24)}

${body.trim()}

${'—'.repeat(24)}
${BRAND[locale].name}
${COMPANY.address.oneLine}
${mail} · ${COMPANY.phones[0].display}
${FOOTER_COPY[locale].why}
`;
}
