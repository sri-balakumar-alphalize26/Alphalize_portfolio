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

    /**
     * Pre-bundle the view-transition router at startup.
     *
     * <ClientRouter /> pulls these in lazily, on the FIRST client-side
     * navigation — so Vite does not see them during its startup pass and
     * discovers them minutes into a session, mid-request. That triggers a
     * second optimize, which invalidates the module graph while requests are
     * in flight. Vite's usual answer is a full page reload; under the
     * Cloudflare adapter the request is being served inside workerd, and it
     * deadlocked instead — the server stayed LISTENING and simply stopped
     * answering, leaving the browser spinning on every subsequent page.
     *
     * Declaring them here moves that work into the one startup pass. Despite
     * the "virtual-modules" name these are real files under
     * node_modules/astro/dist/, so the optimizer can pre-bundle them.
     *
     * Dev-server only — optimizeDeps has no effect on the build.
     */
    optimizeDeps: {
      include: [
        'astro/virtual-modules/transitions-router.js',
        'astro/virtual-modules/transitions-events.js',
        'astro/virtual-modules/transitions-swap-functions.js',
        'astro/virtual-modules/transitions-types.js',
      ],
    },
  },
  image: {
    responsiveStyles: true,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
