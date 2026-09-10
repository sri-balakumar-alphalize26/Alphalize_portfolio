import type { APIRoute } from 'astro';
// Bindings, vars and secrets from wrangler.toml / .dev.vars (adapter 14 API).
import { env } from 'cloudflare:workers';
import { PDFDocument } from 'pdf-lib';
import { sendNotification } from '@/lib/email';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import {
  ALLOWED_RESUME_TYPES,
  MAX_RESUME_BYTES,
  careersSchema,
  fieldErrors,
  safeFilename,
  sniffResume,
} from '@/lib/validation';

/**
 * Ceiling for the PDF re-save below. Well under MAX_RESUME_BYTES: the point is
 * to stay clear of the Workers CPU limit, not to compress every file.
 */
const COMPRESS_MAX_BYTES = 2 * 1024 * 1024;

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

/** Base64 for the Resend attachment, chunked so large buffers do not blow the stack. */
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request);

  const limit = await checkRateLimit(env.RATE_LIMIT, `careers:${ip}`, {
    limit: 3,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return json({ ok: false, error: 'Too many applications. Please try again later.' }, 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Malformed submission.' }, 400);
  }

  const captcha = await verifyTurnstile(
    form.get('cf-turnstile-response')?.toString(),
    env.TURNSTILE_SECRET_KEY,
    ip
  );
  if (!captcha.ok) {
    const status = captcha.reason === 'captcha_unavailable' ? 503 : 400;
    return json({ ok: false, error: 'Captcha verification failed. Please try again.' }, status);
  }

  const parsed = careersSchema.safeParse({
    name: form.get('name')?.toString() ?? '',
    email: form.get('email')?.toString() ?? '',
    phone: form.get('phone')?.toString() ?? '',
    position: form.get('position')?.toString() ?? '',
    message: form.get('message')?.toString() ?? '',
  });

  if (!parsed.success) {
    return json(
      {
        ok: false,
        error: 'Please check the highlighted fields.',
        fields: fieldErrors(parsed.error),
      },
      400
    );
  }
  const data = parsed.data;

  // --- Resume checks. Every one of these is server-side on purpose. ---
  const resume = form.get('resume');
  if (!(resume instanceof File) || resume.size === 0) {
    return json(
      { ok: false, error: 'Please attach your CV.', fields: { resume: 'A CV is required.' } },
      400
    );
  }

  if (resume.size > MAX_RESUME_BYTES) {
    return json(
      {
        ok: false,
        error: 'That file is too large.',
        fields: { resume: 'Maximum size is 5MB.' },
      },
      413
    );
  }

  // The declared Content-Type is attacker-controlled, so it is a first filter only.
  if (!ALLOWED_RESUME_TYPES[resume.type]) {
    return json(
      {
        ok: false,
        error: 'Unsupported file type.',
        fields: { resume: 'Upload a PDF, DOC or DOCX.' },
      },
      415
    );
  }

  const bytes = new Uint8Array(await resume.arrayBuffer());

  // Real check: leading magic bytes. Catches `payload.exe` renamed to `cv.pdf`.
  const sniffed = sniffResume(bytes);
  if (!sniffed || sniffed !== ALLOWED_RESUME_TYPES[resume.type]) {
    return json(
      {
        ok: false,
        error: 'That file does not look like a PDF or Word document.',
        fields: { resume: 'Upload a genuine PDF, DOC or DOCX.' },
      },
      415
    );
  }

  const displayName = safeFilename(resume.name, `cv.${sniffed}`);

  // --- Best-effort shrink. Re-saving with object streams deduplicates the
  // bloat Word and Docs exporters leave behind. It cannot re-encode images, so
  // photo-heavy CVs pass through nearly unchanged, and encrypted or quirky
  // PDFs throw — those are stored exactly as uploaded. Keep the smaller of the
  // two: pdf-lib can occasionally grow an already-tight file.
  //
  // Gated on size on purpose. This runs on Workers, where exceeding the CPU
  // limit is NOT catchable — the request is killed and the application is lost,
  // which is far worse than storing a file that is a little larger. Anything
  // above the threshold is passed through untouched.
  /**
   * Widened to ArrayBufferLike because pdf-lib's save() returns
   * Uint8Array<ArrayBufferLike> while the upload gives Uint8Array<ArrayBuffer>
   * — TypeScript 5.7 made that buffer type a parameter, so the two no longer
   * assign to each other. Both are plain byte arrays at runtime.
   */
  let stored: Uint8Array<ArrayBufferLike> = bytes;
  if (sniffed === 'pdf' && bytes.length <= COMPRESS_MAX_BYTES) {
    try {
      const doc = await PDFDocument.load(bytes);
      const packed = await doc.save({ useObjectStreams: true });
      if (packed.length < stored.length) stored = packed;
    } catch {
      /* not a PDF pdf-lib can parse; store as uploaded */
    }
  }

  // Store under a random key — never a client-supplied path.
  let storedUrl: string | undefined;
  if (env.RESUMES) {
    const key = `applications/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${sniffed}`;
    try {
      await env.RESUMES.put(key, stored, {
        httpMetadata: { contentType: resume.type },
        customMetadata: {
          applicant: data.name,
          email: data.email,
          phone: data.phone,
          position: data.position,
          originalName: displayName,
          submittedAt: new Date().toISOString(),
        },
      });
      storedUrl = key;
    } catch (err) {
      // Storage is a convenience; the attachment below is the delivery path.
      console.error('[careers] R2 put failed', err);
    }
  }

  const sent = await sendNotification({
    apiKey: env.RESEND_API_KEY,
    from: env.MAIL_FROM ?? 'website@alphalize.com',
    to: env.CAREERS_TO_EMAIL ?? 'hr@alphalize.com',
    subject: `Application: ${data.position} — ${data.name}`,
    replyTo: data.email,
    fields: [
      { label: 'Applicant', value: data.name },
      { label: 'Position', value: data.position },
      { label: 'Email', value: data.email },
      { label: 'Phone', value: data.phone },
      {
        label: 'CV',
        value: `${displayName} (${Math.round(stored.length / 1024)}KB${
          stored.length < bytes.length ? `, from ${Math.round(bytes.length / 1024)}KB` : ''
        })`,
      },
      ...(storedUrl ? [{ label: 'Stored at', value: storedUrl }] : []),
      ...(data.message ? [{ label: 'Message', value: data.message, pre: true }] : []),
      { label: 'Received', value: new Date().toISOString() },
    ],
    attachments: [{ filename: displayName, content: toBase64(stored) }],
  });

  if (!sent.ok) {
    return json(
      { ok: false, error: 'We could not submit your application. Please email us directly.' },
      502
    );
  }

  return json({
    ok: true,
    message: 'Thanks — your application has been received. We will be in touch.',
  });
};

export const ALL: APIRoute = () => json({ ok: false, error: 'Method not allowed.' }, 405);
