/**
 * The favicon set. Ported from the 369 site's generate-icons.mjs.
 *
 * Before this there was one icon: public/favicon.png at 40x40. That is below
 * the size every modern surface asks for — a browser tab wants 32 and a
 * bookmark 128, iOS wants a 180 apple-touch-icon and composites transparency
 * onto BLACK if it does not get one, and Android wants a maskable 512 it can
 * crop to whatever shape the launcher uses. All three were falling back to a
 * 40px upscale, or to nothing.
 *
 * Source is the mark at the left of src/assets/brand/logo.png. The full logo is
 * 864x240 — mark plus wordmark — and a wordmark squeezed into a 32px square is
 * an illegible smudge, so only the mark is taken. The crop below is measured,
 * not guessed: the ink in logo.png runs from column 9 to column 855, and the
 * one gap wider than 10px sits at 230-244, which is the space between the mark
 * and the "alphalize" that follows it.
 *
 * One-off. Not wired into `build` — the outputs are committed, because
 * Cloudflare builds from the checkout and serves public/ verbatim, so an icon
 * that only exists on the machine that ran this script is an icon that 404s in
 * production. Re-run it with `npm run icons` if the logo ever changes.
 */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGO = join(ROOT, 'src/assets/brand/logo.png');

/** The mark, without the wordmark. See the header for where these came from. */
const MARK = { left: 0, top: 0, width: 240, height: 240 };

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/**
 * `inset` is the share of the square left empty around the artwork.
 *
 * A maskable icon needs a fat one: Android crops to a circle, a squircle or a
 * rounded rect depending on the launcher, and anything outside the middle ~80%
 * can be shaved off. A tab icon needs only enough that the mark is not flush
 * to the edge at 16px.
 */
async function icon({ out, size, background, inset }) {
  const box = Math.round(size * (1 - inset * 2));

  const art = await sharp(LOGO)
    .extract(MARK)
    // lanczos3 on a 240px source: the mark is smooth gradients with no fine
    // detail, so it takes the 2x upscale to 512 without visible softness.
    .resize(box, box, { fit: 'contain', background: TRANSPARENT, kernel: 'lanczos3' })
    .toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: art, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(join(ROOT, out));

  console.log(`  ${out.padEnd(32)} ${size}x${size}`);
}

await mkdir(join(ROOT, 'public/icons'), { recursive: true });

// Transparent, so the tab icon sits on whatever the browser's chrome is.
await icon({ out: 'public/favicon.png', size: 512, background: TRANSPARENT, inset: 0.06 });
// Solid white, because iOS composites transparency onto black and the mark is
// dark blue — on black it disappears.
await icon({ out: 'public/apple-touch-icon.png', size: 180, background: WHITE, inset: 0.1 });
// Fat inset, because Android crops this one to the launcher's shape.
await icon({ out: 'public/icons/maskable-512.png', size: 512, background: WHITE, inset: 0.2 });

console.log('\nicons: 3 file(s) written to public/.');
