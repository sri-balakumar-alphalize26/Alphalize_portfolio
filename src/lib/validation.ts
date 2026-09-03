import { z } from 'astro/zod';

/** Trim, then reject anything that is only whitespace. */
const trimmed = (min: number, max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(min).max(max));

export const contactSchema = z.object({
  name: trimmed(2, 120),
  email: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.string().email().max(254)),
  phone: trimmed(6, 40),
  subject: trimmed(2, 160),
  message: trimmed(10, 4000),
});

export const careersSchema = z.object({
  name: trimmed(2, 120),
  email: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.string().email().max(254)),
  phone: trimmed(6, 40),
  position: trimmed(2, 120),
  message: trimmed(0, 4000).optional().default(''),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type CareersInput = z.infer<typeof careersSchema>;

/** 5MB — comfortably over a real CV, well under the Workers request limit. */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export const ALLOWED_RESUME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/**
 * Magic-byte sniffing. An attacker can set any `Content-Type` on a multipart
 * part and can rename `payload.exe` to `cv.pdf`, so the declared type alone is
 * not evidence. We check the actual leading bytes as well.
 *
 *   %PDF          -> 25 50 44 46
 *   PK.. (docx)   -> 50 4B 03 04  (zip container)
 *   legacy .doc   -> D0 CF 11 E0  (OLE compound file)
 */
export function sniffResume(bytes: Uint8Array): 'pdf' | 'docx' | 'doc' | null {
  if (bytes.length < 4) return null;
  const [b0, b1, b2, b3] = bytes;

  if (b0 === 0x25 && b1 === 0x50 && b2 === 0x44 && b3 === 0x46) return 'pdf';
  if (b0 === 0x50 && b1 === 0x4b && b2 === 0x03 && b3 === 0x04) return 'docx';
  if (b0 === 0xd0 && b1 === 0xcf && b2 === 0x11 && b3 === 0xe0) return 'doc';
  return null;
}

/** Collapse a user-supplied filename to something safe to echo in an email. */
export function safeFilename(name: string, fallback: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base.replace(/[^\w.\- ]+/g, '_').slice(0, 100);
  return cleaned.length >= 3 ? cleaned : fallback;
}

/** Escape user input before it goes into an HTML email body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip CR/LF from anything interpolated into a mail header (Reply-To,
 * Subject) so a crafted value cannot inject extra headers.
 */
export function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/** Flatten Zod issues into { field: message } for the client. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}
