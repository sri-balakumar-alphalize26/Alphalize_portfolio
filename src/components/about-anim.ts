/* about-anim.ts — reveal engine. Idempotent: safe to call on every
   astro:page-load (view transitions) and on plain loads. */
let io: IntersectionObserver | null = null;
let t0 = 0;

function splitWords(el: HTMLElement) {
  if (el.dataset.split) return;
  const base = Number(el.dataset.base ?? 0);
  const step = Number(el.dataset.step ?? 40);
  const words = (el.textContent ?? '').trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.style.setProperty('--d', `${base + i * step}ms`);
    s.textContent = w;
    el.append(s, ' ');
  });
  el.dataset.split = '1';
}

/* Stagger a container's children without annotating them individually — the
   way to animate rendered markdown, where there is no template to put --d on.
   Only the delay is set here; the hidden start state comes from the stylesheet,
   so the content is never painted visible and then snapped away. */
function cascade(el: HTMLElement) {
  if (el.dataset.cascaded) return;
  const base = Number(el.dataset.base ?? 0);
  const step = Number(el.dataset.step ?? 90);
  Array.from(el.children).forEach((child, i) => {
    (child as HTMLElement).style.setProperty('--d', `${base + i * step}ms`);
  });
  el.dataset.cascaded = '1';
}

export function initAboutAnim(root: ParentNode = document) {
  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-ab]'));
  // <ClientRouter /> keeps this listener alive after navigating off the About
  // page, and reuses the same <html>. Clear the flag so an unrelated page can
  // never inherit the hidden start state.
  if (!sections.length) {
    io?.disconnect();
    document.documentElement.classList.remove('ab-js');
    return;
  }
  document.documentElement.classList.add('ab-js');
  root.querySelectorAll<HTMLElement>('.ab-words').forEach(splitWords);
  root.querySelectorAll<HTMLElement>('[data-ab-cascade]').forEach(cascade);

  io?.disconnect();
  t0 = performance.now();
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        void el.offsetHeight; // make sure the hidden state was laid out once, so the transition has a start value
        // data-hold: extra wait only when the section is on screen at page load (keeps top→bottom order)
        const hold = Number(el.dataset.hold ?? 0);
        el.style.setProperty('--b', `${performance.now() - t0 < 1500 ? hold : 0}ms`);
        el.classList.add('in');
        io!.unobserve(el);
        setTimeout(() => el.classList.add('done'), 2600);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );

  sections.forEach((s) => {
    s.classList.remove('in', 'done');
    io!.observe(s);
  });

  // failsafe: anything on screen but still hidden after 4s is shown
  setTimeout(
    () =>
      sections.forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) s.classList.add('in');
      }),
    4000,
  );
}

// wire up for both plain loads and view-transition navigations
document.addEventListener('astro:page-load', () => initAboutAnim());
if (document.readyState !== 'loading') initAboutAnim();
else document.addEventListener('DOMContentLoaded', () => initAboutAnim(), { once: true });
