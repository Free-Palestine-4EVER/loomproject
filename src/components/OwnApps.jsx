// OUR OWN APPS — LOOM's own product line, presented honestly.
//
// Sits directly under ToolsLab on purpose: that section just showed the
// studio's six in-house tools ("built in-house · not for sale"). This is the
// same instinct pointed at a different shelf — apps LOOM is building for
// itself as real products, not client work (that's AppsShowcase, above both
// of these) and not internal tooling.
//
// Every card here is genuinely mid-build, so it says exactly that and nothing
// more: no store badges, no download links, no fabricated numbers.
// `hire.css`'s dashed-border language ("posted, not filled yet") is reused for
// the grid cards for the same honest reason — a dashed edge already means
// "real, but not finished" on this site.
//
// Zero animation at rest, same budget rule as Hiring: entry is Reveal /
// SplitWords, one-shot, and the only motion after that is a hover transform.
import { useMemo, useRef } from 'react'
import { OWN_APPS } from '../data/site.js'
import { SplitWords, Reveal } from '../lib/motion.jsx'
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
            {count} products in build, and nothing dressed up as more than it is — no store
            links here yet, because none of them are live. This is where they'll show up the
            day they are.
          </p>
        </Reveal>
      </div>

      <div className="oa-grid">
        {list.map((app, i) => <OwnAppCard key={app.id} app={app} i={i} />)}
      </div>
    </section>
  )
}
