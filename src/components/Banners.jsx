// ————————————————————————————————————————————————————————
// LOOM — the banner layer.
// Petbarn's three promo shapes (category tile grid / split promo pair /
// full-width claim) cut from real photographed wool.
//
// ONE shared material recipe, `.blk`, does all three:
//   background-color   a deep flat brand hue — the paint-in AND the value floor
//   background-image   the real knit photograph, at a scale where stitches
//                      read as stitches (>=300px) instead of as noise
//   ::before           one flat tint rect that pulls the photograph's ±25%
//                      value swing back into a single readable field
// No filter, no blur, no hue-rotate. The wool is never recoloured —
// wool.css:174-176 already records why (hue-rotate sent violet to indigo).
// ————————————————————————————————————————————————————————
import { motion, useReducedMotion } from 'motion/react'
import { BRAND, WIZARD, SERVICES, PROCESS, APPS, TOOLS } from '../data/site.js'
import { EASE, SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton, WoolIcon } from './Wool.jsx'

import './banners.css'

/* ═══════════════════ 1 · THE COUNTER ═══════════════════ */

// One dye + one felted medallion per need. Every icon name is in WOOL_ICONS.
// knit-cream is deliberately unused: a cream band directly above a cream felt
// strip has no value jump and the tile loses its two-part anatomy. 'Launch
// campaign' takes a second magenta instead — colour here is rhythm, not a key.
// 'Not sure yet' is the only tile with no dye in it: dark felt, the blank swatch.
// `photo` is a knitted-wool still shot for that need (Nano Banana Pro, one
// shared style block + the woven logo as reference, so all eight read as one
// set). The dye + medallion stay as the paint-in and the fallback: a tile whose
// photo has not decoded yet is still a finished LOOM tile, never a white hole.
const NEED_BLOCK = {
  'Brand identity': { dye: 'magenta', mark: 'tag', photo: 'brand-identity' },
  'Website': { dye: 'violet', mark: 'home', photo: 'website' },
  'Mobile app': { dye: 'blue', mark: 'phone', photo: 'mobile-app' },
  'Social content': { dye: 'crimson', mark: 'share-nodes', photo: 'social-content' },
  'AI systems': { dye: 'grey', mark: 'settings', photo: 'ai-systems' },
  '3D / AR experience': { dye: 'gold', mark: 'eye', photo: 'ar-experience' },
  'Launch campaign': { dye: 'magenta', mark: 'upload', photo: 'launch-campaign' },
  'Not sure yet': { dye: 'felt', mark: 'search', photo: 'not-sure' },
}

