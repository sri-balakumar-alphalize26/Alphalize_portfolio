/**
 * Fixed-window per-IP rate limiting backed by Workers KV.
 *
 * Deliberately simple: form endpoints need a cheap abuse ceiling, not exact
 * accounting. If the KV binding is missing we allow the request through rather
 * than take the forms offline — Turnstile is still the primary gate.
 */
interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export async function checkRateLimit(
  kv: KVLike | undefined,
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number }
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  if (!kv) return { allowed: true, remaining: limit, retryAfter: 0 };

  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const bucket = `rl:${key}:${window}`;

  try {
    const current = Number((await kv.get(bucket)) ?? 0);
    if (current >= limit) {
      const elapsed = Math.floor(Date.now() / 1000) % windowSeconds;
      return { allowed: false, remaining: 0, retryAfter: windowSeconds - elapsed };
    }

    // Read-then-write races can let a couple of extra requests through under
    // concurrency. Acceptable for an abuse ceiling; not used for billing.
    await kv.put(bucket, String(current + 1), { expirationTtl: windowSeconds + 60 });
    return { allowed: true, remaining: limit - current - 1, retryAfter: 0 };
  } catch (err) {
    console.error('[rate-limit] KV error, allowing request', err);
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}

/** Client IP as seen by Cloudflare. */
export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
