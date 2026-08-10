// LOOM-built software — ONE section, `#apps`, "THE STAGE".
//
// 10 Aug 2026: the client asked for six products (apps + software together,
// content from src/data/suite.js) but rejected the flat card grid it first
// shipped as ("not designed... make it change on scroll like it used to
// do"). This file restores the OLD `AppsShowcase` DESIGN — one product
// centre stage, an icon rail of real tabs, the featured product changing as
// the reader scrolls past a pinned card — but re-plumbed onto SUITE's six
// honest entries instead of the old seven-app roster, and WITHOUT the cost
// that design used to carry.
//
// What did NOT come back, on purpose:
//   - AppScreens.jsx's live animated device mockups (never imported here).
//   - The seven-capture "shot cycle" / three-phone fan (SUITE items carry
//     exactly one `art` image each — there is nothing to cycle or fan).
//   - #lab / ToolsLab. Gone, and its nav tab stays gone.
// Only the SELECTED product's image is ever mounted, so there is never more
// than one <img> decoding for the stage at a time; switching products swaps
// the DOM node rather than crossfading six pre-loaded ones.
//
// Every animated value here is transform/opacity (the fan-in entrance, the
// rail's selection tick, the aura's colour cross-fade) — nothing sizes,
// positions or filters per frame, and nothing loops unconditionally: the
// scroll driver is a single rAF-throttled `scroll` listener, passive, torn
// down on unmount, same contract as the rest of the site (Sections.jsx).
import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { SUITE } from '../data/suite.js'
import { SplitWords, Reveal } from '../lib/motion.jsx'
import { LiveBadge } from './Rich.jsx'
import './products-stage.css'      // .stg-* — the stage design
import './heads-v7.css'            // .apps-status

// Real dimensions of every file in public/img/suite/, read with
// `sharp(...).metadata()` — never guessed. Keyed by SUITE's own `key`.
// (Carried over from Suite.jsx, which this file replaces as the mount.)
const DIMS = {
  'evora-scan': { art: [440, 977], icon: [128, 128] },
  '2d3d': { art: [720, 325] },
  'quran-noor': { art: [720, 1561], icon: [128, 128] },
  kun: { art: [720, 325] },
  kwakwa: { art: [540, 1174], icon: [128, 128] },
  ellie: { art: [720, 1565], icon: [128, 128] },
}

const two = (n) => String(n + 1).padStart(2, '0')

/* The rail icon. Four of six items ship a real icon file; 2D3D and KUN don't
   (they're desktop tools, not app-store products with a square glyph) — those
   fall back to a gradient squircle carrying the product's own initial, drawn
   in CSS, so a rail of six never waits on a missing asset. */
function ProductIcon({ item, className = '' }) {
  const dims = DIMS[item.key]?.icon || [128, 128]
  if (item.icon) {
    return (
      <span className={`pi pi--photo ${className}`}>
        <img src={item.icon} alt="" aria-hidden="true" loading="lazy" decoding="async" width={dims[0]} height={dims[1]} />
      </span>
    )
  }
  return (
    <span className={`pi ${className}`} style={{ '--g1': item.grad[0], '--g2': item.grad[1] }} aria-hidden="true">
      <em>{item.name.trim()[0]}</em>
    </span>
  )
}

/* Shared tab keyboard behaviour for the rail: one tab stop for the whole
   list (roving tabindex), arrows move selection AND focus, Home/End jump to
   the ends. Both arrow axes are accepted deliberately — the rail is vertical
   on desktop and horizontal on a phone. */
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

/* The stage pins for SUITE.length slices of scroll, so scrolling THROUGH the
   section walks the rail on its own — scroll POSITION is the only input;
   nothing is hijacked, no wheel listener, the scrollbar and a deep link
   drive it identically (same contract `Sections.jsx` runs its own
   scroll-linked work on).

   THE GUARD IS HEIGHT, NOT WIDTH — a card taller than the viewport cannot
   sit still in a sticky box, so a short viewport (or a short phone) falls
   back to an unpinned, click-only stage instead of pinning over a track
   nothing can read. `products-stage.css` states the same rule again to
   unpin `.stg-scroll` / `.stg-pin`; the two must always agree. */
const STAGE_PIN = '(min-width: 761px) and (min-height: 620px), (max-width: 760px) and (min-height: 760px)'

