/**
 * The nine locales, ported from the 369 site's i18n/routing.ts so the two
 * sites offer the same set in the same order.
 *
 * ORDER IS LOAD-BEARING. The picker groups by region positionally — a group
 * breaks when the region label changes — so same-region entries have to stay
 * adjacent. India's three languages (hi, ta, ml) are contiguous on purpose;
 * split them and the picker prints "India" three times with three identical
 * flags. Reordering this array is a UI change.
 */
export const locales = ['en', 'ar', 'bn', 'zh', 'fr', 'de', 'hi', 'ta', 'ml'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale = 'en' satisfies Locale;

export const isLocale = (value: unknown): value is Locale => locales.includes(value as Locale);

/**
 * Which locales actually have pages behind them.
 *
 * The picker lists all nine so the plan is visible, but only these render as
 * links — the rest are shown greyed with a "Soon" tag. Without this the menu
 * would be eight guaranteed 404s, which is worse than saying "not yet", and
 * would feed dead URLs to anything that crawls the page.
 *
 * This grows by one entry each time a locale's catalogue and content land. It
 * is the switch that turns the picker on, and the last line of each of those
 * commits.
 */
export const liveLocales: readonly Locale[] = [
  'en',
  'ar',
  'bn',
  'zh',
  'fr',
  'de',
  'hi',
  'ta',
  'ml',
];

export const isLive = (locale: Locale) => liveLocales.includes(locale);

type LocaleMeta = {
  /** Shown as the group heading in the picker. */
  region: string;
  /** The language's own name for itself, never an English exonym. */
  language: string;
  /** <link rel="alternate" hreflang> and the sitemap's xhtml:link lang. */
  hreflang: string;
  /** og:locale — language_TERRITORY, not a bare code. */
  ogLocale: string;
  /** Intl.DateTimeFormat / Intl.DisplayNames / zod's locale packs. */
  bcp47: string;
  dir: 'ltr' | 'rtl';
};

export const localeLabels: Record<Locale, LocaleMeta> = {
  en: { region: 'Global', language: 'English', hreflang: 'en', ogLocale: 'en_US', bcp47: 'en-GB', dir: 'ltr' }, // prettier-ignore
  ar: { region: 'Oman & UAE', language: 'العربية', hreflang: 'ar', ogLocale: 'ar_OM', bcp47: 'ar-OM', dir: 'rtl' }, // prettier-ignore
  bn: { region: 'Bangladesh', language: 'বাংলা', hreflang: 'bn', ogLocale: 'bn_BD', bcp47: 'bn-BD', dir: 'ltr' }, // prettier-ignore
  /**
   * hreflang is zh-Hans, not zh-CN: it names the SCRIPT, which is what a
   * reader in Singapore or Malaysia matches on. bcp47 stays zh-CN because that
   * is the tag Intl and zod's locale pack are keyed by. Both are needed.
   */
  zh: { region: 'China', language: '简体中文', hreflang: 'zh-Hans', ogLocale: 'zh_CN', bcp47: 'zh-CN', dir: 'ltr' }, // prettier-ignore
  fr: { region: 'France', language: 'Français', hreflang: 'fr', ogLocale: 'fr_FR', bcp47: 'fr-FR', dir: 'ltr' }, // prettier-ignore
  de: { region: 'Germany', language: 'Deutsch', hreflang: 'de', ogLocale: 'de_DE', bcp47: 'de-DE', dir: 'ltr' }, // prettier-ignore
  hi: { region: 'India', language: 'हिन्दी', hreflang: 'hi', ogLocale: 'hi_IN', bcp47: 'hi-IN', dir: 'ltr' }, // prettier-ignore
  ta: { region: 'India', language: 'தமிழ்', hreflang: 'ta', ogLocale: 'ta_IN', bcp47: 'ta-IN', dir: 'ltr' }, // prettier-ignore
  ml: { region: 'India', language: 'മലയാളം', hreflang: 'ml', ogLocale: 'ml_IN', bcp47: 'ml-IN', dir: 'ltr' }, // prettier-ignore
};

export const isRtl = (locale: Locale) => localeLabels[locale].dir === 'rtl';

/**
 * The locales grouped by region label, in `locales` order.
 *
 * India has three languages, so its region is printed once as a heading with
 * the flag beside it and the languages sit underneath. The flat alternative put
 * "India" on three consecutive rows, each with an identical flag, which reads
 * as a bug rather than as a choice.
 */
export function localeRegions(): { region: string; flag: Locale; items: Locale[] }[] {
  const groups: { region: string; flag: Locale; items: Locale[] }[] = [];

  for (const locale of locales) {
    const { region } = localeLabels[locale];
    const last = groups.at(-1);
    if (last?.region === region) last.items.push(locale);
    else groups.push({ region, flag: locale, items: [locale] });
  }

  return groups;
}
