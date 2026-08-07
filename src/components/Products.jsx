// LOOM-built software: Apps showcase (phone frames) + 3D Lab (tool cards)
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { APPS, TOOLS } from '../data/site.js'
import { SplitWords, Reveal } from '../lib/motion.jsx'
import { AppScreen } from './AppScreens.jsx'
import { LabPreview } from './LabPreviews.jsx'
import { LiveBadge } from './Rich.jsx'
import './products-showcase.css'
import './products-touch.css'
import './heads-v7.css'

// True on coarse pointers (touch) — cards use this to swap hover-only
// interactions for scroll/tap equivalents, and never attach the extra
// listeners at all on fine-pointer desktops.
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return coarse
}

// Minimal platform/store marks, drawn in the house 1.5px stroke style.
// Each icon is a small array of primitives rather than one fused path —
// that's what lets the stroke-draw animate per-part and lets hover nudge
// one piece (a leaf, a tile, a plane) instead of the glyph as a dead block.
const PLATFORM_PARTS = {
  ios: [
    { tag: 'path', cls: 'pm-leaf', transform: 'translate(3.5 -1.5) scale(0.92)',
      d: 'M15.5 5.6c-.9.1-2 .7-2.6 1.5-.6.7-1.1 1.8-.9 2.8 1 0 2.1-.6 2.7-1.4.6-.7 1-1.8.8-2.9Z' },
    { tag: 'path', cls: 'pm-body', transform: 'translate(3.5 -1.5) scale(0.92)',
      d: 'M12 9.9c-1.4 0-2.6.8-3.4.8-.8 0-1.9-.8-3.1-.8-1.6 0-3.4 1.4-3.4 4.1 0 2.7 2 5.7 3.5 5.7.8 0 1.7-.8 3-.8s2 .8 3 .8c1.5 0 3.4-3.1 3.4-4.4-1.6-.7-2.4-1.8-2.4-3.1 0-1.2.7-2 1.6-2.6-.7-1-1.7-1.7-2.2-1.7Z' },
  ],
  macos: [
    { tag: 'rect', cls: 'pm-screen', x: 3.5, y: 5, width: 17, height: 11.5, rx: 1.6 },
    { tag: 'path', cls: 'pm-stand', d: 'M8.5 20h7M12 16.5V20' },
  ],
  windows: [
    { tag: 'path', cls: 'pm-q pm-q1', d: 'M4 6.6 11 5.5v6H4v-4.9Z' },
    { tag: 'path', cls: 'pm-q pm-q2', d: 'M13 5.2 20 4v7.5h-7V5.2Z' },
    { tag: 'path', cls: 'pm-q pm-q3', d: 'M4 13.5h7v6L4 18.4v-4.9Z' },
    { tag: 'path', cls: 'pm-q pm-q4', d: 'M13 13.5h7V20l-7-1.2v-5.3Z' },
  ],
  linux: [
    { tag: 'circle', cls: 'pm-head', cx: 12, cy: 9, r: 4.4 },
    { tag: 'path', cls: 'pm-body',
      d: 'M9.4 12.6 7.6 18a1.4 1.4 0 0 0 1.4 1.8h6a1.4 1.4 0 0 0 1.4-1.8l-1.8-5.4M10.4 8.4h.01M13.6 8.4h.01M11 10.4c.3.4 1.7.4 2 0' },
  ],
  web: [
    { tag: 'circle', cls: 'pm-globe', cx: 12, cy: 12, r: 8.2 },
    { tag: 'path', cls: 'pm-merid',
      d: 'M3.8 12h16.4M12 3.8c2.6 2.4 3.9 5.2 3.9 8.2s-1.3 5.8-3.9 8.2c-2.6-2.4-3.9-5.2-3.9-8.2s1.3-5.8 3.9-8.2Z' },
  ],
  appstore: [
    { tag: 'rect', cls: 'pm-plate', x: 3.5, y: 3.5, width: 17, height: 17, rx: 4.2 },
    { tag: 'path', cls: 'pm-arrow', d: 'm9.2 15.5 4.6-8M14.2 15.5 12.9 13M7 15.5h6.3M15.6 15.5H17' },
  ],
  testflight: [
    { tag: 'path', cls: 'pm-plane', d: 'M4 12.5 20 4l-4.2 16-4.6-6.2L4 12.5ZM11.2 13.8 20 4' },
  ],
  // A drawn nod to the Play triangle, not a trace of the trademarked mark —
  // the two seam-lines from the back corners toward the tip are what read
  // as "Google Play" at a glance without reproducing the actual logo.
  googleplay: [
    { tag: 'path', cls: 'pm-triangle', d: 'M6 3.6 20 12 6 20.4Z' },
    { tag: 'path', cls: 'pm-seam', d: 'M6 3.6 15 12M6 20.4 15 12' },
  ],
}

