/**
 * Find English text still hardcoded in markup.
 *
 * ~600 strings moved into the catalogue by hand, across 47 components. A diff
 * of that size is not reviewable by eye, and the failure is silent: a missed
 * string simply stays English in all nine locales, looking like a translation
 * gap rather than a bug.
 *
 * The heuristic is a text node of three or more consecutive Latin words sitting
 * in the markup half of a .astro file, outside any {t(...)} expression. That
 * catches sentences and misses single labels — deliberately, because widening
 * it enough to catch "Home" would flag every class name and attribute on the
 * site.
 *
 * Owner-only surfaces are excluded by design, not oversight: the manage bar and
 * the applications inbox sit behind a passcode and are used by one operator, so
 * nine translations of them buys nothing and costs ~300 catalogue entries.
 *
 * Run with: npm run check:english
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SRC = join(ROOT, 'src');

/**
 * Not visitor copy, so not translated:
 *
 *   ManageBar, WhatsAppManage, ContactSync, applications.astro
 *     Owner-only, behind the manage passcode — see the note above.
 *
 *   Turnstile
 *     Its only English string is a build-time warning that appears when
 *     PUBLIC_TURNSTILE_SITE_KEY is unset. It is addressed to whoever is
 *     deploying the site, and on a correctly configured production build it
 *     never renders at all.
 */
const EXCLUDED = /ManageBar|WhatsAppManage|ContactSync|applications\.astro|Turnstile\.astro/i;

async function astroFiles(dir, out = []) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) await astroFiles(full, out);
    else if (item.name.endsWith('.astro')) out.push(full);
  }
  return out;
}

/** Everything after the frontmatter fence — the markup, not the script. */
function markupOf(source) {
  const parts = source.split(/^---$/m);
  return parts.length >= 3 ? parts.slice(2).join('---') : source;
}

const findings = [];

for (const file of await astroFiles(SRC)) {
  if (EXCLUDED.test(file)) continue;

  const markup = markupOf(await readFile(file, 'utf8'));

  // Strip comments and every expression, so {t('…')} and its neighbours cannot
  // contribute text. What is left is literal markup text.
  const stripped = markup
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, ' ')
    .replace(/<style>[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ');

  for (const match of stripped.matchAll(/>\s*([A-Z][a-z]+(?:\s+[A-Za-z][a-z']+){2,}[^<]*)</g)) {
    const text = match[1].replace(/\s+/g, ' ').trim();
    if (text.length < 12) continue;
    findings.push({ file: relative(ROOT, file).split(sep).join('/'), text });
  }
}

for (const { file, text } of findings) {
  console.error(`  ${file}\n    ${text.slice(0, 90)}${text.length > 90 ? '…' : ''}`);
}

if (findings.length) {
  console.error(`\nleftover English: ${findings.length} string(s) still hardcoded in markup.`);
  process.exit(1);
}
console.log('leftover English: none — all markup text goes through the catalogue.');
