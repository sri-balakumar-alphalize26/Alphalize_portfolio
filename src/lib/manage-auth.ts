import { checkRateLimit, clientIp } from './rate-limit';

/**
 * The manage-mode lock.
 *
 * The passcode is compared HERE, on the server, and every guarded route
 * re-checks the session here too. The browser's "unlocked" state only decides
 * which controls render — a passcode compared in the browser would ship inside
 * the JavaScript, and the applications inbox could then be read without ever
 * visiting the page. That inbox carries candidates' names, emails, phone
 * numbers and CVs, so this is the difference between a lock and a decoration.
 *
 * WHERE THE PASSCODE LIVES
 *   KV `manage:auth`   the real one, once it has been changed on screen
 *   MANAGE_PASSCODE    the FIRST-RUN value only
 *
 * The KV record wins the moment it exists, so after the first change on screen
 * the secret is never read again. Only a PBKDF2 hash is stored, never the
 * passcode itself.
 *
 * The session cookie is signed with that hash, so changing the passcode
 * invalidates every open session everywhere, immediately and for free.
 *
 * Ported from 369ai_portfolio/lib/careers-auth.ts. Two deliberate differences:
 * PBKDF2 rather than scrypt (Web Crypto has no scrypt), and KV rather than a
 * JSON file — nothing may be written to disk on Workers.
 */

interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export const COOKIE = 'alphalize_manage';
export const MIN_PASSCODE_LENGTH = 4;

const AUTH_KEY = 'manage:auth';
const DEFAULT_SESSION_HOURS = 1;
const MIN_SESSION_HOURS = 1;
const MAX_SESSION_HOURS = 72;
const PBKDF2_ITERATIONS = 100_000;

type Stored = { salt: string; hash: string; updatedAt: string; sessionHours: number };

export interface AuthEnv {
  MANAGE?: KVLike;
  RATE_LIMIT?: Parameters<typeof checkRateLimit>[0];
  MANAGE_PASSCODE?: string;
}

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time compare, so a wrong passcode leaks nothing through timing. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hashOf(passcode: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(passcode), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return toHex(bits);
}

function envPasscode(env: AuthEnv): string | null {
  const value = env.MANAGE_PASSCODE;
  return value && value.trim() ? value.trim() : null;
}

async function readStored(env: AuthEnv): Promise<Stored | null> {
  if (!env.MANAGE) return null;
  try {
    const raw = await env.MANAGE.get(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    return parsed?.salt && parsed?.hash ? parsed : null;
  } catch {
    return null; // not set on screen yet — the secret is in charge
  }
}

async function writeStored(env: AuthEnv, next: Stored): Promise<void> {
  await env.MANAGE?.put(AUTH_KEY, JSON.stringify(next));
}

/** How long an unlock lasts. Owner-set; 1 hour until they say otherwise. */
export async function sessionHours(env: AuthEnv): Promise<number> {
  const hours = (await readStored(env))?.sessionHours;
  return typeof hours === 'number' && hours >= MIN_SESSION_HOURS && hours <= MAX_SESSION_HOURS
    ? hours
    : DEFAULT_SESSION_HOURS;
}

/** What the cookie is signed with — the stored hash, or the bootstrap value. */
async function signingKey(env: AuthEnv): Promise<string | null> {
  const stored = await readStored(env);
  return stored ? stored.hash : envPasscode(env);
}

async function verifyPasscode(env: AuthEnv, entered: string): Promise<boolean> {
  const attempt = entered.trim();
  if (!attempt) return false;

  const stored = await readStored(env);
  if (stored) return sameString(await hashOf(attempt, stored.salt), stored.hash);

  const bootstrap = envPasscode(env);
  return bootstrap ? sameString(attempt, bootstrap) : false;
}

async function sign(expiry: number, key: string): Promise<string> {
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(String(expiry))));
}

