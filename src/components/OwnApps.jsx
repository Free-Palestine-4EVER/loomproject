// OUR OWN APPS — LOOM's own product line, presented honestly.
//
// Sits directly under ToolsLab on purpose: that section just showed the
// studio's six in-house tools ("built in-house · not for sale"). This is the
// same instinct pointed at a different shelf — apps LOOM is building for
// itself as real products, not client work (that's AppsShowcase, above both
// of these) and not internal tooling.
//
// Two different truths, two different treatments on the same section:
//   - blip.net is real: a shipped name, a real pricing model, self-serve
//     registration. It gets the flagship banner up top and its own page
//     (/blip) — this section only teases it, BLIP's actual facts live in
//     site.js and get rendered on that page, not duplicated here.
//   - The other four are genuinely mid-build, so their cards say exactly
//     that and nothing more: no store badges, no download links, no
//     fabricated numbers. `hire.css`'s dashed-border language ("posted, not
//     filled yet") is reused for the grid cards for the same honest reason —
//     a dashed edge already means "real, but not finished" on this site.
//
// Zero animation at rest, same budget rule as Hiring: entry is Reveal /
// SplitWords, one-shot, and the only motion after that is a hover transform.
import { useMemo, useRef } from 'react'
import { OWN_APPS, BLIP } from '../data/site.js'
import { SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { WoolButton } from './Wool.jsx'
import './ownapps.css'

function AppGlyph({ app, className = '' }) {
  return (
    <span className={`oa-icon ${className}`} style={{ '--g1': app.grad[0], '--g2': app.grad[1] }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round">
        <path d={app.glyph} />
      </svg>
    </span>
  )
}

function OwnAppCard({ app, i }) {
  return (
    <Reveal delay={i * 0.06} className="oa-cell">
      <article className="oa-card" style={{ '--g1': app.grad[0], '--g2': app.grad[1] }}>
        <span className="oa-status"><i />{app.status}</span>
        <AppGlyph app={app} />
        <h3 className="oa-name">{app.name}</h3>
        <p className="oa-tag">{app.tag}</p>
        <p className="oa-blurb">{app.blurb}</p>
      </article>
    </Reveal>
  )
}

/* The flagship banner. Everything it says is a real fact from BLIP in
   site.js — nothing is invented here. Clicking through, or the whole card,
   goes to the dedicated /blip page, which is where the pricing and the full
   pitch live. */
function BlipBanner() {
  return (
    <Reveal className="oa-blip-cell">
      <article className="oa-blip" style={{ '--g1': BLIP.grad[0], '--g2': BLIP.grad[1] }}>
        <div className="oa-blip-glow" aria-hidden="true" />
        <div className="oa-blip-body">
          <span className="oa-blip-status"><i />{BLIP.status}</span>
          <div className="oa-blip-id">
            <AppGlyph app={BLIP} className="oa-blip-icon" />
            <div>
              <h3 className="oa-blip-name">{BLIP.name}</h3>
              <p className="oa-blip-tag">{BLIP.tag}</p>
            </div>
          </div>
          <p className="oa-blip-headline">{BLIP.headline}</p>
          <p className="oa-blip-lede">{BLIP.lede}</p>
          <div className="oa-blip-plans" aria-label="blip.net pricing">
            {BLIP.plans.map((p) => (
              <div className={`oa-blip-plan${p.featured ? ' is-featured' : ''}`} key={p.id}>
                <span className="oa-blip-plan-name">{p.name}</span>
                <span className="oa-blip-plan-price">{p.price}<em>{p.period}</em></span>
                <span className="oa-blip-plan-blurb">{p.blurb}</span>
              </div>
            ))}
          </div>
          <div className="oa-blip-cta">
            <Magnetic><WoolButton label="See blip.net" href="/blip" className="wool-btn--hero" /></Magnetic>
          </div>
        </div>
      </article>
    </Reveal>
  )
}

export function OwnApps() {
  const ref = useRef(null)
  // deterministic — no Math.random in render, same reasoning as StatSpark's
  // seed prop elsewhere on this page: a stable render is what lets Reveal's
  // once-only IntersectionObserver behave the same on every mount
  const count = OWN_APPS.length
  const list = useMemo(() => OWN_APPS, [])

  return (
    <section className="oa" id="own-apps" ref={ref}>
      <div className="section-head">
        <p className="kicker"><span>—</span> LOOM Software</p>
        <SplitWords as="h2" className="h2" text="We build our own products too." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            One of these is already a real product with a real price. The other {count} are
            genuinely mid-build — no store links here yet, because none of those four are live.
            This is where they'll show up the day they are.
          </p>
        </Reveal>
      </div>

      <BlipBanner />

      <div className="oa-grid">
        {list.map((app, i) => <OwnAppCard key={app.id} app={app} i={i} />)}
      </div>
    </section>
  )
}
