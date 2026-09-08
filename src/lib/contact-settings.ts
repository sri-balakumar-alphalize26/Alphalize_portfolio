import { contact } from '@/config/site';

/**
 * The public contact details, editable in manage mode.
 *
 * Two sources, same idea as the passcode in manage-auth.ts:
 *   src/config/site.ts   committed, the details as shipped
 *   KV `manage:contact`  written in manage mode, wins when it exists
 *
 * Only what a human types is stored. The machine-readable forms are derived on
 * read, so there is no second field to keep in sync and nothing to rot when
 * somebody edits the pretty number:
 *
 *   telHref   digits and a leading + only  — the dialer link
 *   waNumber  digits only                  — the format wa.me requires
 *
 * WhatsApp is NOT a stored field, deliberately. It was one on the 369 site and
 * was removed there, because the two were always the same line and keeping them
 * apart only created a way for them to disagree: edit the number, forget the
 * WhatsApp box, and every enquiry form quietly keeps sending to the old one.
 * If a genuinely separate WhatsApp line is ever needed, add the field back here
 * rather than asking editors to type the number twice.
 *
 * WHAT A SAVE DOES AND DOES NOT REACH
 *
 * Only /contact reads this store, because only /contact renders per request.
 * The header utility bar, the footer, the CtaBand call button and the
 * Organization JSON-LD are on every page, so they are built from the site.ts
 * seed at build time and keep the old value until a redeploy.
 *
 * That is the price of the rest of the site staying static. It is a real
 * inconsistency — a number changed here and nowhere else will disagree with the
 * header — so treat this as "change it here to go live now, then land the same
 * value in site.ts", not as a replacement for editing the source.
 */
interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface ContactEnv {
  MANAGE?: KVLike;
}

export type ContactSettings = {
  /** As shown to a visitor, spaces and all: '+91 70252 05503'. */
  phoneDisplay: string;
  email: string;
};

const KEY = 'manage:contact';

const SEED: ContactSettings = {
  phoneDisplay: contact.phone,
  email: `${contact.emailUser}@${contact.emailDomain}`,
};

/** `'+91 70252 05503'` → `'tel:+917025205503'`. */
export function telHref({ phoneDisplay }: ContactSettings): string {
  return `tel:+${phoneDisplay.replace(/\D/g, '')}`;
}

/** wa.me wants bare digits — no +, no spaces. */
export function waNumber({ phoneDisplay }: ContactSettings): string {
  return phoneDisplay.replace(/\D/g, '');
}

export function isValidPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 8;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalise(input: unknown): ContactSettings {
  const data = (input ?? {}) as Partial<ContactSettings>;
  const phoneDisplay = String(data.phoneDisplay ?? '').trim();
  const email = String(data.email ?? '').trim();
  // A blank field would render a dead tel:/mailto:, so fall back per field
  // rather than throwing the whole record away.
  return {
    phoneDisplay: phoneDisplay || SEED.phoneDisplay,
    email: email || SEED.email,
  };
}

/** The live details, or the shipped ones when KV is empty or unreadable. */
export async function readContact(env: ContactEnv): Promise<ContactSettings> {
  if (!env.MANAGE) return SEED;
  try {
    const raw = await env.MANAGE.get(KEY);
    return raw ? normalise(JSON.parse(raw)) : SEED;
  } catch (err) {
    console.warn('[contact] could not read the stored details — using the seed:', err);
    return SEED;
  }
}

export async function writeContact(env: ContactEnv, data: ContactSettings): Promise<boolean> {
  if (!env.MANAGE) return false;
  await env.MANAGE.put(KEY, JSON.stringify(normalise(data)));
  return true;
}
