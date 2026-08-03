// ————————————————————————————————————————————
// make-case-screens.mjs
// Generates a realistic desktop (1440x900) + mobile (390x844) "screenshot"
// of a plausible brand landing page for every LOOM case study, built from
// that brand's OWN real photography (cover / star / board webp assets).
// These are pure screen-content renders (no device chrome/shadow) meant to
// be composited into MacBook/iPhone mockup frames elsewhere.
//
// Usage:
//   export PATH="$HOME/.local/node/bin:$PATH"
//   node scripts/make-case-screens.mjs [slug ...]
// ————————————————————————————————————————————

import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import sharp from 'sharp'
import { chromium } from 'playwright'
import { CASES } from '../src/data/site.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CASES_DIR = path.join(ROOT, 'public', 'img', 'cases')

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
const SCALE = 2 // capture at 2x, downsample to exact target for crisp output
const WEBP_QUALITY = 82

// Only build the slugs passed on the CLI, or all of them.
const wanted = process.argv.slice(2)

// KNOWN DATA BUG: these three cases' cover.webp on disk is literally the
// Ana Ellie dog-food-bag photo (a copy/paste mistake upstream in the asset
// pipeline), not that brand's own photography. Their star-N assets ARE the
// correct real brand photos, so we use star-0 as the hero image instead and
// drop the bogus cover from the gallery strip. This keeps every screenshot
// built from that brand's OWN genuine assets, per the task's requirement.
const HERO_OVERRIDE = {
  evorahome: 'star-0',
  maison: 'star-0',
  vucko: 'star-0',
}

function fileUrl(absPath) {
  return pathToFileURL(absPath).href
}

