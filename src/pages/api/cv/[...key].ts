import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isUnlocked } from '@/lib/manage-auth';

/**
 * Download one stored CV. Session-guarded — this is somebody's personal data.
 *
 * A rest param because the R2 key contains slashes
 * (`applications/<date>/<uuid>.pdf`). Every failure is a flat 404, including
 * "locked": a 403 would confirm that a given key exists.
 */
export const prerender = false;

const notFound = () => new Response('Not found', { status: 404 });

/** Only ever serve keys we wrote, never an arbitrary path from the URL. */
function isSafeKey(key: string): boolean {
  return /^applications\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.(pdf|doc|docx)$/.test(key);
}

export const GET: APIRoute = async ({ request, params }) => {
  if (!(await isUnlocked(request, env))) return notFound();

  const key = params.key ?? '';
  if (!isSafeKey(key) || !env.RESUMES) return notFound();

  const object = await env.RESUMES.get(key);
  if (!object) return notFound();

  const name = object.customMetadata?.originalName ?? key.split('/').pop() ?? 'cv';
  /**
   * R2 hands back a Workers ReadableStream while `Response` here is typed
   * against the DOM one. They are the same object at runtime — workerd
   * implements the same interface — but the two declarations are structurally
   * distinct, so the assignment needs the cast. Streaming it straight through
   * is the point: a CV must not be buffered into the isolate.
   */
  return new Response(object.body as unknown as ReadableStream, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      // `attachment` so a PDF cannot render inline on our own origin.
      'content-disposition': `attachment; filename="${name.replace(/"/g, '')}"`,
      'cache-control': 'private, no-store',
    },
  });
};

export const ALL: APIRoute = () => notFound();
