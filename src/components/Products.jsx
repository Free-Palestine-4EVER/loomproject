// LOOM-built software, in two sections:
//
//   <AppsShowcase />  "THE STAGE" — one phone centre stage, an icon rail of
//                     real tabs switching what is on it.
//   <ToolsLab />      "THE SUITE" — the six in-house tools presented as one
//                     piece of software with six modules.
//
// Both replace the previous designs (a seven-phone grid and a six-card lab
// wall) for one measured reason: cost. Between them those two carried 23
// `infinite` CSS animations — six looping phone UIs from AppScreens.jsx and
// six looping tool previews from LabPreviews.jsx — plus seven device mockups,
// seven parallax listeners and a scroll-driven background. src/lib/
// viewportBudget.js existed largely to park them off-screen.
//
// Neither of these sections has a single unconditional loop. Nothing animates
// at rest; the only animation that repeats at all is the scan line inside the
// SPLAT LAB pane, and it only exists while that module is the selected one.
// AppScreens.jsx and LabPreviews.jsx (and their two stylesheets, and
// products-touch.css) are no longer imported anywhere — that is where the
// 23 loops went. products-showcase.css is still imported: it owns the .dl-*
// download-chip system, which both sections still use.
//
// NOTE for src/lib/viewportBudget.js: its animation budget keys off
// `.app-card, .lab-card`, neither of which is rendered any more. That pass is
// now inert by construction rather than broken — there is nothing left to
// park. Its IMAGE budget still does real work here (the stage stacks seven
// screenshots in one phone) and is untouched.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { APPS, TOOLS } from '../data/site.js'
import { SplitWords, Reveal } from '../lib/motion.jsx'
import { LiveBadge } from './Rich.jsx'
import './products-showcase.css'   // .dl-row / .dl-btn / .platform-mark
import './products-stage.css'      // both new sections
import './heads-v7.css'            // .apps-status

// Minimal platform/store marks, drawn in the house 1.5px stroke style.
// Each icon is a small array of primitives rather than one fused path —
// that's what lets hover nudge one piece (a leaf, a tile, a plane) instead
// of the glyph as a dead block.
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
  // A drawn nod to the Play triangle, not a trace of the trademarked mark.
  googleplay: [
    { tag: 'path', cls: 'pm-triangle', d: 'M6 3.6 20 12 6 20.4Z' },
    { tag: 'path', cls: 'pm-seam', d: 'M6 3.6 15 12M6 20.4 15 12' },
  ],
}

// ————————————————————————————————————————————————————————————
// DOWNLOAD LINKS. An href of '#' is a placeholder and renders as a dead
// (but focusable) button; anything else renders as a real anchor that opens
// in a new tab — see DownloadButton.
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
// dead button to a live anchor (with a pulsing dot) with no other edit.
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

// Same mock-link contract, for the 3D Lab / software suite.
// Picked per tool's actual runtime, not a uniform "all four buttons" grid:
//  - KUN, ORBIT, ATELIER, TESSERA run today as browser tools (localhost
//    servers) — a Windows/macOS installer for these doesn't exist yet.
//  - SPLAT LAB trains on Apple-silicon Metal specifically — it is a macOS
//    tool by nature, so it gets a mac link and nothing else.
//  - 2D→3D STUDIO is the one tool that is genuinely packaged as desktop
//    software today (the Evora Studio installer: a signed-off .dmg and a
//    licensed .exe) — the only module that earns both buttons.
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
// one-time cinematic reveal. (An earlier version gated this on its own
// `useInView`, which is what once made the icon read as permanently missing:
// a fast/anchor-jump scroll can carry an element from "not yet visible" to
// "already scrolled past" in one frame.)
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

/* The product icon. Only KwaKwa ships a real icon file; every other app's is
   drawn from the two fields site.js already carries — `grad` (the colour
   pair) and `glyph` (a 24×24 stroke path). A gradient squircle costs no
   network request and no filter, so a rail of seven of them is free. */
