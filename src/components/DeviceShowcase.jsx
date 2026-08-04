// ————————————————————————————————————————————————————————
// DeviceShowcase — the case-study "on real hardware" shot.
//
// Every case in Work.jsx ships one production screenshot (`cover.webp`); most
// never had a separate mobile capture taken because the work itself was a
// desktop deliverable. Rather than inventing a second image per case (or,
// worse, leaving mobile out of a "responsive" portfolio entirely), this
// component always renders BOTH devices and simply lets the same still stand
// in behind both panes of glass when a case has no dedicated `devices` field.
// The frames are real mockup PNGs (public/img/devices/*-frame.png). Two
// different techniques produce the two apertures, confirmed by sampling raw
// pixels (see device-showcase.css's FRAME MATH note for the numbers and how
// each was derived — they are not the same technique):
//   - iphone-frame.png:  the screen really is alpha-cut (RGBA alpha == 0).
//   - macbook-frame.png: the screen is painted solid near-black, alpha 255,
//     same as the bezel — there is no cutout. The screen art is layered on
//     top (z-index) inside a rect measured to match that painted rectangle.
// This file only recombines the two frames with the right rect maths.
// ————————————————————————————————————————————————————————
import { motion, useReducedMotion } from 'motion/react'
import './device-showcase.css'

const EASE = [0.16, 1, 0.3, 1]

/**
 * @param {string} desktop  - image src shown behind the MacBook glass
 * @param {string} mobile   - image src shown behind the iPhone glass (ignored in `compact`)
 * @param {string} alt      - base alt text; " — desktop view" / " — mobile view" is appended
 * @param {boolean} compact - card-scale mode: MacBook only, no phone. Kept for
 *   any future spot that wants a mac-only chip; Work.jsx's grid no longer
 *   uses it (see `card` below) now that the thumbnail itself is the pair.
 * @param {boolean} card    - Selected-Work grid-thumbnail mode: same MacBook +
 *   iPhone pair as the overlay, scaled and centered to sit inside a 4:3 tile
 *   instead of a full-width panel, and with the idle float animation dropped
 *   (see device-showcase.css — 17 of these on screen at once is a different
 *   performance budget than the one-at-a-time overlay).
 */
// `fallback` is the swap-on-404, not a default prop: the generated screens are
// resolved by slug convention in Work.jsx, so a case whose screens have not
// been rendered yet would otherwise show a broken pane inside a real device
// frame — worse than showing nothing. Swapping to the case's own cover keeps
// the frame full. Guarded so a fallback that is itself missing cannot loop.
const swapOnError = (fallback) => (e) => {
  const el = e.currentTarget
  if (!fallback || el.dataset.fellBack) { el.style.visibility = 'hidden'; return }
  el.dataset.fellBack = '1'
  el.src = fallback
}

// Screen art fades in on decode instead of popping — same convention Work.jsx
// already uses for the cover image (`imgFade` ref + `onLoad`), reimplemented
// here since it now has to run on the device screens themselves.
const shotFade = (el) => { if (el && el.complete && el.naturalWidth) el.classList.add('is-loaded') }
const onShotLoad = (e) => e.currentTarget.classList.add('is-loaded')

export function DeviceShowcase({ desktop, mobile, alt, fallback, compact = false, card = false }) {
  const reduced = useReducedMotion()
  const variant = compact ? ' devshow--compact' : card ? ' devshow--card' : ''
  // Card-scale tiles skip the mac/phone hover choreography on touch devices
  // (whileHover on the ancestor .case-card is already disabled there in
  // Work.jsx) — variants simply never receive the 'hover' label, so leaving
  // them declared here costs nothing on coarse pointers.
  // These only ever animate where an ancestor sets whileHover='hover' (only
  // Work.jsx's .case-card does) — declaring them unconditionally elsewhere
  // (the overlay) costs nothing since that label is simply never dispatched.
  const macHover = !reduced && { hover: { rotateX: 3, rotateY: -4, scale: 1.018 } }
  const shotHover = !reduced && { hover: { scale: 1.05 } }
  const phoneHover = !reduced && { hover: { y: -12, x: 5, rotate: -3, scale: 1.05 } }

  return (
    <div className={`devshow${variant}`} data-cursor>
      <motion.div
        className="devshow-mac"
        variants={macHover || undefined}
        transition={{ duration: 0.6, ease: EASE }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Screen rect below is measured directly off this PNG's painted-black
            rectangle (pixel-sampled, not eyeballed) — see device-showcase.css. */}
        <img
          className="devshow-mac-frame"
          src="/img/devices/macbook-frame.png"
          alt="" aria-hidden="true" loading="lazy" decoding="async"
        />
        <div className="devshow-mac-screen">
          <motion.img
            src={desktop} alt={`${alt} — desktop view`} loading="lazy" decoding="async"
            ref={shotFade} onLoad={onShotLoad}
            onError={swapOnError(fallback)}
            variants={shotHover || undefined}
            transition={{ duration: 0.7, ease: EASE }}
          />
        </div>
      </motion.div>
      {!compact && (
        <motion.div
          className="devshow-phone"
          variants={phoneHover || undefined}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {/* Alpha-cut PNG — see the file banner. Rect below is the measured
              transparent hole, not a guess. */}
          <img
            className="devshow-phone-frame"
            src="/img/devices/iphone-frame.png"
            alt="" aria-hidden="true" loading="lazy" decoding="async"
          />
          <div className="devshow-phone-screen">
            <img
              src={mobile} alt={`${alt} — mobile view`} loading="lazy" decoding="async"
              ref={shotFade} onLoad={onShotLoad}
              onError={swapOnError(fallback)}
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}
