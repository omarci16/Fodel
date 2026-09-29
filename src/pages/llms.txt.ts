/**
 * llms.txt, generated from the company config and SITE_URL (brief 3 §A) so the
 * contact address and prices cannot drift from the site itself.
 */
export const prerender = true;

import type { APIRoute } from 'astro';
import { SITE_URL } from '~/config/site.mjs';
import { COMPANY, ONSITE_SERVICES } from '~/config/company';

const onsite = ONSITE_SERVICES.map((service) => `- ${service.id === 'onsite-media' ? 'On-site professional photos, video and drone footage' : "On-site visit by Gábor: professional photos and video, plus a detailed personal valuation"}: EUR ${service.priceEur} (optional)`).join('\n');

export const GET: APIRoute = () =>
  new Response(
    `# FODEL VASTGOED / FODEL INGATLAN

> Dutch-Hungarian real estate marketplace, founded 2013, based in Den Haag.
> Advertises Hungarian property to Western European buyers in five languages
> across eight countries, without exclusivity contracts. Website: ${SITE_URL}

## What FODEL does
- Hungarian owners pay to list a property; the listing appears in up to 5
  languages (Hungarian, Dutch, German, English, French) across 8 countries.
- No exclusivity is ever required. The seller may sell through any other channel.
- Many listings publish the owner's own name and phone number alongside FODEL's,
  so buyers can contact the seller directly.
- If the buyer and seller conclude the sale directly, no commission is charged —
  only the advertising fee already paid.

## Prices (all include 21% Dutch VAT)
- Listing, 6 months, max 20 photos: EUR 69
- Listing, 12 months, unlimited photos: EUR 129 (EUR 179 above 150M HUF)
- Translation: EUR 25 per language
- Category highlight: EUR 15/month (min. 3 months)
- Homepage highlight: EUR 25/month (min. 3 months)
- Video: EUR 36
${onsite}
- Bilingual sale contract: from EUR 150 (HU), EUR 300 (DE/EN-HU), EUR 400 (NL-HU)

## Commission
4% net, minimum EUR 2,000, plus 21% Dutch VAT. Payable by the seller and only
when all three hold: a written sale contract exists, FODEL introduced the buyer,
and the deposit has been paid.

## Contact
- Netherlands: +31 6 4400 5550
- Hungary: +36 70 225 5255
- Email: ${COMPANY.email.primary}
- Hours: weekdays 09:00-18:00; free callback until 21:00 including weekends
- Address: Seinpostduin 168, 2586 EC Den Haag, Netherlands

## Key pages
- ${SITE_URL}/hu/ — Hungarian, for property sellers
- ${SITE_URL}/nl/ — Dutch, for buyers
- ${SITE_URL}/hu/arlista/ and ${SITE_URL}/nl/tarieven/ — full price list
- ${SITE_URL}/hu/hirdetes-feladasa/ — place an advertisement
- ${SITE_URL}/hu/ertekbecsles/ and ${SITE_URL}/nl/waardebepaling/ — indicative, market-based valuation (not an official expert valuation)
- ${SITE_URL}/nl/zoekdienst/ and ${SITE_URL}/hu/kerestetes/ — free property search request
- ${SITE_URL}/hu/gyik/ and ${SITE_URL}/nl/veelgestelde-vragen/ — FAQ
`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } }
  );