export function AppsShowcase() {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const wrapRef = useRef(null)
  const N = SUITE.length

  /* Scroll to a product's slice of the pin. Lenis owns window.scrollTo on
     this site, so it is asked directly when it exists. Falls back to setting
     state when the section isn't pinned (short viewport / reduced motion). */
  const goTo = useCallback((n) => {
    const wrap = wrapRef.current
    const total = wrap ? wrap.offsetHeight - window.innerHeight : 0
    const pinned = !reduced && window.matchMedia(STAGE_PIN).matches && total > 0
    if (!pinned) { setI(n); return }
    const top = wrap.getBoundingClientRect().top + window.scrollY
    const y = top + (n / (N - 1)) * total
    if (window.__lenis) window.__lenis.scrollTo(y)
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }, [N, reduced])

  const { refs, onKeyDown } = useTabList(N, i, goTo)

  // ——— the scroll driver: one passive listener, rAF-throttled, torn down on
  // unmount and whenever reduced motion is on (the pin is removed in CSS at
  // the same time, so there is nothing left to read). ———
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
      // position decides is WHEN the switch fires
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

  const item = SUITE[i]
  const dims = DIMS[item.key] || {}
  const [artW, artH] = dims.art || [720, 480]

  return (
    <section className="apps" id="apps">
      <div className="section-head">
        <p className="kicker"><span>—</span> What we've built</p>
        <SplitWords as="h2" className="h2" text="We don’t just market software. We ship it." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Six products, one stage. <strong>Just scroll</strong> — the stage changes
            itself, and the rail is there when you want to jump. Only one is downloadable
            by a stranger today; the rest carry exactly the status they've earned.
          </p>
        </Reveal>
        <Reveal delay={0.22}>
          <div className="apps-status">
            <LiveBadge label="App Store — live" />
            <LiveBadge label="TestFlight · submitted" />
            <LiveBadge label="Built · in the lab" />
          </div>
        </Reveal>
      </div>

      {/* the tall element. Its height IS the rail's timeline; the sticky
          child is what the reader actually sees. Both collapse to nothing
          under the media query in the stylesheet, which is the
          short-viewport / reduced-motion fallback. */}
      <div
        className={`stg-scroll${reduced ? ' stg-scroll--flat' : ''}`}
        ref={wrapRef}
        style={{ '--steps': N - 1 }}
      >
      <div className="stg-pin">
      {/* the card carries the selected item's own colour pair, which is all
          the aura and the floor pool below the device are made of — a colour
          transition on two gradients, not a repaint of anything */}
      <div className="stg" style={{ '--g1': item.grad[0], '--g2': item.grad[1] }}>
        <div className="stg-aura" aria-hidden="true" />
        <div className="stg-rail" role="tablist" aria-label="Choose a product" onKeyDown={onKeyDown}>
          {SUITE.map((it, n) => (
            <button
              key={it.key}
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
              <span className="p-sr-only">{it.name}</span>
              <ProductIcon item={it} />
            </button>
          ))}
        </div>

        {/* The tabpanel is the whole right-hand half — identity AND imagery —
            because both change when the rail changes tab. Reading order is
            identity first (icon, name, tag, blurb, status), imagery second;
            DOM order and visual order agree, so keyboard/screen-reader order
            matches what a sighted reader sees left to right / top to
            bottom. */}
        <div
          className="stg-stage"
          role="tabpanel"
          id="stg-panel"
          aria-labelledby={`stg-tab-${i}`}
        >
          <div className="stg-info">
            <div className="stg-id">
              <ProductIcon item={item} className="stg-icon" />
              <div>
                <h3>{item.name}</h3>
              </div>
            </div>
            <div className="stg-tag">{item.tag}</div>
            <p className="stg-blurb">{item.blurb}</p>
            <div className="stg-meta">
              <span className="pstore" data-s={item.status}><i />{item.status}</span>
            </div>
            {/* Only Quran Noor resolves to a real store page — see
                data/suite.js. Every other item is a plain, non-clickable
                panel; there is no store badge here that could 404. */}
            {item.href && (
              <a className="stg-open" href={item.href} target="_blank" rel="noreferrer" data-cursor>
                View on the App Store ↗
              </a>
            )}
            {/* how far through the six the scroll has carried the stage */}
            <div className="stg-count">
              <b>{two(i)}</b> / {two(N - 1)} — LOOM-built products
              <i aria-hidden="true" style={{ '--w': `${(i / (N - 1)) * 100}%` }} />
            </div>
          </div>

          {/* The imagery column. Only the SELECTED item's picture is mounted
              — keyed on `item.key` so it remounts (and replays its one
              entrance animation) rather than crossfading a stack of
              preloaded images. `fit` decides the presentation: a portrait
              phone capture goes behind the site's iPhone frame; a wide
              desktop capture gets its own plate instead of being crammed
              into a phone screen it was never shot for. */}
          <div className="stg-panel">
            {item.fit === 'contain' ? (
              <div className="stg-phone" key={item.key}>
                <div className="stg-glass">
                  <img
                    className="is-contain"
                    src={item.art}
                    width={artW}
                    height={artH}
                    loading="lazy"
                    decoding="async"
                    alt={`${item.name} — real app screenshot`}
                  />
                </div>
                <img className="stg-frame" src="/img/devices/iphone-frame.png" alt="" aria-hidden="true" loading="lazy" decoding="async" width="900" height="1813" />
              </div>
            ) : (
              <div className="stg-wide" key={item.key} style={{ background: `linear-gradient(155deg, ${item.grad[0]}, ${item.grad[1]})` }}>
                <img
                  src={item.art}
                  width={artW}
                  height={artH}
                  loading="lazy"
                  decoding="async"
                  alt={`${item.name} — real capture`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      </div>
    </section>
  )
}
