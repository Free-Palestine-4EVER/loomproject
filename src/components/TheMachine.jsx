// THE MACHINE (المصنع) — LOOM's content subscription. Same section grammar as
// Solutions/Process: ThreadDivider, .section-head (kicker/h2/lede), then a
// two-column panel, then a dedicated native-Arabic passage. New `mo-` class
// prefix, scoped in machine-offer.css only.
//
// The illustrative "month grid" is decoration, not data — 24 cells standing
// for one month's output (20 posts + 4 reels), captioned as illustrative so
// it never reads as a real client's calendar.
import { useRef } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import { THE_MACHINE } from '../data/offers.js'
import { SplitWords, Reveal, CountUp, Magnetic } from '../lib/motion.jsx'
import { ThreadDivider } from './Rich.jsx'
import { WoolButton } from './Wool.jsx'
import { useWizard } from '../lib/wizard.jsx'

import './machine-offer.css'

const COLS = 6

// Spreads the reels across the month instead of clumping them.
//
// The previous version stepped `round(total / reels)` cells at a time, which
// for 24 cells / 4 reels is exactly 6 — the column count — so every reel
// landed in column 6 and the "schedule" rendered as a solid stripe down the
// right edge. Place one reel per row band instead, and walk the column with a
// golden-ratio step so no two share one. Distinct rows means no two reels can
// collide, so the count always comes out exact.
function buildMonthCells(posts, reels) {
  const total = posts + reels
  const rows = Math.ceil(total / COLS)
  const cells = Array.from({ length: total }, () => 'post')
  if (reels <= 0) return cells
  const band = rows / reels
  for (let r = 0; r < reels; r++) {
    const row = Math.min(rows - 1, Math.floor(r * band + band / 2))
    const col = (Math.round(r * COLS * 0.618) + 4) % COLS
    const idx = Math.min(total - 1, row * COLS + col)
    cells[idx] = 'reel'
  }
  return cells
}

export function TheMachine() {
  const reduced = useReducedMotion()
  const { open } = useWizard()
  const m = THE_MACHINE
  const cells = buildMonthCells(m.monthGrid.posts, m.monthGrid.reels)

  // The cells' pop-in is a CSS animation with a per-cell delay, and a CSS
  // animation starts the moment the element is parsed — mounted at the top of
  // a long page, the whole stagger had already finished by the time anyone
  // scrolled here. Gate it on the grid actually being in view.
  const gridRef = useRef(null)
  const gridIn = useInView(gridRef, { once: true, margin: '-12% 0px' })

  return (
    <section className="mo" id="the-machine" style={{ '--mo-tint': 'var(--cyan)' }}>
      <ThreadDivider />
      {/* the warp the month is woven on — one painted gradient, no elements */}
      <span className="mo-warp" aria-hidden="true" />
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

          {/* The price is the section's strongest single claim and it used to be
              its quietest element — a flat bar of body text. It is a plate now:
              the numeral in the display face at headline weight, the hedge
              ("from", and the note) kept deliberately small but never dropped. */}
          <div className="mo-price">
            <span className="mo-price-tag">From</span>
            <p className="mo-price-value">
              <CountUp value={m.priceFromJod} />
              <span className="mo-price-cur">JOD</span>
              <span className="mo-price-unit">/month</span>
            </p>
            <p className="mo-price-note">{m.priceNote}</p>
            <span className="mo-price-ar" lang="ar" aria-hidden="true">{m.nameAr}</span>
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
          <figure className="mo-month">
            <div className="mo-month-top">
              <span className="mo-month-label">One month</span>
              <span className="mo-legend">
                <i className="mo-key mo-key--post" aria-hidden="true" /> post
                <i className="mo-key mo-key--reel" aria-hidden="true" /> reel
              </span>
            </div>

            <div
              ref={gridRef}
              className={`mo-grid-viz${gridIn ? ' is-in' : ''}`}
              data-cursor
              aria-hidden="true"
            >
              {cells.map((kind, i) => (
                <i
                  key={i}
                  className={`mo-cell mo-cell--${kind}`}
                  style={reduced ? undefined : { '--d': `${i * 0.022}s` }}
                />
              ))}
            </div>

            <div className="mo-month-foot" aria-hidden="true">
              <span className="mo-tally">
                <b>{m.monthGrid.posts}</b> posts
              </span>
              <span className="mo-tally mo-tally--reel">
                <b>{m.monthGrid.reels}</b> reels
              </span>
              <span className="mo-tally mo-tally--sum">
                <b>{m.monthGrid.posts + m.monthGrid.reels}</b> pieces
              </span>
            </div>

            <figcaption className="mo-grid-caption">
              One illustrative month — {m.monthGrid.posts} posts, {m.monthGrid.reels} reels.
              Shape only, not a real client's calendar.
            </figcaption>
          </figure>
        </Reveal>
      </div>

      <Reveal delay={0.2} className="mo-arabic-wrap">
        <p className="mo-arabic" lang="ar" dir="rtl">{m.arabicPitch}</p>
      </Reveal>
    </section>
  )
}
