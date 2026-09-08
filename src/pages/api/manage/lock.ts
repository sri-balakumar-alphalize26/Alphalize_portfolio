import type { APIRoute } from 'astro';
import { clearCookie } from '@/lib/manage-auth';

/**
 * The instant lock behind `?manage=0`.
 *
 * Locking means clearing the session cookie, and most of this site is static —
 * a prerendered page cannot set a Set-Cookie header. So the parameter is spotted
 * on the client and handed here, where the cookie is actually cleared and the
 * visitor is sent back to the clean page.
 *
 * That client-side trigger is the one departure from the 369 version, which
 * redirects during the page render. Only the trigger differs: the cookie is
 * still cleared server-side, so the lock cannot be faked by a visitor.
 *
 * The lock is global by construction: one cookie at path '/' governs the
 * careers and contact editors, so clearing it locks both at once, whichever
 * page the link was used on.
 *
 * No "is it already unlocked?" check on purpose — clearing an absent cookie is
 * a no-op, so a repeat visit, or a visitor who never had a session, simply
 * lands on the clean page. `manage=0` means "end up locked", not "toggle".
 */
export const prerender = false;

/** Same-site paths only, so `next` can never bounce a visitor off-site. */
function safePath(next: string | null): string {
  if (!next || !next.startsWith('/')) return '/';
  // '//evil.com' and '/\evil.com' are protocol-relative URLs, not local paths.
  if (next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}

export const GET: APIRoute = ({ request }) => {
  const target = safePath(new URL(request.url).searchParams.get('next'));
  return new Response(null, {
    status: 303,
    headers: {
      location: target,
      // Must match how the session was issued (manage-auth issues at path '/'),
      // or the browser keeps the cookie and the lock does nothing.
      'set-cookie': clearCookie(),
      'cache-control': 'no-store',
    },
  });
};

export const ALL: APIRoute = () => new Response('Method not allowed', { status: 405 });
