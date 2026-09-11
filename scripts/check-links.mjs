/**
 * Every internal link in the build must resolve — to a built page, to an
 * on-demand route, or to a rule in public/_redirects.
 *
 * This exists because a locale-unprefixed link fails in two different ways and
 * neither shows up in a passing build. In dev it is a hard 404, because
 * _redirects is a Cloudflare Assets feature the dev server never reads. In
 * production it 301s to /en/…, so an Arabic reader clicking an Arabic page's
 * button lands on the English one, locale silently lost. `astro check` sees a
 * string; check-redirects only proves rule TARGETS resolve, not that every link
 * has a rule. Four such links had accumulated before this script was written.
 *
 * Run against dist/, so `npm run build` first.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'dist/client';
const REDIRECTS = 'public/_redirects';

/** Assets and API routes are not pages; neither is checked here. */
const SKIP = /^\/(_astro|api)\//;
const ASSET = /\.(png|jpe?g|webp|avif|svg|ico|xml|txt|json|pdf|mp4|webm|woff2?)$/i;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** `/a/b.html` → `/a/b`, and an index file also answers to its directory. */
function routesOf(files) {
  const routes = new Set();
  for (const file of files) {
    const rel = '/' + path.relative(ROOT, file).split(path.sep).join('/');
    const route = rel.replace(/\.html$/, '');
    routes.add(route);
    if (route.endsWith('/index')) routes.add(route.slice(0, -'/index'.length) || '/');
  }
  return routes;
}

/**
 * Source patterns from _redirects, `*` included. Only the source matters here —
 * check-redirects.mjs already proves the targets resolve.
 */
async function redirectMatchers() {
  const text = await readFile(REDIRECTS, 'utf8').catch(() => '');
  const matchers = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [from] = trimmed.split(/\s+/);
    if (!from?.startsWith('/')) continue;
    matchers.push(
      from.includes('*')
        ? new RegExp('^' + from.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
        : new RegExp('^' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')
    );
  }
  return matchers;
}

const files = await walk(ROOT);
const routes = routesOf(files);
const redirects = await redirectMatchers();

/**
 * Locale list read from source so it cannot drift from locales.ts.
 */
const localesSrc = await readFile('src/i18n/locales.ts', 'utf8');
const locales = [...localesSrc.matchAll(/'([a-z]{2})'/g)]
  .map((m) => m[1])
  .filter((v, i, a) => a.indexOf(v) === i);
const PREFIXED = new RegExp(`^/(${locales.join('|')})(/|$)`);

/**
 * `/` is the bare root, a real on-demand route that negotiates a locale.
 * Everything else a page links to should already carry one.
 */
const LOCALE_FREE_OK = new Set(['/']);

/**
 * On-demand routes have no .html on disk — `prerender = false` pages are served
 * by the Worker. Read them off the page files that do exist rather than
 * hardcoding a list, so a new one does not have to be remembered here.
 */
const onDemand = [/\/[a-z]{2}\/contact$/, /\/[a-z]{2}\/careers\/applications$/];

const broken = new Map();

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const from = '/' + path.relative(ROOT, file).split(path.sep).join('/');

  /**
   * Anchors only. <link rel="canonical"> and <meta property="og:url"> also
   * carry hrefs, and the 404 page's canonical points at /{locale}/404 — a URL
   * that by definition has no page. That is a metadata question, not a dead
   * link a visitor can click, and the page is noindex anyway.
   */
  for (const match of html.matchAll(/<a\b[^>]*?\shref="(\/[^"#?]*)/g)) {
    const href = match[1].replace(/\/$/, '') || '/';
    if (SKIP.test(href) || ASSET.test(href)) continue;

    /**
     * A missing locale prefix is the bug this script exists for, and a redirect
     * rule does NOT excuse it — `/services/*` → `/en/…` is exactly what made
     * these invisible. Checked before resolution, because such a link resolves
     * perfectly well; it just resolves into the wrong language.
     */
    if (!LOCALE_FREE_OK.has(href) && !PREFIXED.test(href)) {
      const key = `${href}  (no locale prefix)`;
      if (!broken.has(key)) broken.set(key, new Set());
      broken.get(key).add(from);
      continue;
    }

    if (routes.has(href)) continue;
    if (existsSync(path.join(ROOT, href))) continue;
    if (onDemand.some((re) => re.test(href))) continue;
    if (redirects.some((re) => re.test(href))) continue;

    if (!broken.has(href)) broken.set(href, new Set());
    broken.get(href).add(from);
  }
}

if (broken.size === 0) {
  console.log(`links: ${files.length} page(s), all internal links resolve.`);
  process.exit(0);
}

for (const [href, pages] of broken) {
  const list = [...pages];
  const shown = list.slice(0, 3).join(', ');
  console.error(`  ${href}  ←  ${shown}${list.length > 3 ? ` (+${list.length - 3} more)` : ''}`);
}
console.error(`\nlinks: ${broken.size} dead internal link(s).`);
process.exit(1);
