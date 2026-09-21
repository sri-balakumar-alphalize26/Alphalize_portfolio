# Alphalize — SEO handoff

**Date:** 21 September 2026
**Site:** https://www.alphalize.com — Astro on Cloudflare Workers
**Follows:** `docs/session-2026-09-12.md` (the SEO parity pass)

---

## 1. Where things stand

### The site is live, and the code-side SEO is done

The 12 September notes ended with "none of this is live". It is now. Verified
directly against production today:

| Check | Result |
|---|---|
| `https://www.alphalize.com/en` | 200 |
| hreflang | 9 alternates + `x-default`, all resolving |
| `robots.txt` | live, with the three `Disallow` rules |
| Share cards | `/og-default.png`, `/og/services/erp-solutions.png` → 200 |
| Icons | `/apple-touch-icon.png`, `/icons/maskable-512.png`, `/site.webmanifest` → 200 |
| `sitemap-index.xml` | 200, `lastmod` 2026-09-12 |
| Organization JSON-LD | `alternateName` and `sameAs` both present |
| Home `<title>` / description | localised per locale, as intended |

**Nothing in the repo needs changing for any of this.** The one outstanding code
edit is a single string (section 3 below).

### What the 369 site's handoff changes

`369ai_portfolio/docs/seo-handoff.md` covers the same pass on the sibling site
and settles two of our open questions:

- 369 verified Search Console with a **DNS domain property — no HTML tag**.
  So `site.googleSiteVerification` can stay empty permanently. A domain property
  also covers apex and www in one go, which matters here (see fault 2).
- 369 records that **Google restricted FAQ rich results in 2023** to
  government/health sites. This independently confirms the 12 Sept decision to
  skip FAQPage schema. Settled — do not revisit.

---

## 2. Three live faults, highest value first

All three are **Cloudflare dashboard settings, not code**. 369's handoff lists
its equivalents as done; ours are missing.

### Fault 1 — the whole site is served over plain HTTP

```
http://alphalize.com/en      -> 200   (not a redirect)
http://www.alphalize.com/en  -> 200   (not a redirect)
```

Every URL is reachable unencrypted, so every page exists twice as far as a
crawler is concerned, and HTTPS is a ranking signal Google states outright.

**Fix:** Cloudflare → SSL/TLS → Edge Certificates → **Always Use HTTPS** on.

### Fault 2 — apex and www both return 200

`https://alphalize.com/en` serves full content with a 200. Its canonical does
correctly point at `https://www.alphalize.com/en`, so Google will most likely
consolidate — but a 301 removes the ambiguity rather than relying on it.

**www is the canonical host here**, because `site.url` in `src/config/site.ts`
is `https://www.alphalize.com` and canonical, hreflang, sitemap and OG URLs all
derive from it. Note this is the **inverse of 369**, which canonicalises to
apex. Do not "make the two sites match".

**Fix:** Cloudflare → Rules → Redirect Rules. `alphalize.com/*` →
`https://www.alphalize.com/$1`, status **301**, preserve query string.

### Fault 3 — edge caching is not actually working

`public/_headers` sets `s-maxage=600, stale-while-revalidate=86400` and that
header *is* arriving on the live response. But `/en/about` — a prerendered page —
returns `cf-cache-status: DYNAMIC` on the second and third request. So the
caching work from 11 Sept (`f9016be`) is not having its effect.

369 hit the identical symptom. Cloudflare does not cache Worker responses by
default merely because they carry `s-maxage`; it needs a zone-level rule.

**Fix:** Cloudflare → Caching → Cache Rules. Match `https://www.alphalize.com/*`,
set **Eligible for cache**, respect origin TTL. Exclude `/api/*`.

> `/`, `/en/contact`, `/en/careers` and `/api/*` will stay `DYNAMIC` — they are
> on-demand routes by design. `/en/about` turning `HIT` on a second request is
> the pass condition.

### Not a fault — the root 302

`https://www.alphalize.com/` → 302 → `/en` looks wrong and is not.
`src/pages/index.astro` documents the reasoning in full: it is a real Worker
route (an `astro.config` redirect 500'd, because Astro resolves the destination
in `manifest.pageMap`, which holds only on-demand routes), `prerender = false`
so it emits a genuine `Location` header rather than a crawler-invisible
meta-refresh, and the **302 is deliberate** — the root is the entry point for
all nine languages and must not be cached as pinned to English. That is also
where `Accept-Language` negotiation will eventually live.

