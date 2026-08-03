// ————————————————————————————————————————————————————————
// DeviceShowcase — the case-study "on real hardware" shot.
//
// Every case in Work.jsx ships one production screenshot (`cover.webp`); most
// never had a separate mobile capture taken because the work itself was a
// desktop deliverable. Rather than inventing a second image per case (or,
// worse, leaving mobile out of a "responsive" portfolio entirely), this
// component always renders BOTH devices and simply lets the same still stand
// in behind both panes of glass when a case has no dedicated `devices` field.
// The frames are real, alpha-punched mockups (public/img/devices/*-frame.png,
// scripts/make-device-frames.mjs) — the same asset family Products.jsx
// already trusts for the lab cards (.lab-mac) and Apps.jsx for the phone
// grid (.app-phone). This file only recombines them into a pair.
// ————————————————————————————————————————————————————————
import './device-showcase.css'

/**
 * @param {string} desktop - image src shown behind the MacBook glass
 * @param {string} mobile  - image src shown behind the iPhone glass
 * @param {string} alt     - base alt text; " — desktop view" / " — mobile view" is appended
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

export function DeviceShowcase({ desktop, mobile, alt, fallback }) {
  return (
    <div className="devshow" data-cursor>
      <div className="devshow-mac">
        {/* Alpha-keyed mockup PNG, not a CSS border — see macbook-frame.png's
            provenance note above. Screen rect below is measured off that PNG,
            same method Products.jsx's .lab-mac already uses. */}
        <img
          className="devshow-mac-frame"
          src="/img/devices/macbook-frame.png"
          alt="" aria-hidden="true" loading="lazy" decoding="async"
        />
        <div className="devshow-mac-screen">
          <img src={desktop} alt={`${alt} — desktop view`} loading="lazy" decoding="async" onError={swapOnError(fallback)} />
        </div>
      </div>
      <div className="devshow-phone">
        <img
          className="devshow-phone-frame"
          src="/img/devices/iphone-frame.png"
          alt="" aria-hidden="true" loading="lazy" decoding="async"
        />
        <div className="devshow-phone-screen">
          <img src={mobile} alt={`${alt} — mobile view`} loading="lazy" decoding="async" onError={swapOnError(fallback)} />
        </div>
      </div>
    </div>
  )
}
