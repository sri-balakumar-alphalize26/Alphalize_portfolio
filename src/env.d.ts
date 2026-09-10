/// <reference types="astro/client" />

/**
 * `@cloudflare/workers-types` is imported per-type below rather than pulled in
 * with a `/// <reference types>` directive.
 *
 * The directive puts every Workers global into scope for every file in the
 * project, including the browser-side <script> blocks in .astro components —
 * and Workers declares its own `Element` (HTMLRewriter's), which shadows the
 * DOM one. The result was three type errors on ordinary DOM code:
 * `document.body.append(ta)` resolved to HTMLRewriter's
 * `append(content: string | ReadableStream | Response)` and rejected a real
 * element. Scoped imports give the same binding types with no global fallout.
 */

/**
 * Bindings, vars and secrets declared in wrangler.toml, merged into
 * `Cloudflare.Env` — the type of `import { env } from 'cloudflare:workers'`
 * and of the `env` the adapter passes to its handler. Keep in step with
 * wrangler.toml. Secrets are set with `wrangler secret put`, never committed.
 */
declare namespace Cloudflare {
  interface Env {
    /** Secrets. */
    RESEND_API_KEY?: string;
    TURNSTILE_SECRET_KEY?: string;
    /** First-run manage passcode; ignored once one is set on screen. */
    MANAGE_PASSCODE?: string;

    /** Plain `[vars]`. */
    PUBLIC_TURNSTILE_SITE_KEY?: string;
    CONTACT_TO_EMAIL?: string;
    CAREERS_TO_EMAIL?: string;
    MAIL_FROM?: string;

    /** Bindings. */
    RATE_LIMIT?: import('@cloudflare/workers-types').KVNamespace;
    RESUMES?: import('@cloudflare/workers-types').R2Bucket;
    MANAGE?: import('@cloudflare/workers-types').KVNamespace;
  }
}

/**
 * The one thing the dropped `/// <reference types>` directive supplied that is
 * actually used: the virtual module the adapter resolves at build time. Only
 * `env` is imported from it anywhere in this project.
 */
declare module 'cloudflare:workers' {
  export const env: Cloudflare.Env;
}

declare namespace App {
  /** Adapter 14 exposes `cfContext` (ExecutionContext) on locals; `runtime` is gone. */
  interface Locals extends import('@astrojs/cloudflare').Runtime {
    /** Set by src/middleware.ts for every page and endpoint. */
    locale: import('./i18n/locales').Locale;
    /** Translations for `locale`, falling back to English per key. */
    t: import('./i18n/messages').Translate;
  }
}
