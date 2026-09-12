/**
 * The Open Graph share cards.
 *
 * Every one of the ~144 URLs shared a single og-default.png, so a link to a
 * service page, the careers page and the privacy policy all unfurled as the
 * same generic card. Seo.astro has accepted an `ogImagePath` since the SEO
 * commit; nothing ever passed one, because there was nothing to pass.
 *
 * ── Why satori and not sharp's own text rendering ──
 *
 * sharp WILL render <text> in an SVG, which is the trap: it resolves the font
 * family through the system's fontconfig, so the result depends on what is
 * installed on the machine that ran it. Measured on this box, `sans-serif`
 * resolves to Courier metrics. The escape hatch is closed too — sharp's
 * `fontfile` option silently ignores .woff and .woff2 (output was byte-for-byte
 * identical to passing a deliberately bogus family name), and @fontsource ships
 * no .ttf at all, nor does packages/astro-marker.
 *
 * satori lays out with Yoga and shapes with harfbuzz, both WASM, and with
 * embedFont on (the default) it emits every glyph as a <path>. The SVG handed
 * to sharp below therefore names no font, so librsvg never consults fontconfig
 * and the bytes are the same on Windows, on Linux and in CI. It also reads
 * .woff, which is the format @fontsource actually ships.
 *
 * The rule that falls out, and the reason this file is split the way it is:
 * text never goes into a hand-written SVG, geometry never goes into satori.
 *
 * ── Why English only ──
 *
 * One card per route, not per route per locale. Per-locale is ~135 PNGs and
 * 10-12MB of binary committed forever, rewritten whole on every design tweak,
 * and 63 of those files would be byte-identical because the seven service pages
 * have English-only titles in all nine locales anyway. Meanwhile og:title and
 * og:description in the <head> are ALREADY correct per locale — the image is
 * the decorative half of an unfurl, the text half is right.
 *
 * The renderer takes a flat descriptor, so adding a locale loop later is a
 * change to CARDS below and not to card().
 *
 * One-off, like generate-icons.mjs. Outputs are committed: Cloudflare builds
 * from the checkout and copies public/ verbatim, so a gitignored public/og/
 * would ship sixteen dead og:image URLs with nothing in the build log to say
 * so. Run with `npm run og`.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const W = 1200;
const H = 630;
const PAD_X = 96;
const PAD_Y = 72;
/** The text column. Everything wraps against this. */
const COL = W - PAD_X * 2;

const TITLE_MAX = 80;
const SUPPORT_MAX = 128;

// ─────────────────────────────────────────────────────────── sources

/**
 * Read from the source files rather than imported, so this script stays
 * dependency-free of the Astro build — the same trade scripts/check-i18n.mjs
 * makes. It cannot use Astro.locals.t or astro:content; it runs in bare node.
 */
const messages = JSON.parse(await readFile(join(ROOT, 'src/i18n/messages/en.json'), 'utf8'));

/**
 * Dotted-path getter that throws rather than returning undefined. A card with a
 * blank title is a card nobody notices is broken until it is on someone's
 * timeline.
 */
function key(path) {
  const value = path.split('.').reduce((node, k) => node?.[k], messages);
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`src/i18n/messages/en.json: "${path}" is missing or not a non-empty string`);
  }
  return value;
}

/**
 * Keep in step with stripMarks in src/components/marks.ts.
 *
 * Duplicated rather than imported: marks.ts is TypeScript with an exported
 * type, and importing it from .mjs would need a build step, which is precisely
 * what the other scripts/*.mjs avoid. check-i18n.mjs makes the same trade when
 * it scrapes liveLocales out of locales.ts.
 */
const MARK = /\[\[([\s\S]+?)\]\]/g;
const stripMarks = (text) => text.replace(MARK, '$1');

