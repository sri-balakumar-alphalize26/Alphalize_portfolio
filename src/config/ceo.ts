import portrait from '@/assets/ceo/portrait.jpg';
import moment from '@/assets/ceo/moment.jpg';
import trophy from '@/assets/ceo/award-trophy.jpg';

/**
 * The Managing Director's page (/ceo).
 *
 * Ported from the 369 content/ceo.ts, which profiles the same person — its own
 * file names his company as "Alphalize Technologies Private Limited". What did
 * not port is the framing: there he leads "the company behind 369AI, with
 * offices in India, the UAE, Oman and the United States". Here he leads this
 * company directly, from Kollam. The Gulf and US wording was taken off this
 * site on purpose and is not coming back through a new page.
 *
 * The name and the registered company name are brand strings, written exactly
 * as the company registers them.
 */
export const ceo = {
  name: 'Shan Sahib',
  role: 'Managing Director',
  company: 'Alphalize Technologies Private Limited',
  portrait,
  portraitAlt: 'Shan Sahib, Managing Director of Alphalize Technologies',

  intro: [
    'Shan Sahib leads Alphalize Technologies from Kollam, Kerala. His focus is automation people can actually run: Odoo-based ERP built around how a shop, showroom or restaurant works day to day, the business intelligence that makes those numbers legible, and the custom software and IoT work that closes the gaps between them.',
    'Under his direction the company joined the Odoo Partnership Program and opened a new development office in 2025, and in February 2026 his work in robotics service was recognised at the Insight Kerala Business Awards.',
  ],

  award: {
    eyebrow: 'Award',
    title: 'Robotics Service Excellence Award',
    body: 'Presented to Shan Sahib at BizConnect 2026 as part of the Insight Kerala Business Awards 2026 by Business Insight magazine — recognition for dependable robotics deployments and the long-term support that keeps them running.',
    /**
     * Each tile carries its photo's real aspect ratio, so the frame matches the
     * picture and neither is cropped or letterboxed. `shine` is the sweep across
     * the trophy; the second photo is a room full of people and reads better
     * without it.
     */
    images: [
      {
        src: trophy,
        alt: 'The Robotics Service Excellence Award trophy',
        ratio: '800 / 1200',
        shine: true,
      },
      {
        src: moment,
        alt: 'Shan Sahib welcoming guests at a company opening',
        ratio: '1600 / 1029',
        shine: false,
      },
    ],
    videoTitle: 'The presentation',
    videoCaption: 'Receiving the award at BizConnect 2026.',
    /** In public/ rather than src/assets: astro:assets does not process video. */
    video: '/videos/ceo-award.mp4',
  },

  talks: {
    title: 'From the stage',
    body: 'Mind-management sessions for corporate teams, published on his channel, Shan on Tech.',
    channel: 'https://www.youtube.com/@shanontech4849',
  },

  cta: {
    title: 'Work with the team he leads',
    body: 'ERP implementation, business intelligence and custom software, delivered and supported from Kollam.',
  },
};

export type Talk = { id: string; title: string; note: string };

/**
 * The Mind Management corporate-training series only.
 *
 * The channel's two "Motivational Speech" parts are credited on YouTube to
 * another speaker, so presenting them here as his would be wrong — a constraint
 * recorded in the 369 content/videos.ts, and one that travels with the data.
 */
export const talks: Talk[] = [
  { id: '-hUlpwDzVNo', title: 'Mind Management — Part 7', note: 'Corporate training' },
  { id: 'REArQiiviuo', title: 'Mind Management — Part 4', note: 'Corporate training' },
  { id: 'RjaOCsnT5P4', title: 'Mind Management — Part 5', note: 'Corporate training' },
  { id: '10-iIL1DIpM', title: 'Mind Management — Part 6', note: 'Corporate training' },
];
