import { defaultLocale, isLocale, liveLocales, type Locale } from './locales';

/**
 * URL path helpers. Everything that reads or builds a path goes through here,
 * so there is one answer to what a "path" is — there used to be four, and two
 * of them were wrong.
 */

/**
 * The path a page is actually served at, from the pathname it sees.
 *
 * `build.format: 'file'` emits `about.html` rather than `about/index.html`, so
 * a prerendered page's own `Astro.url.pathname` is `/about.html` while every
 * href on the site is `/about`. Comparing the two unnormalised never matches.
 * Server-rendered routes already get the clean path, where this is a no-op.
 *
 * Before this existed, Header and Seo each carried their own version and were
 * correct; LegalLayout and SummarizeWithAi did not and were not. The legal
 * sidebar therefore had no active state on any of its three pages, and every
 * "Summarize with AI" prompt handed the assistant a `.html` URL that 301s.
 */
export function cleanPathname(pathname: string): string {
  const path = pathname
    .replace(/\/index\.html$/, '/')
    .replace(/\.html$/, '')
    .replace(/\/index$/, '/');

  // Trailing slashes go, except on the root itself — `trailingSlash: 'never'`.
  return path.length > 1 ? path.replace(/\/$/, '') : '/';
}

/**
 * Split a pathname into its locale and the locale-free path underneath.
 *
 *   '/fr/services/erp.html' -> { locale: 'fr', path: '/services/erp' }
 *   '/api/contact'          -> { locale: 'en', path: '/api/contact' }
 *
 * A path with no locale segment reports the default one, so callers that run
 * on unprefixed routes — the 404 page, the API endpoints — still get an answer
 * rather than having to special-case themselves.
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const clean = cleanPathname(pathname);
  const [, first = '', ...rest] = clean.split('/');

  if (!isLocale(first)) return { locale: defaultLocale, path: clean };
  return { locale: first, path: rest.length ? `/${rest.join('/')}` : '/' };
}

/**
 * Prefix an internal path with a locale.
 *
 *   localeHref('fr', '/about') -> '/fr/about'
 *   localeHref('fr', '/')      -> '/fr'        (not '/fr/' — trailingSlash: 'never')
 *
 * Anything that is not an internal absolute path is returned untouched —
 * mailto:, tel:, https://, '#apply' — so this is safe to wrap around every
 * href without first checking what kind it is. A query or hash is preserved.
 *
 * NOT for /api/* or for files in public/. Those are locale-agnostic and must
 * stay unprefixed; passing them through here would break them.
 */
export function localeHref(locale: Locale, path: string): string {
  if (!path.startsWith('/')) return path;

  const [pathname = '/', ...tail] = path.split(/(?=[?#])/);
  return `/${locale}${pathname === '/' ? '' : pathname}${tail.join('')}`;
}

/**
 * The getStaticPaths every prerendered page under [locale] re-exports.
 *
 * Over `liveLocales`, not `locales`. A locale with no catalogue would build a
 * full tree of pages that are English word for word — 17 pages each, 136 in
 * total — and duplicate content at that scale is an active harm, not a neutral
 * placeholder. It also means one switch does everything: adding a locale to
 * liveLocales builds its routes AND turns its entry in the picker into a link,
 * so the two can never disagree.
 *
 * On-demand pages must NOT use this: Astro ignores getStaticPaths on a route
 * with `prerender = false` and warns about it. They validate the segment at
 * request time instead.
 */
export const localeStaticPaths = () => liveLocales.map((locale) => ({ params: { locale } }));
