# @alphalize/astro-marker

Handwriting headings, marker highlights / underlines / circles, hand-drawn arrows, sparkle bursts, annotations and CTA buttons for Astro. Every stroke draws itself when it scrolls into view. Zero dependencies, works with `<ClientRouter />`.

## Install

Drop the folder into your project and reference it locally:

```
your-site/
  packages/astro-marker/     ← this folder
  package.json
```

```json
"dependencies": { "@alphalize/astro-marker": "file:./packages/astro-marker" }
```

then `npm install`. (Or publish it to your registry and install normally.)

## Setup

Once, in your base layout:

```astro
---
import '@alphalize/astro-marker/tokens.css';   // colours, font vars, heading sizes
import '@alphalize/astro-marker/fonts.css';    // bundled Caveat + Inter (optional, see Fonts)
---
```

## Components

```astro
---
import { Heading, Marker, Arrow, Sparkle, Note, Button } from '@alphalize/astro-marker';
---

<Heading as="h1" size="xl" align="center">
  All your business on <Marker type="highlight" color="yellow">one platform</Marker>.
</Heading>
<Heading as="p" size="lg" align="center">
  Simple, efficient, yet <Marker type="underline" color="blue" delay={500}>affordable</Marker>!
</Heading>

<Button href="/signup">Start now - It's free</Button>
<Button href="/contact" variant="secondary">Meet an advisor</Button>

<Arrow variant="curve-down-right" color="purple" size={54} />
<Note color="purple" rotate={-10}>580.00 Rs / month<br/>for ALL apps</Note>

<Sparkle color="yellow">
  <Heading as="h1" size="xl" align="center">Unleash<br/>your <span class="mk-ink-teal">growth potential</span></Heading>
</Sparkle>
```

| Component | Props |
|---|---|
| `Heading` | `as` h1–h4/p/span · `size` xl/lg/md/sm · `align` left/center |
| `Marker` | `type` highlight/underline/strike/circle/squiggle/box · `color` · `delay` ms · `tilt` deg · `animate` |
| `Arrow` | `variant` curve-down-right/curve-down-left/up/down/right/left/loop-right · `color` · `size` px · `flip` · `rotate` · `stroke` · `delay` |
| `Sparkle` | `color` · `hearts` |
| `Note` | `color` · `rotate` · `size` · `align` |
| `Button` | `href` · `variant` primary/secondary · `size` md/lg + any anchor/button attrs |
| `Quote` | outlined “66” mark · `color` · `size` px · `outline` |
| `ReviewCard` | `name` · `role` · `rating` 0–5 · `color` (omit to auto-cycle) · `avatar` url · slot = review text |

`color` accepts a named marker colour (`yellow pink teal blue sky orange purple green`) or any CSS colour.
Coloured words: `<span class="mk-ink-teal">…</span>` (one class per named colour).

## Reviews

```astro
<div class="mk-reviews">
  <ReviewCard name="Ajmal" rating={5}>The weighing scale integration works exactly the way it should…</ReviewCard>
  <ReviewCard name="Alshabith" rating={5}>The restaurant application handles our dine-in…</ReviewCard>
  <ReviewCard name="Srisaan" rating={4}>The tools rental management app keeps track…</ReviewCard>
</div>
```

Inside `.mk-reviews` the quote mark, avatar and hover border cycle **blue → orange → yellow**; pass `color="teal"` (or any colour) on a card to override. The mark alone is `<Quote color="yellow" />`.

## Fonts

Default handwriting face is **Caveat** 700, sans is **Inter**. Three ways to handle fonts:

1. `import '@alphalize/astro-marker/fonts.css'` — self-hosted woff2 bundled in `src/fonts/` (no network).
2. `<Fonts />` in `<head>` — loads the same faces from Google Fonts.
3. Your own font: skip both and override the variable in your global CSS:

```css
:root { --mk-font-hand: "Your Handwriting Font", cursive; --mk-font-sans: "Your Sans", sans-serif; }
```

If your face sits differently on the baseline, nudge the marks with plain CSS, e.g.
`.mk-mark--underline .mk-mark__svg { bottom: -0.3em }`.

## Tokens

All colours, button styles and motion timing are CSS variables in `tokens.css` — override any of them after the import:

```css
:root { --mk-yellow: #FFC53D; --mk-btn-primary-bg: #1C7DC0; --mk-draw-duration: 900ms; }
```

`prefers-reduced-motion` sets the draw duration to 0 automatically.

## Demo

`demo/index.astro` reproduces the six reference headings — copy it to `src/pages/marker-demo.astro`.