/** Frontmatter without a YAML dependency. These files are ours, and flat. */
async function frontmatter(file) {
  const source = await readFile(join(ROOT, file), 'utf8');
  const block = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) throw new Error(`${file}: no frontmatter block`);

  const out = {};
  for (const line of block[1].split(/\r?\n/)) {
    const match = line.match(/^(\w+):\s*(.+?)\s*$/);
    if (match) out[match[1]] = match[2].replace(/^["'](.*)["']$/, '$1');
  }
  return out;
}

/** Clip on a word boundary, so the ellipsis is ours and not a rasteriser's. */
function clip(text, max) {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.—-]$/, '')}…`;
}

// ─────────────────────────────────────────────────────────── the card list

const SERVICES = [
  'erp-solutions',
  'business-intelligence',
  'custom-web-development',
  'mobile-app-development',
  'integration-and-migration-services',
  'digital-marketing',
  'training-and-internship-program',
];

const LEGAL = ['privacy-policy', 'terms-conditions', 'disclaimer'];

/**
 * The eyebrow is the section, the title is the page's H1, the support line is
 * the meta description.
 *
 * The H1 and not metaTitle: metaTitle would make careers.png read "Careers"
 * over "Careers" and contact.png "Contact" over "Contact", which is a dead
 * card. The <head>'s og:title still uses metaTitle, unchanged.
 */
const CARDS = [
  {
    out: 'og-default.png',
    eyebrow: key('welcomeIntro.eyebrow'),
    title: key('site.tagline'),
    support: 'ERP · Business Intelligence · Custom Software · Kollam, Kerala',
  },
  {
    out: 'og/about.png',
    eyebrow: key('aboutPage.eyebrow'),
    title: stripMarks(key('aboutPage.title')),
    support: key('aboutPage.metaDescription'),
  },
  {
    out: 'og/ceo.png',
    eyebrow: key('nav.leadership'),
    // ceo.name is a TS constant, not a catalogue key — a person's name is
    // written the same way in every language, so it is not translated.
    title: `Shan Sahib — ${key('ceoPage.role')}`,
    support: key('ceoPage.intro1'),
  },
  {
    out: 'og/careers.png',
    eyebrow: key('careersPage.eyebrow'),
    title: stripMarks(key('careersPage.title')),
    support: key('careersPage.metaDescription'),
  },
  {
    out: 'og/contact.png',
    eyebrow: key('contactPage.eyebrow'),
    title: stripMarks(key('contactPage.title')),
    support: key('contactPage.metaDescription'),
  },
  {
    out: 'og/services.png',
    eyebrow: key('servicesPage.eyebrow'),
    title: stripMarks(key('servicesPage.title')),
    support: key('servicesPage.metaDescription'),
  },
];

for (const slug of SERVICES) {
  const data = await frontmatter(`src/content/services/en/${slug}.md`);
  if (!data.title || !data.summary) {
    throw new Error(`src/content/services/en/${slug}.md: needs both title and summary`);
  }
  CARDS.push({
    out: `og/services/${slug}.png`,
    eyebrow: key('nav.services'),
    title: stripMarks(data.title),
    support: data.seoDescription ?? data.summary,
  });
}

for (const slug of LEGAL) {
  const data = await frontmatter(`src/content/legal/en/${slug}.md`);
  if (!data.title || !data.description) {
    throw new Error(`src/content/legal/en/${slug}.md: needs both title and description`);
  }
  CARDS.push({
    out: `og/legal/${slug}.png`,
    eyebrow: key('common.legal'),
    title: stripMarks(data.title),
    support: data.description,
  });
}

/**
 * Validate the whole list before a single pixel is written, so a missing key
 * fails loudly rather than leaving half the set stale and half regenerated.
 */
for (const card of CARDS) {
  if (card.title.length > TITLE_MAX) {
    throw new Error(
      `${card.out}: title is ${card.title.length} chars, over the ${TITLE_MAX} that fits in ` +
        `three lines. Shorten it, or add a size step to titleSize().\n  ${card.title}`
    );
  }
  if (/\[\[|\]\]/.test(card.title) || /\[\[|\]\]/.test(card.support)) {
    throw new Error(`${card.out}: marker brackets survived stripMarks — check marks.ts parity`);
  }
}

// ─────────────────────────────────────────────────────────── rendering

/**
 * satori reads ttf, otf and woff. It cannot read woff2 — its only inflater is
 * fflate, and woff2 is Brotli. @fontsource ships both; take the .woff. There is
 * no .ttf anywhere under node_modules/@fontsource, so this is the only format
 * available without vendoring a font binary into the repo.
 */
const font = async (weight) => ({
  name: 'Inter',
  weight,
  style: 'normal',
  data: await readFile(
    join(ROOT, `node_modules/@fontsource/inter/files/inter-latin-${weight}-normal.woff`)
  ),
});
// 500 is the footer line; without it satori substitutes the nearest weight.
const fonts = await Promise.all([font(400), font(500), font(600), font(700)]);

/**
 * Geometry only — never text. librsvg draws <rect> and gradients identically
 * everywhere; what it does with <text> depends on the machine's fonts.
 *
 * Colours sampled from the og-default.png this replaces, so the set stays
 * recognisably the same card. #062f56 is --color-brand-900 in global.css.
 */
const grid = [
  ...Array.from(
    { length: 19 },
    (_, i) => `<rect x="${(i + 1) * 60}" y="0" width="1" height="${H}"/>`
  ),
  ...Array.from(
    { length: 10 },
    (_, i) => `<rect x="0" y="${(i + 1) * 60}" width="${W}" height="1"/>`
  ),
].join('');

const background = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1a5592"/>
        <stop offset="0.52" stop-color="#062f56"/>
        <stop offset="1" stop-color="#025889"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.88" cy="0.92" r="0.45">
        <stop offset="0" stop-color="#0074ac" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#0074ac" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <g fill="#ffffff" fill-opacity="0.04">${grid}</g>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
  </svg>`
);

