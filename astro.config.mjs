// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defaultLocale, liveLocales, locales } from './src/i18n/locales.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.alphalize.com',
  // Static by default; only the two form endpoints opt out via `prerender = false`.
  output: 'static',
  // Emit `about.html` rather than `about/index.html` so Cloudflare Pages serves
  // `/about` directly instead of 308-ing to `/about/`. Keeps the 301s from the
  // old .html URLs to a single hop and the canonical/sitemap URLs slash-free.
  build: { format: 'file' },
  trailingSlash: 'never',

  /**
   * The bare root, redirected by Astro rather than by public/_redirects.
   *
   * Every page now lives under a locale prefix, so `/` matches no route at all.
   * public/_redirects covers that in production — but it is a Cloudflare
   * feature that the dev server never reads, so locally the site's own front
   * door was a dead URL that fell through to the 404 page. Declaring it here
   * makes dev behave the same as production.
   *
   * 302, not 301: this is the entry point for all nine languages and must not
   * be pinned to English in every visitor's cache — including after locale
   * negotiation is added.
   *
   * The division of labour with public/_redirects is deliberate:
   *   here          — live routing that must behave identically in dev and prod
   *   _redirects    — preserving URLs from earlier generations of the site
   *                   (the old .html pages, the retired blog, and the
   *                   unprefixed URLs this site served before the locale move).
   *                   None of those is a URL a developer types locally.
   */
  redirects: {
    '/': { status: 302, destination: `/${defaultLocale}` },
  },

  i18n: {
    locales: [...locales],
    defaultLocale,
    /**
     * `manual` switches Astro's own i18n middleware off entirely, so it never
     * redirects, rewrites or 404s anything of its own accord — which matters
     * because /api/* has no locale segment and must stay reachable.
     *
     * The block is declared only so `Astro.currentLocale` is populated from the
     * [locale] param and @astrojs/sitemap can read the locale list. Routing
     * itself is ours: one [locale] segment, getStaticPaths over the nine, and
     * public/_redirects for the bare root.
     *
     * Astro's built-in routing is not what we want here — it maps locales onto
     * physical per-locale page directories, i.e. nine hand-maintained copies of
     * every page.
     */
    routing: 'manual',
  },
  adapter: cloudflare({
    // Optimise images at build time so no Worker CPU is spent on them.
    imageService: 'compile',
    // Adapter 14 runs `astro dev`/`astro preview` inside workerd via the
    // Cloudflare Vite plugin, so bindings from wrangler.toml are live locally.
  }),
  integrations: [
    sitemap({
      /**
       * /[locale]/contact is `prerender = false`, and @astrojs/sitemap builds
       * its URLs from a route's `pathname` — which an on-demand dynamic route
       * does not have, so it is skipped silently. Before the locale move
       * /contact was a static route pattern and appeared on its own; now it
       * has to be listed by hand or the contact page falls out of the sitemap
       * altogether. One entry per live locale.
       */
      customPages: liveLocales.map((locale) => `https://www.alphalize.com/${locale}/contact`),
    }),
  ],
  vite: {
    // @tailwindcss/vite resolves its own Vite types, which differ from Astro's
    // pinned copy by a patch version; the plugin object itself is compatible.
    plugins: [/** @type {any} */ (tailwindcss())],
  },
  image: {
    responsiveStyles: true,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
