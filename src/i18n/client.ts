import type enMessages from './messages/en.json';

type ClientKey = Extract<keyof (typeof enMessages)['client'], string>;

/**
 * Translations for code that runs in the browser.
 *
 * A client script has no Astro context and no way to know which of nine
 * catalogues to use without shipping all nine. So the layout inlines just the
 * `client` namespace — about a dozen strings, under 500 bytes — as a JSON
 * island, and this reads it. No fetch, no flash, nothing to configure.
 */
let cache: Record<string, string> | null = null;

function bag(): Record<string, string> {
  if (cache) return cache;
  const el = document.getElementById('i18n-client');
  cache = el ? (JSON.parse(el.textContent || '{}') as Record<string, string>) : {};
  return cache;
}

/** Browser-side t(). Keys are the `client` namespace, without that prefix. */
export function ct(key: ClientKey, vars?: Record<string, string | number>): string {
  const raw = bag()[key] ?? key;
  return vars
    ? raw.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole))
    : raw;
}

/**
 * The current locale, for Intl.* in the browser.
 *
 * Read off <html lang> rather than stored, because ClientRouter's
 * swapRootAttributes copies every attribute off the incoming <html> on each
 * view transition — so it always describes the page you are actually looking
 * at, with nothing to keep in step.
 */
export const clientLocale = () => document.documentElement.lang || 'en';

// A view transition brings in a new island, possibly for a different locale.
document.addEventListener('astro:before-swap', () => {
  cache = null;
});
