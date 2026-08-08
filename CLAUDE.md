# LOOM — AI-native creative agency site

Flagship marketing site for LOOM (Amman × Sarajevo), built from the ADVN Digital
2026 company profile. Vite + React SPA, no backend, no env vars — `dist/` is the
entire deliverable.

Repo: `Free-Palestine-4EVER/loomproject`. Read `README.md` for the deploy story
and `studio.md` for the client-facing visual editor.

## Running it

**Node is not on PATH on this machine.** Every command needs this first:

```bash
export PATH="$HOME/.local/node/bin:$PATH"
```

```bash
npm run dev       # http://localhost:4930
npm run build     # -> dist/
npm run preview   # http://localhost:4931
npm run studio    # the click-to-edit Studio (spawns the dev server too)
```

Deploy is Firebase Hosting (`firebase.json` is configured). **Vercel is
unreachable from Jordan — do not propose it.**

## Shape of the app

`src/App.jsx` is the whole router: one pathname check (`/consultancy` vs.
everything else), no router dependency. The long page mounts ~17 sections in a
fixed order; `/consultancy` mounts the dedicated page plus `Contact`.

| What | Where |
|---|---|
| All copy/content (brand, services, 16 cases, stats) | `src/data/site.js` (+ `crew.js`, `agents.js`, `machine.js`) |
| Sections of the long page | `src/components/Sections.jsx` |
| Nav / loader / cursor / progress / footer | `src/components/Chrome.jsx` |
| Contact wizard (4 steps → WhatsApp/email) | `src/components/ContactWizard.jsx` + `lib/wizard.jsx` |
| Motion primitives (SplitWords, Reveal, CountUp, Magnetic) | `src/lib/motion.jsx` |
| Design system | `src/styles.css` (+ per-component CSS next to each `.jsx`) |
| Client-facing visual editor | `studio/`, `src/studio/` — dev-only, never in `dist/` |

Lenis drives smooth scroll and is exposed as `window.__lenis`. **Lenis hijacks
`window.scrollTo`** — for scripted/QA scrolling use `window.__lenis.scrollTo(y,
{ immediate: true })`, or drive real wheel events. Note it exposes no
`scrollTo` until the instance exists, and reduced-motion users get no Lenis at
all.

`prefers-reduced-motion` is read **live**, not just at mount — flipping it
mid-session must immediately kill Lenis, the FX pack and the flyer. Chrome's
Battery Saver forces that media query on, so this path is a large slice of
ordinary laptop visitors, not a rare branch.

## The 3D — read this before touching anything with wings

There are two independent WebGL layers, and they are not the same butterfly.

**The companion butterfly — `src/three/Companion.js`.** This is *the* butterfly
of the site: a fixed, full-viewport, pointer-events-none layer above the copy
and below the nav (`src/components/Flyer.jsx`), carrying one butterfly for the
entire scroll of the document. Mounted lazily — it waits for the main thread to
go quiet or the first scroll, so it never contends with the hero's first paint.

**The hero backdrop — `src/three/PlanetField.js`**, dynamically imported by
`Sections.jsx`. `ButterflyField.js` / `BeeField.js` / `HeroField.js` /
`CuratedField.js` are earlier staging experiments, still driven by the
`*-lab.html` entry points at the repo root (`butterfly-lab`, `bee-lab`,
`hive-lab`, `curated-lab`, `flight-compare`) but **not mounted by the site**.
Changing them changes nothing a visitor sees.

`butterfly-lab.html?a=0&e=0&spin=0` puts the camera on `+Z` and is the fastest
way to see the pose the page is *supposed* to hit. `swatch-lab.html?sheet=colors`
and `?sheet=eyes` render four-up contact sheets of colourways and eye treatments
under Companion's exact light rig — options are registered as throwaway `SPECS`
entries, since `createButterfly(THREE, key)` looks its spec up by key.

**The butterfly is procedural, not a GLB.** `public/models/butterfly.glb` no
longer exists; `butterflyAsset.js` builds it at runtime from
`butterfly-model.js` (variant `woven`), and `loadButterfly()` fetches nothing.
The reason is the wing membrane: it bends in a **vertex shader** so it trails
behind the stroke, and shader deformation cannot ride inside a GLB. `prepFlyer`
still returns the legacy `{ root, mixer, flutter, cruise, flap, rig, bf }`
surface, so callers that only know `flap` keep working — there is no
`AnimationMixer` underneath any more.

### Rules the flight code enforces on itself

