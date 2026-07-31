# LOOM — AI-Native Creative Agency

Flagship agency site for LOOM (Amman × Sarajevo). Built from the ADVN Digital 2026
company profile: 14 real case studies, 7 countries, full client wall
(Benetton, UNICEF, Vodafone, MAC, Max Factor, …).

**Stack:** Vite + React · Framer Motion (`motion/react`) · Lenis smooth scroll ·
three.js WebGL particle hero (custom shaders) · Clash Display + Satoshi (self-hosted).

## Run locally

```bash
export PATH="$HOME/.local/node/bin:$PATH"   # Node lives here on this machine
npm install
npm run dev        # http://localhost:4930
npm run build      # production build -> dist/
npm run preview    # serve dist -> http://localhost:4931
```

## Deploy (pick one)

The site is 100% static — `dist/` is the whole deliverable.

**Firebase Hosting** (recommended — Vercel is unreachable from Jordan):

```bash
npm run build
npx firebase-tools login
npx firebase-tools use --add          # pick/create a Firebase project
npx firebase-tools deploy --only hosting
```

`firebase.json` is already configured (SPA rewrite + immutable caching).

**Any static host** (Cloudflare Pages, Netlify, GitHub Pages, own VPS + Caddy):
upload the contents of `dist/`. No server code, no env vars.

> After you have a domain, set `og:image` / canonical to absolute URLs in
> `index.html` for richer link previews.

## Where things live

| What | Where |
|---|---|
| All content (brand, services, 14 cases, stats, contacts) | `src/data/site.js` |
| WebGL hero (particle weave) | `src/three/HeroField.js` |
| Sections | `src/components/Sections.jsx` |
| Work grid + case overlay | `src/components/Work.jsx` |
| Nav / loader / cursor / footer | `src/components/Chrome.jsx` |
| Motion primitives (SplitWords, Reveal, CountUp, Magnetic) | `src/lib/motion.jsx` |
| Design system (all CSS) | `src/styles.css` |
| Portfolio images (webp, curated from the ADVN deck) | `public/img/cases/<slug>/` |
| Asset pipeline (re-runs from the deck extractions) | `scripts/build-assets.mjs` |

To edit a case study or add one: edit `src/data/site.js` (copy an existing entry),
drop images in `public/img/cases/<slug>/`, rebuild.

## Accessibility & perf notes

- `prefers-reduced-motion` disables Lenis, the particle animation loop, marquee
  and entrance animations (content is always visible).
- WebGL failure falls back to the CSS gradient backdrop.
- Hero pauses off-screen and when the tab is hidden; DPR capped at 1.6.
- No horizontal overflow at 390px; overlay is keyboard-navigable (ESC, ←/→).