`x-default` already points at `/en`, so Google has the signal. **Leave it.**

---

## 3. The measurement steps

### Step A — Search Console, via DNS domain property

**Read this first: the domain is already verified by someone.** A TXT record

```
google-site-verification=GAylRYwksKIz6LeOzKaBNis543xfWKXhwUfhEbIaVcM
```

is live on `alphalize.com` today. It almost certainly belongs to whoever built
the old hand-written site, which means an older property exists holding the
historical data — possibly in an account we do not control.

Two consequences:

- **Do not delete that record.** Multiple `google-site-verification` TXT records
  coexist safely, so a new account can verify alongside it without touching it.
  Removing it only risks losing history that could otherwise be reclaimed.
- **Try to recover the old property first.** If the previous developer still
  holds it, having them add you as an Owner (Settings → Users and permissions)
  beats starting cold, because the history comes with it.

Confirmed before writing this: nameservers are `armfazh.ns.cloudflare.com` /
`journey.ns.cloudflare.com`, so DNS is ours to edit; `sitemap-0.xml` holds
**144 URLs, all on `www`**, with no non-www entries to reconcile.

Then, taking 369's route:

1. Search Console → Add property → **Domain** → `alphalize.com` (bare — no
   scheme, no `www`). Domain rather than URL-prefix because it covers apex, www,
   http and https in one property, which matters while fault 2 above is open.
2. Add the TXT record it offers: Cloudflare → DNS → Records → TXT, name `@`.
3. Verify.
4. Submit **`https://www.alphalize.com/sitemap-index.xml`** — the *index*, not
   `sitemap-0.xml`. The index is what `<link rel="sitemap">` and robots.txt name.
   Expect **144 URLs** discovered.
5. Request indexing for `/en`, `/en/about`, `/en/services`, `/en/ceo`,
   `/en/careers`, `/en/contact`. English only — there is a small daily quota,
   and the sitemap plus hreflang reaches the other eight locales.

`site.googleSiteVerification` stays `''`. The gated `<meta>` in
`src/components/Seo.astro` remains as a fallback if DNS verification is refused.

**The signal that it worked:** the "Alphalize" search snippet stops mentioning
the Clearwater, Florida office. Usually 1–2 weeks.

### Step B — Cloudflare Web Analytics (the one code change)

Dashboard → Analytics & Logs → Web Analytics → the site → JS snippet → copy the
`token` out of `data-cf-beacon`. Paste it into `cfAnalyticsToken` in
`src/config/site.ts`. The emit is already written and gated in
`src/layouts/BaseLayout.astro`.

Then `npm run deploy`, and **settle the open question from 12 Sept by hand:**
the beacon hooks the History API and `<ClientRouter />` does client-side
navigation. Load `/en`, click through to `/en/about`, and confirm **two**
pageviews register. If only one does, dispatch on `astro:page-load`.

### Step C — social re-scrapes

Both caches are hard and per-URL, so this had to wait for the deploy. Re-scrape
at minimum `/en`, `/en/services/erp-solutions` and `/hi/legal/privacy-policy` in
the **Facebook Sharing Debugger** and **LinkedIn Post Inspector**. Then **Rich
Results Test** on the home page, a service page and careers.

### Step D — two brand-entity items 369 surfaced

- **The YouTube channel is `@shanontech4849`** — an unbranded handle sitting in
  `sameAs`. 369's equivalent step was adding the site URL to the channel's
  Links; do the same, and consider renaming the handle. A `sameAs` pointing at
  an unrecognisable channel does little entity work.
- **Google Business Profile** — 369 flags this as worth doing and not done.
  Alphalize has one real Kollam office with `GeoCoordinates` already in the
  LocalBusiness JSON-LD, so the schema half is built. A GBP listing often beats
  organic ranking for a brand search. business.google.com

---

## 4. Deliberately not doing

| Item | Why |
|---|---|
| FAQPage schema | No Q&A content exists, and Google restricted FAQ rich results to government/health sites in 2023 |
| Review / AggregateRating | No dates, all ratings 5, names first-name-only, seven written from topics rather than submitted |
| Per-locale OG cards | ~135 PNGs, 10–12 MB committed; `og:title`/`og:description` are already correct per locale |
| Per-app indexable pages | The ten entries in `src/content/apps/` are frontmatter-only — 90 URLs of thin near-duplicate English |
| Translating service titles only | The service *bodies* are English-only in all nine locales; a Hindi title on an English page is treated worse than consistent English |

