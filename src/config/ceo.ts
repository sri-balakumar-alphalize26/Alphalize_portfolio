import portrait from '@/assets/ceo/portrait.jpg';
import trophyImg from '@/assets/ceo/award-trophy.jpg';
import handshakeImg from '@/assets/ceo/handshake.jpg';
import stageImg from '@/assets/ceo/stage.jpg';

/**
 * The Managing Director's page (/ceo) — structure only.
 *
 * Every sentence moved to the `ceoPage` namespace in the message catalogue.
 * What is left here is what a translator has no business editing: which image
 * goes in which slot, where the video lives, and the two brand strings below.
 *
 * Ported from the 369 content/ceo.ts, which profiles the same person — its own
 * file names his company as "Alphalize Technologies Private Limited". What did
 * not port is the framing: there he leads "the company behind 369AI, with
 * offices in India, the UAE, Oman and the United States". Here he leads this
 * company directly, from Kollam. The Gulf and US wording was taken off this
 * site on purpose and is not coming back through a new page.
 */
export const ceo = {
  /**
   * Not translated, and not in the catalogue. A person's name and a registered
   * company name are written the same way in every language — putting them in
   * front of a translator invites a transliteration nobody asked for.
   */
  name: 'Shan Sahib',
  company: 'Alphalize Technologies Private Limited',

  portrait,

  award: {
    /**
     * The two dealt cards, then the clip. `trophy` is the tall slot and
     * `handshake` the wide one, which sets the row height — its 1050x693 is
     * exactly the 350/231 the layout declares. `stage` is a 16:9 still from
     * the presentation, so it is the clip's poster rather than a third card.
     */
    trophy: trophyImg,
    handshake: handshakeImg,
    stage: stageImg,
    /** In public/ rather than src/assets: astro:assets does not process video. */
    video: '/videos/ceo-award.mp4',
  },

  talks: {
    channel: 'https://www.youtube.com/@shanontech4849',
  },
};

/** A YouTube id and its title. The note beside it is `ceoPage.talkNote`. */
export type Talk = { id: string; title: string };

/**
 * The Mind Management corporate-training series only.
 *
 * The channel's two "Motivational Speech" parts are credited on YouTube to
 * another speaker, so presenting them here as his would be wrong — a constraint
 * recorded in the 369 content/videos.ts, and one that travels with the data.
 *
 * Titles stay here rather than in the catalogue: they are the titles of real
 * published videos, and a translated title would not match what a viewer finds
 * on the channel.
 */
export const talks: Talk[] = [
  { id: '-hUlpwDzVNo', title: 'Mind Management — Part 7' },
  { id: 'REArQiiviuo', title: 'Mind Management — Part 4' },
  { id: 'RjaOCsnT5P4', title: 'Mind Management — Part 5' },
  { id: '10-iIL1DIpM', title: 'Mind Management — Part 6' },
];
