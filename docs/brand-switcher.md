# Brand switcher on the logo

## Context

The header logo currently links home and nothing else. Alphalize and 369AI are sibling brands of the same operation — same phone number, same `hr@` address, and the 369 site is already linked from two components — but nothing on the site tells a visitor the other brand exists.

Requested: the Flipkart pattern. Hovering the logo reveals a small dropdown listing both brands; clicking 369AI goes to `https://369ai.biz/`.

Decisions taken: **369AI opens in a new tab** (matching how every other 369 link on the site already behaves), and each row carries a **short description of what the brand does**.

---

## What gets built

A `BrandSwitcher.astro` sitting beside `<Logo />` in the header bar, with a two-row panel:

```
┌──────────────────────────────────┐
│  [A]  Alphalize            ✓     │   → / (current)
│       ERP and business           │
│       intelligence               │
│                                  │
│  [3]  369AI                      │   → https://369ai.biz/ (new tab)
│       Smart devices and robotics │
└──────────────────────────────────┘
```

**Interaction.** The hover target is a new wrapper around the logo and a chevron button, so hovering *the logo itself* opens the menu — which is what was asked for. The logo stays a plain link to home; the chevron is the click/tap affordance, because touch has no hover.

---

## Files

**New — `src/components/BrandSwitcher.astro`**
Copy the mechanics of `src/components/LocaleSwitcher.astro`, which already solves this exact problem: 80/180ms hover intent, delegated `document` listeners registered once behind a `window` flag, a CSS-only `:hover`/`:focus-within` baseline that a `js-*` class hands over to the script so Escape sticks, and the panel recipe (`--color-brand-100` border, `--radius-card`, `--shadow-lift`, the same easing).

Every hook must be brand-scoped — `data-brand-switcher`, `data-brand-trigger`, `.bs`, `js-bs`, `__brandSwitcherWired`. Reusing `.drop` / `data-drop` would collide: `Header.astro:327` grabs `header.querySelector('[data-drop]')`, **the first match only**, so a second one is silently ignored.

Row markup follows `contact.astro:88-112` (`.ct-row`): icon tile, bold title, muted second line. Shrink the subtitle relative to the title — the contact rows use one size for both, Flipkart does not.

**New — `src/components/BrandMark.astro`**
The Alphalize mark alone, no link, no entrance animation. `Logo.astro` cannot be reused: its root element *is* the `<a>`, and `.word` sets `overflow: hidden` plus an animated `clip-path`, which would clip anything placed inside.

Asset choice matters here. `public/favicon.png` is square but only 40×40 — soft on a retina tile. `brand/logo.png` is 3.6:1, wrong shape. Use the two `splash-a.png` / `splash-b.png` halves stacked exactly as `Logo.astro:57-60` does — together they *are* the mark, at 692×584 (1.18:1), which sits beside `trusted/369ai.png` (355×336, 1.06:1) without either looking odd in a square tile with `object-fit: contain`.

**Modified — `src/components/Header.astro`**
Wrap `<Logo size={28} />` (line 81) in a `.brand` div with the switcher as its sibling; that div is the `position: relative` anchor and the hover target. `.bar-in` is a flex row and `.nav` already takes `margin-inline-start: auto`, so nothing else shifts.

Three follow-ons that are easy to miss:
- The entrance stagger enumerates its participants in **four** selector lists (`Header.astro:1088`, `1098`, `1116`, `1132`). Add the chevron with its own `--d`, near 0 so it arrives with the logo. Animate the chevron, **not** `.brand` — the logo already has its own `lg-up` / `lg-wipe` entrance and would double up.
- The scroll-hide handler at `Header.astro:302` checks `header.querySelector('.drop.open')` so the bar does not retract mid-menu. Extend it to the brand switcher or the header will slide away under an open panel.
- Panel anchors to the **start** edge (`inset-inline-start: 0`), unlike the locale switcher's end edge — the logo sits at the start of the bar, and this must flip under `dir="rtl"`.

**Modified — `src/config/site.ts`**
`https://369ai.biz/` is currently duplicated in `SolutionCards.astro:22` and `WhatWeDo.astro:69`. Add it once as `site.ai369Url` and point all three at it.

**Modified — the nine `src/i18n/messages/*.json`**
New `brand` namespace. Brand *names* stay untranslated — same rule already applied to `ceo.name` and the company name. Only the descriptions and the trigger's accessible label are translated:

```json
"brand": {
  "switchLabel": "Switch product",
  "alphalizeTagline": "ERP and business intelligence",
  "ai369Tagline": "Smart devices and robotics"
}
```

`scripts/check-i18n.mjs` enforces parity, so all nine need the key or the build reports it.

---

## Verification

- `npm run build`, `npm run check`, `npm run check:i18n`, `npm run check:english` — all clean.
- In the built HTML: the panel is present on every page, the Alphalize row points at `/{locale}` and carries the current marker, and the 369 row has `target="_blank" rel="noopener noreferrer"`.
- Only one `[data-drop]` still exists, so the Services dropdown script is unaffected.
- `?dir=rtl` on any page — panel opens from the correct edge and the chevron mirrors.
- With JavaScript disabled the panel still opens on hover (the CSS-only baseline).
- Keyboard: Tab reaches the chevron, Enter opens, Escape closes and returns focus.
