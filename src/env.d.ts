/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

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

    /** Plain `[vars]`. */
    PUBLIC_TURNSTILE_SITE_KEY?: string;
    CONTACT_TO_EMAIL?: string;
    CAREERS_TO_EMAIL?: string;
    MAIL_FROM?: string;

    /** Bindings. */
    RATE_LIMIT?: KVNamespace;
    RESUMES?: R2Bucket;
  }
}

declare namespace App {
  /** Adapter 14 exposes `cfContext` (ExecutionContext) on locals; `runtime` is gone. */
  interface Locals extends import('@astrojs/cloudflare').Runtime {}
}
