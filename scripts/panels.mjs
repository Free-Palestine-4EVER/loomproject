/**
 * Composite the App Store panels shown on #apps.
 *
 *   node scripts/panels.mjs                # every panel in mocks/panels.json
 *   node scripts/panels.mjs kwakwa lume    # only ids starting with these
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The panels are the App-Store-style cards the client asked for: a phone in a
 * lit scene under a headline. Three things are on that card and each is made
 * by whatever is actually best at it:
 *
 *   the SCENE     — a Higgsfield plate, art-src/plates/<plate>.png.
 *                   Rooms, water, light. No device, no type; see mocks/plates.json.
 *
 *                   THE PLATES LIVE OUTSIDE static/ ON PURPOSE (14 Aug 2026).
 *                   They are 108 MB of source art across 16 PNGs and no page
 *                   has ever referenced one — they are input to this script and
 *                   nothing else. Sitting in static/ meant SvelteKit copied
 *                   every byte into the build and Vercel deployed them, so each
 *                   deploy shipped 108 MB that no visitor could ever fetch (and
 *                   that anyone could fetch, at a guessable URL). Moved to
 *                   art-src/, which the build does not touch. If you add a new
 *                   plate, it goes there, not in static/.
 *   the SCREEN    — a real render of mocks/<screen>.html, already sitting in
 *                   static/img/suite/<screen>.webp (scripts/mockshots.mjs).
 *   the TYPE      — set here, in the browser, in the site's own faces.
 *
 * An image model is never asked to draw interface or letterforms, because it
 * garbles both and the panels are displayed large enough to see it. That
 * split is the whole point of this file — do not "simplify" it by prompting
 * for a phone-with-a-headline plate.
 *
 * Output is 1080x1440 (3:4, matching the plates) webp into static/img/panels/.
 * Run `node scripts/responsive.mjs` afterwards or the originals ship unscaled.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFile, writeFile, unlink, mkdir, access } from 'node:fs/promises'
import { resolve } from 'node:path'

const W = 1080
const H = 1440
const OUT = 'static/img/panels'

const { panels } = JSON.parse(await readFile('mocks/panels.json', 'utf8'))
const only = process.argv.slice(2)
const wanted = panels.filter((p) => !only.length || only.some((k) => p.id.startsWith(k)))

if (!wanted.length) {
  console.error(`no panels match ${only.join(', ')}`)
  process.exit(1)
}

const fileUrl = (p) => 'file://' + resolve(p)
const exists = async (p) => access(p).then(() => true, () => false)

/** The panel itself. Everything is sized in vw of the 1080px page so the
 *  layout is resolution-independent — bumping W/H rescales the whole card
 *  rather than breaking its proportions. */
