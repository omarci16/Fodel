# FODEL — Website Audit & Build Specification
### Companion to `fodel_brand_identity 2.md`. Audit date: 27 July 2026.

> **What this document is.** A full audit of the current `index.html` build against (a) FODEL's *actual* business as published on fodel.nl and fodel.hu, and (b) what an international real-estate agency site must contain in 2026 to be legally compliant, findable, and commercially effective.
>
> **How to read it.** §1–2 are ground truth about the client (including **five factual conflicts** with the current brand doc that must be resolved before launch). §3 is the industry standard. §4 is what we have. §5 is the gap audit, severity-ranked. §6–11 are the build spec.

---

## 0. Executive summary

The design work is genuinely good. The strategic instinct is right — the dual-audience split on the homepage is exactly the correct way to express this business, and the seller argument (cash buyers, no mortgage, €200–300 to even view a property) is FODEL's single strongest sales asset and it is used well.

Three things stand in the way of this being deliverable:

1. **It is architecturally a prototype, not a website.** In-browser Babel compilation, React *development* builds from a CDN, no routing, no URLs, no server-rendered HTML. Every page is `/`. A property listing cannot be linked to, shared, or indexed. For a business whose entire customer acquisition is organic search in five countries, this is not an SEO weakness — it is a total absence of SEO surface.
2. **It is monolingual.** FODEL's business *is* the multilingual arbitrage — Hungarian sellers reaching Dutch, Belgian, German, and British buyers. The site is Hungarian-only, and the `HU | EN | NL` switcher in the nav is decorative (it has no click handler). Right now we serve half the funnel, in one language, and it's the half that doesn't spend money.
3. **The revenue mechanics are missing.** FODEL's actual product is a **paid listing** — €69 for 6 months, €129/€179 for 12 months, plus per-language translation and featured-placement upsells. None of that is on the site. There is no ad-submission form, no price list, no free-search-request (*kerestető/zoekdienst*) form. The two conversion actions that make FODEL money don't exist yet.

Everything else is fixable detail. These three are structural and should be decided before more pages get built, because they determine the framework.

---

## 1. Verified company profile

Scraped 27 July 2026 from fodel.nl (NL + HU + EN paths), fodel.hu, and their sub-pages.

| Field | Verified value | Source |
|---|---|---|
| Trading names | **FODEL VASTGOED** (NL legal/footer) · FODEL INGATLAN (HU) · FODEL REAL ESTATES (EN) | fodel.nl footer, fodel.hu |
| Founded | 2013, in the Netherlands | fodel.hu |
| Principal | Födelmesi Gábor | fodel.nl/hu |
| Dutch address | **Seinpostduin 168, 2586 EC Den Haag** | fodel.hu/kapcsolat |
| Dutch VAT | **NL002505231B62** | fodel.hu/kapcsolat |
| KvK number | **Not published anywhere** — see §10 | — |
| Phones | +31 6 4400 5550 (NL) · +36 70 225 5255 · +36 70 231 0031 | all sites |
| Emails | info@fodel.nl · info@fodel.hu · info@ingatlan.nl | all sites |
| Hours | Weekdays **09:00–18:00**; free callback until 21:00, weekends included | fodel.hu/kapcsolat |
| Banks | NL35 RABO 0360284973 (RABONL2U) · 11600006-30000006-12407762 (HU) | fodel.hu/kapcsolat |
| Languages | Hungarian, Dutch, English, German, French (5) | fodel.nl flag switcher |
| Domain network | fodel.nl · fodel.hu · immofodel.de · fodel.at · fodel.ch · fodel.uk · fodel.us | fodel.hu |
| Site built by | Energy Line Kft. (energyline.hu) — incumbent vendor | fodel.hu footer |

### 1.1 Conflicts with `fodel_brand_identity 2.md` — resolve before launch

These are not nitpicks. Address and hours are legal disclosure items and direct local-SEO ranking signals; NAP (name/address/phone) inconsistency across a domain network actively suppresses local rankings.