function ProductIcon({ app, className = '' }) {
  if (app.logo) {
    return (
      <span className={`pi pi--photo ${className}`}>
        <img src={app.logo} alt="" aria-hidden="true" loading="lazy" decoding="async" width="58" height="58" />
      </span>
    )
  }
  return (
    <span className={`pi ${className}`} style={{ '--g1': app.grad[0], '--g2': app.grad[1] }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d={app.glyph} /></svg>
    </span>
  )
}

/* Only two products have a public distribution channel. Rather than invent a
   status for the other five, the badge falls back to the platform — which is
   a fact rather than a claim. */
function StoreTag({ app }) {
  if (app.store) return <span className="pstore" data-s={app.store}><i />{app.store}</span>
  return <span className="pstore">{app.platforms[0] === 'web' ? 'Web app' : 'iOS'}</span>
}

const two = (n) => String(n + 1).padStart(2, '0')
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* Shared tab keyboard behaviour for both sections' rails.

   Both rails are real WAI-ARIA tabs, not click-only divs: one tab stop for
   the whole list (roving tabindex), arrows move selection AND focus, Home/End
   jump to the ends. Both arrow axes are accepted deliberately — each rail is
   vertical on desktop and horizontal on a phone, so hard-coding one axis
   would leave half the layouts unoperable. */
function useTabList(count, index, setIndex) {
  const refs = useRef([])
  const onKeyDown = useCallback((e) => {
    let next = null
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (index + 1) % count
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (index - 1 + count) % count
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = count - 1
    if (next === null) return
    e.preventDefault()
    setIndex(next)
    refs.current[next]?.focus()
  }, [count, index, setIndex])
  return { refs, onKeyDown }
}

// ═══════════════════════════════════════════════════════════════
// #apps · THE STAGE
// One phone centre stage, an icon rail of real tabs switching what is on it.
// Each app may carry several captures (`shots`); the phone cycles them on a
// 2-second beat so a product shows more than one screen without the reader
// having to do anything.
// ═══════════════════════════════════════════════════════════════

const SHOT_MS = 2000

/* Which images this app puts on the stage, and whether they bring their own
   device with them.

   An app with `mocks` ships RENDERED mockups — the phone is already inside the
   image, at its own tilt, on a transparent background. Those replace the
   stage's iPhone frame rather than sitting inside it: pasting a picture of a
   tilted phone into the flat frame's screen cut-out would read as a phone
   photographed on a phone. Everything else is a flat screen capture and goes
   behind the frame's glass, as before. */
const stageShots = (app) => {
  if (app.mocks?.length) return { list: app.mocks, framed: false }
  if (app.shots?.length) return { list: app.shots, framed: true }
  return { list: app.shot ? [app.shot] : [], framed: true }
}

/* THREE PHONES FOR EVERY APP.
   The client's ask: the three-up fan is the presentation for the whole stage,
   not just for the one product that happens to ship three renders.

   `stageTrio` deals an app's captures into exactly three slots — 0 left,
   1 middle (the hero, in front and at full size), 2 right — the same order the
   fan has always been composed in. Images are dealt round-robin, so an app
   that later grows to six captures gets two per slot and each slot crossfades
   its own pair on the existing 2-second beat.

   An app with FEWER than three captures has its slots padded from what it has,
   and `padded` is set. That is the placeholder state the client accepted until
   real per-slot captures exist: the same picture three times at the same size
   would read as a rendering bug, so a padded slot is also given a CROP (see
   CROPS below) — the outer two zoom into the top and the bottom of the screen
   while the hero shows it whole, on top of the fan's own scale/rotation/depth.

   Swapping in real per-slot imagery later is a one-line data change in
   site.js — add `shots: [a, b, c]` (or `mocks:`) to the app and `padded` goes
   false on its own, which switches every crop off. Nothing here changes.

   An app with NO capture at all (TrueSize AR) returns no slots and keeps its
   stated "no public capture" panel — it is never given fabricated imagery. */
const SLOTS = 3
const CROPS = ['a', null, 'c']

const stageTrio = (app) => {
  const { list, framed } = stageShots(app)
  if (!list.length) return { slots: [], framed, padded: false }
  const slots = Array.from({ length: SLOTS }, () => [])
  list.forEach((src, n) => { slots[n % SLOTS].push(src) })
  const padded = list.length < SLOTS
  for (let n = list.length; n < SLOTS; n++) slots[n] = [list[n % list.length]]
  return { slots, framed, padded }
}

/* The captures for one slot, stacked and crossfaded.
   All of a slot's images are in the DOM at once and only `opacity` changes, so
   a beat never causes a layout pass or a decode stall. The timer is a single
   interval that exists ONLY while the slot holds more than one image and the
   reader hasn't asked for reduced motion — every app on the stage today deals
   one image per slot, so at rest this costs nothing at all. */
function ShotCycle({ app, shots, on, reduced, hero = true, crop }) {
  const [k, setK] = useState(0)

  useEffect(() => {
    setK(0)
    if (reduced || !on || shots.length < 2) return undefined
    const id = setInterval(() => setK((v) => (v + 1) % shots.length), SHOT_MS)
    return () => clearInterval(id)
  }, [shots, on, reduced])

  if (!shots.length) {
    /* the one app with no capture gets a stated panel rather than an empty
       frame — TrueSize AR is an AR session, and a still would misrepresent it */
    return (
      <div className={`stg-noshot ${on ? 'is-on' : ''}`} aria-hidden={on ? undefined : true}>
        <ProductIcon app={app} />
        <p>No public capture yet<br />— AR sessions don’t screenshot well</p>
      </div>
    )
  }

  return (
    <>
      {shots.map((src, n) => (
        <img
          key={src}
          className={on && n === k ? 'is-on' : undefined}
          src={src}
          data-crop={crop || undefined}
          alt={hero && n === 0 ? `${app.name} — real app screenshot` : ''}
          aria-hidden={hero && on && n === k ? undefined : true}
          loading="lazy"
          decoding="async"
        />
      ))}
      {/* the beat, made visible: one pip per capture, so the reader knows the
          screen is going to change before it does */}
      {shots.length > 1 && on && (
        <span className="stg-pips" aria-hidden="true">
          {shots.map((s, n) => <i key={s} data-on={n === k} />)}
        </span>
      )}
    </>
  )
}

/* The stage pins for `APPS.length` slices of scroll, so scrolling THROUGH the
   section walks the rail on its own — the same contract the deck below already
   runs on (scroll POSITION is the only input; nothing is hijacked, no wheel
   listener, the scrollbar and a deep link drive it identically). The rail's
   tabs still work: a click scrolls to that app's slice rather than setting
   state, otherwise the next scroll event would snap the copy straight back.

   The pin is off on phones and on short viewports (`STAGE_PIN`) — a card
   taller than the viewport cannot sit still inside a sticky 100vh box — and
   off under reduced motion. In every one of those cases the section falls back
   to exactly what it was before: a normal-height card driven only by clicks. */
const STAGE_PIN = '(min-width: 761px) and (min-height: 620px)'

export function AppsShowcase() {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const wrapRef = useRef(null)
  const N = APPS.length

  /* Scroll to an app's slice of the pin. Lenis owns window.scrollTo on this
     site, so it is asked directly when it exists. Falls back to setting state
     when the section isn't pinned (mobile / reduced motion). */
  const goTo = useCallback((n) => {
    const wrap = wrapRef.current
    const total = wrap ? wrap.offsetHeight - window.innerHeight : 0
    // The media query is checked here as well as in the driver, and it has to
    // be: an unpinned track can still be taller than a short viewport, and
    // scrolling to a slice of a timeline nothing is reading would leave the
    // rail stuck on whatever it was showing.
    const pinned = !reduced && window.matchMedia(STAGE_PIN).matches && total > 0
    if (!pinned) { setI(n); return }
    const top = wrap.getBoundingClientRect().top + window.scrollY
    const y = top + (n / (N - 1)) * total
    if (window.__lenis) window.__lenis.scrollTo(y)
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }, [N, reduced])

  const { refs, onKeyDown } = useTabList(N, i, goTo)

  // ——— the scroll driver ———
  useEffect(() => {
    if (reduced) return undefined
    const mq = window.matchMedia(STAGE_PIN)
    let raf = 0
    const paint = () => {
      raf = 0
      const wrap = wrapRef.current
      if (!wrap || !mq.matches) return
      const total = wrap.offsetHeight - window.innerHeight
      if (total <= 0) return
      const y = Math.min(Math.max(-wrap.getBoundingClientRect().top, 0), total)
      // rounded, not eased: the stage has no intermediate state to draw — a
      // tab is either the selected one or it isn't, so the only thing scroll
      // position decides is WHEN the crossfade fires
      const near = Math.round((y / total) * (N - 1))
      setI((v) => (v === near ? v : near))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint) }
    paint()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    mq.addEventListener('change', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      mq.removeEventListener('change', onScroll)
    }
  }, [reduced, N])

  const app = APPS[i]
  const dl = DOWNLOADS[app.name] || {}
  // memoised so each slot's array keeps its identity between renders — the
  // crossfade timer inside ShotCycle keys off it
  const trio = useMemo(() => stageTrio(app), [app])

  return (
    <section className="apps" id="apps">
      <div className="section-head">
        <p className="kicker"><span>01</span> Apps we built</p>
        <SplitWords as="h2" className="h2" text="We don’t just market software. We ship it." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            {/* Six of the seven carry a REAL BUILD chip and are genuine captures —
                from the simulator, from a LiDAR device, from a real iPhone, and
                from the running web app. The claim names them rather than
                implying everything came out of the simulator. */}
            Seven products, one stage. <strong>Just scroll</strong> — the stage changes
            itself, and the rail is there when you want to jump. Every screen wearing a{' '}
            <strong>REAL BUILD</strong> chip was captured from the running app,
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

      {/* the tall element. Its height IS the rail's timeline; the sticky child
          is what the reader actually sees. Both collapse to nothing under the
          media query in the stylesheet, which is the mobile/reduced fallback. */}
      <div
        className={`stg-scroll${reduced ? ' stg-scroll--flat' : ''}`}
        ref={wrapRef}
        style={{ '--steps': N - 1 }}
      >
      <div className="stg-pin">
      {/* the card carries the selected app's own colour pair, which is all the
          aura and the floor pool below the device are made of — a colour
          transition on two gradients, not a repaint of anything */}
      <div className="stg" style={{ '--g1': app.grad[0], '--g2': app.grad[1] }}>
        <div className="stg-aura" aria-hidden="true" />
        <div className="stg-rail" role="tablist" aria-label="Choose an app" onKeyDown={onKeyDown}>
          {APPS.map((a, n) => (
            <button
              key={a.name}
              type="button"
              role="tab"
              id={`stg-tab-${n}`}
              ref={(el) => { refs.current[n] = el }}
              aria-selected={n === i}
              aria-controls="stg-panel"
              tabIndex={n === i ? 0 : -1}
              onClick={() => goTo(n)}
              data-cursor
            >
              {/* the accessible name of the tab — the icon itself is decorative */}
              <span className="p-sr-only">{a.name}</span>
              <ProductIcon app={a} />
            </button>
          ))}
        </div>

        {/* The tabpanel is the whole right-hand half — identity AND imagery —
            because both of them change when the rail changes tab, and a
            tabpanel that only covered the phones would leave the app's name,
            blurb and download chips outside the thing the tab controls.

            Inside it, the reading order is the client's: identity first
            (icon, name, tags, blurb, CTA, counter), imagery second. DOM order
            and visual order agree, left to right on a desktop and top to
            bottom once the two columns stack — no CSS `order` anywhere, so
            keyboard and screen-reader order is the same order the page reads
            in. */}
        <div
          className="stg-stage"
          role="tabpanel"
          id="stg-panel"
          aria-labelledby={`stg-tab-${i}`}
        >
          <div className="stg-info">
            <div className="stg-id">
              <ProductIcon app={app} className="stg-icon" />
              <div>
                <h3>{app.name}</h3>
                {/* no dir="rtl": the Arabic name is a single word inside an LTR
                    paragraph, and forcing RTL right-aligns it to the far edge of
                    the info column, half a screen from the Latin name above it */}
                {app.ar && <div className="stg-ar" lang="ar">{app.ar}</div>}
              </div>
            </div>
            <div className="stg-tag">{app.tag}</div>
            <p className="stg-blurb">{app.blurb}</p>
            <div className="stg-meta">
              <StoreTag app={app} />
              {app.store && <span className="pstore">{app.platforms[0] === 'web' ? 'Web app' : 'iOS'}</span>}
              <span className="pstore pstore--real">{app.shot ? 'Real build' : 'In the lab'}</span>
            </div>
            {/* Real store links are pending — see the DOWNLOADS map at the top
                of this file. Every button below is a working, focusable control
                that goes nowhere on purpose until the client supplies real URLs. */}
            {Object.keys(dl).length > 0 && (
              <div className="dl-row" role="group" aria-label={`${app.name} — downloads`}>
                {Object.entries(dl).map(([id, href]) => (
                  <DownloadButton key={id} id={id} href={href} />
                ))}
              </div>
            )}
            {/* the same progress rule the deck carries, for the same reason:
                once scroll drives the switch, the reader needs to see how far
                through the set they are */}
            <div className="stg-count">
              <b>{two(i)}</b> / {two(N - 1)} — LOOM-built products
              <i aria-hidden="true" style={{ '--w': `${(i / (N - 1)) * 100}%` }} />
            </div>
          </div>

          {/* The imagery column. Three phones for every app that has a capture:

              framed — the stock iPhone 14 Pro mockup the site already ships
                (keyed to alpha by scripts/make-device-frames.mjs) with its
                display punched out, so a flat screen capture shows through and
                the Dynamic Island still sits on top of it. One frame per slot.

              unframed — the app ships rendered mockups that already contain a
                device (see `mocks` in site.js). The frame and the glass are not
                rendered at all; the render IS the device.

              Either way all three are on stage at once rather than cycled:
              three phones read as a product family in one glance, where one
              phone swapping every two seconds asks the reader to wait for the
              set. A slot dealt more than one image still crossfades its own
              pile on the 2s beat — see ShotCycle.

              Only the SELECTED app's images are mounted, because the two modes
              are different boxes — keeping all seven stacked would mean
              stacking a framed phone and a free-standing render in the same
              slot. */}
          <div className={`stg-panel${trio.slots.length ? ' stg-panel--fan' : ''}`}>
            <div className="stg-phone-wrap">
              {trio.slots.length === 0 ? (
                /* no capture on file — one honest panel, not three of it */
                <div className="stg-phone">
                  <div className="stg-glass">
                    <ShotCycle key={app.name} app={app} shots={[]} on reduced={reduced} />
                  </div>
                  <img className="stg-frame" src="/img/devices/iphone-frame.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
                </div>
              ) : (
                <div className={`stg-fan${trio.framed ? ' stg-fan--framed' : ''}`} key={app.name}>
                  {trio.slots.map((srcs, n) => (
                    // the slot index IS the identity here — there are always
                    // exactly three, and the fan itself is keyed on the app
                    <div className="stg-mock" key={n}>
                      {trio.framed ? (
                        <div className="stg-phone">
                          <div className="stg-glass">
                            <ShotCycle
                              app={app}
                              shots={srcs}
                              on
                              reduced={reduced}
                              hero={n === 1}
                              crop={trio.padded ? CROPS[n] : null}
                            />
                          </div>
                          <img className="stg-frame" src="/img/devices/iphone-frame.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
                        </div>
                      ) : (
                        /* rendered mockups are dealt one per slot by
                           construction; the first is the one that shows */
                        <img
                          src={srcs[0]}
                          alt={n === 1 ? `${app.name} — real app screens` : ''}
                          aria-hidden={n === 1 ? undefined : true}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// #lab · THE DECK
//
// The six in-house tools on one turntable. The section is `--steps` viewports
// tall with a sticky 100vh stage inside it, so ordinary scrolling (wheel,
// trackpad, spacebar, keyboard, Lenis) advances the carousel — nothing is
// hijacked and nothing listens for `wheel`. The only input is scroll
// POSITION, which means the browser's own scrollbar, a deep link and a rail
// click all drive it identically.
//
// Each tool is drawn as its own application window in CSS rather than pasted
// into a device photograph: a photo cannot be rotated in 3D without its chrome
// and its screen shearing apart, which is the whole trick here.
//
// LATER — rendered mockups. Any tool may carry an optional `mock` field (a
// render with its own environment baked in). When one is present the deck
// drops the CSS window for that tool and shows the render full-bleed instead.
// That is the only edit needed: add `mock: '/img/lab/x-mock.webp'` in site.js.
// ═══════════════════════════════════════════════════════════════

/* smootherstep — the dwell curve. Raw scroll progress is linear, which makes
   every card drift through centre at constant speed and never *arrive*.
   Easing each unit segment by 6t⁵−15t⁴+10t³ makes the deck sit still on a
   tool for most of its segment and cross to the next one quickly. */
const smoother = (f) => f * f * f * (f * (f * 6 - 15) + 10)

/* The console line. It types, because output typing out reads as a machine
   answering rather than as a paragraph of marketing — but it is a plain
   setInterval over a string with one caret element, it stops the moment the
   line is finished, and it does not run at all under reduced motion. */
function Console({ tool, reduced }) {
  const [typed, setTyped] = useState(tool.blurb)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (reduced) { setTyped(tool.blurb); setBusy(false); return }
    const text = tool.blurb
    let n = 0
    setTyped('')
    setBusy(true)
    const id = setInterval(() => {
      n += 1
      setTyped(text.slice(0, n))
      if (n >= text.length) { clearInterval(id); setBusy(false) }
    }, 14)
    return () => { clearInterval(id); setBusy(false) }
  }, [tool, reduced])

  return (
    <div className="sui-console">
      <p className="row">
        <span className="p">loom</span> <span className="c">~/lab</span> $ open{' '}
        <span className="out">{slug(tool.name)} — {tool.kicker.toLowerCase()}</span>
      </p>
      {/* The typing line is decorative to assistive tech — announcing it
          would fire once per character. The whole sentence is exposed once,
          in one node, instead. */}
      <p className="row out" aria-hidden="true">
        {typed}
        {busy && <span className="sui-caret" aria-hidden="true" />}
      </p>
      <p className="p-sr-only">{tool.blurb}</p>
    </div>
  )
}

/* One tool's seat on the turntable. Everything positional is written by the
   scroll driver straight onto the node (transform / opacity / z-index /
   --dim), never through React state — six nodes × one transform each per
   frame, no re-render. */
function DeckWindow({ tool, n, onPick, active, refCb }) {
  return (
    <div className="dk-slot" ref={refCb} data-n={n} aria-hidden={active ? undefined : true}>
      <button
        type="button"
        className="dk-card"
        onClick={() => onPick(n)}
        tabIndex={-1}
        aria-label={`Show ${tool.name}`}
        data-cursor
      >
        {/* The laptop, drawn — lid, display, hinge and base are four CSS
            boxes, not a photograph. A photo cannot be rotated in 3D without
            its chrome and its screen shearing apart, which is the whole trick
            this deck runs on; drawn, the whole machine turns as one solid. */}
        <span className="dk-body">
          <span className="dk-lid">
            <span className="dk-display">
              {/* the camera housing, so the lid reads as a modern laptop
                  rather than a generic dark rectangle */}
              <span className="dk-notch" aria-hidden="true" />
              {tool.mock ? (
                <img className="dk-mock" src={tool.mock} alt={`${tool.name} — product mockup`} loading="lazy" decoding="async" />
              ) : (
                <>
                  <span className="dk-chrome" aria-hidden="true">
                    <i /><i /><i />
                    <em>{slug(tool.name)}.tool</em>
                  </span>
                  <span className="dk-screen">
                    {tool.shot ? (
                      <img src={tool.shot} alt={`${tool.name} — real tool screenshot`} loading="lazy" decoding="async" />
                    ) : (
                      /* SPLAT LAB has no still, and one would be a lie: its
                         output is a live splat, not a frame. The pane says so,
                         in the language of the tool. */
                      <span className="dk-cloud">
                        <em>
                          no still on file
                          <b>output is a live splat — 1.2 M gaussians</b>
                          <b>captured · trained · streamed</b>
                        </em>
                      </span>
                    )}
                  </span>
                </>
              )}
              {/* the light that sells the tilt: one sheen sweep across the
                  glass, and one flat scrim that deepens with distance from
                  centre. Both sit INSIDE the display, so the aluminium keeps
                  its own shading instead of being washed with the glare. */}
              <span className="dk-sheen" aria-hidden="true" />
              <span className="dk-scrim" aria-hidden="true" />
            </span>
          </span>
          {/* the deck: a touch wider than the lid, with the thumb scoop cut
              out of its front edge */}
          <span className="dk-base" aria-hidden="true"><i /></span>
        </span>
      </button>
    </div>
  )
}

export function ToolsLab() {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const { refs, onKeyDown } = useTabList(TOOLS.length, i, setI)
  const wrapRef = useRef(null)
  const slots = useRef([])
  const N = TOOLS.length
  const tool = TOOLS[i]
  const dl = useMemo(() => TOOL_DOWNLOADS[tool.name] || {}, [tool])

  /* Write one transform per card for a fractional index `p`. Called from the
     scroll driver, and once directly whenever the reduced-motion fallback
     changes tab. */
  const place = useCallback((p) => {
    for (let n = 0; n < N; n++) {
      const el = slots.current[n]
      if (!el) continue
      const d = n - p
      const a = Math.abs(d)
      const s = Math.sign(d)
      // the fan compresses as it recedes (1 − e^-a), so six wide windows still
      // fit in one viewport instead of marching off the sides in a straight line
      const x = s * (1 - Math.exp(-a * 0.82)) * 58
      const ry = -s * Math.min(a, 2.4) * 30
      const z = -Math.min(a, 3) * 240
      const sc = Math.max(0.6, 1 - a * 0.105)
      const lift = Math.min(a, 3) * 16
      const gone = a > 3.05
      el.style.transform = `translate3d(${x}%, ${lift}px, ${z}px) rotateY(${ry}deg) scale(${sc})`
      el.style.opacity = gone ? '0' : String(Math.max(0, 1 - Math.max(0, a - 2.2) * 1.2))
      el.style.visibility = gone ? 'hidden' : 'visible'
      el.style.zIndex = String(200 - Math.round(a * 20))
      el.style.setProperty('--dim', String(Math.min(0.72, a * 0.34)))
    }
  }, [N])

  // ——— the scroll driver ———
  useEffect(() => {
    if (reduced) { place(i); return undefined }
    const wrap = wrapRef.current
    if (!wrap) return undefined
    let raf = 0
    const paint = () => {
      raf = 0
      const total = wrap.offsetHeight - window.innerHeight
      if (total <= 0) { place(i); return }
      const y = Math.min(Math.max(-wrap.getBoundingClientRect().top, 0), total)
      const raw = (y / total) * (N - 1)
      const seg = Math.min(Math.floor(raw), N - 2)
      const p = seg + smoother(raw - seg)
      place(p)
      const near = Math.round(p)
      setI((v) => (v === near ? v : near))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint) }
    paint()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
    // `i` is read only as a fallback value inside paint; re-subscribing on
    // every index change would tear down the listener six times per pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, N, place])

  /* The motes are the one looping decoration in this section, so they are
     mounted on the compositor only while the deck is actually on screen —
     `.is-live` is the whole gate, and it is never added under reduced motion. */
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || reduced) return undefined
    const io = new IntersectionObserver(
      ([e]) => wrap.classList.toggle('is-live', e.isIntersecting),
      { rootMargin: '10% 0px' },
    )
    io.observe(wrap)
    return () => io.disconnect()
  }, [reduced])

  /* Rail clicks and side-card clicks scroll the page to that tool's slice of
     the pin rather than setting state — otherwise the copy would say one thing
     and the next scroll event would immediately snap it back. Lenis owns
     window.scrollTo on this site, so it is asked directly when it exists. */
  const goTo = useCallback((n) => {
    if (reduced) { setI(n); place(n); return }
    const wrap = wrapRef.current
    if (!wrap) return
    const total = wrap.offsetHeight - window.innerHeight
    if (total <= 0) { setI(n); return }
    // document-absolute, not offsetTop: the deck's offsetParent is not the
    // body once any ancestor becomes positioned, and offsetTop would then be
    // measured from the wrong origin
    const top = wrap.getBoundingClientRect().top + window.scrollY
    const y = top + (n / (N - 1)) * total
    if (window.__lenis) window.__lenis.scrollTo(y)
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }, [reduced, N, place])

  return (
    <section className="lab" id="lab">
      {/* static wash. It used to be a scroll-driven parallax layer; the
          parallax cost a scroll subscription and a transform on a very large
          element for an effect nobody could name. */}
      <div className="lab-bg" aria-hidden="true" />
      <div className="section-head">
        <p className="kicker kicker--light"><span>02</span> The 3D Lab</p>
        <SplitWords as="h2" className="h2 h2--light" text="We built our own tools. Then we built yours." />
        <Reveal delay={0.15}>
          <p className="lede lede--light" style={{ marginTop: 22 }}>
            Six machines engineered in-house — scanners, editors, generators — and not a
            shelf of experiments: one toolchain with six modules. <strong>Just scroll</strong>;
            every window on the deck is the software actually running.
          </p>
        </Reveal>
      </div>

      {/* the tall element. Its height IS the carousel's timeline; the sticky
          child is what the reader actually sees. */}
      <div
        className={`dk${reduced ? ' dk--flat' : ''}`}
        ref={wrapRef}
        style={{ '--steps': N - 1 }}
      >
        <div className="dk-pin">
          {/* the wash behind the deck, tinted by the tool currently centre
              stage — a colour transition, not a repaint of anything */}
          <div
            className="dk-aura"
            aria-hidden="true"
            style={{ '--g1': tool.grad?.[0] || '#7b2fbe', '--g2': tool.grad?.[1] || '#59e6ff' }}
          />
          {/* Scatter is computed here rather than in CSS: the obvious CSS
              version needs `mod()`, which is Chrome 125+/Safari 18 only, and
              would stack all fourteen motes in one corner everywhere else. */}
          <div className="dk-motes" aria-hidden="true">
            {Array.from({ length: 14 }, (_, k) => (
              <i key={k} style={{ '--k': k, left: `${4 + ((k * 37) % 92)}%`, top: `${8 + ((k * 53) % 78)}%` }} />
            ))}
          </div>

          <div className="dk-stage">
            <div className="dk-track">
              {TOOLS.map((t, n) => (
                <DeckWindow
                  key={t.name}
                  tool={t}
                  n={n}
                  active={n === i}
                  onPick={goTo}
                  refCb={(el) => { slots.current[n] = el }}
                />
              ))}
            </div>
            {/* the floor the reflection falls onto */}
            <div className="dk-floor" aria-hidden="true" />
          </div>

          {/* A coverflow is wider than the column it sits in — that is what
              makes it read as depth. The veil is what stops the receding cards
              from colliding with the rail and the copy: it fades the section's
              own background back in over the left and right thirds, so a card
              travelling out of frame dissolves into the page instead of
              sliding under a headline. */}
          <div className="dk-veil" aria-hidden="true" />

          {/* ——— the copy. Keyed on the tool so it re-mounts and replays its
              own entrance every time the deck lands on a new module. ——— */}
          <div className="dk-info" key={tool.name}>
            <div className="dk-id">
              <span className="dk-n" aria-hidden="true">{two(i)}</span>
              <div className="dk-id-t">
                <h3>{tool.name}</h3>
                <span className="dk-tag">{tool.kicker}</span>
              </div>
            </div>
            <Console tool={tool} reduced={reduced} />
            <div className="dk-meta">
              <span className="pill">{tool.tag}</span>
              <span className="dk-note">built in-house · not for sale</span>
            </div>
            {/* Real download links are pending — see TOOL_DOWNLOADS above.
                Filed as a command so the chrome stays honest. */}
            {Object.keys(dl).length > 0 && (
              <div className="sui-get">
                <span className="sui-get-lbl" aria-hidden="true">$ get</span>
                <div className="dl-row dl-row--lab" role="group" aria-label={`${tool.name} — downloads`}>
                  {Object.entries(dl).map(([id, href]) => (
                    <DownloadButton key={id} id={id} href={href} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ——— the rail. Still a real WAI-ARIA tablist: it is the keyboard
              and screen-reader route through the deck, and the only reason the
              carousel is operable without a mouse wheel. ——— */}
          <div className="dk-rail" role="tablist" aria-label="LOOM in-house tools" onKeyDown={onKeyDown}>
            {TOOLS.map((t, n) => (
              <button
                key={t.name}
                type="button"
                role="tab"
                id={`dk-tab-${n}`}
                ref={(el) => { refs.current[n] = el }}
                className="dk-mod"
                aria-selected={n === i}
                aria-controls="dk-info"
                tabIndex={n === i ? 0 : -1}
                onClick={() => goTo(n)}
                data-cursor
              >
                <span className="n" aria-hidden="true">{two(n)}</span>
                <span className="t">{t.name}</span>
              </button>
            ))}
          </div>

          <div className="dk-count">
            module <b>{two(i)}</b> / {two(N - 1)} — engineered in-house
            <i aria-hidden="true" style={{ '--w': `${(i / (N - 1)) * 100}%` }} />
          </div>
        </div>
      </div>
      {/* the tablist's panel: one live region carrying whatever the deck has
          landed on, so arrow-keying the rail announces the module */}
      <div id="dk-info" className="p-sr-only" role="tabpanel" aria-labelledby={`dk-tab-${i}`} aria-live="polite">
        {tool.name} — {tool.kicker}. {tool.blurb}
      </div>
    </section>
  )
}