export function Counter() {
  const { open } = useWizard()
  return (
    <section className="counter" id="counter">
      <div className="section-head">
        {/* unnumbered, following Work.jsx:276 — 01–12 is fully allocated */}
        <p className="kicker"><span>—</span> Start here</p>
        <SplitWords as="h2" className="h2" text="We can help you in any phase of your business journey." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Day one or year ten — pick what you need and we’ll shape the rest with you.
          </p>
        </Reveal>
      </div>

      <div className="cnt-grid">
        {/* NEED_BLOCK is the gate, not WIZARD.needs. The questionnaire may carry
            more options than the grid — 'Consultancy' is the first — and line 226
            of banners.css is a hard constraint: 8 tiles form a rectangle, 9 form
            a ragged 3×3−1. A need earns a tile by being given a block, and
            Consultancy has its own section instead. */}
        {WIZARD.needs.filter((n) => NEED_BLOCK[n]).map((need, i) => {
          const b = NEED_BLOCK[need]
          return (
            // modulo stagger — row 2 restarts at 0 instead of waiting on row 1
            <Reveal key={need} delay={(i % 4) * 0.06} y={22} className="cnt-cell">
              <button
                type="button"
                className="cnt-tile"
                onClick={() => open({ note: need })}
                aria-label={`Start a brief — ${need}`}
              >
                <span className={`cnt-band blk blk--${b.dye}`}>
                  {/* the four yarns — the same stripe .kicker::after and
                      .progress already run. One static gradient, never animated. */}
                  <i className="blk-rail" aria-hidden="true" />
                  {/* anchored top-left: a maker's stamp, never a centred sticker.
                      It stays in the tree under the photo, so a need whose still
                      has not been shot yet is still a finished LOOM tile. */}
                  <WoolIcon name={b.mark} className="cnt-medal" />
                  {b.photo && (
                    <img
                      className="cnt-photo"
                      src={`/img/needs/${b.photo}.webp`}
                      alt=""
                      width={800}
                      height={800}
                      loading="lazy"
                      decoding="async"
                      /* the medallion is the fallback: it only steps aside once
                         the still has actually decoded, so a missing file leaves
                         the original tile untouched */
                      onLoad={(e) => e.currentTarget.closest('.cnt-tile')?.classList.add('has-photo')}
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  )}
                </span>
                <span className="cnt-strip">
                  <span className="cnt-label">{need}</span>
                  <i className="cnt-arrow" aria-hidden="true" />
                </span>
              </button>
            </Reveal>
          )
        })}
      </div>

      <Reveal delay={0.1} className="cnt-foot">
        {/* 'Request a quote' is one of the 21 photographed spools and is unused
            elsewhere on the site. It sits on bare --bg, so it cannot clash with
            a block — the label was chosen before the colour, because Wool.jsx
            gives the `yarn` prop no effect on a photographed pill. */}
        <Magnetic>
          <WoolButton label="Request a quote" size="big" onClick={() => open({})} />
        </Magnetic>
        <a className="cnt-foot-link" href="#work">or see the work →</a>
      </Reveal>
    </section>
  )
}

/* ═══════════════════ 2 · THE OFFER ═══════════════════ */

const OFFER = [
  {
    id: 'studio',
    dye: 'violet',          // chosen AFTER the magenta CTA
    mark: 'user',           // cut for one client
    photo: 'have-business',
    eyebrow: 'Already trading',
    title: 'I have a business already.',
    body: `It runs — it just doesn’t land. We rebuild the brand, the site and the campaign around what already sells, on one frame, with ${SERVICES.length} disciplines pulling together.`,
    care: PROCESS.map((p) => p.title).join('  →  '),
    proof: SERVICES.map((s) => s.title).join(' · '),
    link: { href: '#work', label: 'See the work' },
  },
  {
    id: 'lab',
    dye: 'blue',            // chosen AFTER the gold CTA
    mark: 'copy',           // off the shelf — the same thing again
    photo: 'have-idea',
    eyebrow: 'Starting out',
    title: 'I have a business idea.',
    body: `Nothing exists yet — that is the easiest place to start. Name, identity, website, first campaign, and the AI that runs it, in the order that gets you selling fastest.`,
    care: 'Name  →  Identity  →  Website  →  Launch',
    proof: `${APPS.length + TOOLS.length} products we built for ourselves first — apps in stores, tools in the lab.`,
    // the pill already goes to #lab — a secondary link to the same anchor is
    // two controls doing one job, so this one carries the other half of the
    // claim ("apps in stores, tools in the lab")
    link: { href: '#apps', label: 'See the apps' },
  },
]

