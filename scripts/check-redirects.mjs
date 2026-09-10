/**
 * Check every rule in public/_redirects points at something that exists.
 *
 * The locale move changed every URL on the site, so this table is the only
 * thing keeping the old ones alive — and a typo in it is invisible until a
 * visitor or a crawler hits the dead rule. This cannot replace a real request
 * against a deployed preview (it does not test Cloudflare's matching order or
 * precedence), but it does catch the failure that actually happens: a target
 * that was never built.
 *
 * Resolution mirrors `build.format: 'file'` + `trailingSlash: 'never'`:
 *   /en/about  ->  dist/client/en/about.html
 *   /en        ->  dist/client/en.html
 *
 * Run after a build:  npm run check:redirects
 */
import { readFile, access, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DIST = join(ROOT, 'dist', 'client');
const PAGES = join(ROOT, 'src', 'pages');

/**
 * Routes with `prerender = false` are served by the Worker, so they are
 * correctly absent from dist/client — a target check that did not know this
 * would report the contact page as broken on every run, which is worse than
 * not checking at all.
 *
 * Collected from the source rather than hard-coded, so a page that stops being
 * on-demand starts being checked again automatically.
 */
async function onDemandRoutes(dir = PAGES, out = []) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) {
      await onDemandRoutes(full, out);
      continue;
    }
    if (!/\.(astro|ts)$/.test(item.name)) continue;
    const source = await readFile(full, 'utf8');
    if (!/export\s+const\s+prerender\s*=\s*false/.test(source)) continue;

    // src/pages/[locale]/contact.astro -> /:locale/contact
    const route = relative(PAGES, full)
      .split(sep)
      .join('/')
      .replace(/\.(astro|ts)$/, '')
      .replace(/\/index$/, '');
    out.push(`/${route}`);
  }
  return out;
}

const onDemand = await onDemandRoutes();

/** Does `path` match an on-demand route, treating [param] as one segment? */
const isOnDemand = (path) =>
  onDemand.some((route) => {
    const pattern = route.replace(/\[\.\.\.[^\]]+\]/g, '.+').replace(/\[[^\]]+\]/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(path);
  });

const exists = (p) =>
  access(p).then(
    () => true,
    () => false
  );

const raw = await readFile(join(ROOT, 'public', '_redirects'), 'utf8');

const rules = raw
  .split('\n')
  .map((line, i) => ({ line: line.trim(), no: i + 1 }))
  .filter(({ line }) => line && !line.startsWith('#'))
  .map(({ line, no }) => {
    const [from, to, code = '301'] = line.split(/\s+/);
    return { from, to, code: Number(code), no };
  });

const errors = [];
const warnings = [];
const seen = new Map();

for (const { from, to, code, no } of rules) {
  if (!from || !to) {
    errors.push(`line ${no}: could not parse "${from} ${to}"`);
    continue;
  }

  if (seen.has(from)) {
    errors.push(`line ${no}: "${from}" is already redirected on line ${seen.get(from)}`);
  }
  seen.set(from, no);

  if (![301, 302, 307, 308].includes(code)) {
    errors.push(`line ${no}: "${from}" has status ${code}`);
  }

  // A rule whose source would also be served as a real file never fires.
  const sourceFile = from === '/' ? null : join(DIST, `${from.replace(/^\//, '')}.html`);
  if (sourceFile && !from.includes('*') && (await exists(sourceFile))) {
    errors.push(`line ${no}: "${from}" is also a built page — the redirect is unreachable`);
  }

  // Splat targets are checked by their prefix; the :splat part is per-request.
  const target = to.replace(/:splat$/, '').replace(/\/$/, '');
  if (!target.startsWith('/')) {
    warnings.push(`line ${no}: "${to}" is external — not checked`);
    continue;
  }

  const candidates = [
    join(DIST, `${target.replace(/^\//, '')}.html`),
    join(DIST, target.replace(/^\//, ''), 'index.html'),
    join(DIST, target.replace(/^\//, '')),
  ];

  if (to.endsWith(':splat')) {
    // The prefix must be a real directory for the splat to land anywhere.
    if (!(await exists(join(DIST, target.replace(/^\//, ''))))) {
      errors.push(`line ${no}: "${from}" -> "${to}" — no ${target}/ directory was built`);
    }
    continue;
  }

  const found = await Promise.all(candidates.map(exists));
  if (!found.some(Boolean) && !isOnDemand(target)) {
    errors.push(`line ${no}: "${from}" -> "${to}" — target was not built`);
  }
}

if (!(await exists(DIST))) {
  console.error('dist/client not found — run `npm run build` first.');
  process.exit(1);
}

for (const line of warnings) console.warn(`  warn  ${line}`);
for (const line of errors) console.error(`  error ${line}`);

if (errors.length) {
  console.error(`\nredirects: ${errors.length} problem(s) in ${rules.length} rule(s).`);
  process.exit(1);
}
console.log(
  `redirects: ${rules.length} rules, all targets resolve, no duplicate or shadowed sources.`
);
