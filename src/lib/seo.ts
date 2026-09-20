/**
 * Structured data and hreflang.
 *
 * Everything emitted here must also be visible on the page — that is Google's
 * condition for using it, and it is what makes the markup safe to feed to
 * answer engines. Nothing is asserted that the page does not show.
 */

import { COMMISSION } from '~/config/company';
import type { Company } from '~/lib/runtime-config';
import { BRAND, LOCALE_META, type Locale } from '~/i18n/ui';
import type { Property } from './properties';
import { text } from './properties';

const SITE = 'https://fodel.nl';

export const abs = (path: string): string => new URL(path, SITE).toString();

/* ── Organisation ─────────────────────────────────────────────────────── */

export function organisationSchema(locale: Locale, company: Company) {
  const brand = BRAND[locale];

  return {
    '@type': 'RealEstateAgent',
    '@id': `${SITE}/#organization`,
    name: brand.name,
    legalName: company.names.legal,
    description: brand.tagline,
    url: abs(`/${locale}/`),
    foundingDate: String(company.founded),
    email: company.email.primary,
    telephone: company.phones.filter((phone) => phone.public).map((phone) => phone.display),
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address.street,
      postalCode: company.address.postalCode,
      addressLocality: company.address.city,
      addressCountry: company.address.countryCode,
    },
    // Only emitted once verified — an unconfirmed identifier is worse than none.
    ...(company.registration.kvk ? { identifier: company.registration.kvk } : {}),
    ...(company.registration.vatVerified ? { vatID: company.registration.vat } : {}),
    areaServed: [
      { '@type': 'Country', name: 'Hungary' },
      { '@type': 'Country', name: 'Netherlands' },
      { '@type': 'Country', name: 'Belgium' },
    ],
    knowsLanguage: ['hu', 'nl', 'de', 'en', 'fr'],
    sameAs: [company.social.youtube, company.social.facebookNl, company.social.facebookHu],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: company.hours.weekdays.from,
      closes: company.hours.weekdays.to,
    },
  };
}

export function websiteSchema(locale: Locale, searchPath: string) {
  return {
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    name: BRAND[locale].name,
    url: abs(`/${locale}/`),
    inLanguage: LOCALE_META[locale].htmlLang,
    publisher: { '@id': `${SITE}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${abs(searchPath)}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/* ── Property listing ─────────────────────────────────────────────────── */

export function propertySchema(p: Property, locale: Locale, pageUrl: string, imageUrl: string) {
  const d = p.data;
  const residenceType = d.categorySchema;

  const availability =
    d.status === 'sold'
      ? 'https://schema.org/SoldOut'
      : d.status === 'reserved'
        ? 'https://schema.org/LimitedAvailability'
        : 'https://schema.org/InStock';

  return {
    '@type': 'RealEstateListing',
    '@id': `${abs(pageUrl)}#listing`,
    url: abs(pageUrl),
    name: text(d.title, locale),
    description: text(d.description, locale),
    datePosted: d.listing.publishedAt.toISOString(),
    image: abs(imageUrl),
    inLanguage: LOCALE_META[locale].htmlLang,
    provider: { '@id': `${SITE}/#organization` },
    identifier: d.ref,

    about: {
      '@type': residenceType,
      name: text(d.title, locale),
      ...(d.areas.floorM2
        ? {
            floorSize: {
              '@type': 'QuantitativeValue',
              value: d.areas.floorM2,
              unitCode: 'MTK',
            },
          }
        : {}),
      ...(d.rooms
        ? {
            numberOfRooms: d.rooms.bedrooms,
            numberOfBathroomsTotal: d.rooms.bathrooms,
          }
        : {}),
      ...(d.building.yearBuilt ? { yearBuilt: d.building.yearBuilt } : {}),
      address: {
        '@type': 'PostalAddress',
        addressLocality: d.location.settlement,
        addressRegion: d.location.county,
        addressCountry: d.location.country,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: d.location.lat,
        longitude: d.location.lng,
      },
    },

    offers: {
      '@type': 'Offer',
      // Numeric, no separators or symbol — Google is strict about this.
      price: d.price.eur,
      priceCurrency: 'EUR',
      availability,
      businessFunction: 'https://purl.org/goodrelations/v1#Sell',
      url: abs(pageUrl),
      seller: { '@id': `${SITE}/#organization` },
    },
  };
}

/* ── Supporting types ─────────────────────────────────────────────────── */

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(item.url),
    })),
  };
}

export function faqSchema(entries: { question: string; answer: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: { '@type': 'Answer', text: e.answer },
    })),
  };
}

export function articleSchema(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
  published: Date;
  updated?: Date;
  locale: Locale;
  author: string;
}) {
  return {
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: abs(opts.url),
    ...(opts.image ? { image: abs(opts.image) } : {}),
    datePublished: opts.published.toISOString(),
    dateModified: (opts.updated ?? opts.published).toISOString(),
    inLanguage: LOCALE_META[opts.locale].htmlLang,
    author: { '@type': 'Organization', name: opts.author },
    publisher: { '@id': `${SITE}/#organization` },
  };
}

/** The commission terms, stated as data so answer engines can quote them. */
export function serviceSchema(locale: Locale, name: string, description: string) {
  return {
    '@type': 'Service',
    name,
    description,
    provider: { '@id': `${SITE}/#organization` },
    areaServed: { '@type': 'Country', name: 'Hungary' },
    offers: {
      '@type': 'Offer',
      priceSpecification: {
        '@type': 'PriceSpecification',
        description: `${COMMISSION.percent}% + ${COMMISSION.vatPercent}% VAT, min. €${COMMISSION.minimumEur}`,
        priceCurrency: 'EUR',
        minPrice: COMMISSION.minimumEur,
      },
    },
    inLanguage: LOCALE_META[locale].htmlLang,
  };
}

/**
 * The listing packages as an OfferCatalog under one Service node — used on
 * the price list and the submit-ad page, which both show these figures.
 * `priceEur` is each package's base list price, matching what the page
 * actually renders as the headline number (the €179 tier is a conditional
 * surcharge decided server-side, not a separate advertised price).
 */
export function listingServiceSchema(
  locale: Locale,
  opts: {
    name: string;
    description: string;
    url: string;
    packages: { name: string; priceEur: number }[];
  }
) {
  return {
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    provider: { '@id': `${SITE}/#organization` },
    areaServed: { '@type': 'Country', name: 'Hungary' },
    url: abs(opts.url),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: opts.name,
      itemListElement: opts.packages.map((pkg) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: pkg.name },
        price: pkg.priceEur,
        priceCurrency: 'EUR',
      })),
    },
    inLanguage: LOCALE_META[locale].htmlLang,
  };
}

/** FODEL sells video placement at €36 — everything asserted here must also render on the page (see VideoEmbed.astro). */
export function videoObjectSchema(opts: {
  name: string;
  description: string;
  url: string;
  videoId: string;
  uploadDate: Date;
}) {
  return {
    '@type': 'VideoObject',
    name: opts.name,
    description: opts.description,
    thumbnailUrl: `https://i.ytimg.com/vi/${opts.videoId}/hqdefault.jpg`,
    uploadDate: opts.uploadDate.toISOString(),
    embedUrl: `https://www.youtube-nocookie.com/embed/${opts.videoId}`,
    contentUrl: opts.url,
  };
}

/** Wrap graph nodes into one @graph document. */
export function graph(nodes: unknown[]) {
  return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) };
}
