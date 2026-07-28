# FODEL Website 1.0

Astro static site for **FODEL VASTGOED / FODEL INGATLAN** — Hungarian property
advertised to Western European buyers. Hungarian and Dutch at launch, with
German, English and French scaffolded.

Companion documents: [`FODEL_AUDIT.md`](FODEL_AUDIT.md) (why this rebuild exists)
and [`fodel_brand_identity 2.md`](fodel_brand_identity%202.md) (brand ground truth).
The original React prototype is preserved untouched at [`index.html`](index.html)
as the design reference.

---

## Quick start

```bash
npm install
cp .env.example .env      # add RESEND_API_KEY to make the forms deliver
npm run dev               # http://localhost:4321
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server, including the four form endpoints |
| `npm run build` | Static build to `dist/` |
| `npm run preview` | Serves the built `dist/` at localhost:4321. Zero dependencies. |
| `npm run verify` | Build + full preflight. **Fails until the KvK number is set.** |
| `npm run verify:dev` | Same, but waives the KvK gate |
| `npm run og` | Regenerates `public/og/fodel-default.jpg` |

`build` runs `scripts/prune-assets.mjs` afterwards, which drops the source
images Astro emits alongside the optimised variants (11 MB, unreferenced).

### Why you can't just open the HTML file any more

You can't double-click `dist/hu/index.html` — you get the page with no images,
no fonts, and every link 404ing. That is not the build tool being awkward:

- `/hu/ingatlanok/` is a **directory URL**. Mapping it to `index.html` is
  something only a server does. Under `file://` every internal link dead-ends.
- Assets are referenced absolutely (`/_astro/…`) so a page at any depth resolves
  them identically. Under `file://` that points at your filesystem root.

The old single-file prototype avoided both problems by having no URLs at all —
which was the defect this rebuild existed to fix. `npm run preview` is the
replacement for dragging the file into Chrome: one command, no install, and it
serves the real production output.

---

## Before this can go live

1. **KvK number.** Not published on any FODEL property, and Dutch law requires it
   on the website. Set `registration.kvk` in `src/config/company.ts`. Until then
   the footer and colofon render a red `—` and `npm run verify` fails.
2. **Confirm the VAT identifier.** `NL002505231B62` is published on fodel.hu.
   Confirm it is the publishable **BTW-id** and not the legacy sole-trader
   BTW-nummer, which embeds a BSN and must not appear publicly. Once confirmed,
   set `registration.vatVerified: true` so it is also emitted in the JSON-LD.
3. **Legal pages are drafts.** `src/data/pages-legal.ts` must be reconciled
   against the ÁSZF and privacy PDFs FODEL already publish on
   fodel.hu/dokumentumok, and reviewed by counsel.
4. **Hungarian FAQ wording.** `src/data/faq.ts` reproduces FODEL's 22 questions;
   headings and quoted passages are verbatim, connecting prose is a faithful
   restatement. Diff against fodel.hu/gyik before launch.
5. **`RESEND_API_KEY`** and a verified sender domain, or no form reaches anyone.
6. **Photography rights** for the six demo listings.

---

## Architecture

Static HTML for every route; the four form endpoints are the only server code.
**No UI framework** — the interactive pieces are small vanilla scripts over
pre-rendered markup, so listings stay in the HTML for crawlers and the client JS
budget is effectively zero.

```
src/
  config/company.ts     Single source of truth for every company fact.
                        Nothing is invented; unverified values are null.
  i18n/ui.ts            Nav, categories, route slugs, UI strings. FODEL's own
                        vocabulary per market, taken verbatim from their sites.
  content.config.ts     Property + article schemas
  content/properties/   Six listings, one Markdown file each
  data/                 copy.ts · faq.ts · features.ts · pages-content.ts
                        pages-legal.ts
  lib/                  properties · seo · format · page · form-handler
  layouts/Base.astro    head, canonical, hreflang, JSON-LD, consent, skip link
  components/           Design system, ported 1:1 from the prototype
  components/pages/     One component per page type, shared across locales
  pages/{hu,nl}/…       Thin route files
  pages/api/            enquiry · callback · listing-order · search-request
scripts/                verify-ssg · verify-contrast · build-og
```

**Adding a locale** (de/en/fr): add it to `LOCALES` in `src/config/site.mjs`,
fill in `ROUTES` and `UI` in `src/i18n/ui.ts` (brand strings are already there),
add the locale to `COPY`, and create the thin route files under `src/pages/<loc>/`.
hreflang and the sitemap pick it up automatically.

**Adding a property**: drop a Markdown file in `src/content/properties/`. The
schema is enforced at build time, so a missing EPC class or coordinates fails
the build rather than shipping quietly.

