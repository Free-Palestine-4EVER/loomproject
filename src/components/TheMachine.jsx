// THE MACHINE (المصنع) — LOOM's content subscription. Same section grammar as
// Solutions/Process: ThreadDivider, .section-head (kicker/h2/lede), then a
// two-column panel, then a dedicated native-Arabic passage. New `mo-` class
// prefix, scoped in machine-offer.css only.
//
// The "month grid" used to be 22 empty divs standing in for a calendar shape.
// It now renders MACHINE_WORK — real files on disk (see the header comment in
// data/machineWork.js for exactly what they are and are not). The counters
// and the caption are both DERIVED from that array's length and `kind`, never
// typed as literals here, so the grid can never claim a count the data
// doesn't back.
import { useMemo, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import { THE_MACHINE } from '../data/offers.js'
import { MACHINE_WORK, MACHINE_CLIENT_COUNT } from '../data/machineWork.js'
import { SplitWords, Reveal, CountUp, Magnetic } from '../lib/motion.jsx'
import { ThreadDivider } from './Rich.jsx'
import { WoolButton } from './Wool.jsx'
import { useWizard } from '../lib/wizard.jsx'

import './machine-offer.css'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'post', label: 'Posts' },
  { id: 'reel', label: 'Reels' },
]

export function TheMachine() {
  const reduced = useReducedMotion()
  const { open } = useWizard()
  const m = THE_MACHINE

  const postsCount = useMemo(() => MACHINE_WORK.filter((w) => w.kind === 'post').length, [])
  const reelsCount = useMemo(() => MACHINE_WORK.filter((w) => w.kind === 'reel').length, [])
  const totalCount = MACHINE_WORK.length

  const [filter, setFilter] = useState('all')
  const visible = filter === 'all' ? MACHINE_WORK : MACHINE_WORK.filter((w) => w.kind === filter)

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
              <span className="mo-month-label">Real work, month-shaped</span>
              {/* a real filter now, not a static colour key — role="radiogroup"
                  for the same reason OfferPair's switch is (Banners.jsx):
                  the three states are mutually exclusive */}
              <div className="mo-filter" role="radiogroup" aria-label="Filter the grid">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={filter === f.id}
                    className={`mo-filter-opt${filter === f.id ? ' is-active' : ''}`}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.id !== 'all' && (
                      <i className={`mo-key mo-key--${f.id}`} aria-hidden="true" />
                    )}
                    {f.label}
                    <span className="mo-filter-n">{f.id === 'all' ? totalCount : f.id === 'post' ? postsCount : reelsCount}</span>
                  </button>
                ))}
              </div>
            </div>

            <div ref={gridRef} className={`mo-grid-viz${gridIn ? ' is-in' : ''}`}>
              {visible.length === 0 ? (
                <p className="mo-grid-empty">No reels in this set yet — see posts.</p>
              ) : (
                visible.map((w, i) => (
                  <span
                    key={w.id}
                    className={`mo-cell mo-cell--${w.kind}`}
                    style={reduced ? undefined : { '--d': `${i * 0.022}s` }}
                  >
                    <picture style={{ display: 'contents' }}>
                      {/* avif coverage across the case folders is uneven (see
                          machineWork.js) — <picture> does not retry the next
                          <source> when the chosen one 404s, so this source is
                          only emitted for a file verified to exist on disk */}
                      {w.avif && <source type="image/avif" srcSet={`${w.src}.avif`} />}
                      <source type="image/webp" srcSet={`${w.src}.webp`} />
                      <img
                        className="mo-cell-photo"
                        src={`${w.src}.webp`}
                        alt={w.alt}
                        width={w.width}
                        height={w.height}
                        loading="lazy"
                        decoding="async"
                        // mirrors Banners.jsx's cnt-photo pattern: a failed
                        // fetch removes the tile itself rather than leaving a
                        // broken-image icon standing in for real work
                        onError={(e) => {
                          const cell = e.currentTarget.closest('.mo-cell')
                          if (cell) cell.style.display = 'none'
                        }}
                      />
                    </picture>
                    {w.client && <span className="mo-cell-tag">{w.client}</span>}
                  </span>
                ))
              )}
            </div>

            <div className="mo-month-foot" aria-hidden="true">
              <span className="mo-tally">
                <b>{postsCount}</b> posts
              </span>
              <span className="mo-tally mo-tally--reel">
                <b>{reelsCount}</b> reels
              </span>
              <span className="mo-tally mo-tally--sum">
                <b>{totalCount}</b> pieces
              </span>
            </div>

            <figcaption className="mo-grid-caption">
              {totalCount} real pieces from {MACHINE_CLIENT_COUNT} LOOM client projects, arranged in a
              month's shape — each tile credited to the client it was made for.
              {reelsCount > 0
                ? ` ${postsCount} stills, ${reelsCount} reels.`
                : ' All stills; no reels in this set yet — no video asset exists in this build.'}
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