const html = ({ plate, screen, head, sub, ink }) => `<!doctype html>
<meta charset="utf-8">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
  body {
    position: relative;
    font-family: -apple-system, "SF Pro Display", "Helvetica Neue", system-ui, sans-serif;
    background: #0b0b0e;
    --ink: ${ink === 'light' ? '#fffdf8' : '#241d16'};
    --ink-soft: ${ink === 'light' ? 'rgba(255,253,248,.78)' : 'rgba(36,29,22,.72)'};
    --scrim: ${ink === 'light'
      ? 'linear-gradient(180deg, rgba(0,0,0,.46) 0%, rgba(0,0,0,.16) 34%, rgba(0,0,0,0) 56%)'
      : 'linear-gradient(180deg, rgba(255,255,255,.42) 0%, rgba(255,255,255,.12) 34%, rgba(255,255,255,0) 56%)'};
  }

  /* the scene */
  .plate { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  /* a scrim under the headline only — the plates are built with a calm top
     third, this just guarantees contrast when one comes back busier */
  .scrim { position: absolute; inset: 0; background: var(--scrim); }

  /* the type */
  .type { position: absolute; top: 6.6%; left: 8%; right: 8%; text-align: center; }
  h1 {
    color: var(--ink);
    font-size: 62px; line-height: 1.06; font-weight: 800; letter-spacing: -0.022em;
    text-wrap: balance;
    text-shadow: ${ink === 'light' ? '0 2px 24px rgba(0,0,0,.38)' : '0 2px 20px rgba(255,255,255,.32)'};
  }
  p {
    margin-top: 18px; color: var(--ink-soft);
    font-size: 27px; line-height: 1.34; font-weight: 500; letter-spacing: -0.006em;
    text-wrap: balance;
    text-shadow: ${ink === 'light' ? '0 1px 14px rgba(0,0,0,.34)' : '0 1px 12px rgba(255,255,255,.3)'};
  }

  /* the device — the same CSS phone the stage draws, at panel scale */
  .phone {
    position: absolute; left: 50%; bottom: -7%;
    width: 560px; transform: translateX(-50%);
    aspect-ratio: 540 / 1174;
    border-radius: 68px; padding: 13px;
    background: linear-gradient(150deg, #565b63 0%, #16181c 26%, #0a0b0d 55%, #3c4149 82%, #101216 100%);
    box-shadow:
      0 60px 90px rgba(0, 0, 0, 0.42),
      0 18px 34px rgba(0, 0, 0, 0.3),
      inset 0 0 0 1.5px rgba(255, 255, 255, 0.14);
  }
  .glass {
    position: relative; width: 100%; height: 100%;
    border-radius: 56px; overflow: hidden; background: #000;
  }
  .glass img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
  /* the island, drawn over the capture exactly as the stage does */
  .island {
    position: absolute; top: 15px; left: 50%; transform: translateX(-50%);
    width: 132px; height: 37px; border-radius: 20px; background: #000;
  }
  /* a soft pool of light under the phone so it sits IN the scene rather than
     on top of it — without this the composite reads as a sticker */
  .pool {
    position: absolute; left: 50%; bottom: -4%; transform: translateX(-50%);
    width: 900px; height: 300px; border-radius: 50%;
    background: radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,.34), rgba(0,0,0,0) 70%);
    filter: blur(26px);
  }
  /* the glare: one soft diagonal sheen across the glass. The screen underneath
     is a flat capture, and a flat rectangle of pixels is the tell that gives a
     composite away — a real photographed phone always catches something. */
  .glare {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(118deg,
      rgba(255,255,255,0) 26%, rgba(255,255,255,.13) 38%,
      rgba(255,255,255,.05) 47%, rgba(255,255,255,0) 58%);
  }
  /* and one hairline of light down the left edge of the bezel, where the key
     in most of these plates is coming from */
  .phone::after {
    content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(100deg, rgba(255,255,255,.22), rgba(255,255,255,0) 22%);
    mix-blend-mode: screen;
  }
  /* vignette last: pulls the eye to the middle and stops the plate's corners
     competing with the headline */
  .vig {
    position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(120% 78% at 50% 42%, rgba(0,0,0,0) 46%, rgba(0,0,0,.30) 100%);
  }
</style>
<img class="plate" src="${plate}" alt="">
<div class="scrim"></div>
<div class="vig"></div>
<div class="type"><h1>${head}</h1><p>${sub}</p></div>
<div class="pool"></div>
<div class="phone"><div class="glass"><img src="${screen}" alt=""><span class="island"></span><span class="glare"></span></div></div>
`

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

let missing = 0
for (const p of wanted) {
  const plate = `art-src/plates/${p.plate}.png`
  const screen = `static/img/suite/${p.screen}.webp`

  // A missing plate is the normal state while the Higgsfield run is still in
  // flight — say so and move on rather than writing a panel with a black hole
  // where the scene should be.
  if (!(await exists(plate))) { console.log(`${p.id.padEnd(16)} — waiting on plate ${p.plate}.png`); missing++; continue }
  if (!(await exists(screen))) { console.log(`${p.id.padEnd(16)} — MISSING screen ${screen}`); missing++; continue }

  // NOT page.setContent: a document created that way has an opaque origin, and
  // Chromium refuses to load file:// subresources into it — the plate and the
  // screen both come back as broken images and the panel renders as an empty
  // black phone on a grey field. Writing the page to a real file next to the
  // assets and navigating to it is what makes the images load at all.
  const tmp = `${OUT}/.panel.html`
  await writeFile(tmp, html({ ...p, plate: fileUrl(plate), screen: fileUrl(screen) }))
  await page.goto('file://' + resolve(tmp), { waitUntil: 'load' })
  await page.evaluate(() => Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => {}))))
  await page.evaluate(() => document.fonts.ready)
  // a broken plate is silent otherwise — it just renders as flat background
  const bad = await page.evaluate(() =>
    Array.from(document.images).filter((i) => !i.naturalWidth).map((i) => i.className || 'screen'))
  if (bad.length) { console.error(`${p.id}: image(s) failed to load — ${bad.join(', ')}`); process.exitCode = 1 }

  const png = await page.screenshot({ type: 'png' })
  const info = await sharp(png).webp({ quality: 86 }).toFile(`${OUT}/${p.id}.webp`)
  console.log(`${OUT}/${p.id}.webp`.padEnd(44) + ` ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`)
}

await browser.close()
await unlink(`${OUT}/.panel.html`).catch(() => {})
if (missing) console.log(`\n${missing} panel(s) not built — see above.`)