| # | Brand doc / current build says | Live site says | Action |
|---|---|---|---|
| 1 | HQ **Almere-Buiten, Flevoland** (in footer, About page ×3, Contact page, hero eyebrow) | **Seinpostduin 168, 2586 EC Den Haag** | **Ask the client.** Almere may be historical. The About page currently builds a whole origin story around Almere-Buiten — if the address is wrong, that copy is fiction and must be rewritten, not just find-and-replaced. |
| 2 | Working hours **08:00–18:00** | **09:00–18:00** + callback to 21:00 incl. weekends | Confirm. The extended callback window is a *selling point* currently being thrown away. |
| 3 | **9 countries** | **8 countries** (fodel.hu) | Pick one number and use it everywhere. It appears in the hero, sellers page, about page, and stats band. |
| 4 | Network incl. `fodel.be`, `agroinform.nl`, `eladod.com` | `immofodel.de`, `fodel.at`, `fodel.ch`, `fodel.uk`, `fodel.us` | The footer currently prints `fodel.nl · fodel.hu · fodel.be`. Verify which domains are live — this matters for the hreflang cluster (§9.3). |
| 5 | "several hundred transactions since 2013" (About page, `Tapasztalat` value block) | No such claim published anywhere by FODEL | **Unsourced claim we invented.** Either get the client to confirm a real number in writing, or remove it. Fabricated track-record claims in a regulated sector are a real liability. |

Also: the phone number is mis-grouped throughout as `+31-644-005-550`. The Dutch number is `06 44005550` → render as **+31 6 4400 5550**, `tel:+31644005550`.

---

## 2. The business, as the website must express it

FODEL is **not** an estate agency in the normal sense, and the site must not look like one. It is a **two-sided, non-exclusive marketplace with an optional brokerage attached**.

**Revenue stream 1 — paid listings (the volume business).** A Hungarian owner pays up front to have their property advertised across Western Europe.

| Product | Price (incl. 21% NL VAT) |
|---|---|
| Cheap ad, 6 months, max 20 photos, text as submitted | **€69** |
| Normal ad, 12 months, unlimited photos, professionally edited copy + images | **€129** (property ≤150M HUF) / **€179** (>150M HUF) |
| Additional language (NL / EN / DE / FR) | **€25** per language |
| Category highlight (min. 3 months) | **€15** / month |
| Homepage highlight (min. 3 months) | **€25** / month |
| Video | **€36** |
| Retro photo upload | **€30** |
| 6-month renewal | **€25** |

**Revenue stream 2 — brokerage (the margin business).** Only if FODEL introduced the buyer: **4% net, minimum €2,000, + 21% Dutch VAT**, payable on written contract + FODEL-introduced buyer + deposit paid. **No exclusivity ever.** If the buyer finds the seller directly through the listing, the seller pays nothing beyond the ad fee — and FODEL says so loudly. That radical-transparency position is the brand's whole differentiator and deserves more prominence than it currently gets.

**Revenue stream 3 — transaction services.** Bilingual sale contracts (from €150 HU-only, from €300 HU+DE), power-of-attorney representation so the buyer needn't fly to Hungary, land registry filing, utility transfers. Plus the agricultural specialism: an EU citizen with an agricultural qualification may buy up to **300 hectares** in Hungary, and FODEL organises the whole procedure. That is a high-value, near-zero-competition niche and it currently appears nowhere on the new site.

**Free lead magnet — *Kerestető / Zoekdienst*.** A free "tell us what you're looking for" request. Buyer submits type, area, budget, requirements; FODEL hunts off-market and emails matches. This is the highest-intent lead capture they have, it costs the user nothing, and it is **entirely absent from the new build**.

### 2.1 The two audiences

| | **A — Hungarian sellers** | **B — Western European buyers** |
|---|---|---|
| Who | Property owners, mostly private | Dutch & Belgian first; then DE/AT/CH, UK, US |
| Segments | — | Pensioners on small pensions, families seeking rural space, investors, lifestyle emigrants |
| Language | Formal Hungarian, "Ön", "TISZTELT LÁTOGATÓNK!" | Dutch primary; then DE, EN, FR |
| Wants | A foreign buyer, fast, no exclusivity, no legal headache | Cheap, authentic, safe, someone who speaks their language |
| Proof they need | Reach, buyer quality, transparent fees | Legitimacy, land registry, contracts, no scam |
| Converts via | Ad submission form + price list | Property search + enquiry + free search request |