/**
 * Step the title down by length so it stays inside three lines. Yoga does the
 * wrapping; this only picks a scale it can wrap within. Over TITLE_MAX the list
 * validation above has already thrown — a clipped H1 is a bug you do not see
 * until someone shares the page.
 */
const titleSize = (n) => (n <= 30 ? 92 : n <= 56 ? 76 : 62);

const box = (children, style) => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});

async function card({ out, eyebrow, title, support }) {
  const svg = await satori(
    box(
      [
        box([eyebrow.toUpperCase()], {
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 3.9,
          color: '#93cfff',
        }),
        box(
          [
            box([title], {
              fontSize: titleSize(title.length),
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.12,
              maxWidth: COL,
            }),
            box([clip(support, SUPPORT_MAX)], {
              fontSize: 28,
              fontWeight: 400,
              color: '#bfe2ff',
              lineHeight: 1.4,
              marginTop: 28,
              maxWidth: COL,
            }),
          ],
          // Auto margin, so a short title floats the block low like the card
          // this replaces and a long one grows upward into the empty middle.
          { flexDirection: 'column', marginTop: 'auto' }
        ),
        box(
          [
            box([], {
              width: COL,
              height: 1,
              backgroundColor: '#ffffff',
              opacity: 0.12,
              marginBottom: 28,
            }),
            box(
              [
                box(['alphalize.com'], { fontSize: 24, fontWeight: 500, color: '#dbeefe' }),
                box(['Kollam, Kerala'], { fontSize: 24, fontWeight: 500, color: '#93cfff' }),
              ],
              { width: COL, justifyContent: 'space-between' }
            ),
          ],
          { flexDirection: 'column', marginTop: 40 }
        ),
      ],
      {
        width: W,
        height: H,
        flexDirection: 'column',
        padding: `${PAD_Y}px ${PAD_X}px`,
        fontFamily: 'Inter',
      }
    ),
    { width: W, height: H, fonts }
  );

  const png = await sharp(background)
    .composite([{ input: Buffer.from(svg) }])
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();

  const meta = await sharp(png).metadata();
  if (meta.width !== W || meta.height !== H) {
    throw new Error(`${out}: got ${meta.width}x${meta.height}, expected ${W}x${H}`);
  }

  const file = join(ROOT, 'public', out);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, png);

  console.log(`  ${out.padEnd(44)} ${W}x${H}  ${(png.length / 1024).toFixed(0)}KB`);
}

for (const descriptor of CARDS) await card(descriptor);

console.log(`\nog: ${CARDS.length} card(s) written to public/.`);