// ————————————————————————————————————————————————————————————
// DOWNLOAD LINKS. An href of '#' is a placeholder and renders as a dead
// (but focusable) button; anything else renders as a real anchor that opens
// in a new tab — see DownloadButton. KwaKwa's TestFlight link is the first
// real one; the rest are still awaiting URLs.
// TODO(client): real store URLs for the remaining apps. Nothing else needs
// to change: the key is the platform id (must match a PLATFORM_PARTS entry
// above + a DL_META entry below), the value is the URL.
//
// Platforms are picked per product, honestly:
//  - the five native builds (Lahza, Evora Scan, Glowbar, TrueSize AR, Morphic)
//    are iOS-only — RoomPlan/ARKit need iOS hardware, there is no Android
//    build to link to, so none is offered.
//  - TAWSIYAT is a web ordering app with no native wrapper — one "open the
//    web app" link, not a store badge that would be lying about a native app.
//  - Morphic is the one already on the App Store for real; the rest are
//    TestFlight/coming-soon, which is why the button reads differently.
// ————————————————————————————————————————————————————————————
// KwaKwa's public TestFlight invite. Kept in its own named const because it
// is the first link here that will be REAL: set it to the
// https://testflight.apple.com/join/… URL and the chip promotes itself from a
// dead button to a live anchor (with a pulsing dot) with no other edit. The
// live path is verified — anchor, target=_blank, rel=noopener, real navigation.
const KWAKWA_TESTFLIGHT = '#'

const DOWNLOADS = {
  Lahza: { testflight: '#' },
  'Evora Scan': { appstore: '#' },
  Glowbar: { appstore: '#' },
  TAWSIYAT: { web: '#' },
  'TrueSize AR': { appstore: '#' },
  KwaKwa: { testflight: KWAKWA_TESTFLIGHT },
  Morphic: { appstore: '#' },
}

// Same mock-link contract, for the 3D Lab / software row.
// Picked per tool's actual runtime, not a uniform "all four buttons" grid:
//  - KUN, ORBIT, ATELIER, TESSERA run today as browser tools (localhost
//    servers) — a Windows/macOS installer for these doesn't exist yet.
//  - SPLAT LAB trains on Apple-silicon Metal specifically — it is a macOS
//    tool by nature, so it gets a mac link and nothing else.
//  - 2D→3D STUDIO is the one tool that is genuinely packaged as desktop
//    software today (the Evora Studio installer: a signed-off .dmg and a
//    licensed .exe) — the only card that earns both buttons.
const TOOL_DOWNLOADS = {
  KUN: { web: '#' },
  ORBIT: { web: '#' },
  ATELIER: { web: '#' },
  'SPLAT LAB': { macos: '#' },
  '2D→3D STUDIO': { macos: '#', windows: '#' },
  TESSERA: { web: '#' },
}

// The two-line "eyebrow + title" convention real store badges use — drawn in
// the house type rather than importing anyone's artwork.
const DL_META = {
  appstore: { eyebrow: 'Download on the', title: 'App Store' },
  testflight: { eyebrow: 'Public beta on', title: 'TestFlight' },
  googleplay: { eyebrow: 'Get it on', title: 'Google Play' },
  macos: { eyebrow: 'Download for', title: 'macOS' },
  windows: { eyebrow: 'Download for', title: 'Windows' },
  web: { eyebrow: 'Open in the', title: 'Browser' },
}