---

## Decisions worth knowing

**Property URLs mirror FODEL's existing pattern** — `/nl/huis-te-koop-6412/`,
matching their live `fodel.nl/woonhuis-te-koop-1550/`. When the real inventory
migrates, the 301 map is mechanical.

**Images are optimised at build time with sharp**, not handed to the host's
image CDN. `netlify({ imageCDN: false })` in `astro.config.mjs` is deliberate:
the output is fast on any host and the file sizes are verifiable in `dist/`.

**CSS is inlined** (`inlineStylesheets: 'always'`). Measured: it removes two
render-blocking requests and improves FCP ~0.15s and the Lighthouse score by 2–3
points. The trade-off is no cross-page CSS caching; for a site this size the
first-visit win is worth more, and first visit is what converts a search visitor.

**An LCP image preload was tried and removed.** It measured *worse* — on a
throttled connection the 111 kB image competed with the CSS for bandwidth and
cost ~0.4s of LCP. The A/B is in the git history.

**Payments are deliberately absent.** FODEL's published process is form →
díjbekérő by email → bank transfer → photo upload → translation → publication.
The ad-submission form is step one of that flow. No gateway is needed.

**Forms work without JavaScript.** With JS they post via `fetch` and swap in a
success panel; without it the browser does a native POST and the endpoint
redirects to `/hu/koszonjuk/` or `/nl/bedankt/`. A prerendered page cannot read
`?sent=`, so the confirmation needs its own URL.

---

## Corrections carried into this build

| | Prototype | 1.0 |
|---|---|---|
| Countries | 9 | **8** — FODEL's own figure |
| Hours | 08:00–18:00 | **09:00–18:00**, plus the free callback to 21:00 including weekends |
| Address | Almere-Buiten | Founded in Almere-Buiten, **based in Den Haag** |
| Track record | "several hundred transactions" | **Removed** — FODEL publish no such figure |
| Csemő | Bács-Kiskun county | **Pest county** |
| Zala | Dél-Dunántúl | **Nyugat-Dunántúl** |
| Dutch phone | `+31-644-005-550` | **+31 6 4400 5550** |

### A correction I got wrong first

The prototype had `h1,h2,h3 { font-weight: 700 !important }`. I initially read
that as a bug overriding the inline `fontWeight: 300` values and removed it.
That was backwards: the `!important` **won**, so 700 is what rendered on screen
and 700 is what was approved. The inline values were unreachable code. Bold
headings are restored via `--fw-display`.

Related and more serious: spacing classes passed into child components
(`<Eyebrow class="aud-eyebrow">`) never applied. Astro scopes styles per
component, so the parent's `.aud-eyebrow { margin-bottom: 16px }` compiled to
`.aud-eyebrow[data-astro-cid-PARENT]` while the element carried Eyebrow's own
scope id. **74 call sites silently did nothing.** `Eyebrow` and `GoldRule` now
take an explicit `space` prop instead, which cannot fail this way.

`em { font-style: normal !important }` was genuinely dead — the prototype
re-declared italic inline on every use — and stays removed.

---

## Verification

`npm run verify` checks, in order: content present in static HTML without JS ·
no dev-mode framework anywhere · unique title/description/canonical per page ·
hreflang reciprocity · JSON-LD validity, numeric prices, coordinates · alt text
and explicit dimensions on every image · modern image formats · crawlable links
· required assets · client JS budget · legal preflight.

`npm run verify:contrast` asserts the design tokens clear WCAG AA and guards
against the prototype's failing alpha values returning.

Last measured (Lighthouse mobile, throttled, local server — a real host with
Brotli and a CDN will be faster):

| | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/hu/` | 93 | 100 | 100 | 100 | 3.1s | 0.012 | 0ms |
| `/hu/haz-elado-6412/` | 96 | 100 | 100 | 100 | 2.6s | 0.001 | 0ms |
| `/nl/woningen/` | 97 | 99 | 100 | 100 | 2.6s | 0.001 | 0ms |

`dist/` is 8.6 MB total for 62 pages, with **zero** client JavaScript files.

axe-core: **0 violations** across 13 routes including 390px mobile.

---

## Deploying

Netlify is configured (`@astrojs/netlify`). Set `RESEND_API_KEY`, `FODEL_INBOX`
and `FODEL_FROM` in the site environment. To move host, swap the adapter in
`astro.config.mjs` — nothing else is host-specific.

**After launch:** submit `https://fodel.nl/sitemap-index.xml` to Search Console,
and set up the 301 map from the old fodel.nl URLs when the real inventory
migrates. Those URLs carry thirteen years of accumulated authority.
