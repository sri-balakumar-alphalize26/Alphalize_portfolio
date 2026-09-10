import { defaultLocale, type Locale } from './locales';
import type enMessages from './messages/en.json';

/**
 * en.json is the schema. A key that is not in it does not exist, and every
 * other locale is checked against it by scripts/check-i18n.mjs.
 */
export type Messages = typeof enMessages;

type Leaf = string | number | boolean;

/** Descend into objects; stop at leaves and at arrays, whose keys are indices. */
type IsLeaf<T> = T extends Leaf | readonly unknown[] ? true : false;

type Path<T> = {
  [K in Extract<keyof T, string>]: IsLeaf<T[K]> extends true ? K : K | `${K}.${Path<T[K]>}`;
}[Extract<keyof T, string>];

type At<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? At<T[Head], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type MessageKey = Path<Messages>;

/**
 * The return type follows the key. A leaf gives a string, `whyCards.items`
 * gives the array of objects, `nav` gives the whole namespace — so one function
 * covers all three shapes the strings are in today (frontmatter const arrays,
 * inline text nodes, and id-keyed data) without needing a second API.
 */
export type Translate = <K extends MessageKey>(
  key: K,
  vars?: Record<string, string | number>
) => At<Messages, K>;

/**
 * Lazy per-locale chunks rather than nine eager imports.
 *
 * The two on-demand pages pull this into the Worker bundle. Eager imports would
 * parse every catalogue on each cold start to serve one locale. A glob leaves
 * them as nine separate chunks and loads exactly one. Vite still bundles all
 * nine into dist/server, which is what makes the dynamic import safe on
 * workerd — nothing is fetched over the network at runtime.
 */
const loaders = import.meta.glob<{ default: Messages }>('./messages/*.json');
const cache = new Map<Locale, Messages>();

async function load(locale: Locale): Promise<Messages> {
  const hit = cache.get(locale);
  if (hit) return hit;

  const loader = loaders[`./messages/${locale}.json`];
  if (!loader) throw new Error(`[i18n] no catalogue for "${locale}"`);

  const { default: messages } = await loader();
  cache.set(locale, messages);
  return messages;
}

const read = (bag: unknown, key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node == null ? undefined : (node as Record<string, unknown>)[part]),
      bag
    );

/** `Uploading {pct}%` + { pct: 40 } -> `Uploading 40%`. */
const interpolate = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole));

export async function getTranslations(locale: Locale): Promise<Translate> {
  const [messages, fallback] = await Promise.all([
    load(locale),
    locale === defaultLocale ? null : load(defaultLocale),
  ]);

  return ((key, vars) => {
    let value = read(messages, key);

    if (value === undefined && fallback) {
      /* A locale mid-translation renders English rather than a raw dotted key,
         so a half-finished catalogue is never a broken page. check-i18n.mjs is
         what fails on this — a translator working in ta.json must not be able
         to red-build the site for everyone else. */
      value = read(fallback, key);
      if (import.meta.env.DEV) {
        console.warn(`[i18n] ${locale} is missing "${key}" — falling back to ${defaultLocale}`);
      }
    }

    if (value === undefined) {
      // Not in en either, so it is a typo rather than a missing translation.
      // Loud in dev; in production the key itself, which is ugly but visible
      // and never a blank page.
      if (import.meta.env.DEV) throw new Error(`[i18n] no such message key: "${key}"`);
      return key as never;
    }

    return (typeof value === 'string' && vars ? interpolate(value, vars) : value) as never;
  }) as Translate;
}

/**
 * Split a string that carries one inline link, marked <0>like this</0>.
 *
 *   'See our <0>privacy policy</0>.' -> ['See our ', 'privacy policy', '.']
 *
 * Splitting such a sentence into three separate keys hands the translator
 * fragments they cannot reorder, and word order around a link is exactly what
 * changes between languages.
 */
export const parts = (text: string): [string, string, string] => {
  const match = text.match(/^([\s\S]*?)<0>([\s\S]*?)<\/0>([\s\S]*)$/);
  return match ? [match[1]!, match[2]!, match[3]!] : [text, '', ''];
};
