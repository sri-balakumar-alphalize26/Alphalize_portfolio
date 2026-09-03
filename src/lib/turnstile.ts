const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Server-side Turnstile verification.
 *
 * The site this replaces shipped a client-side `CheckValidCaptcha()` guard,
 * which any script could skip by POSTing straight to the PHP endpoint. This
 * check happens on the server before anything else touches the submission, so
 * a forged or absent token cannot get past it.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  secret: string | undefined,
  remoteIp?: string | null
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!secret) {
    // Fail closed: without a secret we cannot verify, so we must not accept.
    console.error('[turnstile] TURNSTILE_SECRET_KEY is not configured');
    return { ok: false, reason: 'captcha_unavailable' };
  }
  if (!token) return { ok: false, reason: 'captcha_missing' };

  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body });
    if (!res.ok) return { ok: false, reason: 'captcha_upstream_error' };

    const data = (await res.json()) as TurnstileResponse;
    if (!data.success) {
      return { ok: false, reason: data['error-codes']?.join(',') || 'captcha_failed' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[turnstile] verification request failed', err);
    return { ok: false, reason: 'captcha_upstream_error' };
  }
}
