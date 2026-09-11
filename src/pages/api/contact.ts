import type { APIRoute } from 'astro';
// Bindings, vars and secrets from wrangler.toml / .dev.vars (adapter 14 API).
import { env } from 'cloudflare:workers';
import { sendNotification } from '@/lib/email';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { contactSchema, fieldErrors } from '@/lib/validation';

// Runs on demand as a Cloudflare Function; everything else on the site is prerendered.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request);

  // 1. Abuse ceiling before any work.
  const limit = await checkRateLimit(env.RATE_LIMIT, `contact:${ip}`, {
    limit: 5,
    windowSeconds: 600,
  });
  if (!limit.allowed) {
    return json({ ok: false, error: 'Too many submissions. Please try again shortly.' }, 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Malformed submission.' }, 400);
  }

  // 2. Verify the captcha server-side. Nothing else is trusted until this passes.
  const captcha = await verifyTurnstile(
    form.get('cf-turnstile-response')?.toString(),
    env.TURNSTILE_SECRET_KEY,
    ip
  );
  if (!captcha.ok) {
    const status = captcha.reason === 'captcha_unavailable' ? 503 : 400;
    return json({ ok: false, error: 'Captcha verification failed. Please try again.' }, status);
  }

  // 3. Validate shape and length.
  const parsed = contactSchema.safeParse({
    name: form.get('name')?.toString() ?? '',
    email: form.get('email')?.toString() ?? '',
    phone: form.get('phone')?.toString() ?? '',
    subject: form.get('subject')?.toString() ?? '',
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

  // 4. Notify.
  const sent = await sendNotification({
    apiKey: env.RESEND_API_KEY,
    from: env.MAIL_FROM ?? 'website@alphalize.com',
    to: env.CONTACT_TO_EMAIL ?? 'hr@alphalize.com',
    subject: `Website enquiry: ${data.subject}`,
    replyTo: data.email,
    fields: [
      { label: 'Name', value: data.name },
      { label: 'Email', value: data.email },
      { label: 'Phone', value: data.phone },
      { label: 'Subject', value: data.subject },
      { label: 'Message', value: data.message, pre: true },
      { label: 'Received', value: new Date().toISOString() },
    ],
  });

  if (!sent.ok) {
    return json(
      { ok: false, error: 'We could not send your message. Please email us directly.' },
      502
    );
  }

  return json({ ok: true, message: 'Thanks — your message is on its way. We will be in touch.' });
};

/** Anything other than POST is not useful here. */
export const ALL: APIRoute = () => json({ ok: false, error: 'Method not allowed.' }, 405);
