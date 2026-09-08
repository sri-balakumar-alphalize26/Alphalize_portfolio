/**
 * Client-side half of manage mode.
 *
 * The lock itself is NOT here. Whether a session is open is decided by the
 * server in src/lib/manage-auth.ts and carried in an httpOnly cookie this code
 * cannot read; `status()` just asks. Everything in this file only decides which
 * controls render — the applications inbox and the CV downloads re-check the
 * session server-side on every request.
 *
 * What does live here is the draft store. Job drafts are deliberately
 * browser-local: they change what *you* see under `?manage=1` and never reach
 * a visitor, who keeps seeing the published src/content/jobs/*.md until those
 * are edited and the site redeployed.
 */

/** localStorage throws in some privacy modes; never let that break the page. */
export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore — an unwritable store just means drafts do not persist */
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  writeRaw(key, JSON.stringify(value));
}

/** `?manage=1` in the address. A plain URL stays a visitor page. */
export function inManageMode(): boolean {
  return new URLSearchParams(location.search).get('manage') === '1';
}

export interface ManageStatus {
  unlocked: boolean;
  sessionHours: number;
}

/** POST a form-encoded action to /api/manage. */
export async function manageAction(
  action: string,
  fields: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  const body = new FormData();
  body.set('action', action);
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  try {
    const res = await fetch('/api/manage', { method: 'POST', body });
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, outcome: 'network' };
  }
}

let cached: Promise<ManageStatus> | null = null;

/** Cached per page view; call `refreshStatus()` after anything that changes it. */
export function status(): Promise<ManageStatus> {
  cached ??= manageAction('status').then((r) => ({
    unlocked: r.unlocked === true,
    sessionHours: typeof r.sessionHours === 'number' ? r.sessionHours : 1,
  }));
  return cached;
}

export function refreshStatus(): Promise<ManageStatus> {
  cached = null;
  return status();
}