**A demographic fact that must drive design decisions:** a large share of audience B are retirees — FODEL's own copy calls them *"kisnyugdíjasok"*. Body copy at 13–14px in weight 300, eyebrows at 9.5px, and low-contrast greys are not a stylistic choice for this audience; they're a conversion leak. See §5.3.

### 2.2 Geographic focus (drives the SEO landing-page plan)

Baranya, Tolna, Zala, Bács-Kiskun, Somogy, Veszprém · Balaton and the Balaton-felvidék · Dunántúl generally · anything with good access to Budapest Ferihegy or another international airport · established Dutch colonies (Csemő is their own cited example).

What buyers want: hillside views, forest edge, waterfront, rentable holiday homes, campsites, land for livestock, hotels/pensions, large parcels, Budapest city-centre rentals.
What they avoid: overpriced, panel flats, industrial adjacency, noise.

---

## 3. What a site like this must contain in 2026

The benchmark, split into non-negotiable and competitive.

### 3.1 Legally required (EU / NL / HU)

- **Service-provider identification** — E-Commerce Directive Art. 5 / Dutch implementation: legal name, geographic address, email, trade register (**KvK**) number, **VAT** number, must be "easily, directly and permanently accessible". Dutch law specifically requires the KvK number on the website. ([KVK](https://www.kvk.nl/en/starting/kvk-number-all-you-need-to-know/), [business.gov.nl](https://business.gov.nl/starting-your-business/registering-your-business/lei-rsin-vat-and-kvk-number-which-is-which/))
- **Energy performance indicator in property advertisements** — EPBD requires the EPC class/indicator to be stated in sale and rental advertisements, online and offline; Hungary transposed this via Gov. Decree 176/2008 (*energiatanúsítvány*). ([RICS EPBD overview](https://www.rics.org/content/dam/ricsglobal/documents/latest-news/RICS-EPBD-oveview.pdf), [EPBD 2024](https://en.wikipedia.org/wiki/Directive_on_the_energy_performance_of_buildings))
- **GDPR** — lawful basis and explicit consent on every form, privacy policy, data-retention statement, processor list. Enquiry forms collect name, phone, email and property interest: that is personal data with an obvious profiling dimension.
- **ePrivacy / cookie consent** — prior opt-in for any non-essential cookie or tracker, with genuine reject-all parity. Dutch and Hungarian regulators both enforce this.
- **Accessibility (EAA)** — in force since 28 June 2025 for consumer-facing e-commerce services, requiring WCAG 2.1 AA / EN 301 549. **Microenterprises (<10 staff, <€2M turnover) are exempt for services**, which FODEL almost certainly is today. ([Taylor Wessing](https://www.taylorwessing.com/en/interface/2025/accessibility/key-eu-accessibility-act-exemptions-and-the-challenges-they-pose), [Level Access](https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/)) **Build to WCAG 2.2 AA anyway** — the exemption is fragile, the audience is elderly, and it costs nothing to do it right the first time.
- **Terms of service** for the paid listing products, incl. EU consumer withdrawal rights on distance-sold services.

### 3.2 Technical baseline

- Server-rendered or statically generated HTML; real URLs per page and per listing; canonical tags; `robots.txt`; XML sitemaps (incl. an image sitemap).
- **hreflang** cluster across all five languages plus `x-default`, bidirectionally consistent.
- **JSON-LD structured data**: `RealEstateAgent`/`Organization` sitewide; `RealEstateListing` + a concrete residence type (`SingleFamilyResidence`, `House`, `Apartment`) + `Offer` + `PostalAddress` + `GeoCoordinates` per property; `BreadcrumbList`; `FAQPage`; `Article` on blog; `VideoObject` where video exists. Google renders no dedicated property card today, but this markup is what AI search and answer engines consume — and everything in the markup must be visible on the page. ([schema.org/RealEstateListing](https://schema.org/RealEstateListing), [seoClarity](https://www.seoclarity.net/blog/structured-data-for-real-estate-listings))
- **Core Web Vitals**: LCP, CLS, INP all green on mobile. Responsive `srcset` + AVIF/WebP, explicit `width`/`height`, lazy-loading below the fold, self-hosted subsetted fonts.
- Per-page `<title>`, meta description, Open Graph + Twitter card (property links get pasted into WhatsApp and Facebook groups constantly in this market — the OG image *is* the marketing).
- Working forms with server-side validation, spam protection, autoresponder, and CRM/inbox delivery.
- Analytics + conversion tracking, consent-gated.

### 3.3 Content & feature baseline for this specific business

- Property search with the filters this audience actually uses: **type, county/region, price, plot size, floor area, bedrooms, and "near water / near forest / with land"**.
- Listing detail: gallery, floor area, plot, rooms, EPC class, **reference number**, map, video, printable PDF, share, enquiry form, similar properties, and — because FODEL's whole pitch is direct access — clear indication of how to reach the owner.
- **Unit conversion**: m² ↔ hectare ↔ *hold*, and EUR ↔ HUF. A Dutch buyer does not know what 4 hold is; a Hungarian seller does not think in m². FODEL's old site had a converter — it's not a gimmick, it's a translation layer.
- Seller funnel: price list → ad submission form → payment → "what happens next".
- Buyer funnel: search → enquiry → free search request → "how buying in Hungary works" guide.
- Trust: sold archive, testimonials/emigrant stories, real photos of the people, registration numbers, memberships.
- Editorial: FAQ, buying guide, emigration guide, cost-of-living comparison, photography guide for sellers, market news.

---

## 4. Inventory — what `index.html` contains today

Single 182 KB / 2,672-line file. React 18 UMD + `@babel/standalone` from unpkg, JSX compiled in the browser, all styling inline, one `<div id="root">`.

**Pages (React state switch, no router):** `home` · `properties` · `detail` · `sellers` · `buyers` · `about` · `contact` · `blog` · `blog-post`

**Built and working**
- Nav (fixed, scroll-shrink, mobile drawer), footer with contact block
- Home: split hero, search bar, dual-audience band, 3 featured cards, pull-quote, "Így működik a FODEL" 3-step, parallax CTA
- Properties: filter UI (type/region/price/area/land/curated/beds) + sort
- Property detail: breadcrumb, gallery with prev/next + counter, price EUR + HUF, 4 spec tiles, description, "FODEL Garancia" block, sticky dark enquiry form, similar properties
- Sellers: hero, 5 benefit points, 4 buyer personas, 3-step model, commission band
- Buyers, About (origin quote, 3 values, stats, approach), Contact (details + form), Blog index + post template with block renderer
- Reveal-on-scroll, touch-parallax fallback, mobile breakpoint hook

**Data:** 6 hardcoded properties, 3 how-it-works steps, 4 stats, blog posts array. Prices in EUR + a hardcoded HUF *string*.

**Assets:** `hero.png`, `cta.png`, `kuria.jpg`, `tanya.jpg`, `vineyard.png`, `vevoknek.jpg`, `propertypage.png`. Several sections still use generated SVG `<Placeholder>` components — notably the entire About page hero.

**What's genuinely strong and should be preserved:** the restrained palette and editorial typography; the dual-audience homepage split; the seller argument sequence; the sticky enquiry form on detail; the mobile-specific reordering; the verbatim brand phrases (*"Forduljon hozzánk bizalommal!"*, *"Problémamentes, diszkrét ingatlanközvetítés"*). None of the architectural criticism below touches the design.

---

## 5. The audit

### 5.1 P0 — blocks launch

**A. No server-rendered HTML.** The document body is an empty `<div id="root">`. Content exists only after React boots *and* Babel compiles the JSX in the browser. Googlebot can render JS, but slowly and unreliably at this cost; Bing, and the AI crawlers now driving a growing share of referrals, largely don't execute JS at all. For a business acquired 100% through organic search in five countries, **the site is currently invisible.** → SSG/SSR (§6).

**B. React and Babel development builds shipped from a CDN.** `react.development.js` + `react-dom.development.js` + `@babel/standalone` ≈ 1.5 MB of blocking JavaScript, then a full JSX compile on the main thread on every single page load, before a pixel of content. LCP and INP will fail on mobile. Dev builds must never ship, and browser Babel must never ship. → build step.

**C. No routing, no URLs.** Navigation is `setPage()`. Every page is `/`. Consequences: no property can be shared, linked, bookmarked, or indexed; browser back button breaks the site; no per-page title/description/canonical; paid ads can't land anywhere but home; a seller can't send their listing to family. → real routes (§7).

**D. Monolingual.** Only Hungarian exists. The `HU | EN | NL` switcher renders `<span>`s with a pointer cursor and **no `onClick`** — it looks functional and does nothing. FODEL sells to Dutch, Belgian, German, British and French buyers; the Dutch-language site is the *primary* commercial surface. Shipping HU-only inverts the business.

**E. Forms are non-functional.** Both the contact form and the property enquiry form do `e.preventDefault(); setSent(true);`. Nothing is sent anywhere. The user is told *"Üzenetét megkaptuk"* — we are currently telling people we received a message that was silently discarded. There is also no GDPR consent checkbox, no validation, no honeypot/captcha, no required fields.

**F. No revenue path.** No price list (the €69/€129/€179 table), no ad-submission form, no *Kerestető* request form, no payment. The Sellers page's terminal CTA is *"Árlista kérése"* → a generic contact form. The product FODEL actually sells cannot be bought.

**G. No legal layer.** No privacy policy, no cookie consent, no terms, no imprint, no KvK, no VAT number, no registered address. §3.1 items are not optional.

**H. Zero SEO infrastructure.** No meta description, canonical, hreflang, Open Graph/Twitter card, `robots.txt`, `sitemap.xml`, favicon, or a single line of JSON-LD. The `<title>` is one static string for all nine pages.

### 5.2 P1 — needed for the site to do its job

- **No CMS / data layer.** Six properties are hardcoded in the HTML. FODEL runs a rotating inventory across ten categories with reference numbers (`#7061`, `#1550`). They must be able to add, edit, expire and mark-sold listings without a developer. This also decides §6.
- **No property reference numbers.** Sellers and buyers quote these on the phone. Currently absent from card, detail, and enquiry form.
- **No EPC / energy rating field** — legally required in the ad (§3.1).
- **No map, no coordinates.** Foreign buyers do not know where Badacsony is. A map is table stakes and it also feeds `GeoCoordinates`.
- **No video support**, despite FODEL selling video placement at €36 and running a YouTube channel.
- **HUF prices are hardcoded strings** (`'64 000 000 Ft'`) that go stale silently. Store EUR canonical + a dated FX rate, or store both with a visible "as of" date.
- **No sold/*Eladva* archive.** The single cheapest trust signal available and they already have the category.
- **Missing content pillars**, all of which exist on their old site and are pure SEO and trust value: FAQ (*GYIK*), selling tips, the photography guide, the Hungarian-buying guide for foreigners, the emigration/cost-of-living content, the documents page, the agricultural/300-hectare specialism, the transaction services list with prices.
- **No `<a href>` anywhere.** Every navigation element is a `<button>` with an onClick. That's zero crawlable internal links, no middle-click/open-in-new-tab, no link preview on hover, and a worse screen-reader experience. Nav, footer, cards, and breadcrumbs must be anchors.

### 5.3 P2 — quality, accessibility, conversion

- **Contrast failures in dark sections.** Footer body text at `rgba(244,244,242,0.45)` on `#102A43` computes to ≈**3.8:1** — below the 4.5:1 AA threshold for 13px text. The copyright line at `0.25` alpha is ≈**2.0:1**. The commission explainer on the Sellers page (`0.55` alpha) is borderline. Raise dark-surface body text to ≥`0.75` alpha.
- **Type is too small and too light for the audience.** Body at 13–14px `font-weight: 300`; eyebrows and labels at **9.5–10.5px** with 0.18–0.28em tracking; form labels at 9.5px. For a buyer base FODEL themselves describe as pensioners, this is a measurable conversion cost. Recommend 16px body minimum, weight 400, eyebrows no smaller than 12px.
- **`h1` set to `font-weight: 300` inline while the global rule is `font-weight: 700 !important`** — the `!important` wins, so every heading renders bold regardless of the design intent expressed inline. The whole `h1,h2,h3 { font-weight: 700 !important }` + `em { font-style: normal !important }` pair fights the inline styles throughout the file and should be deleted.
- **No focus-visible styles.** Keyboard users cannot see where they are. Straight WCAG 2.4.7 failure.
- Mobile menu button lacks `aria-expanded`/`aria-controls`; the drawer isn't focus-trapped and stays in the tab order when closed (`translateY(-110%)`, still rendered).
- Gallery has no keyboard arrow support, no swipe, no lightbox, no thumbnails, no image counter announcement.
- Images have **no `width`/`height`** (CLS), no `srcset`, no `loading="lazy"`, no modern formats. `hero.png` is a PNG doing a photograph's job.
- Google Fonts loaded render-blocking from a third party — a GDPR grey area in the EU as well as a performance cost. Self-host and subset.
- `<Placeholder>` SVGs still ship in production paths, most visibly as the entire About page hero.
- No 404 page, no loading/empty/error states, no "no results match your filters" state on the properties page.
- No print stylesheet. Buyers flying to Hungary print property sheets; this is a real behaviour in this market.
- No skip-to-content link. `scroll-behavior: smooth` set globally without a `prefers-reduced-motion` guard, as are all the reveal animations.

### 5.4 P3 — polish

Favicon and touch icons · web manifest · currency toggle EUR/HUF · unit toggle m²/ha/hold · saved/favourite properties · email alerts for new listings matching a search · WhatsApp contact button (heavily used by this demographic) · testimonials with real emigrant names (FODEL already publishes Ries & Lianne Terheijden, Lammi Luten, Wim Jacobsen) · YouTube embeds · comparison view · mortgage/total-cost calculator including Hungarian transfer duty and notary fees.

---

## 6. Recommended architecture

**Next.js (App Router) + a headless CMS, statically generated with ISR.**

| Requirement | How it's met |
|---|---|
| SEO / crawlability | SSG per route; real HTML in the response |
| 5 languages | `next-intl` with `/[locale]/` segments; automatic hreflang |
| Property inventory | CMS collection, ISR revalidation on publish |
| Core Web Vitals | `next/image` (AVIF/WebP, srcset, sized), `next/font` self-hosted |
| Forms | Route handlers → Resend/Postmark + CRM webhook |
| Payments for listings | Stripe Checkout or Mollie (Mollie is the Dutch/EU norm — iDEAL, Bancontact) |
| Deploy | Vercel or Cloudflare Pages, EU region |

**Keep everything from `index.html`.** The design system, page compositions, copy, animations and mobile behaviour all port directly — this is a mechanical migration of JSX into components plus extracting inline styles into CSS Modules or Tailwind. Nothing is thrown away.

*Alternative if a Node build is genuinely unwanted:* Astro with islands. Same SEO and CWV outcome, lighter. But payments, forms and a CMS are all coming, so Next is the better long bet.

**CMS**: Sanity or Payload. Non-negotiable requirements — localised fields per locale, image pipeline, draft/publish, a `sold` state, and an editing UI a non-technical Hungarian-speaking operator can use.

---

## 7. Information architecture

Routes shown for `/nl/`; mirrored across `hu`, `en`, `de`, `fr` with **localised slugs** (`/nl/woningen/`, `/hu/ingatlanok/`, `/de/immobilien/`) tied together by hreflang.

```
/[locale]/                              Home
/[locale]/woningen/                     Search + filters (facets → indexable URLs)
/[locale]/woningen/[county]/            Region landing        ← SEO engine
/[locale]/woningen/[type]/              Type landing          ← SEO engine
/[locale]/woningen/[type]/[county]/     Type × region         ← SEO engine
/[locale]/woningen/[id]-[slug]/         Property detail
/[locale]/verkocht/                     Sold archive
/[locale]/zoekopdracht/                 FREE SEARCH REQUEST   ← missing, high value
/[locale]/kopen-in-hongarije/           Buying guide (process, costs, land registry, PoA)
/[locale]/emigreren/                    Emigration & cost-of-living hub
/[locale]/agrarisch-vastgoed/           Agricultural + 300-hectare specialism ← missing
/[locale]/diensten/                     Transaction services & prices
/[locale]/over-ons/                     About
/[locale]/contact/                      Contact
/[locale]/nieuws/[slug]/                Editorial
/[locale]/veelgestelde-vragen/          FAQ → FAQPage schema
/[locale]/privacy/ /voorwaarden/ /cookies/ /colofon/

Hungarian-only seller track (HU locale):
/hu/hirdetes-feladasa/                  AD SUBMISSION FORM    ← the money page, missing
/hu/arlista/                            PRICE LIST            ← missing
/hu/hogyan-mukodik/                     How the model works
/hu/fotozasi-utmutato/                  Photography guide
/hu/gyik/                               Seller FAQ
```

The region/type landing pages are where the traffic actually is: *"boerderij te koop Hongarije"*, *"huis kopen Balaton"*, *"Bauernhof Ungarn kaufen"*. Generate them from the CMS taxonomy with real intro copy per page — not thin doorway pages.

---

## 8. Property data model

```ts
type Property = {
  ref: string;                  // "7061" — FODEL's own reference, shown everywhere
  slug: Record<Locale, string>;
  title: Record<Locale, string>;
  description: Record<Locale, string>;   // which locales are paid for
  type: PropertyType;           // house | holiday | farm | plot | commercial |
                                // agricultural | mansion | apartment | guesthouse
  status: 'active' | 'reserved' | 'sold' | 'expired';
  price: { eur: number; huf: number; asOf: string };  // never a hardcoded string
  location: {
    settlement: string; county: County; region: Region;
    lat: number; lng: number; precision: 'exact' | 'approximate';
  };
  areas: { floorM2: number; plotM2: number; usableM2?: number };
  rooms: { bedrooms: number; bathrooms: number; total: number };
  building: { yearBuilt?: number; condition?: string; heating?: string;
              utilities: string[]; epcClass?: string };   // EPC legally required
  features: string[];           // waterfront, forest-adjacent, cellar, well, outbuildings…
  media: { images: Image[]; video?: string; floorplan?: string; tour360?: string };
  listing: { package: '6m' | '12m'; featured: boolean; homepageFeatured: boolean;
             publishedAt: string; expiresAt: string; languages: Locale[] };
  seller: { contactVisible: boolean; phone?: string; name?: string };  // FODEL's USP
};
```

Notes: `precision: 'approximate'` lets sellers hide an exact address while still getting a map. `seller.contactVisible` encodes the "you may contact the owner directly" promise as data rather than prose. `listing.expiresAt` drives auto-expiry and the renewal upsell.

---

## 9. SEO plan

**9.1 Keyword territory (by market)**
- 🇳🇱/🇧🇪 — *huis kopen Hongarije · boerderij Hongarije te koop · vastgoed Hongarije · emigreren naar Hongarije · wonen in Hongarije · Balaton huis kopen*
- 🇩🇪/🇦🇹/🇨🇭 — *Immobilien Ungarn kaufen · Bauernhof Ungarn · Haus am Balaton kaufen · Auswandern Ungarn*
- 🇬🇧 — *property for sale Hungary · Hungarian farmhouse for sale · buying property in Hungary as a foreigner*
- 🇭🇺 (sellers) — *ingatlan hirdetés külföldi vevőknek · külföldi vevő ingatlanra · ingatlan eladása hollandoknak*

**9.2 Structured data** — as specified in §3.2. Every field in the JSON-LD must be visible on the page.

**9.3 hreflang** — all five locales plus `x-default`, bidirectionally reciprocal, per URL. If `immofodel.de`, `fodel.at`, `fodel.ch`, `fodel.uk` stay live, they must be *inside* the cluster or they will cannibalise. **Resolve conflict #4 in §1.1 before implementing.** Consolidating everything onto fodel.nl subfolders is the stronger long-term play — one domain accumulating all the authority.

**9.4 Answer-engine visibility** — a growing share of this audience will arrive via AI assistants. That rewards: semantic HTML, an FAQ page with `FAQPage` markup, plainly-stated facts (prices, commission, process steps) rather than marketing abstraction, an `llms.txt`, and crawler access for GPTBot/ClaudeBot/PerplexityBot in `robots.txt`. FODEL's transparency-first content style is unusually well suited to this — lean into it.

**9.5 Local & off-site** — Google Business Profile at the verified Dutch address, consistent NAP everywhere, Dutch emigration forums and Facebook groups (they already run three), and their YouTube channel wired into property pages via `VideoObject`.

---

## 10. Compliance checklist

| # | Item | Status |
|---|---|---|
| 1 | KvK number published | ❌ Not published on *any* FODEL site. **Obtain from the client.** |
| 2 | VAT number published | ⚠️ `NL002505231B62` on old site, absent from new. Confirm this is the publishable **BTW-id** and not the legacy BTW-nummer (the old sole-trader format embeds a BSN and must not be published). |
| 3 | Registered address | ⚠️ Two conflicting addresses (§1.1 #1) |
| 4 | Privacy policy | ❌ Missing |
| 5 | Cookie consent, opt-in with reject parity | ❌ Missing |
| 6 | Terms for paid listing products + withdrawal rights | ❌ Missing |
| 7 | GDPR consent + purpose text on every form | ❌ Missing |
| 8 | EPC class on every property advertisement | ❌ No field exists |
| 9 | WCAG 2.2 AA | ❌ Known failures (§5.3). EAA microenterprise exemption likely applies, but build compliant. |
| 10 | Accessibility statement | ❌ Missing |
| 11 | Hungarian brokerage registration status | ❓ FODEL states they only broker properties they advertised abroad. Clarify what, if anything, must be disclosed. |

---

## 11. Open questions for the client

1. **Almere-Buiten or Den Haag?** Which is the registered address — and if Den Haag, is the Almere origin story true at all?
2. **KvK number**, and confirmation of the correct publishable VAT identifier.
3. **8 or 9 countries?** Which domains are live and who controls them?
4. **Opening hours** — 08:00 or 09:00, and are we advertising the free callback to 21:00 including weekends?
5. **Transactions to date** — is there a real, defensible number? (Currently we claim "several hundred" with no source.)
6. **Are the €69/€129/€179 prices current**, and do we sell them online or keep it enquiry-based?
7. **Inventory** — how many live listings, and can we get an export or feed from Energy Line?
8. **Who edits the site** after launch, and in which languages?
9. **Which languages ship at launch?** Recommendation: **HU + NL first** (the two ends of the actual transaction), then DE, EN, FR.
10. **Photo rights** — can we use real property photography from the existing listings?

---

## 12. Suggested build sequence

| Phase | Work | Unblocks |
|---|---|---|
| **0** | Resolve §11 Q1–Q5. Nothing else should ship on unverified facts. | everything |
| **1** | Migrate to Next.js + CMS. Port the existing design 1:1. Real routes, real `<a>` tags, `next/image`, self-hosted fonts. | P0 A, B, C |
| **2** | Working forms + GDPR consent + legal pages + cookie banner + KvK/VAT in footer. | P0 E, G |
| **3** | Full SEO layer: metadata, JSON-LD, sitemaps, robots, OG images. | P0 H |
| **4** | Dutch locale + hreflang. Then DE/EN/FR. | P0 D |
| **5** | Price list, ad-submission form, *Kerestető* form, payment. | P0 F |
| **6** | Content pillars: FAQ, buying guide, emigration hub, agricultural, photography guide, sold archive. | P1 |
| **7** | Accessibility + typography pass (§5.3), map, video, EPC field, reference numbers. | P1, P2 |
| **8** | P3 polish. | — |

---

## Sources

Scraped: [fodel.nl](https://fodel.nl/) · [fodel.nl/hu](https://fodel.nl/hu/) · [fodel.nl/hu/ertekesites](https://fodel.nl/hu/ertekesites/) · [fodel.nl/zoekdienst](https://fodel.nl/zoekdienst/) · [fodel.hu](https://fodel.hu/) · [fodel.hu/arlista](https://fodel.hu/arlista/) · [fodel.hu/kapcsolat](https://fodel.hu/kapcsolat/)

Standards: [schema.org/RealEstateListing](https://schema.org/RealEstateListing) · [seoClarity — structured data for real estate](https://www.seoclarity.net/blog/structured-data-for-real-estate-listings) · [Taylor Wessing — EAA exemptions](https://www.taylorwessing.com/en/interface/2025/accessibility/key-eu-accessibility-act-exemptions-and-the-challenges-they-pose) · [Level Access — EAA compliance](https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/) · [KVK — KVK number](https://www.kvk.nl/en/starting/kvk-number-all-you-need-to-know/) · [business.gov.nl — Dutch business numbers](https://business.gov.nl/starting-your-business/registering-your-business/lei-rsin-vat-and-kvk-number-which-is-which/) · [RICS — EPBD overview](https://www.rics.org/content/dam/ricsglobal/documents/latest-news/RICS-EPBD-oveview.pdf) · [EPBD 2024](https://en.wikipedia.org/wiki/Directive_on_the_energy_performance_of_buildings)
