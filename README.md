# FODEL 1.1

Astro platform for **FODEL VASTGOED / FODEL INGATLAN** — Hungarian property
advertised to Western European buyers, with an admin system and a
seller portal behind it. Hungarian and Dutch are the two fully
built markets; German, English and French have a structural bridge page each
(see [Locales](#locales-hunl-full-deenfr-structural) below).

**No longer a static site.** Property data (listings, translations, photos)
lives in Postgres (Supabase), not in Markdown files — a logged-in seller
writes to it and an admin approves what gets published. The marketing pages
(About, Sellers, FAQ, legal, blog, …) are still plain static HTML, exactly as
before.

Companion documents: [`FODEL_AUDIT.md`](FODEL_AUDIT.md) (why this rebuild exists)
and [`fodel_brand_identity 2.md`](fodel_brand_identity%202.md) (brand ground truth).
The original React prototype is preserved untouched at [`index.html`](index.html)
as the design reference.

---

## Quick start

```bash
npm install
cp .env.example .env      # fill in Supabase, Resend, and (optional) Stripe/PMTiles values
npm run dev               # http://localhost:4321
```

Without a configured Supabase project, static content pages (About, Sellers,
FAQ, legal, blog) still work. Anything that reads property data — home, the
listings page, a property page, the sold archive, the map, the entire
`/portal/` seller/admin area — will show a clear "not configured" error
instead of the real page until `SUPABASE_URL`/`SUPABASE_ANON_KEY` are set and
`supabase/migrations/*.sql` have been run. See **Database setup** below.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server, including all form and API endpoints |
| `npm run build` | Build to `dist/` (mixed static HTML + server functions) |
| `npm run preview` | Serves the *static* pages in `dist/` at localhost:4321. Pages that read Supabase (home, listings, portal, …) aren't in `dist/` as files — use `npm run dev` for those. |
| `npm run verify` | Build + full preflight. **Fails until the KvK number is set.** |
| `npm run verify:dev` | Same, but waives the KvK gate |
| `npm run verify:rls` | Proves one seller can't read/edit/delete another's listings or reach admin routes — needs a configured Supabase project |
| `npm run verify:workflow` | Scripted pass through draft → submitted → changes requested → approved → awaiting payment → paid → published, including that an owner cannot publish or settle their own listing |
| `npm run seed:500` | Generates 500 synthetic listings for search/pagination load-testing |
| `npm run build:pmtiles` | Builds the self-hosted map basemap (real data-engineering step, not part of `npm run build`) |
| `npm run og` | Regenerates `public/og/fodel-default.jpg` |

`build` runs `scripts/prune-assets.mjs` afterwards, which drops the source
images Astro emits alongside the optimised variants (11 MB, unreferenced).

---

## Database setup

1. Create a free project at [supabase.com](https://supabase.com) (region
   Frankfurt/`eu-central-1` recommended — closest to Hungary/Netherlands).
2. SQL Editor → paste and run, in order: `supabase/migrations/0001_init.sql`,
   `0002_seed_properties.sql`, `0003_portal_infrastructure.sql`,
   `0004_search.sql`, `0005_fodel_11.sql`.

   **`0005` must be run in two steps**, and it says so at the top of the file.
   Its first statement adds a value to an enum, and PostgreSQL refuses to use a
   newly-added enum value inside the same transaction that added it — pasting
   the whole file at once fails with *"unsafe use of new value
   'awaiting_payment'"*. Run the single `alter type` line, then the rest.
3. Project Settings → API → copy the Project URL, `anon` key and
   `service_role` key into `.env` as `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`.
4. `npm run dev` — the public site now reads the six seeded demo listings
   from the database.

To get into the portal, an admin account has to exist first — there's no
"first admin" self-signup by design (an unauthenticated route that creates
an admin account would be a real security hole). Sellers do self-register in
1.1, but only ever as `owner`, and only by proving they control the mailbox
they signed up with. Create the first admin by hand once, in the Supabase SQL
Editor, after signing up a user any way you like (e.g. Authentication → Users
→ Add user in the dashboard):
```sql
insert into profiles (id, role, email, full_name)
values ('<the user''s auth.users id>', 'admin', 'you@example.com', 'Your Name');
```
Every admin after that can invite more people from `/portal/users/invite`.

---

## Architecture — public site vs. portal

The public marketing site works exactly as the original build (see
**Decisions worth knowing** below) — static HTML, near-zero client JS,
sharp-optimised images. Layered on top:

- **Data**: `src/lib/properties.ts` queries Supabase with the low-privilege
  anon key — every query is still filtered by Row-Level Security
  (`supabase/migrations/0001_init.sql`), which is the actual security
  boundary, not this file.
- **Rendering**: `astro.config.mjs` sets `output: 'server'`. Pure content
  pages declare `export const prerender = true` and are built once, same as
  before. Pages that read Supabase (home, listings, a property, sold
  archive, the map, `/portal/`) render per request with a short CDN cache
  (`s-maxage=300`), so approving a listing shows up live within minutes.
- **Search**: `src/lib/properties.ts`'s `searchProperties()` calls a
  Postgres function (`search_properties`, in `0004_search.sql`) that does
  free-text search (PostgreSQL's built-in Hungarian/Dutch dictionaries — no
  extension needed), filtering, sorting and pagination in one round trip.
- **Maps**: `src/components/Map.astro` — MapLibre GL + a self-hosted PMTiles
  basemap (`PMTILES_URL`), never a third-party map provider. Shows a plain
  "unavailable" message until that env var points at a real tileset (see
  `npm run build:pmtiles`).
- **Portal** (`/portal/`, always `noindex`): Supabase Auth + a
  session-scoped Supabase client (`src/lib/supabase-server.ts`) so every
  portal query runs *as* the signed-in user and RLS decides what they can
  touch. `src/middleware.ts` is a convenience gate on top (redirects a
  signed-out visitor, blocks non-admins from admin routes) — a bug there
  would be embarrassing, not dangerous, because the database enforces the
  same rules independently.
- **Media**: a seller's uploaded photo is re-encoded through `sharp` before
  it ever reaches Supabase Storage (`src/lib/media.ts`) — strips EXIF/GPS,
  neutralises anything embedded outside the actual image data, caps
  resolution.
- **Email**: `src/lib/email/` — eleven lifecycle emails, each written in the
  *recipient's* own language (`profiles.locale`), rendered through one
  table-based, inline-styled shell built for real mail clients
  (`layout.ts`), with a hand-written plain-text alternative for every one.
  Copy lives in `copy/hu.ts` and `copy/nl.ts`, and `nl.ts` is type-checked
  against `hu.ts` — adding a template without translating it is a compile
  error, not a Hungarian email in a Dutch inbox. Same log-instead-of-fail
  pattern as the public forms when `RESEND_API_KEY` is unset, plus two
  retries on a transient failure. **Preview them all at `/dev/emails`**
  (development only; 404s in production).
- **Payments**: an admin approves a listing, the owner is emailed what it
  costs, and paying publishes it — see **The listing lifecycle** below.
  `src/lib/orders.ts` builds and prices orders from the catalogue in
  `src/config/company.ts`; `src/lib/stripe.ts` is only the client and the
  on/off switch. Behind `STRIPE_ENABLED=false` the whole flow still works —
  the email carries bank details instead of a card button and an admin
  publishes once the transfer lands.

### The listing lifecycle

```
                    ┌──────────────── request_changes ◀───────────────┐
                    ▼                                                 │
  draft ──submit──▶ submitted ──approve──▶ awaiting_payment ──┬──[card]──▶ published
    ▲                                                         │
    │                                    publish_manually ────┘        published ──▶ sold
    └── changes_requested ◀── (owner edits, submits again)              (bank transfer)
```

Who may do what is enforced twice: the status machine in
`src/pages/api/portal/properties/[id]/status.ts` decides which transitions are
legal, and Row-Level Security decides independently whose rows anyone may
touch at all. RLS cannot express "only from exactly this status to exactly
that one", which is why the first half lives in app code — but the half that
matters for security is in the database.

The two things worth knowing:

- **`approve` does not publish.** It builds an order from the catalogue,
  writes it to `payments`, and moves the listing to `awaiting_payment`. Money
  publishes it — either the Stripe webhook or an admin confirming a transfer.
- **`publishProperty()` (`src/lib/portal/publish.ts`) is the only place a
  listing goes live**, and it is idempotent. Stripe retries webhooks; running
  it twice must not send a second "you're online!" email.

`npm run verify:workflow` walks this whole path against a real database.

### Locales: hu/nl full, de/en/fr structural

`/de/`, `/en/`, `/fr/` are a single self-contained bridge page each —
FODEL's own verified name, tagline and category vocabulary, not
machine-translated marketing copy — pointing into the fully-built Dutch
site. Full `HomePage`/`PropertiesPage`/`PropertyDetailPage` routing in these
three languages is real follow-up work: those components (and `Nav`/`Footer`)
are typed and built for exactly `hu`/`nl` today, with a `UI[locale]` string
table and a number of small inline `locale === 'hu' ? … : …` ternaries
throughout — extending that safely to three more languages needs live
testing in each, not a blind edit.

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

0. **Run `supabase/migrations/0005_fodel_11.sql`** against the project, in the
   two steps its header describes. Nothing in 1.1 — payment, password reset,
   self-registration, photo captions — works without it.
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
7. **`PMTILES_URL`.** Until it is set, *every* map on the site — the location
   map on a listing as well as the browse map — renders "not available". Build
   the basemap with `npm run build:pmtiles` and host the file anywhere public.
8. **Stripe, only if card payment is wanted at launch.** Set the two keys, flip
   `STRIPE_ENABLED`, and register the webhook endpoint (see `.env.example`).
   Leaving it off is a supported, fully working configuration — not a
   half-finished one.

---

## Repository layout

**No UI framework** — every interactive piece, on both the public site and
the portal, is a small vanilla script over server-rendered markup. MapLibre
GL is the one deliberate exception (a real ~250 kB-gzipped library), loaded
only on pages that show a map.

```
src/
  config/company.ts        Single source of truth for every company fact.
                            Nothing is invented; unverified values are null.
  i18n/ui.ts                Nav, categories, route slugs, UI strings for hu/nl
                            (full) and de/en/fr (brand strings only — see
                            "Locales" above).
  content.config.ts         Article schema. Properties moved to Supabase —
                            there is no properties content collection any more.
  data/                     copy.ts · faq.ts · features.ts · pages-content.ts
                            pages-legal.ts
  lib/                      properties.ts (public, RLS-scoped reads + search)
                            · supabase.ts (anon client) · supabase-server.ts
                            (portal's session + admin clients) · media.ts
                            (upload processing) · orders.ts (pricing an
                            approved listing) · portal/publish.ts (the only
                            path to going live) · email/ (layout · templates ·
                            copy/hu · copy/nl) · stripe.ts · map-style.ts
                            · seo.ts · format.ts · page.ts · form-handler.ts
  middleware.ts              Portal auth/role gate — a convenience layer;
                            RLS is the real boundary
  layouts/Base.astro         Public-site head, canonical, hreflang, JSON-LD
  layouts/Portal.astro       Portal shell — reuses the same design tokens,
                            simpler and denser, always noindex
  components/                Design system, ported 1:1 from the prototype
  components/pages/          One component per page type, shared across locales
  components/portal/…, pages/portal/…    Portal screens (see Architecture above)
  pages/{hu,nl}/…            Thin route files
  pages/{de,en,fr}/          One bridge page each
  pages/api/                 Public forms + /api/portal/* + /api/stripe/*
                            + /api/map/properties.geojson
scripts/                     verify-ssg · verify-contrast · verify-rls
                            · verify-workflow · build-pmtiles · seed-500
                            · build-og
supabase/migrations/         Schema, RLS policies, search function — run
                            these in order against a real project (see
                            "Database setup" above)
```

**Adding a property**: through the portal (`/portal/properties/new`) once an
account exists — not a file any more. The six launch demo listings were
seeded once via `supabase/migrations/0002_seed_properties.sql`.

---

## Decisions worth knowing

**Property URLs mirror FODEL's existing pattern** — `/nl/huis-te-koop-6412/`,
matching their live `fodel.nl/woonhuis-te-koop-1550/`. When the real inventory
migrates, the 301 map is mechanical.

**Images are optimised at build time with sharp**, not handed to the host's
image CDN. `vercel({ imageService: false })` in `astro.config.mjs` is deliberate:
the output is fast on any host and the file sizes are verifiable in `dist/`.

**CSS is inlined** (`inlineStylesheets: 'always'`). Measured: it removes two
render-blocking requests and improves FCP ~0.15s and the Lighthouse score by 2–3
points. The trade-off is no cross-page CSS caching; for a site this size the
first-visit win is worth more, and first visit is what converts a search visitor.

**An LCP image preload was tried and removed.** It measured *worse* — on a
throttled connection the 111 kB image competed with the CSS for bandwidth and
cost ~0.4s of LCP. The A/B is in the git history.

**Money is taken after approval, never before.** FODEL approves a listing
first, then the owner pays, then it publishes. The alternative — charging at
submission — means holding money for listings that are then rejected, which
needs a refund process, a policy in the terms, and someone to operate both.
This way there is nothing to refund, ever.

**Bank transfer is not the fallback, it is the primary method.** It is what
FODEL publish and what most of their sellers use. Card payment is the
addition. `publish_manually` in `status.ts` is a first-class action for
exactly this reason, not a workaround.

**Self-registration goes through the invite mechanism.** The public
ad-submission form doesn't create an account directly — it writes an
`invites` row carrying the form's answers and emails a link. The token proves
the person controls that mailbox (an unauthenticated endpoint that creates
accounts lets anyone register under someone else's address), and their
answers become a pre-filled draft when they accept. Reusing the invite path
meant no second, less-tested way into the portal.

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

`npm run verify` checks, in order: content present in rendered HTML without JS
(static pages read from `dist/`; Supabase-backed pages are fetched from a real
dev server — see the comment at the top of `scripts/verify-ssg.mjs`) · no
dev-mode framework anywhere · unique title/description/canonical per page ·
hreflang reciprocity · JSON-LD validity, numeric prices, coordinates · alt text
and explicit dimensions on every image · modern image formats · crawlable links
· required assets · client JS budget (two budgets since Stage 7: near-zero for
everything except a map, a generous gzipped ceiling for pages that show one) ·
legal preflight. `npm run verify:rls` and `npm run verify:workflow` need a
configured Supabase project and aren't part of the default `verify` chain for
that reason — run them once the database is set up. Since 1.1 `verify:rls`
also proves one seller cannot read another's orders or review notes, and that
no signed-in user can read `password_resets` (a readable reset token is an
account takeover).

**The emails cannot be verified by a script.** Run `npm run dev`, open
`/dev/emails`, and check them in Gmail, Outlook on Windows (the strictest
renderer by a distance), Apple Mail and iOS, in both light and dark mode.
Twenty-two pieces of HTML that have to survive Word's rendering engine is not
something source review catches.

`npm run verify:contrast` asserts the design tokens clear WCAG AA and guards
against the prototype's failing alpha values returning.

The Lighthouse numbers and axe-core pass below were measured before the
Stage 1 rebuild (Markdown-backed, fully static, zero client JS) and have not
been re-measured since — the architecture changed too much for the old
numbers to still describe the site honestly (SSR on data-driven pages, a real
map bundle on pages that show one). Re-measuring against a deployed instance
with real Supabase data is a "before go-live" task, not something to
guess at:

| | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/hu/` (pre-Stage-1) | 93 | 100 | 100 | 100 | 3.1s | 0.012 | 0ms |
| `/hu/haz-elado-6412/` (pre-Stage-1) | 96 | 100 | 100 | 100 | 2.6s | 0.001 | 0ms |
| `/nl/woningen/` (pre-Stage-1) | 97 | 99 | 100 | 100 | 2.6s | 0.001 | 0ms |

axe-core (pre-Stage-1): **0 violations** across 13 routes including 390px mobile.

---

## Deploying

Vercel is configured (`@astrojs/vercel`). Set every variable from
`.env.example` in the project's Environment Variables settings — at minimum
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `FODEL_INBOX` and `FODEL_FROM`; `PMTILES_URL` once the
basemap is built and uploaded; the `STRIPE_*` vars only if card payment is
deliberately turned on. To move host, swap the adapter in `astro.config.mjs`
— nothing else is host-specific, though `output: 'server'` (needed for the
database-backed pages) means the new host must support SSR, not just static
hosting.

**After launch:** submit `https://fodel.nl/sitemap-index.xml` to Search Console,
and set up the 301 map from the old fodel.nl URLs when the real inventory
migrates. Those URLs carry thirteen years of accumulated authority.