export function OfferPair() {
  const { open } = useWizard()
  return (
    // no .section-head — a promo pair is an interstitial, the same grammar
    // Marquee and Stats use. It answers the work above it rather than starting
    // a subject, so it takes the short lead-in clamp.
    <section className="offer" id="offer" aria-label="Already trading, or starting from an idea">
      <div className="offer-row">
        {OFFER.map((o, i) => (
          <Reveal key={o.id} delay={i * 0.08} y={28} className="offer-cell">
            <article className={`offer-panel blk blk--${o.dye}`} data-cursor>
              <i className="blk-rail" aria-hidden="true" />
              {/* one flat gradient rect value-flattens the knit under the type.
                  Never a blur — a blurred layer per panel is what got the
                  previous version reverted. */}
              {/* the drifting field the cut-out crew stands in — see
                  .offer-aura in banners.css for why this is CSS, not a canvas */}
              <i className="offer-aura" aria-hidden="true" />
              <i className="offer-scrim" aria-hidden="true" />
              <span className="offer-stamp" aria-hidden="true">
                <WoolIcon name={o.mark} />
              </span>
              {o.photo && (
                <img
                  className="offer-photo"
                  /* PNG, not webp: these are alpha cut-outs and the whole
                     point is that there is no rectangle. */
                  src={`/img/needs/${o.photo}.png`}
                  alt=""
                  width={1264}
                  height={848}
                  loading="lazy"
                  decoding="async"
                  aria-hidden="true"
                  onLoad={(e) => e.currentTarget.closest('.offer-panel')?.classList.add('has-photo')}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              )}
              <div className="offer-face">
                <p className="offer-eyebrow">{o.eyebrow}</p>
                <h3 className="offer-h">{o.title}</h3>
                <p className="offer-body">{o.body}</p>
                <p className="offer-care">{o.care}</p>
                <p className="offer-proof">{o.proof}</p>
                <div className="offer-ctas">
                  {o.id === 'studio' ? (
                    <Magnetic>
                      {/* photographed knit, and its photograph is magenta —
                          which is why this half is cut from violet */}
                      <WoolButton
                        label="Book a call"
                        onClick={() => open({ note: 'I have a business already' })}
                      />
                    </Magnetic>
                  ) : (
                    <Magnetic>
                      {/* never photographed, so a real yarn pill, spun gold
                          to carry against the blue knit behind it */}
                      <WoolButton label="Start from zero" yarn="gold" onClick={() => open({ note: 'I have a business idea' })} />
                    </Magnetic>
                  )}
                  <a className="offer-link" href={o.link.href}>{o.link.label} →</a>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ═══════════════════ 3 · THE BOLT ═══════════════════ */

export function Bolt() {
  const { open } = useWizard()
  const reduced = useReducedMotion()
  return (
    <section className="bolt" id="bolt" aria-label={BRAND.positioning}>
      <Reveal y={28}>
        <div className="bolt-frame felt stitched">
          <i className="bolt-rail bolt-rail--top" aria-hidden="true" />
          <i className="bolt-rail bolt-rail--bot" aria-hidden="true" />
          {/* the shuttle: ONE weft pass, transform only, once, then gone.
              This is the only animated bar on the page — repeating it per card
              is the trade wool.css:79 already recorded as a failure. */}
          {!reduced && (
            <motion.i
              className="bolt-weft"
              aria-hidden="true"
              initial={{ x: '-140%' }}
              whileInView={{ x: '340%' }}
              viewport={{ once: true, margin: '-12% 0px' }}
              transition={{ duration: 1.25, ease: EASE, delay: 0.2 }}
            />
          )}

          <div className="bolt-inner">
            <div className="bolt-copy">
              {/* the same file Chrome.jsx already loads three times (nav,
                  fullscreen menu, footer) — a cache hit, not a new download */}
              <img
                className="bolt-lockup"
                src="/img/logo/loom-woven.webp"
                alt={BRAND.name}
                width={1579}
                height={534}
                loading="lazy"
                decoding="async"
              />
              <SplitWords
                as="h2"
                className="h2 bolt-claim"
                text={`${BRAND.positioning}.`}
              />
              <p className="bolt-sub">
                <WoolIcon name="pin" size="sm" />
                {BRAND.cities.join(' × ')}
              </p>
            </div>

            {/* the one CTA. Two would turn this back into a promo pair.
                'Contact us' is photographed violet and is unused elsewhere,
                so no two photographed spools ever share a screen. */}
            <Magnetic className="bolt-cta">
              <WoolButton label="Contact us" size="big" onClick={() => open({})} />
            </Magnetic>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