---

## 5. Still open from earlier sessions

Not SEO, recorded so they are not lost:

- The two i18n leftovers cut when scope narrowed on 12 Sept: the hardcoded
  English `Services` breadcrumb in `src/pages/[locale]/services/[...slug].astro`,
  and the English `CtaBand` body in `src/pages/[locale]/services/index.astro`.
  Both change visible UI, which is why they were left.
- Legal translations still want a native-speaker or lawyer read before they are
  relied on.
- `LocaleSwitcher` still has the touch bug the brand switcher fixed.

---

## 6. Verification

After the Cloudflare changes:

```bash
# 1. HTTPS forced — expect a 301 to an https:// location
curl -sI http://alphalize.com/en | grep -iE "^HTTP|^location"

# 2. Apex canonicalises to www — expect 301 -> https://www.alphalize.com/en
curl -sI https://alphalize.com/en | grep -iE "^HTTP|^location"

# 3. Root stays a 302 to /en — confirm it did NOT change
curl -sI https://www.alphalize.com/ | grep -iE "^HTTP|^location"

# 4. Edge cache — run twice; the second should read HIT
curl -sI https://www.alphalize.com/en/about | grep -i cf-cache-status
curl -sI https://www.alphalize.com/en/about | grep -i cf-cache-status
```

After the analytics deploy:

```bash
curl -s https://www.alphalize.com/en | grep -c cloudflareinsights   # expect 1
```

Repo gate before any deploy, unchanged from 12 Sept:

```powershell
npm run check; if ($?) { npm run check:links }; if ($?) { npm run check:redirects }
npm run build
```

---

## 7. Ranking first for "Alphalize" — where you actually stand

The goal is to be the first result when someone searches the company name. I ran
the searches on 21 September 2026. You are **not** first, and the reason is not
the site's markup.

### Google's index is stale — it has not seen the new site

The search snippet Google returns still describes Alphalize as based in
**"Clearwater, Florida, and Kollam, Kerala"**. The Florida office was removed
from `src/config/site.ts` weeks ago. Google is also still listing old blog URLs:

```
alphalize.com/the-power-auto-auditing-erp-streamlining-compliance-efforts.html
alphalize.com/unveiling-latest-mobile-erp-trends-empowering-businesses
```

Both **301 correctly in one hop** to `/en/services` — `public/_redirects` handles
them, and I verified all four old-URL families resolve properly. The redirect
work is sound. Google simply has not recrawled.

**This is the whole problem, and Step A (Search Console + sitemap) is the fix.**
Nothing else on this list matters as much. Until Google recrawls, every
improvement from the September pass is invisible to it.

### What currently outranks you for your own name

| Position | Result |
|---|---|
| 1–8 | ZoomInfo (company page **and** five individual employee pages), Facebook, Tofler, LinkedIn, X, Tracxn, RocketReach, GitHub |
| lower | **alphalize.com** |

These are directory and data-broker pages. They outrank you because they have
domain authority and Google trusts them; your own domain currently has a stale
index entry and few inbound links. A brand term is the **most winnable search
there is** — nobody else is competing for the word "Alphalize" — so this is
fixable, unlike a generic term.

Note the ZoomInfo employee pages are exposing staff names and `@alphalize.com`
email patterns. Nothing to do about it via SEO, but worth knowing it is there.

### What actually moves the brand search, in order

1. **Search Console + sitemap submission + request indexing** (Step A). Without
   this, nothing else registers. Expect first movement in days, not months.
2. **Google Business Profile** (Step D). For a brand search with a real office,
   a GBP panel frequently takes the entire right-hand side of the page and the
   top local result. This is the single highest-leverage item after indexing,
   and it is free. You have the Kollam address and `GeoCoordinates` already in
   the LocalBusiness JSON-LD, so the schema half is built.
3. **Fix the `sameAs` set.** Two problems found:
   - **`@alphalizeerp` on X exists.** The 11 September notes dropped the X link
     believing the account did not exist — it appears in search results. Verify
     it is yours, then add it back to `socials` in `src/config/site.ts`.
   - **The YouTube entry is `@shanontech4849`**, an unbranded handle. Rename it
     if you can, and add `https://www.alphalize.com` to the channel's Links.

   `sameAs` is how Google ties the scattered profiles above into one entity that
   resolves to *your* domain. Right now it is incomplete in both directions.
4. **Claim and align the directory profiles you control** — LinkedIn, Facebook,
   ZoomInfo, RocketReach. Make each one link to `https://www.alphalize.com`.
   You cannot outrank them quickly, but you can make them point at you.