function readRealAssets(slug) {
  const dir = path.join(CASES_DIR, slug)
  if (!fs.existsSync(dir)) return null
  const files = fs.readdirSync(dir)
  const cover = files.includes('cover.webp') ? path.join(dir, 'cover.webp') : null
  const stars = files
    .filter((f) => /^star-\d+\.webp$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map((f) => path.join(dir, f))
  const boards = files
    .filter((f) => /^board-\d+\.webp$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map((f) => path.join(dir, f))
  return { dir, cover, stars, boards }
}

async function dominantColor(imgPath) {
  try {
    const { dominant } = await sharp(imgPath).stats()
    return dominant // {r,g,b}
  } catch {
    return { r: 40, g: 40, b: 60 }
  }
}

function rgb({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`
}

function luminance({ r, g, b }) {
  // perceived brightness 0-255
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function shade({ r, g, b }, amt) {
  // amt negative = darker, positive = lighter
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amt)))
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`
}

function alpha({ r, g, b }, a) {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

// Build the gallery strip: prefer stars first (hero product shots), then
// boards (campaign/board layouts), capped so the strip stays readable.
function galleryImages(assets, heroPath, cap = 6) {
  const list = [...assets.stars, ...assets.boards].filter(
    (p) => p !== assets.cover && p !== heroPath
  )
  return list.slice(0, cap)
}

// Resolve the real hero image for a case: normally cover.webp, but falls
// back to the HERO_OVERRIDE star image for the known mislabeled covers.
function resolveHero(slug, assets) {
  const overrideFile = HERO_OVERRIDE[slug]
  if (overrideFile) {
    const p = path.join(assets.dir, `${overrideFile}.webp`)
    if (fs.existsSync(p)) return p
  }
  return assets.cover
}

function escapeHtml(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildHtml(caseData, assets, heroPath, accent, viewport) {
  const isMobile = viewport.width < 600
  const { client, country, year, scope = [], title, copy } = caseData
  const accentDark = luminance(accent) > 150
  const textOnAccent = accentDark ? '#0b0b0d' : '#ffffff'
  const gallery = galleryImages(assets, heroPath, isMobile ? 4 : 6)
  const coverUrl = heroPath ? fileUrl(heroPath) : ''

  const navLinks = ['Work', 'Studio', 'Services', 'Contact']
  const initials = client
    .replace(/[×·]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const galleryItemsHtml = gallery
    .map(
      (p, i) => `
      <div class="g-item" style="animation-delay:${i * 40}ms">
        <img src="${fileUrl(p)}" alt="" />
      </div>`
    )
    .join('')

  const scopeChipsHtml = scope
    .slice(0, isMobile ? 2 : 4)
    .map((s) => `<span class="chip">${escapeHtml(s)}</span>`)
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  :root {
    --accent: ${rgb(accent)};
    --accent-dark: ${shade(accent, -70)};
    --accent-light: ${shade(accent, 60)};
    --accent-a12: ${alpha(accent, 0.12)};
    --accent-a25: ${alpha(accent, 0.25)};
    --text-on-accent: ${textOnAccent};
    --ink: #12110f;
    --paper: #faf9f6;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${viewport.width}px;
    height: ${viewport.height}px;
    overflow: hidden;
    background: var(--paper);
    font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
  }
  img { display: block; width: 100%; height: 100%; object-fit: cover; }

  header {
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${isMobile ? '16px 18px' : '22px 44px'};
    background: var(--paper);
    border-bottom: 1px solid rgba(0,0,0,0.06);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    letter-spacing: -0.01em;
    font-size: ${isMobile ? '15px' : '17px'};
  }
  .brand .mark {
    width: ${isMobile ? '26px' : '32px'};
    height: ${isMobile ? '26px' : '32px'};
    border-radius: 8px;
    background: var(--accent);
    color: var(--text-on-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${isMobile ? '11px' : '13px'};
    font-weight: 800;
  }
  nav { display: flex; gap: 30px; }
  nav a {
    font-size: 13px;
    font-weight: 500;
    color: rgba(18,17,15,0.55);
    text-decoration: none;
    letter-spacing: 0.01em;
  }
  .burger {
    width: 22px; height: 14px; position: relative;
  }
  .burger span {
    position: absolute; left: 0; right: 0; height: 2px; background: var(--ink); border-radius: 2px;
  }
  .burger span:nth-child(1){ top: 0; }
  .burger span:nth-child(2){ top: 6px; }
  .burger span:nth-child(3){ top: 12px; }
  .cta {
    background: var(--accent);
    color: var(--text-on-accent);
    border: none;
    border-radius: 999px;
    padding: 9px 20px;
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .hero {
    position: relative;
    width: 100%;
    height: ${isMobile ? viewport.height - 60 - 74 : viewport.height - 77 - 96}px;
    overflow: hidden;
  }
  .hero img {
    position: absolute; inset: 0;
    transform: scale(1.02);
  }
  .hero .scrim {
    position: absolute; inset: 0;
    background:
      linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.55) 100%),
      linear-gradient(90deg, ${alpha(accent, 0.28)} 0%, rgba(0,0,0,0) 55%);
  }
  .hero .content {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    padding: ${isMobile ? '22px 20px 24px' : '0 44px 40px'};
    display: flex;
    flex-direction: column;
    gap: ${isMobile ? '10px' : '14px'};
    max-width: ${isMobile ? '100%' : '760px'};
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    background: var(--accent);
    color: var(--text-on-accent);
    font-size: ${isMobile ? '10.5px' : '12px'};
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 6px 12px;
    border-radius: 999px;
  }
  h1 {
    color: #fff;
    font-size: ${isMobile ? '27px' : '52px'};
    line-height: 1.06;
    letter-spacing: -0.02em;
    font-weight: 700;
    text-shadow: 0 2px 24px rgba(0,0,0,0.25);
    max-width: ${isMobile ? '100%' : '640px'};
  }
  .hero p {
    color: rgba(255,255,255,0.86);
    font-size: ${isMobile ? '13px' : '16px'};
    line-height: 1.5;
    max-width: ${isMobile ? '100%' : '520px'};
    text-shadow: 0 1px 12px rgba(0,0,0,0.3);
  }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 2px; }
  .chip {
    background: rgba(255,255,255,0.16);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.28);
    color: #fff;
    font-size: ${isMobile ? '10px' : '11.5px'};
    font-weight: 600;
    padding: 5px 11px;
    border-radius: 999px;
  }
  .meta-row {
    display: flex; align-items: center; gap: 10px;
    font-size: ${isMobile ? '11px' : '12.5px'};
    color: rgba(255,255,255,0.72);
    font-weight: 500;
  }
  .meta-row .dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.5); }

  .gallery {
    display: flex;
    gap: ${isMobile ? '8px' : '14px'};
    padding: ${isMobile ? '14px 20px' : '20px 44px'};
    background: var(--paper);
    height: ${isMobile ? '60px' : '96px'};
    align-items: stretch;
  }
  .g-item {
    flex: 1;
    border-radius: ${isMobile ? '8px' : '10px'};
    overflow: hidden;
    background: var(--accent-a12);
    position: relative;
  }
  .g-item::after {
    content: '';
    position: absolute; inset: 0;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06);
    border-radius: inherit;
  }

  footer {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    display: none;
  }
</style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="mark">${escapeHtml(initials)}</span>
      <span>${escapeHtml(client)}</span>
    </div>
    ${isMobile
      ? '<div class="burger"><span></span><span></span><span></span></div>'
      : `<nav>${navLinks.map((l) => `<a href="#">${l}</a>`).join('')}</nav>`}
    ${isMobile ? '' : '<button class="cta">Get in touch</button>'}
  </header>

  <div class="hero">
    ${coverUrl ? `<img src="${coverUrl}" alt="" />` : ''}
    <div class="scrim"></div>
    <div class="content">
      <span class="eyebrow">${escapeHtml(country)} · ${escapeHtml(year)}</span>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(copy)}</p>
      <div class="chips">${scopeChipsHtml}</div>
    </div>
  </div>

  ${gallery.length ? `<div class="gallery">${galleryItemsHtml}</div>` : ''}
</body>
</html>`
}

const TMP_DIR = path.join(ROOT, 'scripts', '.screen-tmp')

async function shoot(browser, html, viewport, tmpName) {
  // Chromium refuses to load file:// resources referenced from an
  // about:blank page (which is what page.setContent() produces), so the
  // HTML must itself be served from a file:// URL for local <img src>
  // references to resolve.
  fs.mkdirSync(TMP_DIR, { recursive: true })
  const tmpPath = path.join(TMP_DIR, tmpName)
  fs.writeFileSync(tmpPath, html)

  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: SCALE,
  })
  await page.goto(fileUrl(tmpPath), { waitUntil: 'networkidle' })
  // let webp images fully decode/paint
  await page.waitForTimeout(150)
  const buf = await page.screenshot({ type: 'png' })
  await page.close()
  fs.rmSync(tmpPath, { force: true })
  return sharp(buf)
    .resize(viewport.width, viewport.height, { fit: 'cover' })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
}

async function main() {
  const targets = CASES.filter((c) => (wanted.length ? wanted.includes(c.slug) : true))
  console.log(`Generating screens for ${targets.length} case(s)...`)

  const browser = await chromium.launch()
  const results = []

  for (const c of targets) {
    const assets = readRealAssets(c.slug)
    if (!assets || !assets.cover) {
      console.warn(`[SKIP] ${c.slug}: no cover.webp found`)
      results.push({ slug: c.slug, ok: false, reason: 'missing cover.webp' })
      continue
    }
    try {
      const heroPath = resolveHero(c.slug, assets)
      const accent = await dominantColor(heroPath)
      const outDir = assets.dir

      const desktopHtml = buildHtml(c, assets, heroPath, accent, DESKTOP)
      const mobileHtml = buildHtml(c, assets, heroPath, accent, MOBILE)

      const [desktopBuf, mobileBuf] = await Promise.all([
        shoot(browser, desktopHtml, DESKTOP, `${c.slug}-desktop.html`),
        shoot(browser, mobileHtml, MOBILE, `${c.slug}-mobile.html`),
      ])

      const desktopOut = path.join(outDir, 'screen-desktop.webp')
      const mobileOut = path.join(outDir, 'screen-mobile.webp')
      fs.writeFileSync(desktopOut, desktopBuf)
      fs.writeFileSync(mobileOut, mobileBuf)

      console.log(`[OK] ${c.slug} -> screen-desktop.webp, screen-mobile.webp (accent ${rgb(accent)})`)
      results.push({ slug: c.slug, ok: true })
    } catch (err) {
      console.error(`[FAIL] ${c.slug}:`, err.message)
      results.push({ slug: c.slug, ok: false, reason: err.message })
    }
  }

  await browser.close()
  fs.rmSync(TMP_DIR, { recursive: true, force: true })

  const failed = results.filter((r) => !r.ok)
  console.log(`\nDone. ${results.length - failed.length}/${results.length} cases succeeded.`)
  if (failed.length) {
    console.log('Failures:')
    for (const f of failed) console.log(`  - ${f.slug}: ${f.reason}`)
    process.exitCode = 1
  }
}

main()
