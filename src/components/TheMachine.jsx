// THE MACHINE (المصنع) — LOOM's content subscription. Same section grammar as
// Solutions/Process: ThreadDivider, .section-head (kicker/h2/lede), then a
// two-column panel, then a dedicated native-Arabic passage. New `mo-` class
// prefix, scoped in machine-offer.css only.
//
// The illustrative "month grid" is decoration, not data — 24 cells standing
// for one month's output (20 posts + 4 reels), captioned as illustrative so
// it never reads as a real client's calendar.
import { useReducedMotion } from 'motion/react'
import { THE_MACHINE } from '../data/offers.js'
import { SplitWords, Reveal, CountUp, Magnetic } from '../lib/motion.jsx'
import { ThreadDivider } from './Rich.jsx'
import { WoolButton } from './Wool.jsx'
import { useWizard } from '../lib/wizard.jsx'

import './machine-offer.css'

// Evenly interleaves the 4 reel cells across the 24-cell grid instead of
// clumping them at the end — reads as a scheduled month, not a leftover pile.
function buildMonthCells(posts, reels) {
  const total = posts + reels
  const step = reels > 0 ? Math.round(total / reels) : total
  return Array.from({ length: total }, (_, i) => ((i + 1) % step === 0 ? 'reel' : 'post'))
}

export function TheMachine() {
  const reduced = useReducedMotion()
  const { open } = useWizard()
  const m = THE_MACHINE
  const cells = buildMonthCells(m.monthGrid.posts, m.monthGrid.reels)

  return (
    <section className="mo" id="the-machine" style={{ '--mo-tint': 'var(--cyan)' }}>
      <ThreadDivider />
      <div className="section-head">
        <p className="kicker">
          <span>—</span> The Machine
          <span className="mo-kicker-ar" lang="ar">{m.nameAr}</span>
        </p>
        <SplitWords as="h2" className="h2" text={m.h2} />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>{m.ledeEn}</p>
        </Reveal>
      </div>

      <div className="mo-panel">
        <Reveal className="mo-left">
          <ul className="mo-bullets">
            {m.bullets.map((b) => (
              <li key={b.en}>
                <i className="mo-stitch" aria-hidden="true" />
                <span className="mo-bullet-en">{b.en}</span>
                {/* no dir="rtl" — see the comment on .mo-bullet-ar in
                    machine-offer.css for why */}
                <span className="mo-bullet-ar" lang="ar">{b.ar}</span>
              </li>
            ))}
          </ul>

          <div className="mo-price">
            <span className="mo-price-label">From</span>
            <span className="mo-price-value">
              <CountUp value={m.priceFromJod} /> JOD<span className="mo-price-unit">/month</span>
            </span>
            <span className="mo-price-note">{m.priceNote}</span>
          </div>

          <div className="mo-cta-row">
            <Magnetic>
              <WoolButton
                label={m.ctaLabel}
                className="mo-cta"
                onClick={() => open({ note: `${m.nameEn} (${m.nameAr}) — content subscription` })}
              />
            </Magnetic>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mo-right">
          <div className="mo-grid-viz" data-cursor aria-hidden="true">
            {cells.map((kind, i) => (
              <i
                key={i}
                className={`mo-cell mo-cell--${kind}`}
                style={reduced ? undefined : { '--d': `${i * 0.025}s` }}
              />
            ))}
          </div>
          <p className="mo-grid-caption">
            One illustrative month — {m.monthGrid.posts} posts, {m.monthGrid.reels} reels.
            Shape only, not a real client's calendar.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.2} className="mo-arabic-wrap">
        <p className="mo-arabic" lang="ar" dir="rtl">{m.arabicPitch}</p>
      </Reveal>
    </section>
  )
}
