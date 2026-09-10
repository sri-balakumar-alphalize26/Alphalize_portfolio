/**
 * Catalogue parity check. Ported from the 369 site's check-locales.mjs.
 *
 * en.json is the schema. Every other locale is checked against it for:
 *   - missing keys        (renders English at runtime, so it is a warning
 *                          while a locale is being translated and an error
 *                          once it is declared live)
 *   - unknown keys        (a typo, or a key that was renamed in en and not
 *                          here — always an error, since nothing reads it)
 *   - shape mismatches    (a string where en has an array, an array of the
 *                          wrong length — these break .map() at build time)
 *   - [[marker]] parity   (warning only: a language may legitimately not mark
 *                          a phrase, but a silent loss of every stroke in one
 *                          locale is worth seeing)
 *   - stray interpolation ({pct} in en but not in the translation, which
 *                          would render a literal placeholder to a visitor)
 *
 * Run by `npm run check:i18n`, and by `npm run check` alongside astro check.
 */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', 'src', 'i18n', 'messages');
const BASE = 'en';

const read = async (locale) => JSON.parse(await readFile(join(DIR, `${locale}.json`), 'utf8'));

/** Flatten to dotted paths. Arrays stop the descent — their shape is compared whole. */
function flatten(node, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, path, out);
    else out.set(path, value);
  }
  return out;
}

const shapeOf = (value) =>
  Array.isArray(value) ? `array[${value.length}]` : value === null ? 'null' : typeof value;

const placeholders = (value) =>
  [...JSON.stringify(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const markCount = (value) => (JSON.stringify(value).match(/\[\[/g) ?? []).length;

const errors = [];
const warnings = [];

const liveSource = await readFile(join(HERE, '..', 'src', 'i18n', 'locales.ts'), 'utf8');
/* Which locales are declared live drives whether a missing key is fatal. Read
   from the source rather than imported, so this script stays dependency-free
   and runnable without a build step. */
const live = new Set(
  (liveSource.match(/liveLocales:\s*readonly Locale\[\]\s*=\s*\[([^\]]*)\]/)?.[1] ?? '')
    .split(',')
    .map((s) => s.trim().replace(/['"]/g, ''))
    .filter(Boolean)
);

const base = flatten(await read(BASE));
const files = (await readdir(DIR)).filter((f) => f.endsWith('.json'));

for (const file of files) {
  const locale = file.replace(/\.json$/, '');
  if (locale === BASE) continue;

  const target = flatten(await read(locale));
  const isLive = live.has(locale);
  const missing = [];

  for (const [key, baseValue] of base) {
    if (!target.has(key)) {
      missing.push(key);
      continue;
    }

    const value = target.get(key);

    if (shapeOf(value) !== shapeOf(baseValue)) {
      errors.push(`${locale}: "${key}" is ${shapeOf(value)}, en has ${shapeOf(baseValue)}`);
    }

    const [want, got] = [placeholders(baseValue), placeholders(value)];
    if (want.join() !== got.join()) {
      errors.push(
        `${locale}: "${key}" has placeholders {${got.join('} {')}}, en has {${want.join('} {')}}`
      );
    }

    if (markCount(baseValue) > 0 && markCount(value) === 0) {
      warnings.push(`${locale}: "${key}" drops the [[marker]] that en has`);
    }
  }

  for (const key of target.keys()) {
    if (!base.has(key)) errors.push(`${locale}: "${key}" is not a key in en.json`);
  }

  if (missing.length) {
    const detail = `${locale}: ${missing.length} missing key${missing.length === 1 ? '' : 's'} (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ', …' : ''})`;
    // Untranslated keys render English, which is fine while a locale is being
    // worked on and not fine once it is offered to visitors.
    (isLive ? errors : warnings).push(detail);
  }
}

for (const line of warnings) console.warn(`  warn  ${line}`);
for (const line of errors) console.error(`  error ${line}`);

const locales = files.length;
if (errors.length) {
  console.error(`\ni18n: ${errors.length} error(s) across ${locales} catalogue(s).`);
  process.exit(1);
}
console.log(
  `i18n: ${locales} catalogue(s), ${base.size} keys, ${warnings.length} warning(s), no errors.`
);
