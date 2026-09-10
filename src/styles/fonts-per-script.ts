/**
 * Per-script webfonts, loaded only for the locale that needs them.
 *
 * WHY THIS IS NOT ONE STYLESHEET. The locale picker renders every language in
 * its own script — "العربية", "বাংলা", "தமிழ்", "മലയാളം", "简体中文" — on every
 * page, in every locale. `@font-face` is inert until a rule matches, but those
 * labels ARE matching text: a single sheet declaring all six faces would make
 * the French page download the Arabic, Bengali, Tamil, Malayalam and Devanagari
 * files to draw six words in a dropdown. Splitting per script and linking one
 * of them means a French visitor downloads Latin faces and nothing else, and
 * the picker's other labels render in whatever the OS provides — which is free,
 * correct, and invisible.
 *
 * The CSS comes straight from @fontsource rather than being vendored. Vite
 * resolves the relative url() inside each sheet, hashes the woff2 and emits it
 * to /_astro/, where the adapter's generated _headers already applies
 * immutable caching. Nothing is fetched from a third-party origin at runtime —
 * this site has always shipped zero external font requests and still does.
 *
 * WEIGHTS. 400 for body, 600 for headings, 700 for the handwriting face. Some
 * handwriting substitutes only exist at one weight; `font-synthesis: none` in
 * global.css stops the browser faking the others, which on a script with
 * connected forms looks broken rather than bold.
 */
import type { Locale } from '@/i18n/locales';

/* Latin-ext, for French and German. Inter and Caveat currently ship the `latin`
   subset only, which has no œ, ß, ü or guillemets — so fr and de were already
   falling back mid-word before any of this. */
import interLatinExt400 from '@fontsource/inter/latin-ext-400.css?url';
import interLatinExt600 from '@fontsource/inter/latin-ext-600.css?url';
import caveatLatinExt700 from '@fontsource/caveat/latin-ext-700.css?url';

import arabic400 from '@fontsource/noto-sans-arabic/arabic-400.css?url';
import arabic600 from '@fontsource/noto-sans-arabic/arabic-600.css?url';
import lemonada600 from '@fontsource/lemonada/arabic-600.css?url';

import bengali400 from '@fontsource/noto-sans-bengali/bengali-400.css?url';
import bengali600 from '@fontsource/noto-sans-bengali/bengali-600.css?url';
import atma600 from '@fontsource/atma/bengali-600.css?url';

import devanagari400 from '@fontsource/noto-sans-devanagari/devanagari-400.css?url';
import devanagari600 from '@fontsource/noto-sans-devanagari/devanagari-600.css?url';
import kalam700 from '@fontsource/kalam/devanagari-700.css?url';

import tamil400 from '@fontsource/noto-sans-tamil/tamil-400.css?url';
import tamil600 from '@fontsource/noto-sans-tamil/tamil-600.css?url';
import kavivanar400 from '@fontsource/kavivanar/tamil-400.css?url';

import malayalam400 from '@fontsource/noto-sans-malayalam/malayalam-400.css?url';
import malayalam600 from '@fontsource/noto-sans-malayalam/malayalam-600.css?url';
import chilanka400 from '@fontsource/chilanka/malayalam-400.css?url';

/**
 * Simplified Chinese, via fontsource's unicode-range slices.
 *
 * A full Noto Sans SC weight is ~1.5 MB, which is not shippable. The sheet
 * declares ~100 `@font-face` blocks, each with its own `unicode-range`, so the
 * browser fetches only the slices the page's characters actually fall in —
 * typically four to eight, around 110-220 KB.
 *
 * Corpus subsetting with pyftsubset would beat that (one ~80 KB file, since all
 * Chinese copy on a static site is a closed character set), but it needs a
 * Python step in the build. This gets the same correctness with no new tooling,
 * and stays correct for the runtime-dynamic text the KV-backed contact details
 * and server-rendered validation messages produce.
 *
 * No handwriting substitute: CJK calligraphic faces are the same 1.5 MB problem
 * with no system fallback to degrade to, and a running-script marketing heading
 * reads as ceremonial in Simplified Chinese — the wrong register for an ERP
 * vendor. `zh` uses Noto Sans SC 700 for headings and lets the hand-drawn
 * marker strokes carry the personality instead; they are SVG and survive any
 * script unchanged.
 */
import han400 from '@fontsource/noto-sans-sc/chinese-simplified-400.css?url';
import han700 from '@fontsource/noto-sans-sc/chinese-simplified-700.css?url';

/** Stylesheets to link for a locale, beyond the Latin faces every page loads. */
export const scriptFonts: Partial<Record<Locale, readonly string[]>> = {
  /* Latin-ext only — the script faces below are for non-Latin locales. */
  fr: [interLatinExt400, interLatinExt600, caveatLatinExt700],
  de: [interLatinExt400, interLatinExt600, caveatLatinExt700],

  ar: [arabic400, arabic600, lemonada600],
  bn: [bengali400, bengali600, atma600],
  zh: [han400, han700],
  hi: [devanagari400, devanagari600, kalam700],
  ta: [tamil400, tamil600, kavivanar400],
  ml: [malayalam400, malayalam600, chilanka400],
};
