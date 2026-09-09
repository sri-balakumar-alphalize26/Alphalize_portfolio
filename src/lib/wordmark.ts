import a0 from '@/assets/brand/letters/0-a.png';
import l1 from '@/assets/brand/letters/1-l.png';
import p2 from '@/assets/brand/letters/2-p.png';
import h3 from '@/assets/brand/letters/3-h.png';
import a4 from '@/assets/brand/letters/4-a.png';
import l5 from '@/assets/brand/letters/5-l.png';
import i6 from '@/assets/brand/letters/6-i.png';
import z7 from '@/assets/brand/letters/7-z.png';
import e8 from '@/assets/brand/letters/8-e.png';

/**
 * The "alphalize" wordmark, cut into its nine glyphs.
 *
 * Geometry from the original 908x208 artwork and kept exact, so the pieces
 * reassemble into the real wordmark rather than an approximation. Two
 * components lay them out — <Logo> in the header and the ModulesIntro
 * collapse-and-burst on the homepage — which is why the table lives here
 * rather than in either of them.
 *
 * `left` and `w` are in design units. Divide by WORDMARK_W for a percentage
 * and the whole strip scales to any width.
 */
export const WORDMARK_W = 908;
export const WORDMARK_H = 208;

export const wordmarkLetters = [
  { src: a0, glyph: 'a', left: 0, w: 127 },
  { src: l1, glyph: 'l', left: 127, w: 52 },
  { src: p2, glyph: 'p', left: 184, w: 129 },
  { src: h3, glyph: 'h', left: 313, w: 125 },
  { src: a4, glyph: 'a', left: 438, w: 122 },
  { src: l5, glyph: 'l', left: 562, w: 55 },
  { src: i6, glyph: 'i', left: 617, w: 57 },
  { src: z7, glyph: 'z', left: 674, w: 108 },
  { src: e8, glyph: 'e', left: 782, w: 126 },
];