- **Every eased value uses a per-SECOND rate** (`THREE.MathUtils.damp`, or a
  `1 - exp(-rate*dt)` SLERP factor), never a per-frame fraction. `dt === 0`
  snaps to target, which is what lets `renderOnce()` reuse the same helpers for
  the reduced-motion static frame.
- **Body attitude is ONE quaternion**, composed fresh each frame from heading +
  angle-of-attack + roll and SLERPed toward — never `lookAt()`/`rotateZ()`
  applied in sequence.
- **Vertical stroke-coupling lives in exactly one place**: `butterfly-model.js`'s
  own `update()`, derived from the same stroke phase that drives the hinges.
  A second one added in `Companion.js` is what "flying reads as glitching in
  place" turned out to be. Do not add one back.
- **The model's local `+Z` is where its face looks** (and the wing normal — the
  bbox is 2.02 × 1.26 × 0.281, it is a flat thing). `Companion.js` aims that at
  `camera.position`, then leans off it by a little velocity.
- **Aim at the camera POSITION, never at world `+Z`.** They are not the same:
  this is a perspective camera at `(0, 0, 6)` and the path flies the butterfly
  out to ~±2.7 world units sideways, where world `+Z` is up to ~30° from where
  the reader actually is. A heading biased toward world `+Z` reads as a
  three-quarter exactly where the path spends most of its time.
- **`THREE.Matrix4.lookAt(eye, target, up)` sets `+Z = normalize(eye - target)`**
  — it builds a *camera* basis, and cameras look down `-Z`. `Object3D.lookAt()`
  hides this by passing `(target, position)` for meshes and `(position, target)`
  only for cameras and lights. Any code driving the matrix directly must do that
  compensation itself. `Companion.js` did not, for a long time, which pointed the
  butterfly's `+Z` a full 180° from the aim vector — so it flew backwards, and
  every "bias the heading toward the reader" tweak steered its *back* at the
  reader harder. It stayed symmetric and wings-spread throughout, which is what
  made it survive review: the tell is no eyes and an abdomen pointing at you.
- **Scratch `THREE` objects are allocated once in the constructor** and mutated
  in place. Orienting the creature costs zero garbage per frame.

### Flight profiles

`src/three/flight/` — `glider.js` (a), `flutter.js` (b, the shipping default),
`darter.js` (c). A profile customises *feel* without touching `Companion.js`,
the model, or `PATH`: it exports `{ id, label, init, update, dispose }` and
returns a partial `drive` object; every omitted field falls back to
`FLIGHT_DEFAULTS` (exported from `Companion.js`) or `WING_RIG_DEFAULTS`
(exported from `butterfly-model.js`). Returning `{}` must look correct.

Switch with `?flight=a|b|c` or the `1`/`2`/`3` hotkeys. **The corner HUD only
appears in dev or after an explicit selection** — `setProfile()` must not
persist on the initial load, or every production visitor gets the dev HUD
painted over the page. That has already shipped once.

### The duck

`Flyer.jsx` projects the butterfly's wingspan through the camera every frame
into a real on-screen box (published as `window.__loomFlyerBBox` for QA), then
at ~7.5 Hz scans the DOM under that box for text and fades the layer via
`.is-ducking`. The canvas is `position: fixed; inset: 0`, so its own bounding
rect is the whole viewport and useless for measuring overlap — use the bbox.

`Companion.js`'s `PATH` waypoints deliberately keep to the outer thirds, and
near-camera depths only land on waypoints already out past ~|0.55| on x. Big
*and* central is the combination that makes the duck fire constantly.

## The typeface — LOOM Bloom

The studio has its own display family, drawn from scratch: **LOOM Bloom**, a
condensed brutal grotesque (flat terminals, mitred joins), in **five cuts** —
`Regular` plus four planted ones that share its metrics exactly: `Rose`,
`Daisy`, `Tulip`, `Ivy`. Each planted cut subtracts a different species
(`glyphs.ornament(kind, fam)`), and `build.py`'s `CUTS` list is the whole
family definition.
It is given away on **`/type`** (`src/components/Typeface.jsx`), and `/type` is
the reason `App.jsx` carries a `PAGES` route table at all.

```bash
python3 -m pip install skia-pathops brotli   # once
cd type && python3 build.py                  # all five cuts -> type/out/
cp type/out/LOOMBloom*.{otf,ttf,woff2} public/fonts/loom-bloom/
cd public/fonts/loom-bloom && zip -j LOOM-Bloom.zip LOOMBloom*.* LICENCE.txt README.txt
```

