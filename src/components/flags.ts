import type { Locale } from '@/i18n/locales';

/**
 * Inline SVG flags for the locale picker, ported from the 369 site's Flag.tsx.
 *
 * Deliberately not emoji flags (🇴🇲 etc.): Windows ships no flag glyphs, so
 * those render as bare letter pairs — "OM", "BD" — on the majority of the
 * visitors this site gets. These are simplified but recognisable, and render
 * identically everywhere.
 *
 * Same shape as social-marks.ts and ai-marks.ts: a record of markup strings
 * rendered with set:html by a thin wrapper component. Typing it as
 * Record<Locale, string> is what makes a tenth locale a compile error rather
 * than a silently missing flag.
 *
 * The viewBox is 24x16 for every entry so they all size from one class.
 */
export const flags: Record<Locale, string> = {
  /**
   * English is "Global", so it gets a globe rather than a flag — no single
   * country owns it, and picking one would be a statement. Drawn in
   * currentColor with no filled rectangle, so it reads as an icon sitting
   * beside the flags rather than as one more country among them.
   */
  en: `<g fill="none" stroke="currentColor" stroke-width="1.2">
      <circle cx="12" cy="8" r="6" />
      <ellipse cx="12" cy="8" rx="2.4" ry="6" />
      <path d="M6.1 8h11.8M7 4.8h10M7 11.2h10" />
    </g>`,

  /** Oman — white / red / green with the red hoist band. */
  ar: `<rect width="24" height="5.34" fill="#fff" />
    <rect y="5.34" width="24" height="5.33" fill="#db161b" />
    <rect y="10.67" width="24" height="5.33" fill="#0b7a3c" />
    <rect width="7" height="16" fill="#db161b" />`,

  /** Bangladesh — green field, offset red disc. */
  bn: `<rect width="24" height="16" fill="#006a4e" />
    <circle cx="10.5" cy="8" r="4.4" fill="#f42a41" />`,

  /** China — red field with the large star; the four small ones vanish at this size. */
  zh: `<rect width="24" height="16" fill="#de2910" />
    <path fill="#ffde00" d="M6 2.6l1.06 3.26h3.43l-2.78 2.02 1.06 3.26L6 9.12l-2.77 2.02L4.3 7.88 1.5 5.86h3.44z" />`,

  /** France — blue / white / red vertical. */
  fr: `<rect width="8" height="16" fill="#002395" />
    <rect x="8" width="8" height="16" fill="#fff" />
    <rect x="16" width="8" height="16" fill="#ed2939" />`,

  /** Germany — black / red / gold horizontal. */
  de: `<rect width="24" height="5.34" fill="#000" />
    <rect y="5.34" width="24" height="5.33" fill="#dd0000" />
    <rect y="10.67" width="24" height="5.33" fill="#ffce00" />`,

  /**
   * India — saffron / white / green with the Ashoka chakra. One flag for all
   * three Indian languages; the picker draws it once per region anyway, so the
   * duplication never reaches the screen.
   */
  hi: indiaFlag(),
  ta: indiaFlag(),
  ml: indiaFlag(),
};

function indiaFlag() {
  return `<rect width="24" height="5.34" fill="#ff9933" />
    <rect y="5.34" width="24" height="5.33" fill="#fff" />
    <rect y="10.67" width="24" height="5.33" fill="#138808" />
    <circle cx="12" cy="8" r="2.1" fill="none" stroke="#000080" stroke-width="0.7" />
    <circle cx="12" cy="8" r="0.5" fill="#000080" />`;
}

/** The globe is an icon, not a flag: no rounded rectangle, no hairline ring. */
export const isIconFlag = (locale: Locale) => locale === 'en';
