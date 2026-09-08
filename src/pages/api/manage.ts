import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  changePasscode,
  clearCookie,
  isUnlocked,
  openSession,
  sessionHours,
  setSessionHours,
} from '@/lib/manage-auth';

/**
 * The manage-mode session. Everything the browser knows about being unlocked
 * comes from here; nothing is decided client-side.
 *
 * `status` is what lets /careers stay static — the page does not need the
 * cookie at render time, the client just asks after load.
 */
export const prerender = false;

const json = (body: unknown, status = 200, cookie?: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Never let a session response sit in a shared cache.
      'cache-control': 'no-store',
      ...(cookie ? { 'set-cookie': cookie } : {}),
    },
  });

export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Malformed submission.' }, 400);
  }

  const action = form.get('action')?.toString() ?? '';
  const field = (name: string) => form.get(name)?.toString() ?? '';

  switch (action) {
    case 'status': {
      return json({
        ok: true,
        unlocked: await isUnlocked(request, env),
        sessionHours: await sessionHours(env),
      });
    }

    case 'unlock': {
      const { outcome, cookie } = await openSession(request, env, field('passcode'));
      return json({ ok: outcome === 'ok', outcome }, outcome === 'ok' ? 200 : 401, cookie);
    }

    case 'lock': {
      return json({ ok: true }, 200, clearCookie());
    }

    // The two settings actions require an existing session AS WELL AS the
    // current passcode, so a stolen cookie alone cannot change the lock.
    case 'change-passcode': {
      if (!(await isUnlocked(request, env))) return json({ ok: false, outcome: 'locked' }, 403);
      const { outcome, cookie } = await changePasscode(
        env,
        field('current'),
        field('next'),
        field('confirm')
      );
      return json({ ok: outcome === 'ok', outcome }, outcome === 'ok' ? 200 : 400, cookie);
    }

    case 'set-hours': {
      if (!(await isUnlocked(request, env))) return json({ ok: false, outcome: 'locked' }, 403);
      const { ok, cookie } = await setSessionHours(env, Number(field('hours')));
      return json({ ok, sessionHours: await sessionHours(env) }, ok ? 200 : 400, cookie);
    }

    default:
      return json({ ok: false, error: 'Unknown action.' }, 400);
  }
};

export const ALL: APIRoute = () => json({ ok: false, error: 'Method not allowed.' }, 405);
