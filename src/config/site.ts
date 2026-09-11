/**
 * Single source of truth for company details.
 * Consumed by Header, Footer, contact/careers pages and the JSON-LD blocks.
 */

export const site = {
  name: 'Alphalize',
  legalName: 'Alphalize',
  url: 'https://www.alphalize.com',
  /**
   * The sibling brand — connected devices and robotics, the same operation
   * behind both. Read by the header brand switcher, SolutionCards and WhatWeDo.
   */
  ai369Url: 'https://369ai.biz/',
  tagline: 'Unlocking Growth Potential with ERP Solutions',
  description:
    'Alphalize builds customised ERP solutions, business intelligence dashboards and custom software that take your business to the next level of automation.',
  founded: '2023',
} as const;

export const contact = {
  phone: '+91 70252 05503',
  phoneHref: 'tel:+917025205503',
  /** General enquiries — shown publicly and the contact-form recipient. */
  email: 'hr@alphalize.com',
  // Split so the address is assembled at build time rather than sitting in the markup.
  emailUser: 'hr',
  emailDomain: 'alphalize.com',
  /** Applications — the careers-form recipient. */
  careersEmail: 'hr@alphalize.com',
} as const;

export type Office = {
  id: string;
  label: string;
  street: string;
  locality: string;
  region: string;
  postalCode: string;
  country: string;
  countryCode: string;
  /** Decimal degrees. Drives the footer map pin; nothing else reads them. */
  lon: number;
  lat: number;
};

export const offices: Office[] = [
  /**
   * Kept in step with the 369 site, which is the same operation — same phone
   * number, same hr@ address.
   *
   * `id` is looked up by careers.astro for the JobPosting jobLocation, and the
   * split fields feed the PostalAddress in the Organization JSON-LD, so neither
   * the id nor the shape is free to change.
   *
   * If a map link is ever added, note that Google needs the full
   * "Vadayattukotta Road, Kollam, Kerala 691001, India" — "Chinnakada" and
   * "Rd" both fail to geocode, so do not tidy a query back to the display
   * wording below.
   */
  {
    id: 'kollam',
    label: 'India',
    street: 'Vadayattukotta Road, Chinnakada',
    locality: 'Kollam',
    region: 'Kerala',
    postalCode: '691001',
    country: 'India',
    countryCode: 'IN',
    lon: 76.6141,
    lat: 8.8932,
  },
];

import type { socialMarks } from '@/components/social-marks';

/**
 * Where to find us. The mark and its brand colour live in social-marks.ts;
 * this is only the list of accounts, in the order they appear in the footer.
 *
 * X/Twitter was dropped: the link was a placeholder pointing at an account
 * that does not exist, and an icon that goes nowhere is worse than no icon.
 * These are the same four accounts the 369 site links.
 */
export const socials: { name: string; href: string; mark: keyof typeof socialMarks }[] = [
  // The company page, on www rather than in.linkedin.com — the `in.` host is
  // LinkedIn's India edition and redirects everyone else.
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/alphalize', mark: 'linkedin' },
  { name: 'Facebook', href: 'https://www.facebook.com/share/1EJ7TFDP6L/', mark: 'facebook' },
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/alphalize_technologies',
    mark: 'instagram',
  },
  { name: 'YouTube', href: 'https://www.youtube.com/@shanontech4849', mark: 'youtube' },
];

import type { MessageKey } from '@/i18n/messages';

export type NavItem = { labelKey: MessageKey; href: string; hasChildren?: boolean };

/**
 * Primary navigation. Services children are generated from the content
 * collection.
 *
 * Structure only — the label is a catalogue key, looked up per locale by
 * whoever renders it. `href` stays locale-free here and is prefixed at render
 * time by localeHref, so this list does not have to know about locales at all.
 */
export const nav: NavItem[] = [
  { labelKey: 'nav.home', href: '/' },
  { labelKey: 'nav.about', href: '/about' },
  { labelKey: 'nav.leadership', href: '/ceo' },
  { labelKey: 'nav.services', href: '/services', hasChildren: true },
  { labelKey: 'nav.careers', href: '/careers' },
  { labelKey: 'nav.contact', href: '/contact' },
];

export const legalNav = [
  { labelKey: 'legalNav.privacy', href: '/legal/privacy-policy' },
  { labelKey: 'legalNav.terms', href: '/legal/terms-conditions' },
  { labelKey: 'legalNav.disclaimer', href: '/legal/disclaimer' },
] as const satisfies readonly { labelKey: MessageKey; href: string }[];
