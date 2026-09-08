import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isUnlocked } from '@/lib/manage-auth';

/**
 * Delete one stored application. Session-guarded, and POST only — a GET would
 * make every CV deletable by a link, a prefetch or a crawler.
 */
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

function isSafeKey(key: string): boolean {
  return /^applications\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.(pdf|doc|docx)$/.test(key);
}

export const POST: APIRoute = async ({ request }) => {
  if (!(await isUnlocked(request, env))) return json({ ok: false }, 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Malformed submission.' }, 400);
  }

  const key = form.get('key')?.toString() ?? '';
  if (!isSafeKey(key) || !env.RESUMES) return json({ ok: false }, 400);

  await env.RESUMES.delete(key);
  return json({ ok: true });
};

export const ALL: APIRoute = () => json({ ok: false, error: 'Method not allowed.' }, 405);