5. **NAP consistency.** The registry records (Tofler, Tracxn) say
   **Thiruvananthapuram**; the site and LinkedIn say **Kollam**. Facebook has
   appeared as both. Local SEO weights name/address/phone consistency across
   sources. Decide which is the operating address and make every profile match
   the site.

### Honest expectations

**"Alphalize" — winnable, and you should expect to own it.** Unique coined word,
no real competitor for the term. Once indexed with a GBP listing, first place is
a reasonable target within weeks.

**"ERP Kerala" / "ERP software Kerala" — not winnable soon.** Page one is held by
Sage Software, Techimply and listicle sites like spiralcode.in, all with years of
domain history and backlink profiles. Do not spend effort here.

**The genuinely winnable middle ground is long-tail and local:** "ERP company
Kollam", "ERP software Kollam", "custom software Kollam", and the seven service
names paired with the city. Low competition, real buying intent, and the
LocalBusiness schema plus a GBP listing is most of what it takes.

**The site has no blog, and the old one ranked.** Two of the stale results above
are old blog posts that were pulling traffic. The rebuild correctly redirected
them rather than 404ing, but the content is gone and nothing replaced it. A blog
is the main lever for the long-tail terms in the paragraph above — that is a
content project, not a code one, and it is the largest remaining opportunity
once indexing is sorted. (369's handoff reaches the same conclusion about its
own untranslated product descriptions.)

---

## 8. Progress log — 21 September 2026

Done this session, in order, each verified from the command line at the time:

| Item | Status | Evidence |
|---|---|---|
| Cloudflare **Always Use HTTPS** | ✅ done | `http://alphalize.com/en` now `301 → https://…`; full chain terminates at 200, no loop |
| Cloudflare **apex → www 301** | ✅ done | Redirect Rule, wildcard `https://alphalize.com/*` → `https://www.alphalize.com/${1}`, 301, preserve query. Path **and** query string verified preserved; `www` itself returns 200, so no loop |
| Search Console property | ✅ already existed | A verified **Domain** property was already present — Steps 2–5 of the setup were unnecessary. The pre-existing TXT record in section 3 is explained |
| **Sitemap submitted** | ✅ done | `https://www.alphalize.com/sitemap-index.xml` — "Sitemap submitted successfully" |
| **Indexing requested** | ✅ done | All six English URLs: `/en`, `/en/about`, `/en/services`, `/en/ceo`, `/en/careers`, `/en/contact` |
| Cloudflare **Cache Rule** | ⬜ not done | `/en/about` still returns `cf-cache-status: DYNAMIC` on repeat requests |

### What Search Console told us that we did not know

The **HTTPS report** independently confirmed fault 1 before it was fixed:
**1 non-HTTPS URL, flagged critical**, against 6 HTTPS URLs. Last updated
11 September.

More revealing is the total: **Google knew about 7 URLs**, against 144 in the
sitemap. So the crawl was not merely stale, it was shallow. The Enhancements
sidebar did list **Breadcrumbs** and **Job Postings**, and that structured data
exists only on the new Astro site — so Google had seen *something* recent, just
very little of it.

`Discovered pages` read **0** immediately after submission. That is normal;
Google accepts the sitemap first and processes it later. Do not resubmit.

### Watch list

| When | Where | Expected |
|---|---|---|
| Next day | Sitemaps | Discovered pages = **144** |
| 2–3 days | `site:alphalize.com` | Results start appearing |
| 1–2 weeks | Indexing → Pages | Indexed count climbing toward 144 |
| 1–2 weeks | Search "Alphalize" | **Clearwater, Florida gone from the snippet** — the clearest single proof the recrawl landed |

If nothing is indexed after 5–7 days, read **Indexing → Pages** for the
exclusion reasons.

### Next, in order of value

1. **Google Business Profile** for the Kollam office — free, and for a brand
   search it often takes the entire right-hand panel. Schema half already built.
2. **Cloudflare Cache Rule** — hostname `www.alphalize.com`, *Eligible for
   cache*, Edge TTL *use cache-control header from origin*. Speed, not ranking,
   which is why it was deprioritised below the sitemap.
3. **Confirm whether `@alphalizeerp` on X is ours**, then restore it to
   `socials` in `src/config/site.ts`.
4. **Cloudflare Web Analytics token** into `cfAnalyticsToken` — the only
   outstanding code change.