/* A download chip. Two states, one look:

   - real href → a genuine <a target="_blank">, which navigates.
   - '#' (or empty) → a keyboard-focusable <button> that goes nowhere on
     purpose, with `data-mock-href` so the intent stays legible in devtools.

   Both render identical markup inside, so promoting an app from placeholder
   to live is a one-line edit to DOWNLOADS/TOOL_DOWNLOADS, never a markup or
   CSS change. */
function DownloadButton({ id, href }) {
  const meta = DL_META[id] || { eyebrow: '', title: id }
  const live = Boolean(href) && href !== '#'
  const inner = (
    <>
      <PlatformMark id={id} />
      <span className="dl-btn-copy">
        {meta.eyebrow && <em>{meta.eyebrow}</em>}
        <strong>{meta.title}</strong>
      </span>
    </>
  )
  if (live) {
    return (
      <a
        className={`dl-btn dl-btn--${id} dl-btn--real`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-cursor
        aria-label={`${meta.eyebrow} ${meta.title} — opens in a new tab`}
      >
        {inner}
      </a>
    )
  }
  return (
    <button
      type="button"
      className={`dl-btn dl-btn--${id}`}
      data-mock-href={href}
      onClick={(e) => e.preventDefault()}
      title="Placeholder — real link coming soon"
      aria-label={`${meta.eyebrow} ${meta.title} — placeholder link, coming soon`}
    >
      {inner}
    </button>
  )
}

// Fully drawn the instant it mounts — a persistent control glyph, not a
// one-time cinematic reveal. An earlier version gated this on its own
// `useInView` (draw-in on scroll, independent of and lagging behind the
// card's own Reveal entrance by up to ~1s). That's what made the icon read
// as permanently missing: a fast/anchor-jump scroll can carry an element
// straight from "not yet visible" to "already scrolled past" in one frame,
// which an IntersectionObserver with `once: true` can miss entirely — and
// even on an ordinary scroll, screenshotting the instant the card itself
// looks settled could still catch the icon mid-delay, still at opacity 0.
// A button's icon has to just be there; the CSS hover/active/focus-visible
// nudges below (leaf tilt, plane lift, tile fan) still give it life on
// interaction, with zero dependency on scroll timing.
function PlatformMark({ id }) {
  const parts = PLATFORM_PARTS[id]
  if (!parts) return null
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`platform-mark platform-mark--${id}`}>
      {parts.map(({ tag, cls, ...attrs }, i) => {
        const Tag = tag
        return <Tag key={i} className={cls} {...attrs} />
      })}
    </svg>
  )
}

// APPS' `tag` field is always "Platform · Category" (e.g. "iOS · Events") —
// split once here rather than touching data/site.js, so the card can show a
// coloured platform eyebrow above the name and a discipline pill below it,
// the same role/owns split the Crew cards use, without inventing new copy.
function splitTag(tag) {
  const parts = (tag || '').split(' · ')
  return parts.length === 2 ? { platform: parts[0], category: parts[1] } : { platform: '', category: tag || '' }
}

