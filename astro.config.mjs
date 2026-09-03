// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

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
  adapter: cloudflare({
    // Optimise images at build time so no Worker CPU is spent on them.
    imageService: 'compile',
    // Adapter 14 runs `astro dev`/`astro preview` inside workerd via the
    // Cloudflare Vite plugin, so bindings from wrangler.toml are live locally.
  }),
  integrations: [sitemap()],
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
