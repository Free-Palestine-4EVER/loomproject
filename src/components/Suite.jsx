// Suite — "what LOOM has built for itself", ONE section, six cards.
//
// Replaces AppsShowcase + ToolsLab (10 Aug 2026). See src/data/suite.js for
// the full story on why status/href are handled the way they are — this file
// only renders what that data says. It renders a real <a> ONLY when an item
// carries an href; everything else is a plain, non-clickable card. No fake
// store badges, ever.
//
// PERFORMANCE IS THE WHOLE POINT of this rewrite: no canvas, no WebGL, no
// live device mockups, no looping CSS. Every <img> is lazy, async-decoded and
// carries its real intrinsic size (measured with sharp, not guessed) so nothing
// shifts as the six plates paint in. Hover is transform/opacity only — nothing
// here triggers layout or paint outside the hovered card's own layer.
import { SUITE } from '../data/suite.js'
import { SplitWords, Reveal } from '../lib/motion.jsx'
import './suite.css'

// Real dimensions of every file in public/img/suite/, read with
// `sharp(...).metadata()` — see the CLAUDE.md note on why this project never
// guesses an <img> size. Keyed by SUITE's own `key`.
const DIMS = {
  'evora-scan': { art: [440, 977], icon: [128, 128] },
  '2d3d': { art: [720, 325] },
  'quran-noor': { art: [720, 1561], icon: [128, 128] },
  kun: { art: [720, 325] },
  kwakwa: { art: [540, 1174], icon: [128, 128] },
  ellie: { art: [720, 1565], icon: [128, 128] },
}

function SuiteCard({ item, i }) {
  const dims = DIMS[item.key] || {}
  const [artW, artH] = dims.art || [720, 480]
  const Tag = item.href ? 'a' : 'div'
  const linkProps = item.href ? { href: item.href, target: '_blank', rel: 'noreferrer' } : {}
  return (
    <Reveal delay={Math.min(i * 0.07, 0.28)} className="suite-cell">
      <Tag className={`suite-card ${item.href ? 'is-linked' : ''}`} {...linkProps}>
        <div
          className="suite-plate"
          style={{ background: `linear-gradient(155deg, ${item.grad[0]}, ${item.grad[1]})` }}
        >
          <img
            className={`suite-art suite-art--${item.fit}`}
            src={item.art}
            width={artW}
            height={artH}
            loading="lazy"
            decoding="async"
            alt={`${item.name} — screen capture`}
          />
          {item.icon && (
            <img
              className="suite-icon"
              src={item.icon}
              width={128}
              height={128}
              loading="lazy"
              decoding="async"
              alt=""
              aria-hidden="true"
            />
          )}
        </div>
        <div className="suite-body">
          <div className="suite-toprow">
            <h3 className="suite-name">{item.name}</h3>
            <span className="suite-status">{item.status}</span>
          </div>
          <p className="suite-tag">{item.tag}</p>
          <p className="suite-blurb">{item.blurb}</p>
          {item.href && <span className="suite-open">View on the App Store ↗</span>}
        </div>
      </Tag>
    </Reveal>
  )
}

export function Suite() {
  return (
    <section className="suite" id="apps" aria-label="Software LOOM has built">
      <div className="suite-head">
        <p className="kicker"><span>—</span> What we've built</p>
        <SplitWords as="h2" className="h2 suite-h2" text="Software LOOM ships for itself, not just for clients." />
        <Reveal delay={0.12}>
          <p className="lede suite-sub">
            Six products, one honest status each. Only one of them is downloadable
            by a stranger today — the rest are exactly as far along as they say.
          </p>
        </Reveal>
      </div>
      <div className="suite-grid">
        {SUITE.map((item, i) => <SuiteCard item={item} i={i} key={item.key} />)}
      </div>
    </section>
  )
}
