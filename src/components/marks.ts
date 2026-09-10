/** Stroke shapes offered by @alphalize/astro-marker's <Marker>. */
export type MarkerType = 'highlight' | 'underline' | 'strike' | 'circle' | 'squiggle' | 'box';

/**
 * Phrases to wrap in a hand-drawn stroke are marked inside the string itself,
 * with [[double brackets]]:
 *
 *   'A [[partner]], not just a vendor'
 *
 * This replaced a `highlight="…"` prop that MarkedTitle matched against the
 * title with indexOf(). That worked while one person wrote both strings in one
 * language. It does not survive translation: nothing tells a translator the
 * phrase has to reappear word-for-word inside the title, German compounds it
 * away, Arabic prefixes it with a clitic — and when indexOf returns -1 the
 * stroke just disappears, with no error and no warning. Chinese has no word
 * boundary to name a phrase on at all.
 *
 * Putting the mark inside the message puts the decision next to the text, keeps
 * it visible in the source, lets a language opt out by simply not typing the
 * brackets, and cannot half-apply. Marker type and colour stay props: those are
 * art direction, not copy.
 */
const MARK = /\[\[([\s\S]+?)\]\]/g;

/**
 * Split on the marked phrases. Odd indices are marked, even indices are plain,
 * so the caller can map straight over the result:
 *
 *   splitMarks('A [[partner]], not') -> ['A ', 'partner', ', not']
 *
 * An unmarked string yields a single plain segment, which renders as itself.
 */
export function splitMarks(text: string): string[] {
  return text.split(MARK);
}

/**
 * The same string with the brackets removed and the phrases left in place.
 *
 * For every context that needs plain text rather than markup: <title>, meta
 * descriptions, JSON-LD names, breadcrumbs, link labels, image alt text.
 */
export function stripMarks(text: string): string {
  return text.replace(MARK, '$1');
}
