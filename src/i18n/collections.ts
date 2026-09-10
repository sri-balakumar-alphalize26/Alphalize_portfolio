import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLocale, type Locale } from './locales';

/**
 * Per-locale content, with an English fallback.
 *
 * Entries live under `src/content/<collection>/<locale>/<slug>.md`, so the
 * locale is part of the entry id. That was chosen over a `locale:` frontmatter
 * field because entry ids have to be unique anyway — meaning the path already
 * encodes the locale, and a frontmatter field would just duplicate it. A
 * duplicated fact drifts: rename the file and the field quietly lies, with no
 * build error.
 *
 * THE ENGLISH TREE IS THE INDEX. Every locale resolves every slug, translated
 * or not, because the header dropdown, the footer list and the 404 rail are all
 * built from the English set — a locale that simply omitted an untranslated
 * entry would leave the site linking to its own 404.
 */
type Localizable = 'services' | 'jobs' | 'legal';

export type Localized<C extends Localizable> = {
  /** The slug with the locale prefix removed — what the URL uses. */
  slug: string;
  entry: CollectionEntry<C>;
  /**
   * False when this is the English entry standing in for a missing
   * translation. Callers that render the body MUST put lang="en" on it —
   * see the note in services/[...slug].astro.
   */
  translated: boolean;
};

const stripLocale = (id: string, locale: string) => id.slice(locale.length + 1);

/**
 * Every entry in `collection` for `locale`, falling back to English per slug.
 *
 * Ordering follows the English set so the nav is stable across locales — a
 * translated entry cannot reorder itself by changing its `order`.
 */
export async function getLocalized<C extends Localizable>(
  collection: C,
  locale: Locale,
  filter?: (entry: CollectionEntry<C>) => boolean
): Promise<Localized<C>[]> {
  const all = await getCollection(collection);

  const pick = (loc: string) =>
    new Map(all.filter((e) => e.id.startsWith(`${loc}/`)).map((e) => [stripLocale(e.id, loc), e]));

  const english = pick(defaultLocale);
  const mine = locale === defaultLocale ? english : pick(locale);

  if (english.size === 0) {
    throw new Error(`[content] ${collection} has no ${defaultLocale}/ directory`);
  }

  return [...english.entries()]
    .map(([slug, fallback]) => {
      const localised = mine.get(slug);
      return { slug, entry: localised ?? fallback, translated: Boolean(localised) };
    })
    .filter(({ entry }) => (filter ? filter(entry) : true))
    .sort((a, b) => {
      const order = (x: Localized<C>) => (x.entry.data as { order?: number }).order ?? 0;
      return order(a) - order(b);
    });
}
