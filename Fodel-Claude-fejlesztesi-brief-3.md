# FODEL — development brief 3 (fodel.eu, valuation 2.0, on-site services)

Date: 2026-09-29. Source: Éva and Gábor's message of 2026-09-29 (verbatim in Appendix A), audited line by line against the codebase at commit `fc5e7a1` (brief 2 shipped).

Read this whole file before touching code. Every client sentence is mapped to a status below — **Done**, **Partial**, **New**, **Ops** (no code; a DNS, mailbox or dashboard task for a person), or **Decision** (needs Gábor and Éva; build the switchable groundwork, don't guess the business rule).

---

## 0. Context and hard rules

- Stack: Astro 5 (SSR on Vercel) + Supabase. The public site is hu/nl, plus en/de blog pages only. **All admin (portal) UI text is Hungarian.**
- Brief 2 is done and pushed (`Fodel-Claude-fejlesztesi-brief-2.md`, migration `0014_brief2.sql`). **Ask the user whether 0014 has been run on the live database** before relying on its columns. Code must degrade safely either way, as brief 2's code does.
- Read the memory files first (MEMORY.md and the linked notes):
  - don't redo features that exist and work — finish the partial ones;
  - never open or print `.env`;
  - the rounded FODEL 2.0 design system;
  - verify HU and NL at several widths;
  - the OneDrive dev server serves **stale style and script modules**.
- **Never write to the live Supabase database** (the dev server on :4321 is connected to it). Read-only requests are fine. The user runs migrations by hand.
- **Never submit a public form against the dev server**: it writes to the live database and emails real inboxes. Test handlers and scripts in isolation.
- Test SQL in PGlite. The harness is at `/private/tmp/claude-501/-Users-marton-Library-CloudStorage-OneDrive-Personal-Fodel/bcff0cf8-89ab-448e-a681-4dbf040a00dc/scratchpad/pg/run.mjs` (`node run.mjs`; 16 checks pass today). If `/tmp` was wiped, rebuild it:
  - `@electric-sql/pglite`;
  - roles `anon` / `authenticated` / `service_role`;
  - stub `auth.users`, and `auth.uid()` read from `request.jwt.claim.sub`;
  - stub `storage.buckets`, `storage.objects` and `storage.foldername()`;
  - run every migration in order, splitting 0005 and 0014 at the `-- ══ STEP 2 ══` marker;
  - strip `notify pgrst` and `create extension pgcrypto`.
- New SQL goes in **`supabase/migrations/0015_brief3.sql`**. Make it idempotent (`if not exists`, `on conflict do nothing`), and give it a two-step header only if it adds enum values.
- Run `npx astro check` after each chunk of work. It is at 0 errors now; keep it there.
- **Do not commit or push unless the user asks.**
- Never scrape ingatlan.com or any listing portal (terms of use, copyright). Never invent valuation multipliers, accuracy claims or "expert" models. Never collect or use protected characteristics: neighbourhood questions describe land use and buildings, never people.
- Don't redesign anything that isn't listed. The homepage is untouched except where §C and §G say so.

---

## 1. Audit — every point in the message

| # | Client point | Status | What exists / what's missing |
|---|---|---|---|
| 1 | Company addresses info@fodel.eu and gabor@fodel.eu | **Ops + small code** | The mailboxes must be created at the mail provider for fodel.eu. The code has **no** fodel.eu anywhere: fallback addresses in `src/config/company.ts` (`info@fodel.nl`, `info@fodel.hu`, `info@ingatlan.nl`), `src/lib/email/routing.ts` defaults (`portal@`/`website@fodel.nl`), `.env.example`, and the `site_settings.emails` seed in `0012`. |
| 2 | Both addresses get admin access | **Ops + bug fix** | The invite flow exists (`/portal/users/invite`, role admin). **Bug:** `buildInvite()` in `src/lib/portal/invites.ts` uses the approved template for **every** role, so once the owner letter (#6) is approved, admin invites say "Kedves Tulajdonos!". Fix before anyone invites Gábor. Note: info@ is a **shared** login — actions under it can't be told apart in the activity log (a personal address for Éva would solve it; see §9). |
| 3 | eladod.com website closes; the new site is **fodel.eu** | **New (code) + Ops** | The whole codebase treats **fodel.nl** as canonical: `src/config/site.mjs` `SITE_URL`, **hard-coded** again in `src/lib/seo.ts`, `src/pages/index.astro` (canonical/hreflang), `public/robots.txt`, `public/llms.txt`, RSS, sitemaps, `astro.config.mjs` image `remotePatterns`, email copy (`copy/hu.ts`, `copy/nl.ts`, `layout.ts`), `form-handler.ts`, `pages-legal.ts`, `AboutPage`, `404`, `data/copy.ts`, `templates.astro`, `portal/properties/[id].astro`. See §A. |
| 4 | Keep fodel@eladod.com working after the site closes | **Ops only** | Not in the code (only an "unverified network domain" comment in `company.ts`). It requires keeping the eladod.com **domain registration and its MX/mail hosting** (or forwarding to info@fodel.eu) when the web hosting is cancelled. Recommend a 301 from eladod.com to fodel.eu instead of a dead site. No DNS changes from us (brief 2 §9 still applies). |
| 5 | WhatsApp to +31 6 1528 2212 | **Done (UI) — data missing** | The button component, the three placements and the admin field exist (brief 2). `site_settings.whatsapp` is null. Seed `+31615282212` in 0015 (client-supplied, passes the existing check constraint). `WhatsApp.astro` only has hu/nl labels — add en/de if the Bridge (en/de) layout shows it; if it doesn't, leave it (no new placements). |
| 6 | Hungarian invite letter text | **Partial** | The template editor, table and sending exist (`/portal/settings/templates`, `email_templates`, `inviteFromTemplate`). The text is not stored, and the client gave no subject, heading or button text. See §B. |
| 7 | Indicative valuation "like ingatlan.com, but more detailed" — the owner gets a realistic picture after entering data | **Partial → major New** | Existing: `/hu/ertekbecsles` + `/nl/waardebepaling`, about 10 fields + 8 optional questions (`src/data/valuation-questions.ts`), photos, admin review with comps + an optional clamped AI adjustment, band editing, release by email. **Gap:** the comps engine (`src/lib/ai/valuation.ts`) needs **≥ 8 FODEL listings in the same category and county, using asking prices**. With about 10 live listings it returns `insufficient_data` almost every time. "Like ingatlan.com" needs an external market baseline. See §D. |
| 8 | The 30+ factors list | **Partial** | About a third already exist as property fields (`properties`: category, county/settlement, floor_m2, plot_m2, bedrooms, bathrooms, year_built, renovated_in, condition_key, heating_key, epc_class, features[] with panorama/waterfront/forest/cellar/outbuildings/stables/terrace/parking). The valuation table has only category, county, settlement, floor, plot, year_built, free-text condition and the `answers` jsonb. See Appendix B for the field-by-field mapping. |
| 9 | Show it as an indicative, market-based value — **not** an official expert valuation | **Done in principle** | The disclaimer and editable notice exist (`services.valuationNotice`). Wording must say "tájékoztató, piaci alapú értékmeghatározás" and never "szakértői" or "hivatalos". |
| 10 | Option for a personal expert valuation, even a judicial one (igazságügyi) | **New + Decision** | Nothing exists. The €200 Gábor visit (#13) includes a "detailed, personal valuation" — that is **not** a judicial valuation. A judicial valuation needs a court-registered expert; FODEL has no partner yet → capture the request, admin follows up, no price or turnaround promised. See §D.5. |
| 11 | Short photo tips when placing an ad (daylight, sunny weather, tidy up, curtains open, whole rooms, right angle, wipe the lens, phone horizontal, no people) | **Partial** | Full guide page exists (`src/data/pages-content.ts` → `photoGuide`, `/hu/fotozasi-utmutato`, `/nl/fotografiegids`). A four-point box exists in the listing editor (`portal/properties/[id].astro` `.photo-guide`). Missing: "no people in the photo", "wipe the lens" (guide page), "open curtains" and "hold horizontally" (editor), "show whole rooms / right angle" (both). Nothing on the public submit page (`SubmitAdPage.astro`). Three copies can drift. See §E. |
| 12 | €150 — on-site pro photos, video **and drone** | **New** | Catalogue: `LISTING_EXTRAS` in `src/config/company.ts`. There's an existing `video` extra (€36) whose meaning overlaps; `EXTRA_SERVICES` lists `photography`/`drone` unpriced. The guide page callout says "ask for a quote when submitting" — there is **no mechanism** for that today. See §F. |
| 13 | €200 — Gábor's visit: pro photos **and video**, plus a detailed personal valuation | **New + Decision** | As #12. The client text lists **no drone** for the €200 option — ask whether it includes drone (it probably should, as a superset of €150). The two are mutually exclusive. |
| 14 | Services selectable already when placing the ad | **New + bug fix** | **Existing gap:** on the public form (`SubmitAdPage` → `api/listing-order.ts`) only `package` survives into the invite payload and the draft. The requested highlight, video and translations reach FODEL **only in the notification email** and are lost for the review screen. Fix this generally while adding the services. Owners who arrive by admin invite never see `SubmitAdPage`, so the listing editor needs the same choice. |
| 15 | Basic content and image check for uniform, high-quality listings | **Done (process) → Partial (tooling)** | Human moderation (`/portal/review/[id]`), change requests and resubmission exist. No review checklist. Low-resolution photos are flagged at upload; portrait-orientation is not. See §G. |
| 16 | Poor photos or data → correction and re-upload | **Done** | `changes_requested` → the owner edits and resubmits (RLS limits edits to draft/changes_requested). Verify end to end, don't rebuild. |
| 17 | Paid listings: define up front when a refund is due | **Decision + New slot** | Existing: `refund_required` flag on rejection, a generic sentence in the rejection email, ÁSZF line "withdrawn by seller → no refund". Missing: a stated refund policy shown **before** paying. See §G.3. |
| 18 | Articles, existing texts, abandoned registrations, dictionary, Födel sign — "discussed continuously" | **Out of scope** | Leave as brief 2 left them (switches off, groundwork only). |
| 19 | Facebook group sharing — still no | **Out of scope** | Build nothing. Keep existing share buttons. |

---

## 2. Workstreams

### A. Domain move to fodel.eu

1. Make `SITE_URL` (`src/config/site.mjs`) the **single** source of the canonical origin, and set it to `https://fodel.eu`. Replace every hard-coded origin: `seo.ts` `SITE`, `pages/index.astro`, sitemaps, RSS, 404, AboutPage, email layout and copy, form-handler, templates page, listing editor. Generate `robots.txt` and `llms.txt` from `SITE_URL` (Astro endpoints) or update them explicitly.
2. Leave comments that cite fodel.hu/fodel.nl **as sources of scraped copy** alone — they are history, not configuration. Decide each occurrence on purpose, and list the decisions in the handover.
3. User-visible legal copy (`pages-legal.ts` impresszum/colofon, privacy) that names the website domain → fodel.eu. Legal pages stay drafts for counsel (brief 1 note).
4. `astro.config.mjs` `remotePatterns`: add `fodel.eu` and `www.fodel.eu`. Keep the old hosts until the old domains are retired.
5. Email: set the fallback defaults in `routing.ts` to fodel.eu addresses. `company.ts` fallback email becomes `info@fodel.eu`. Add a data update in 0015 for `site_settings.emails.primary` **only where it still holds the seeded value** (don't overwrite an admin edit). `.env.example` and the README: `FODEL_FROM`, `FODEL_INBOX`, `FODEL_REPLY_TO` examples on fodel.eu. Sending only works once fodel.eu is verified at Resend — that's an Ops step, and the env-driven config already allows the switch without code.
6. Redirects from old domains: **don't hard-code**. Put a host-based 301 map (fodel.nl/fodel.hu/eladod.com → fodel.eu, path-preserving) in `vercel.json` **only if** the user confirms those domains point at this Vercel project; otherwise list it as Ops.
7. `node scripts/verify-ssg.mjs` must still pass. Grep the build output for any leftover `fodel.nl` in canonical, hreflang, OG, sitemap or JSON-LD.

Ops checklist for the handover (the owner does these):
- Vercel: add fodel.eu (primary) and www redirect.
- Resend: verify fodel.eu (SPF/DKIM DNS records).
- Stripe: update the webhook endpoint URL.
- Supabase Auth: set Site URL and redirect URLs.
- Google Search Console: add the property and submit the new sitemap.
- Mail provider: create the info@ and gabor@ mailboxes.
- eladod.com: keep the domain and MX.

### B. Invite letter (Hungarian, client-approved)

1. **Fix the role bug first:** approved templates apply to **owner** invites only; admin invites always use the built-in admin wording. Add a PGlite or unit check if practical, and one `/dev/emails` case per role.
2. In 0015, insert the HU owner template **as approved** (`on conflict (key, locale) do nothing`, so an admin edit is never overwritten):
   - `body`: the client text verbatim, from "Szeretnénk meghívni Önt…" to "Várjuk szeretettel!", keeping their paragraph breaks.
   - `heading`: "Kedves Tulajdonos!"
   - `subject`: proposed — "Meghívó a FODEL Ingatlan online felületére"
   - `cta`: proposed — "Ingatlanom regisztrálása"
   - Subject and CTA are **our proposal** — say so in the handover and in the template editor hint.
   - Keep their wording exactly. Don't "fix" style. If you notice a typo, list it in the handover rather than changing it silently.
3. Check the rendering: paragraph breaks come through (`paragraphs()` in `layout.ts`), the button and link fallback work, the 7-day expiry line is appended, and plain text is correct. Preview in `/dev/emails`.
4. NL/EN/DE owner invites: **no** client text yet. Don't auto-translate into an approved template. You may prepare unapproved drafts in the editor — they can't be sent until approved, which the existing logic already enforces.

### C. WhatsApp number

- Seed `update site_settings set whatsapp = '+31615282212' where id = 1 and whatsapp is null;` in 0015.
- Check that it works on the homepage, contact page and a property page in HU and NL; that the message is pre-filled on the property page; and that the button never covers the cookie banner (brief 2 behaviour).
- The number is Dutch. That's fine: `wa.me/31615282212`.

### D. Valuation 2.0 — "tájékoztató, piaci alapú értékmeghatározás"

Goal: an owner enters their property's data and gets a realistic, clearly indicative value range. Honest about its data basis, more detailed than ingatlan.com's, with an easy path to a personal or judicial valuation.

**D.1 Data model (reuse before adding — brief 2 §8 rule).**
- Anything that means the same as a `properties` field gets the **same column name and taxonomy** on `valuations`: `bedrooms`, `bathrooms`, `renovated_in`, `condition_key`, `heating_key`, `epc_class`, `features text[]` (feature taxonomy keys).
- Keep `answers jsonb` for the valuation-only questionnaire, driven by an extended `src/data/valuation-questions.ts`.
- New columns:
  - `parcel_count int` (helyrajzi számok mennyisége);
  - `renovation_extent` (a key: részleges / teljes / nincs / nem tudom);
  - `address_private text`, never shown publicly, plus an optional lat/lng;
  - `factors jsonb` — the free "other plus/minus factors" list: `[{ text, direction: 'plus'|'minus'|'unsure' }]`;
  - `request_kind text` — `indicative` | `expert_visit` | `judicial`.
- Buyer-relevant outbuildings and amenities from the client list that are missing from the feature taxonomy go into the **feature taxonomy**, so listings can use them too: garage, pool, balcony, carport (fedett beálló), storage building, barn/hall (csarnok), animal housing (ól / állattartásra alkalmas épület), gazebo (szaletli), outdoor oven (kerti sütőde/kemence). Give them proper hu/nl/en/de labels.
- The client wrote "szanetri" — read it as **szaletli** and flag that in the handover.

**D.2 The form (UX is the product here).**
- A **multi-step wizard**, not one 40-field page:
  1. Ingatlan (type, settlement, exact location, areas, rooms, parcels)
  2. Épület és műszaki állapot (build/renovation years, condition, walls, floor slab/roof structure, roofing and its condition, windows, insulation, heating/cooling, utilities, energy)
  3. Környezet (panorama, orientation/sunlight, nature proximity, services proximity, noise sources, neighbourhood land use, neighbouring buildings' condition, disturbing facilities)
  4. Extrák és korlátok (outbuildings and amenities, terrace/balcony/pool, garden/fence, expansion potential, legal and other restrictions, free plus/minus factors)
  5. Fotók és elérhetőség
- Required fields: only type, settlement, floor area, name, email, consent. **Everything else is optional, and every closed question offers "Nem tudom"**, stored as its own answer, never counted as negative.
- Short option sets are **tappable chips / segmented controls** rather than selects; multi-selects are chip groups; numeric fields have units. There's a progress indicator. Back/next keep state; the progress is kept in `localStorage` (try/catch, per-viewer convenience only). On mobile, the primary action stays thumb-reachable.
- Settlement: autocomplete from an official Hungarian settlement list (KSH Helységnévtár, public) so the estimate can match statistics. Free text is still accepted.
- Neighbourhood questions are **land-use and building facts only** (e.g. lakóövezet, üdülőövezet, külterület/tanyás, mezőgazdasági, ipari/vegyes). Nothing about people.
- Legal restrictions: chips for common cases (haszonélvezeti jog, jelzálog/terhelés, elővásárlási jog, szolgalom, osztatlan közös tulajdon, műemléki/természetvédelmi védettség, termőföld-forgalmi korlátozás), plus free text. Plain-language hints; no legal advice.
- The photo step reuses the existing downscaling and private-bucket upload.
- Design: the FODEL 2.0 system (slabs, radius scale, pill buttons with ArrowChip, sentence case, upright quiet-ink heading em). Verify HU and NL at 375, 768, 1280 and 1600 px, and with keyboard only.

**D.3 The estimate engine.** Honest and transparent, no invented numbers.
- Baseline, in order of preference:
  - (a) FODEL comparables when the existing ≥ 8 rule holds;
  - (b) official market statistics for the settlement (or settlement type/county) and property category. Research what is legally usable — e.g. KSH housing price statistics by settlement (derived from NAV transaction data) and official agricultural land price statistics. Import it as a **versioned, dated table** refreshed by hand, and cite source + date in every result.
  - If no usable baseline exists for a case → no number, human review.
- **No automatic factor multipliers.** The factors are shown to the reviewer and in the result as qualitative "értéknövelő / értékcsökkentő szempontok". Optionally build an admin table "Becslési szempontok" where **Gábor** can later assign percentage adjustments. It is empty by default, meaning neutral. Say so in the handover (brief 2 §8: never invent multipliers).
- The band width comes from the data dispersion where available. For statistics-only baselines, use a band setting Gábor must enter before instant mode can be switched on.
- The existing AI step (if `AI_ENABLED`) may use the richer facts for its explanation and its clamped adjustment. It is never released unreviewed unless instant mode (below) is on, and even then never the AI number alone.
- Currency: HUF first for hu, EUR for nl, using the project's existing HUF/EUR handling. State the rate date.

**D.4 Release mode.**
- A new switch in `/portal/settings/services`: **"Azonnali becslés megjelenítése" — off by default.**
  - Off (today's flow): the owner sees "munkatársunk ellenőrzi és e-mailben küldi". Gábor reviews, edits the band and approves (existing screen, extended with the new fields, factors, photos and data basis).
  - On: the result page shows the range immediately, **only** when the baseline confidence meets the configured bar; otherwise it falls back to review.
- Gábor must validate the method on real cases before switching it on — handover item.
- Result presentation (page and email): the range and a mid value; the data basis ("X hasonló ingatlan" or "KSH …, 2026"); the qualitative plus/minus factors; the approved notice; and three next steps — list the property, book Gábor's visit (€200), request an official/judicial valuation.

**D.5 Personal and judicial valuation.**
- A "Személyes értékbecslést kérek" choice, both in the form and on the result:
  - (1) **Gábor's on-site visit** — the same product as the €200 service in §F; one catalogue item, never two prices;
  - (2) **Igazságügyi / hivatalos szakértői értékbecslés** — "árajánlat alapján". It is captured as `request_kind = 'judicial'`, the office is notified, and the owner gets an acknowledgement with no price or turnaround.
- Copy must not mix these up with the indicative estimate (brief 2 §8).

**D.6 Admin.**
- `/portal/valuations`: filter by request kind; the detail page shows every answer grouped like the wizard, with "Nem tudom" shown neutrally, plus the data basis and the private address.
- Hungarian labels only (`VALUATION_STATUS_LABEL`, `describeAnswer`, taxonomy labels).

### E. Photo tips — one source, three moments

1. Move the tips into **one data module** (hu/nl) used by the guide page, the listing editor and the public submit page. Merge the existing guide text with the client's list, adding:
   - no people in the photo;
   - wipe the lens;
   - open the curtains and blinds;
   - show each room fully — shoot from a corner, at chest height;
   - hold the phone horizontally;
   - sunny daylight.
   Keep it short enough for a layperson to act on.
2. Listing editor (the moment of upload): a compact, scannable card — the top 6 tips with small icons, a "why it matters" line, and a link to the full guide. Mobile-first.
3. Submit page: a brief "Mielőtt fotózna" block, and the on-site service offer from §F right beside it, for anyone who'd rather not shoot themselves.
4. Guide page callout: replace "Kérjen rá árajánlatot…" with the two real services and prices, linking to where they can actually be ordered.

### F. On-site services (€150 / €200)

1. Catalogue (`LISTING_EXTRAS` or a sibling `ONSITE_SERVICES` in `company.ts`, prices never taken from the client):
   - `onsite-media` — €150, "Helyszíni profi fotózás, videó és drónfelvétel";
   - `onsite-visit` — €200, "Gábor helyszíni látogatása: profi fotózás és videó, részletes személyes értékbecslés".
   - Mutually exclusive. Invoice labels in hu/nl.
   - VAT: same treatment as existing prices. The 21% assumption is still unverified — carry the warning.
   - Clarify in copy how the existing €36 `video` extra differs, or flag the overlap in the handover. Don't delete it.
2. Choosing a service:
   - public submit page — a clear two-card choice with "Nem kérem" as the default;
   - listing editor — for invited owners who never saw the submit page;
   - valuation result (D.5).
   Price, what's included, what happens next ("munkatársunk felveszi Önnel a kapcsolatot az időpont egyeztetéséhez"), and that it's optional.
3. Persistence — **fix the existing gap** (item 14): everything chosen on the submit form (package, highlight, video, translations, service) is stored with the draft, e.g. `properties.requested_extras jsonb` or a `service_requests` table (id, property_id / valuation_id, service_id, status `requested|scheduled|done|cancelled`, note, timestamps). Admin-visible, owner-visible, RLS like the rest. The review screen's order panel is **pre-ticked** from it.
4. Admin: a compact "Helyszíni szolgáltatások" list (filter by status; set scheduled/done; link to listing/valuation). Notify the office by email when a service is requested; send the owner a hu/nl acknowledgement. Register every new template in `/dev/emails`.
5. **Payment timing is a Decision.** The brief 2 rule is "never charge before approval", but an on-site service costs FODEL money before a listing exists. Default without an answer: the service is added to the listing's order at approval (the existing path, no new payment flow). Make "advance payment for on-site services" easy to add later, and put the question in the handover.
6. Price list page (`PriceListPage.astro`) lists both services in HU and NL; the homepage is untouched.

### G. Listing quality: review checklist, orientation flag, refund policy

1. **Review checklist** on `/portal/review/[id]`, standard criteria:
   - Fotók: legalább N kép, nappali fény, vízszintes, éles, nincs ember a képen, minden fontos helyiség;
   - Adatok: ár, alapterület, település, leírás teljes, kategória helyes.
   Ticking the failed criteria **pre-composes the change request** in the owner's language (hu/nl built-in phrases; the admin can still edit before sending). N and the criteria live in one config.
2. **Automatic hints** from `property_media.width/height`: flag portrait-orientation and low-resolution photos on the review screen and on the owner's editor. It's a hint, not a blocker. Detecting people needs ML — don't attempt it; it stays a human check.
3. **Refund policy slot.**
   - An editable policy text (hu/nl) in `/portal/settings/services`, shown on the submit page, the price list, before paying (listing editor payment block) and in the rejection email when `refund_required`.
   - Empty by default = not shown. Gábor and Éva decide the rules.
   - You may put a **draft proposal** of rules in the handover for them to approve — never publish it.
   - The ÁSZF text stays a counsel task.

---

## 3. Verification

- `npx astro check` (0 errors) → `npm run build` → `node scripts/verify-ssg.mjs --allow-missing-kvk` → `npm run verify:contrast`.
- PGlite: every 0015 statement, the RLS on any new table (owner sees own, admin all, anon none), the idempotent seeds (run 0015 twice), the invite role fix.
- Request-level on the dev server (GET only): /hu/, /nl/, /en/, /de/, the blog lists, a missing slug (404), the contact page, a property page, the price list, the photo guide, the valuation wizard, and the portal pages you touched. They must render **before and after** 0015.
- Visual: HU and NL at 375, 768, 1280 and 1600 px — the valuation wizard (every step, a result state), submit page services, listing editor tips + services, review checklist, price list, photo guide. Check the served style **and** script modules for fresh code (OneDrive note). No horizontal overflow; the WhatsApp button never covers the cookie banner.
- Build output: no `fodel.nl` in any canonical/hreflang/OG/sitemap/robots/JSON-LD.
- Emails: every new or changed template renders in `/dev/emails` (hu/nl), including an admin invite showing the **admin** wording after the HU owner template is approved.
- Don't submit public forms (they hit the live database). Test handlers and client scripts in isolation.

## 4. Handover report (Hungarian, brief 2 §12 structure)

- What was built and where.
- Migration 0015 steps and config: the Ops checklist from §A, env vars, Resend domain.
- What was checked and the results.
- What each person still owes (Gábor, Éva, Marci, Richárd), including the open questions below.
- What stays switched off and why: instant estimate, factor adjustments, advance payment, refund policy text, NL/EN/DE invite letters.
- A separate confirmation that the homepage was not redesigned (list any homepage-visible change, expected: none beyond the WhatsApp number now appearing).

## 5. Open questions to list for Gábor and Éva (don't block on them)

1. Does the €200 visit include **drone** footage (the €150 one does)?
2. Are €150 / €200 gross prices (incl. VAT)? Which regions do the visits cover, and are travel costs extra?
3. On-site services: pay in advance, or with the listing after approval?
4. Refund rules for paid listings (which cases, how much, how quickly).
5. Who performs judicial valuations (a certified partner?), and what is quoted to the client?
6. Should the instant estimate show automatically, or only after Gábor's review? Who validates the method?
7. Éva's own login: a personal address (e.g. eva@fodel.eu) so the activity log shows who did what?
8. What happens to fodel.nl, fodel.hu, info@fodel.nl, info@fodel.hu and info@ingatlan.nl — redirect, keep or retire?
9. Invite letter: are the proposed subject and button text OK? Who writes and approves the NL/EN/DE versions?
10. "szanetri" = szaletli?

---

## Appendix A — client message (verbatim)

> Belépések és céges e-mail-címek
> Két céges e-mail-címet szeretnénk használni:
> * info@fodel.eu
> * gabor@fodel.eu
> Mindkét címhez szeretnénk hozzáférést az adminfelülethez.
> A régi e-mail-cím megtartása
> A régi eladod.com weboldal teljesen megszűnik, az új weboldal a fodel.eu lesz.
> A fodel@eladod.com e-mail-címet viszont szeretnénk megtartani, tehát az e-mail-cím továbbra is működjön az eladod.com weboldal megszűnése után is.
> WhatsApp
> A WhatsApp-üzenetek erre a telefonszámra érkezzenek:
> +31 6 1528 2212
> Meghívólevél
> A tulajdonosoknak szóló meghívó magyar szövege:
> Kedves Tulajdonos!
> Szeretnénk meghívni Önt a FODEL Ingatlan új online felületére, ahol ingatlanát egyszerűen és gyorsan regisztrálhatja, és lehetőséget biztosíthatunk arra, hogy nemzetközi szinten is meghirdessük.
> Célunk, hogy a magyarországi ingatlanokat külföldi, elsősorban holland, német, osztrák és belga érdeklődők számára is láthatóvá tegyük.
> Ha szeretné eladni ingatlanát, regisztrálja nálunk, és mi felvesszük Önnel a kapcsolatot a további lehetőségekről.
> FODEL Ingatlan – magyar ingatlanok külföldi vevőknek.
> Várjuk szeretettel!
> Értékbecslés
> Az értékbecslésnél egy olyan irányadó értékbecslést szeretnénk, amely hasonló elven működik, mint az ingatlan.com értékbecslése, de valamivel részletesebb.
> A célunk, hogy a tulajdonos az ingatlan adatainak megadását követően kapjon egy reális, tájékoztató jellegű képet arról, hogy körülbelül milyen értéket képviselhet az ingatlana a jelenlegi piacon.
> Ehhez többek között az alábbi adatokat szeretnénk figyelembe venni:
> * ingatlan típusa
> * település és pontos elhelyezkedés
> * lakóterület / hasznos alapterület
> * telekméret
> * szobák és fürdőszobák száma
> * Kiegészítő épitmenyek( állattartasra alkalmas épületek, ólak, tároló, szanetri, kerti sütőde, garázs, fedett beálló, csarnok.
> * Helyrajzi számok mennyisége
> * építés éve
> * felújítás éve és mértéke
> * jelenlegi állapot
> * falazat típusa
> * födém és tetőszerkezet
> * tetőfedés és annak állapota
> * nyílászárók
> * szigetelés
> * fűtés és hűtés
> * közművek
> * energetikai jellemzők
> * panoráma
> * tájolás, benapozottság
> * erdő, vízpart vagy természet közelsége
> * központ és fontosabb szolgáltatások közelsége
> * főút, vasút vagy egyéb zajforrás közelsége
> * szomszédság jellege
> * szomszédos épületek állapota
> * ipari vagy egyéb zavaró létesítmények közelsége
> * garázs, pince, melléképületek
> * terasz, erkély, medence
> * kert és kerítés állapota
> * bővítési vagy fejlesztési lehetőség
> * jogi vagy egyéb korlátozások
> * minden egyéb értéknövelő vagy értékcsökkentő tényező, felsorolasra alkalmas rublika
> Fontos, hogy ez ne hivatalos szakértői értékbecslésként, hanem tájékoztató, piaci alapú értékmeghatározásként jelenjen meg.
> Szeretnénk azt is, hogy legyen lehetőség személyes, szakember által végzett értékbecslésre is, amennyiben az ügyfél ezt kéri, akár igazságügyi ertékbecslesre is.
> Hirdetési és képi elvárások
> Szeretnénk, ha a tulajdonosok a hirdetés feladásakor rövid, egyszerű fotózási tanácsokat is kapnának, hogy akár telefonnal is jó minőségű képeket tudjanak készíteni az ingatlanról.
> Például: fotózás nappali fényben, lehetőleg napsütéses időben, rendrakás, függönyök elhúzása, a helyiségek teljes bemutatása és megfelelő fotózási szög. Homályos lencse megtörlése, vízszintes telefontartás fotózáskor. A képen ne szerepeljen ember.
> A cél, hogy egy laikus is könnyen tudjon jó, eladásra alkalmas fotókat készíteni.
> Emellett legyen lehetőség szakember segítségét is kérni:
> * 150 EUR – helyszíni profi fotózás, videó és drónfelvétel.
> * 200 EUR – Gábor helyszíni látogatása, amely a profi fotózást és videózást, valamint egy részletesebb, személyes értékbecslést is magában foglal.
> Ezek választható szolgáltatások legyenek, amelyeket a tulajdonos már a hirdetés feladásakor kérhet.
> A hirdetéseknél szeretnénk egy alapvető tartalmi és képi ellenőrzést is, hogy az oldalon egységes, igényes és megfelelő minőségű hirdetések jelenjenek meg.
> Ha a fotók vagy az adatok nem megfelelőek, legyen lehetőség javításra és újrafeltöltésre. A fizetős hirdetéseknél pedig előre határozzuk meg, hogy milyen esetben jár visszatérítés.
> A többi pontot – a cikkeket, meglévő szövegeket, félbehagyott regisztrációkat, fordítási szótárat és a későbbi Födel-tábla fejlesztést – folyamatosan egyeztetjük.
> A Facebook-csoportos megosztást továbbra sem szeretnénk beépíteni.
> Köszönjük, és ha valamelyik ponttal kapcsolatban még pontosítás szükséges, egyeztessünk róla.
> Éva és Gábor

## Appendix B — valuation field mapping

| Client item | Where it lives | Input type |
|---|---|---|
| ingatlan típusa | `category` (taxonomy) — exists | chips |
| település és pontos elhelyezkedés | `county`, `settlement` exist; + `address_private`, optional lat/lng | settlement autocomplete + optional address |
| lakóterület / hasznos alapterület | `floor_m2` — exists | number, m² |
| telekméret | `plot_m2` — exists | number, m² (ha helper for large plots) |
| szobák és fürdőszobák száma | `bedrooms`, `bathrooms` — as on properties | steppers |
| kiegészítő építmények (állattartásra alkalmas épület, ól, tároló, szaletli, kerti sütőde, garázs, fedett beálló, csarnok) | `features[]` — extend the feature taxonomy | multi-chip |
| helyrajzi számok mennyisége | `parcel_count` — new | stepper, "Nem tudom" |
| építés éve | `year_built` — exists | year |
| felújítás éve és mértéke | `renovated_in` (as properties) + `renovation_extent` — new | year + chips |
| jelenlegi állapot | `condition_key` (taxonomy) instead of free text; keep the old text column for old rows | chips |
| falazat típusa | `answers.falazat` | chips (tégla, vályog, panel, fa/könnyűszerkezet, kő, vegyes, nem tudom) |
| födém és tetőszerkezet | `answers.fodem`, `answers.tetoszerkezet` | chips |
| tetőfedés és állapota | `answers.tetofedes`, `answers.tetofedes-allapot` | chips |
| nyílászárók | `answers.nyilaszarok` | chips (műanyag, fa, alumínium; régi/új) |
| szigetelés | `answers.szigeteles` | chips |
| fűtés és hűtés | `heating_key` (taxonomy) + `answers.hutes` | chips |
| közművek | `answers.kozmuvek` (multi: villany, víz, csatorna, gáz, emésztő, kút) | multi-chip |
| energetikai jellemzők | `epc_class` + `answers.napelem` etc. | chips |
| panoráma | `features: panoramic-view` / existing question | chips |
| tájolás, benapozottság | `answers.tajolas` | chips |
| erdő, vízpart, természet közelsége | existing `erdo` / `viz` questions + features | chips |
| központ, szolgáltatások közelsége | `answers.szolgaltatasok` (e.g. walking distance / by car / far) | chips |
| főút, vasút, zajforrás | existing `zaj` question, refined | chips |
| szomszédság jellege | `answers.kornyezet-jellege` — land use only | chips |
| szomszédos épületek állapota | `answers.szomszedos-epuletek` — buildings only | chips |
| ipari / zavaró létesítmény | existing `mezogazdasagi-telep`, `magasfeszultseg` + `answers.zavaro-letesitmeny` | chips |
| garázs, pince, melléképületek | `features[]` | multi-chip |
| terasz, erkély, medence | `features[]` | multi-chip |
| kert és kerítés állapota | `answers.kert-kerites` | chips |
| bővítési / fejlesztési lehetőség | `answers.bovites` | chips + note |
| jogi vagy egyéb korlátozások | `answers.korlatozasok` (multi) + note | multi-chip + text |
| egyéb értéknövelő / -csökkentő tényezők | `factors jsonb` — repeatable rows | text + plus/minus/unsure |