/** The Set-Cookie value for a session ending at `expiry`. */
export async function issueCookie(expiry: number, key: string): Promise<string> {
  const value = `${expiry}.${await sign(expiry, key)}`;
  const maxAge = Math.max(0, Math.round((expiry - Date.now()) / 1000));
  return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearCookie(): string {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function readCookie(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return rest.join('=');
  }
  return null;
}

export async function isUnlocked(request: Request, env: AuthEnv): Promise<boolean> {
  const key = await signingKey(env);
  if (!key) return false;

  const raw = readCookie(request);
  if (!raw) return false;

  const [expiryRaw, signature] = raw.split('.');
  const expiry = Number(expiryRaw);
  if (!expiry || !signature || expiry < Date.now()) return false;
  return sameString(signature, await sign(expiry, key));
}

export type UnlockOutcome = 'ok' | 'wrong' | 'throttled' | 'unset';

export async function openSession(
  request: Request,
  env: AuthEnv,
  entered: string
): Promise<{ outcome: UnlockOutcome; cookie?: string }> {
  const key = await signingKey(env);
  if (!key) return { outcome: 'unset' };

  // Five attempts a minute per address — enough for a typo, not for a script.
  const limit = await checkRateLimit(env.RATE_LIMIT, `manage:${clientIp(request)}`, {
    limit: 5,
    windowSeconds: 60,
  });
  if (!limit.allowed) return { outcome: 'throttled' };

  if (!(await verifyPasscode(env, entered))) return { outcome: 'wrong' };

  const expiry = Date.now() + (await sessionHours(env)) * 60 * 60 * 1000;
  return { outcome: 'ok', cookie: await issueCookie(expiry, key) };
}

export type ChangeOutcome = 'ok' | 'wrong-current' | 'too-short' | 'mismatch' | 'unset';

/**
 * Changing the passcode needs the CURRENT one, even from an unlocked screen:
 * otherwise anyone walking past an unlocked laptop could set a new code and
 * lock the owner out of their own page.
 */
export async function changePasscode(
  env: AuthEnv,
  current: string,
  next: string,
  confirm: string
): Promise<{ outcome: ChangeOutcome; cookie?: string }> {
  if (!env.MANAGE) return { outcome: 'unset' };
  if (!(await verifyPasscode(env, current))) return { outcome: 'wrong-current' };
  if (next.trim().length < MIN_PASSCODE_LENGTH) return { outcome: 'too-short' };
  if (next !== confirm) return { outcome: 'mismatch' };

  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const hash = await hashOf(next.trim(), salt);
  const hours = await sessionHours(env);
  await writeStored(env, { salt, hash, updatedAt: new Date().toISOString(), sessionHours: hours });

  // Re-issue for THIS browser only: the person making the change stays in,
  // every other device is signed out by the new signature.
  return { outcome: 'ok', cookie: await issueCookie(Date.now() + hours * 60 * 60 * 1000, hash) };
}

/** Set how long an unlock lasts, and apply it to the session in hand. */
export async function setSessionHours(
  env: AuthEnv,
  hours: number
): Promise<{ ok: boolean; cookie?: string }> {
  if (!Number.isFinite(hours) || !env.MANAGE) return { ok: false };
  const wanted = Math.round(hours);
  if (wanted < MIN_SESSION_HOURS || wanted > MAX_SESSION_HOURS) return { ok: false };

  const stored = await readStored(env);
  if (stored) {
    await writeStored(env, { ...stored, sessionHours: wanted });
  } else {
    // Still on the bootstrap passcode: store its hash so the setting has
    // somewhere to live, without changing what the owner types.
    const bootstrap = envPasscode(env);
    if (!bootstrap) return { ok: false };
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    await writeStored(env, {
      salt,
      hash: await hashOf(bootstrap, salt),
      updatedAt: new Date().toISOString(),
      sessionHours: wanted,
    });
  }

  const key = await signingKey(env);
  if (!key) return { ok: true };
  return { ok: true, cookie: await issueCookie(Date.now() + wanted * 60 * 60 * 1000, key) };
}
