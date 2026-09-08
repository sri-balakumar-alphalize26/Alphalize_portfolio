/**
 * Single source of truth for company details.
 * Consumed by Header, Footer, contact/careers pages and the JSON-LD blocks.
 */

export const site = {
  name: 'Alphalize',
  legalName: 'Alphalize',
  url: 'https://www.alphalize.com',
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
  },
];

import type { IconName } from '@/components/icons';

export const socials: { name: string; href: string; icon: IconName }[] = [
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/alphalize', icon: 'linkedin' },
  { name: 'Facebook', href: 'https://www.facebook.com/alphalize', icon: 'facebook' },
  { name: 'Instagram', href: 'https://www.instagram.com/alphalize', icon: 'instagram' },
  { name: 'X', href: 'https://x.com/alphalize', icon: 'x' },
];

export type NavItem = { label: string; href: string; hasChildren?: boolean };

/** Primary navigation. Services children are generated from the content collection. */
export const nav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services', hasChildren: true },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact' },
];

export const legalNav = [
  { label: 'Privacy Policy', href: '/legal/privacy-policy' },
  { label: 'Terms & Conditions', href: '/legal/terms-conditions' },
  { label: 'Disclaimer', href: '/legal/disclaimer' },
] as const;
