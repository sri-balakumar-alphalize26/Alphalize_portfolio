/**
 * URL path helpers.
 *
 * This lives under src/i18n/ because locale-aware helpers join it in the next
 * commit and they all have to agree on what a "path" is. Right now it holds
 * one function, and that function replaces four hand-rolled copies of the same
 * idea — two of which were wrong.
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