`type/geom.py` has the primitives — square-capped `bar`, ellipse, arc cut from an
annulus, and `polystroke`, which strokes a polyline with MITRED joins (that is
what makes A/M/W/K/Z corner properly instead of leaving white wedges); `type/glyphs.py` builds every glyph as a **boolean union** of them,
so overlapping strokes fuse and terminals stay perfectly round. `type/floral.py`
*subtracts* the motif — anything hanging past a stem simply vanishes, which is
why no anchor has to be checked against the outline. `type/preview.py` and
`zoom.py` render contact sheets to SVG for eyeballing (`qlmanage -t` turns them
into PNGs); `type/out/proof.html` is the same check through the real font.

**Two rules decide whether a glyph comes out or not.**

1. *A ring box shorter than `2*W + 60` has no counter left.* That is what killed
   J, ?, & and % on the first pass — they now carry a lighter local stroke
   (`W * 0.58`–`0.8`) or a taller box. B/P/R state their counter box outright
   via `_bowl_r` rather than letting `rring` use one width all round, because the
   middle rail is lighter than the outer two.
2. *Acute joins need `polystroke`, not overlapping bars.* Two `bar()`s meeting at
   an apex leave a white wedge on the inside. A/M/N/V/W/K/Y/Z/1/4/7 are one
   mitred polyline each, run past the glyph box and trimmed by `TRIM`.

If you edit any of them, re-render the sheet with `preview.py` and look at it.

Two components carry it into the site: `TypeShowcase.jsx` is the `#typeface`
section on the long page (a cycling word that changes cut every 2.1s, gated
behind an IntersectionObserver so the heavy planted fonts are only fetched near
the viewport), and `PosterMachine.jsx` on `/type` renders a real 1600×2000
poster to a canvas from the live font and downloads it as a PNG. Both are in the
`Typeface` nav entry's orbit — `LINKS` in `Chrome.jsx` carries `/type`.

**`background-clip: text` needs an auto-height box.** The cycling word vanished
until its absolutely-positioned lines used `left/top/width` instead of
`inset: 0` — a forced height clips the background box the text is cut from.

If you change the font files, update the sizes quoted in `Typeface.jsx`
(`FILES`, `ZIP_SIZE`) and the counts in `FACTS` — they are
hardcoded, not measured.

## The Ascent — the loom climb

`#ascent` is no longer the orthographic globe. `AscentLoom.jsx` pins 560vh into
one viewport and flies the visitor **up the inside of a loom**: warp threads
receding in perspective, six weft rings (one per territory) passing with a
shuttle running each, an altimeter counting to 84,000 m in LOOM Bloom, and the
sky stepping through five altitude bands. Near the top the shaft funnels in and
the threads close overhead.

The 3D is `src/three/LoomShaft.js` — code-split, and **skipped entirely on
reduced-motion and on coarse pointers** (iOS gets one WebGL context, and the
companion butterfly already owns it). Under it sits a CSS shaft + gradient that
carries the section on its own, so no-WebGL machines still get the copy and CTA.

**`vertexColors: true` on a geometry with no colour attribute renders black.**
That is what made the warp threads black on the first pass — `setColorAt` needs
`instanceColor` (which it allocates itself) and the material left at plain
white, not `vertexColors`. Flag `instanceColor.needsUpdate` too.

`Moon.jsx` (the old globe) is still in the tree, unmounted, if it is ever wanted
back — swap the import in `App.jsx`.

## Assets

`scripts/*.mjs` is the asset pipeline (`build-assets.mjs`, `make-butterfly.mjs`,
`optimize-assets.mjs`, alpha-cleanup passes, …), re-runnable from the deck
extractions in `assets-src/` and `brand-refs/`. Portfolio images live in
`public/img/cases/<slug>/` as webp.

To add a case study: copy an entry in `src/data/site.js`, drop images in
`public/img/cases/<slug>/`, rebuild.

## Gotchas

- **Version an image's filename when its bytes change** — caches will serve the
  old one otherwise.
- **Screenshots taken right after load catch the hero mid-animation** and look
  blank or wrong. Let the scroll chase settle (~2s) before judging a frame; the
  butterfly is *supposed* to lag behind the scroll position.
- **`three` must stay out of the `vendor` chunk** (`vite.config.js` explicitly
  returns early for it) — it is lazily imported and must stay that way.
- Fonts (Clash Display + Satoshi) are self-hosted in `public/fonts/`. Nothing in
  this project fetches from a CDN at runtime; keep it that way.

## How to work here

Verify before you claim. This is a visual project — if you change how something
looks or moves, screenshot it and look at it. `playwright` is already a
devDependency; drive the real dev server rather than reasoning about the math.
If a build fails, say so with the output; if you skipped part of a task, say
which part and why.
