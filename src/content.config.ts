import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const LOCALES = ['hu', 'nl'] as const;

/** Localised free text. Hungarian is always present; other locales are paid for per listing. */
const localised = (required: boolean = true) => {
  const shape = z.object({
    hu: z.string(),
    nl: z.string().optional(),
    de: z.string().optional(),
    en: z.string().optional(),
    fr: z.string().optional(),
  });
  return required ? shape : shape.partial({ hu: true });
};

/* ── Properties ───────────────────────────────────────────────────────────
   Extends the prototype's six listings with everything they were missing:
   a FODEL reference number, an EPC class (legally required in EU property
   advertisements), coordinates, video, listing lifecycle, and the seller
   contact visibility that encodes FODEL's "direct from the owner" promise.
   ------------------------------------------------------------------------ */

const properties = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/properties' }),
  schema: ({ image }) =>
    z.object({
      /** FODEL's own reference, as used on the phone and on the old site (#1550). */
      ref: z.string().regex(/^\d{3,6}$/, 'ref must be a 3–6 digit FODEL reference number'),

      category: z.enum([
        'house',
        'holiday',
        'farm',
        'land',
        'commercial',
        'agricultural',
        'mansion',
        'apartment',
      ]),

      status: z.enum(['active', 'reserved', 'sold']).default('active'),

      title: localised(),
      subtitle: localised(false).optional(),
      description: localised(),

      price: z.object({
        eur: z.number().int().positive(),
        huf: z.number().int().positive(),
        /** When the HUF figure was last set. The prototype hardcoded it as a string. */
        asOf: z.coerce.date(),
        negotiable: z.boolean().default(false),
      }),

      location: z.object({
        settlement: z.string(),
        county: z.string(),
        region: z.string(),
        lat: z.number().min(45.7).max(48.6),
        lng: z.number().min(16).max(22.9),
        /** `approximate` lets a seller withhold the exact address and still get a map. */
        precision: z.enum(['exact', 'approximate']).default('approximate'),
      }),

      areas: z.object({
        floorM2: z.number().positive().optional(),
        plotM2: z.number().positive(),
      }),

      rooms: z
        .object({
          bedrooms: z.number().int().nonnegative(),
          bathrooms: z.number().int().nonnegative(),
        })
        .optional(),

      building: z
        .object({
          yearBuilt: z.number().int().min(1500).max(2030).optional(),
          renovatedIn: z.number().int().min(1900).max(2030).optional(),
          condition: localised(false).optional(),
          heating: localised(false).optional(),
          /**
           * EPBD requires the energy performance class in sale advertisements
           * (Hungary: Gov. Decree 176/2008). `pending` renders "in progress"
           * rather than silently omitting it.
           */
          epcClass: z
            .enum(['AA++', 'AA+', 'AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'II', 'JJ', 'pending', 'exempt'])
            .default('pending'),
        })
        .default({ epcClass: 'pending' }),

      /** Feature keys resolved through i18n, so they stay translatable. */
      features: z.array(z.string()).default([]),

      media: z.object({
        hero: image(),
        heroAlt: localised(),
        gallery: z
          .array(
            z.object({
              src: image(),
              alt: localised(),
              label: localised(false).optional(),
            })
          )
          .default([]),
        /** FODEL sells video placement at €36 and runs a YouTube channel. */
        videoUrl: z.string().url().optional(),
      }),

      listing: z.object({
        package: z.enum(['cheap-6m', 'normal-12m']),
        featured: z.boolean().default(false),
        /** €25/month paid placement. FODEL control the order, so it is explicit. */
        homepageFeatured: z.boolean().default(false),
        homepageOrder: z.number().int().default(99),
        publishedAt: z.coerce.date(),
        expiresAt: z.coerce.date(),
        /** Which locales the seller has paid to translate into. */
        languages: z.array(z.enum(LOCALES)).default(['hu']),
      }),

      /**
       * FAQ Q11: FODEL publish the owner's own name and number alongside their
       * own. This is the "direct from the owner" promise as data.
       */
      seller: z
        .object({
          contactVisible: z.boolean().default(false),
          name: z.string().optional(),
          phone: z.string().optional(),
          speaks: z.array(z.string()).default([]),
        })
        .default({ contactVisible: false, speaks: [] }),

      /** Editorial badge — "Kiemelt", "Exkluzív", "Vízpart". */
      tag: localised(false).optional(),
    }),
});

/* ── Articles ─────────────────────────────────────────────────────────── */

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: ({ image }) =>
    z.object({
      locale: z.enum(LOCALES),
      title: z.string(),
      excerpt: z.string(),
      category: z.string(),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      readingMinutes: z.number().int().positive(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      featured: z.boolean().default(false),
      author: z.string().default('FODEL'),
      /**
       * FODEL append a standing disclaimer to translated foreign press. Set
       * this to reproduce it — they publish it verbatim on every such piece.
       */
      translatedSource: z.string().optional(),
    }),
});

/** FAQ is typed data, not markdown — see src/data/faq.ts. */
export const collections = { properties, articles };