function PhoneCard({ app, i }) {
  const [c1, c2] = app.grad
  const { platform, category } = splitTag(app.tag)
  const cardRef = useRef(null)
  const shotRef = useRef(null)
  const coarse = useCoarsePointer()
  const reduced = useReducedMotion()

  // Touch: no hover, so pan the screenshot's object-position from the
  // card's own journey through the viewport (0-100% across the card's transit).
  useEffect(() => {
    if (!coarse || reduced || !app.shot) return
    const card = cardRef.current
    const shot = shotRef.current
    if (!card || !shot) return
    let raf = null
    const update = () => {
      raf = null
      const r = card.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      const total = r.height + vh
      const traveled = vh - r.top
      const progress = Math.min(1, Math.max(0, traveled / total))
      shot.style.setProperty('--pan', `${progress * 100}%`)
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [coarse, reduced, app.shot])

  // Tight per-row stagger (<=~35ms/item) so a row of three settles almost
  // as one gesture rather than a visible cascade the eye has to wait out.
  const rowDelay = (i % 3) * 0.035

  // The ambient card glow reads --g1/--g2 from the cell rather than from a
  // per-position CSS rule, so the colours cannot drift out of step with APPS
  // if the list is ever reordered.
  return (
    <Reveal delay={rowDelay} className="app-cell" style={{ '--g1': c1, '--g2': c2 }}>
      <article className="app-card" data-cursor ref={cardRef}>
        <div className="app-phone" style={{ '--g1': c1, '--g2': c2 }}>
          <div className="app-screen">
            {app.shot
              ? <img ref={shotRef} className="app-shot" src={app.shot} alt={`${app.name} — real app screenshot`} loading="lazy" />
              : <AppScreen slug={app.screen} />}
            <i className="app-sheen" aria-hidden="true" />
          </div>
          {/* the real device: a stock iPhone 14 Pro mockup keyed to alpha, with
              its display punched out so the live UI shows through from behind
              and the Dynamic Island still sits on top of it */}
          <img className="app-frame" src="/img/devices/iphone-frame.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
          {app.shot
            ? <span className="app-real" aria-hidden="true">REAL BUILD</span>
            : <span className="app-concept" aria-hidden="true">IN THE LAB</span>}
          <div className="app-glow" aria-hidden="true" />
        </div>
        <div className="app-meta">
          {platform && <span className="app-eyebrow">{platform}</span>}
          {/* Apps that ship a real icon get it shown as the squircle the
              user actually taps on their home screen, sitting inline with
              the name. Apps without one fall back to the name alone rather
              than to a placeholder tile. */}
          <h3 className={app.logo ? 'has-mark' : undefined}>
            {app.logo && (
              <img className="app-mark" src={app.logo} alt=""
                aria-hidden="true" loading="lazy" decoding="async" width="34" height="34" />
            )}
            <span>{app.name}</span>
          </h3>
          {category && <span className="app-pill">{category}</span>}
          <p>{app.blurb}</p>
          {/* Real store links are pending — see the DOWNLOADS map at the top
              of this file. Every button below is a working, focusable control
              that goes nowhere on purpose until the client supplies real URLs. */}
          {Object.keys(DOWNLOADS[app.name] || {}).length > 0 && (
            <>
              <i className="app-meta-divider" aria-hidden="true" />
              <div className="dl-row" role="group" aria-label={`${app.name} — downloads`}>
                {Object.entries(DOWNLOADS[app.name]).map(([id, href]) => (
                  <DownloadButton key={id} id={id} href={href} />
                ))}
              </div>
            </>
          )}
        </div>
        <i className="app-thread" aria-hidden="true" />
      </article>
    </Reveal>
  )
}

export function AppsShowcase() {
  return (
    <section className="apps" id="apps">
      <div className="section-head">
        <p className="kicker"><span>02</span> Apps we built</p>
        <SplitWords as="h2" className="h2" text="We don’t just market software. We ship it." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            {/* Six of the seven carry a REAL BUILD badge and are genuine captures —
                from the simulator, from a LiDAR device, from a real iPhone, and
                from the running web app. The claim names them rather than
                implying everything came out of the simulator. */}
            These phones are not mockups. Every screen wearing a{' '}
            <strong>REAL BUILD</strong> badge was captured from the running app —
            in the simulator, on-device, or in the browser.
          </p>
        </Reveal>
        <Reveal delay={0.22}>
          <div className="apps-status">
            <LiveBadge label="App Store — live" />
            <LiveBadge label="TestFlight — beta" />
            <LiveBadge label="Simulator · device · browser" />
          </div>
        </Reveal>
      </div>
      <div className="apps-grid apps-grid--woven">
        {APPS.map((a, i) => <PhoneCard key={a.name} app={a} i={i} />)}
      </div>
    </section>
  )
}

// One accent per tool, hand-picked so no two neighbours in the 3-col grid
// share a colour — the chrome bar's status dot and hover glow key off it.
const TOOL_ACCENT = {
  KUN: 'var(--cyan)',
  ORBIT: 'var(--violet)',
  ATELIER: 'var(--magenta)',
  'SPLAT LAB': 'var(--gold)',
  '2D→3D STUDIO': 'var(--cyan)',
  TESSERA: 'var(--violet)',
}
// The two light-UI captures (cream terminal, washed studio render) need a
// stronger contrast wash than the dark-UI tools to sit level with them.
const TOOL_TONE = { KUN: 'light', ATELIER: 'light' }
// Composition varies shot to shot — this keeps the part that actually reads
// (the model, the canvas, the headline) inside frame instead of a blind crop.
const TOOL_FOCUS = {
  KUN: '55% 32%',
  ORBIT: '50% 42%',
  ATELIER: '50% 48%',
  '2D→3D STUDIO': '38% 42%',
  TESSERA: '32% 40%',
}

function LabCard({ t, i }) {
  const coarse = useCoarsePointer()
  const [xray, setXray] = useState(false)
  const tappable = coarse && !!t.shot

  const onTap = () => {
    if (!tappable) return
    setXray((v) => !v)
  }
  const onKeyDown = (e) => {
    if (!tappable) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap() }
  }

  return (
    <Reveal delay={(i % 3) * 0.035}>
      <article
        className={`lab-card ${xray ? 'is-xray' : ''}`}
        data-cursor
        style={{ '--tool-accent': TOOL_ACCENT[t.name] || 'var(--cyan)' }}
      >
        {/* The tool preview now runs on a real machine: a stock MacBook Pro
            mockup keyed to alpha (scripts/make-device-frames.mjs) sitting
            behind the preview, which is pinned to the display's exact rect. */}
        <div className="lab-mac">
        <img className="lab-mac-frame" src="/img/devices/macbook-frame.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <div
          className={`lab-preview-wrap ${t.shot ? 'has-shot' : ''} ${tappable ? 'is-tappable' : ''}`}
          data-tone={TOOL_TONE[t.name] || 'dark'}
          role={tappable ? 'button' : undefined}
          tabIndex={tappable ? 0 : undefined}
          aria-pressed={tappable ? xray : undefined}
          aria-label={tappable ? `${t.name} — toggle real screenshot` : undefined}
          onClick={onTap}
          onKeyDown={onKeyDown}
        >
          <span className="lab-chrome" aria-hidden="true">
            <span className="lab-chrome-dots"><i /><i /><i /></span>
            <span className="lab-chrome-name">{t.name.toLowerCase()}</span>
            <span className="lab-chrome-status" />
          </span>
          <LabPreview name={t.name} />
          {t.shot ? (
            <>
              <img
                className="lab-shot"
                src={t.shot}
                alt={`${t.name} — real tool screenshot`}
                loading="lazy"
                style={{ objectPosition: TOOL_FOCUS[t.name] || '50% 40%' }}
              />
              <span className="lab-veil" aria-hidden="true" />
              <span className="lab-real" aria-hidden="true">REAL TOOL</span>
            </>
          ) : (
            <span className="lab-live-badge" aria-hidden="true">LIVE RENDER</span>
          )}
          <span className="lab-floor" aria-hidden="true" />
        </div>
        </div>
        <p className="lab-kicker">{t.kicker}</p>
        <header>
          <h3>{t.name}</h3>
          <span className="lab-tag">{t.tag}</span>
        </header>
        <p className="lab-blurb">{t.blurb}</p>
        {Object.keys(TOOL_DOWNLOADS[t.name] || {}).length > 0 && (
          <>
            <i className="lab-meta-divider" aria-hidden="true" />
            <div className="dl-row dl-row--lab" role="group" aria-label={`${t.name} — downloads`}>
              {Object.entries(TOOL_DOWNLOADS[t.name]).map(([id, href]) => (
                <DownloadButton key={id} id={id} href={href} />
              ))}
            </div>
          </>
        )}
        <i className="lab-thread" aria-hidden="true" />
      </article>
    </Reveal>
  )
}

export function ToolsLab() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-4%', '4%'])
  return (
    <section className="lab" id="lab" ref={ref}>
      <motion.div className="lab-bg" style={{ y }} aria-hidden="true" />
      <div className="section-head">
        <p className="kicker kicker--light"><span>03</span> The 3D Lab</p>
        <SplitWords as="h2" className="h2 h2--light" text="We built our own tools. Then we built yours." />
        <Reveal delay={0.15}>
          <p className="lede lede--light" style={{ marginTop: 22 }}>
            Six machines engineered in-house — scanners, editors, generators. What you see is
            the software actually running; hover or tap any card to x-ray into how it thinks.
          </p>
        </Reveal>
      </div>
      <div className="lab-grid">
        {TOOLS.map((t, i) => <LabCard key={t.name} t={t} i={i} />)}
      </div>
    </section>
  )
}
