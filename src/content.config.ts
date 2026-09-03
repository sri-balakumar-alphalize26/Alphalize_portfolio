import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';
import { iconPaths, type IconName } from './components/icons';

// Validate icon keys at build time so a typo fails the build rather than
// rendering an empty <svg>. Typed as IconName so <Icon name={...}> accepts it.
const iconName = z.enum(Object.keys(iconPaths) as [IconName, ...IconName[]]);

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: ({ image }) =>
    z.object({
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
    }),
});

const jobs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/jobs' }),
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
    summary: z.string(),
    icon: iconName,
    order: z.number().int(),
  }),
});

export const collections = { services, jobs, apps, modules };
