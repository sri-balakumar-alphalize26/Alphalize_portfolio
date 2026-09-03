# Alphalize — website

Rebuild of [alphalize.com](https://www.alphalize.com) on **Astro 7 + Tailwind 4**, deployed to
**Cloudflare Workers** (static assets + two server routes). Every page is prerendered static
HTML; the only server code is the two form endpoints under `src/pages/api/`.

## Commands

| Command           | What it does                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `npm install`     | Install dependencies                                                                             |
| `npm run dev`     | Dev server at `localhost:4321`, running inside workerd — `/api/*`, KV and R2 bindings are live   |
| `npm run build`   | Production build to `dist/` (`dist/client` = static assets, `dist/server` = the Worker)          |
| `npm run preview` | Serve the production build through Wrangler locally                                              |
| `npm run deploy`  | Build and `wrangler deploy` to your Cloudflare account                                           |
| `npm run check`   | TypeScript + Astro type check                                                                    |
| `npm run format`  | Prettier                                                                                         |

## Project layout

```
src/
  config/site.ts        Company details, nav, offices — single source of truth
  content/
    services/*.md       8 services (drives /services, /services/[slug], header dropdown, footer)
    jobs/*.md           Open roles (drives /careers and JobPosting JSON-LD)
    apps/*.md           10 mobile apps (shown on the Mobile App Development page + homepage strip)
  data/erp-modules.json 15 ERP modules (grid on the ERP Solutions page)
  assets/apps/          App card artwork (384x256)   assets/solutions/  IoT solution photos
  content.config.ts     Zod schemas for all four collections
  layouts/              BaseLayout (header/footer/SEO/transitions), LegalLayout
  components/           UI; Icon.astro + icons.ts is the inline SVG set
  pages/
    api/contact.ts      POST — contact form
    api/careers.ts      POST — application form with CV upload
  lib/                  turnstile, validation, rate-limit, email
  styles/global.css     Tailwind theme tokens + the CSS animation layer
public/
  _redirects            301s from every old .html URL (incl. retired blog URLs)
```

### Editing content

- **Add / edit a service**: create or edit `src/content/services/<slug>.md`. The slug is the URL.
  `order` controls position; `featured: true` puts it in the homepage 4-up.
- **Add / close a job**: `src/content/jobs/<slug>.md`. Set `open: false` to remove it from the
  list without deleting the file.
- **Contact details / addresses**: `src/config/site.ts`. Used everywhere, including JSON-LD.
- **Add a mobile app**: `src/content/apps/<slug>.md` with `title`, `tagline`, `image`, `order`
  and up to five `features`. Drop the 384x256 artwork in `src/assets/apps/`.
- **Add an ERP module**: append an entry to `src/data/erp-modules.json` (`icon` must be a key in
  `src/components/icons.ts`).
- **Software sections on a service page** are switched on by `showcase: apps | erp | iot` in
  that service's frontmatter; the IoT page's three photo cards come from its `solutions:` list.

Frontmatter is validated at build time — a typo in an `icon` key or a missing field fails the
build rather than shipping a broken page.

## Forms — how they are protected

The old site's captcha was client-side only and could be skipped by POSTing straight to the PHP
handler. Both endpoints here enforce, in order, **on the server**:

1. Astro's origin check — a POST whose `Origin` is not this site is refused (403).
2. Per-IP rate limit (Workers KV) — 5 / 10 min for contact, 3 / hour for careers.
3. **Cloudflare Turnstile** token verified against `siteverify`. Fails closed if the secret is
   missing.
4. Zod validation of every field (trimmed, length-bounded, email format).
5. Careers only: CV ≤ 5 MB, declared type ∈ {pdf, doc, docx}, **and** leading magic bytes match
   the declared type — a renamed `.exe` is rejected. Stored in R2 under a random UUID key, never
   the client filename.
6. Email via Resend with header-injection-safe `Reply-To`/`Subject` and HTML-escaped body.

Forms are real `<form method="post">` elements, so they work with JavaScript disabled; the
enhancement script only adds inline errors and a no-reload success state.

Bindings, vars and secrets reach the routes through `import { env } from 'cloudflare:workers'`.
The `Env` shape is declared in `src/env.d.ts` — keep it in step with `wrangler.toml`.

## Cloudflare setup (one-time)

1. **Log in**: `npx wrangler login`. The Worker is named `alphalize` (see `wrangler.toml`).
2. **Turnstile**: create a widget for `alphalize.com` in the Cloudflare dashboard. Put the site
   key in `wrangler.toml` `[vars] PUBLIC_TURNSTILE_SITE_KEY` (it is public and is inlined at
   build time). Store the secret with `npx wrangler secret put TURNSTILE_SECRET_KEY`.
3. **Resend**: verify the `alphalize.com` sending domain, create an API key, and store it with
   `npx wrangler secret put RESEND_API_KEY`. `MAIL_FROM` must be on the verified domain.
   Contact enquiries go to `CONTACT_TO_EMAIL` (default `info@`), applications to
   `CAREERS_TO_EMAIL` (default `hr@`) — both plain vars in `wrangler.toml`.
4. **KV**: nothing to create. `RATE_LIMIT` (and the adapter's `SESSION`) are provisioned
   automatically on the first deploy.
5. **R2**: create the `alphalize-resumes` bucket. Keep it private — the email carries the CV as
   an attachment; the bucket is an archive.
6. **Deploy**: `npm run deploy`. Then add `www.alphalize.com` as a custom domain on the Worker
   (Workers & Pages → alphalize → Settings → Domains) and point the apex at it. Cloudflare
   already fronts the DNS.

Secrets are never committed. `.dev.vars` (gitignored) carries Cloudflare's published Turnstile
*test* keys for local runs, so `npm run dev` and `npm run preview` exercise the full
server-side path.

## Verifying a deploy

```sh
# Every old URL must 301 to a live page — never 404.
for u in index.html about.html services.html careers.html contact.html blog.html \
         social-media-business social-media-business.html; do
  curl -s -o /dev/null -w "%{http_code} %{redirect_url}  <- /$u\n" "https://www.alphalize.com/$u"
done

# Direct POST with no Turnstile token must be rejected (this was the old site's hole).
curl -s -X POST https://www.alphalize.com/api/contact -H "Origin: https://www.alphalize.com" \
     -F name=x -F email=x@y.z -F phone=123456 -F subject=x -F message="ten chars.."   # -> 400 captcha
```

Then Lighthouse (mobile) on `/`, `/services/erp-solutions`, `/services/mobile-app-development`
and `/careers`; target ≥ 95 across Performance / SEO / Accessibility.

## What was deliberately dropped from the old site

- **Blog** — 4 posts, all June 2023, unmaintained. URLs 301 to `/services`. Re-adding it is one
  more content collection plus two routes.
- **Lorem-ipsum testimonials** — the live homepage shipped placeholder quotes ("Name of Client").
  Not ported; add a real testimonials section when quotes exist.
- **14 jQuery plugins** — replaced by ~15 KB gzipped of JS across the whole site (view-transition
  router + hero carousel on the homepage only + ~1 KB form enhancement on the two form pages).

## Software catalogue (from 369AI)

The 10 Android apps, 15 ERP modules, desktop software and IoT solutions are ported from the
369AI portfolio site with their copy verbatim and presented as Alphalize's own. The app artwork
and solution photos in `src/assets/` were downloaded from that site and are served locally.
