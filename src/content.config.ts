import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';
import { iconPaths, type IconName } from './components/icons';
import { stripMarks } from './components/marks';

// Validate icon keys at build time so a typo fails the build rather than
// rendering an empty <svg>. Typed as IconName so <Icon name={...}> accepts it.
const iconName = z.enum(Object.keys(iconPaths) as [IconName, ...IconName[]]);

const services = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/services',
    /**
     * Ids are '<locale>/<slug>' — see i18n/collections.ts.
     *
     * Set explicitly because the default generator prefers a `slug:`
     * frontmatter field when one exists, which would drop the locale prefix
     * and let two locales' entries collide with no error at all.
     */
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, ''),
  }),
  schema: ({ image }) =>
    z
      .object({
        /**
         * May carry [[marker brackets]] — see components/marks.ts. The transform
         * below splits this into `title` (plain) and `titleMarked` (as written).
         */
        title: z.string(),
        /** Short line used on cards and in the nav dropdown. */
        summary: z.string(),
        /** <meta description>; falls back to summary when omitted. */
        seoDescription: z.string().optional(),
        /** Icon key resolved by components/Icon.astro. */
        icon: iconName,
        /** Controls ordering on /services and in the header dropdown. */
        order: z.number().int(),
        /** Surfaced in the 4-up highlight grid on the homepage. */
        featured: z.boolean().default(false),
        highlights: z.array(z.string()).default([]),
        /**
         * Extra full-width section rendered under the prose on the detail page:
         *   apps -> AppShowcase (the `apps` collection)
         *   erp  -> ModulesGrid (the `modules` collection) + DesktopSoftware
         *   iot  -> SolutionCards (from `solutions` below)
         */
        showcase: z.enum(['apps', 'erp', 'iot']).optional(),
        /** Image cards for the IoT page. Paths are relative to the .md file. */
        solutions: z
          .array(
            z.object({
              title: z.string(),
              tagline: z.string(),
              body: z.string(),
              image: image(),
            })
          )
          .optional(),
      })
      /**
       * A service title reaches ten sinks — the header dropdown, the footer
       * list, the sidebar, the 404 rail, two JSON-LD blocks, <title>, the
       * breadcrumb — and only one of them, the page hero, wants the marker
       * strokes. Stripping at each sink means a forgotten one leaks a literal
       * "[[" into a <title>. Stripping here inverts that: `title` is plain
       * everywhere by default, and a caller that wants the strokes reaches for
       * `titleMarked` deliberately. Forgetting THAT loses a stroke, which is
       * visible and harmless.
       */
      .transform((data) => ({
        ...data,
        titleMarked: data.title,
        title: stripMarks(data.title),
      })),
});

const jobs = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/jobs',
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    location: z.string(),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'INTERN', 'CONTRACTOR']).default('FULL_TIME'),
    experience: z.string(),
    postedAt: z.coerce.date(),
    /** Set false to keep the page but drop it from the openings list. */
    open: z.boolean().default(true),
    responsibilities: z.array(z.string()).default([]),
    requirements: z.array(z.string()).default([]),
  }),
});

/**
 * Privacy policy, terms, disclaimer.
 *
 * Was ~1,900 words of prose sitting inline in three .astro pages. Markdown is
 * the right shape for text a translator or a lawyer edits, and it keeps that
 * text out of a file full of component internals.
 *
 * The body may contain {placeholders} — {company}, {email}, {phone},
 * {street}, {locality}, {region}, {postalCode}, {country} — filled at render
 * time from config/site.ts, so the registered address and contact details stay
 * defined in exactly one place across nine locales.
 */
const legal = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/legal',
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, ''),
  }),
  schema: z.object({
    /** May carry [[marker brackets]] — see components/marks.ts. */
    title: z.string(),
    description: z.string(),
    /**
     * A date, not a display string. It used to be prose ("8 September 2026"),
     * which meant every locale printed the English wording — and a translated
     * page would have had to hand-copy the date, where the first edit that
     * missed one leaves a locale quietly claiming the wrong date. One value,
     * formatted per locale by LegalLayout.
     */
    updated: z.coerce.date(),
    /** Order in the sidebar. Matches legalNav in config/site.ts. */
    order: z.number().int(),
  }),
});

/** Mobile apps shown on /services/mobile-app-development and the homepage strip. */
const apps = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/apps' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** One line under the name. */
      tagline: z.string(),
      platform: z.enum(['android', 'tablet']).default('android'),
      /** 384x256 card artwork, relative to the .md file. */
      image: image(),
      features: z.array(z.string()).min(1).max(5),
      order: z.number().int(),
    }),
});

/** ERP modules grid on /services/erp-solutions. One JSON file, one entry per module. */
const modules = defineCollection({
  loader: file('./src/data/erp-modules.json'),
  schema: z.object({
    title: z.string(),
    /** Grid label where the full title is too long. Falls back to title. */
    shortTitle: z.string().optional(),
    summary: z.string(),
    icon: iconName,
    order: z.number().int(),
  }),
});

/** Client reviews on the homepage. One JSON file, one entry per review. */
const testimonials = defineCollection({
  loader: file('./src/data/testimonials.json'),
  schema: z.object({
    name: z.string(),
    quote: z.string(),
    /** Stars shown on the card, 0-5. */
    rating: z.number().int().min(0).max(5).default(5),
    order: z.number().int(),
  }),
});

export const collections = { services, jobs, legal, apps, modules, testimonials };
