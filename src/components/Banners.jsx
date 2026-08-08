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
import { Fragment } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BRAND, WIZARD, SERVICES } from '../data/site.js'
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
            more options than the grid, and line 226 of banners.css is a hard
            constraint: 8 tiles form a rectangle, 9 form a ragged 3×3−1. A need
            earns a tile by being given a block. */}
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
                    /* Eight of these mount together, and the stills are
                       1264px wide for a box that is 155px on a phone and
                       291px at 1440 — 4.09 MB of decoded bitmap each, 32.7 MB
                       for the grid, the densest screenful on the page.

                       `media`, not a `w` descriptor, and that is the whole
                       point: decoded RAM is width x height x 4 and the phones
                       this is for run at DPR 3, where a 155px box asks for
                       465px and any srcset would happily hand back the 1264px
                       original. A breakpoint is the only thing that puts a
                       CEILING on the pixels. The -sm cut is 520px — 3.4x the
                       phone box, so it is not soft, it is just not absurd.

                       `display: contents` so the <picture> adds no box: the
                       img is absolutely positioned against `.cnt-band` by
                       `.counter .cnt-photo`, and a wrapper with a layout box
                       would become its containing block instead. Same reason
                       everywhere else this file wraps an img. */
                    <picture style={{ display: 'contents' }}>
                      <source media="(max-width: 767px)" type="image/avif" srcSet={`/img/needs/${b.photo}-sm.avif`} />
                      <source media="(max-width: 767px)" type="image/webp" srcSet={`/img/needs/${b.photo}-sm.webp`} />
                      <source type="image/avif" srcSet={`/img/needs/${b.photo}.avif`} />
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
                    </picture>
                  )}
                </span>
                {/* The button and the peel are siblings of the strip, not
                    children of it. Both are positioned against the TILE —
                    the button to the top-right corner, the peel to the
                    bottom-right — and the strip is now a bare label with no
                    box of its own, so it cannot serve as their containing
                    block. */}
                <span className="cnt-strip">
                  <span className="cnt-label">{need}</span>
                </span>
                <i className="cnt-arrow" aria-hidden="true" />
                <i className="cnt-peel" aria-hidden="true" />
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

/* ═══════════════════ 1b · THE TREE — moved ═══════════════════ */
/* The bloom tree used to stand here, between the needs grid and the fork. It is
   now the closing image of the page: markup in Chrome.jsx's `Footer`, styles in
   styles.css under `.footer--bloom`. `.treebreak` / `.tb-*` are gone from this
   file and from banners.css — the tree was never a divider, it was the site's
   best object being spent as one. */


/* ═══════════════════ 2 · THE FORK ═══════════════════ */

/* Rebuilt from nothing, twice over.

   V1 was two knitted panels on the near-black page. V2 replaced them with paper
   wish tags flanking the bloom tree on a pink sky — a composition that worked
   only because the tree was in it. The tree has moved to the footer, where it
   is the last thing on the page instead of a divider in the middle of one, and
   a pink watercolour with nothing standing on it is just a pale stripe. So the
   sky went with the tree and this section is back on the site's own ground.

   What it is now is a SWITCH, not a pair of cards. Two full-height woven
   panels butted against one yarn seam, sized `1fr 1fr` until you touch one —
   then the one under the pointer takes the room and the other gives it up. The
   interaction IS the content: the section asks which of two you are, and the
   layout answers by physically committing to your choice before you have
   clicked anything. A pair of equal cards can only ask; this can respond.

   Everything is CSS. The expansion is one `flex-grow` transition driven by
   `:has()`, so there is no state, no resize observer, no JS on hover — and
   `:focus-within` gets the identical treatment, so a keyboard walks the same
   design a pointer does. Content and function are unchanged from both previous
   versions: same two choices, same wizard, same secondary links. */
const OFFER = [
  {
    id: 'studio',
    ord: '01',
    // magenta is the house key and goes to the option most visitors are in
    dye: 'magenta',
    mark: 'tag',
    eyebrow: 'Already trading',
    title: 'I have a business already.',
    // The panel is tall and wide enough for three lines now, so the body no
    // longer has to be cut to fit a 340px tag. It still stops well short of a
    // brief — the wizard this opens is where detail belongs.
    body: `It runs — it just doesn’t land. We take what already sells and rebuild the brand, the site and the campaign around it, in one frame.`,
    cta: 'Book a call',
    note: 'I have a business already',
    link: { href: '#work', label: 'See the work' },
  },
  {
    id: 'lab',
    ord: '02',
    dye: 'violet',
    mark: 'plus',
    eyebrow: 'Starting out',
    title: 'I have a business idea.',
    body: `Nothing exists yet, which is the easiest place to start — name, identity, site, launch, in the order that gets you trading fastest.`,
    cta: 'Start from zero',
    note: 'I have a business idea',
    // the CTA already opens the wizard, so the secondary link carries the other
    // half of the claim ("apps in stores, tools in the lab") instead of
    // duplicating it
    link: { href: '#apps', label: 'See the apps' },
  },
]

export function OfferPair() {
  const { open } = useWizard()
  return (
    <section className="offer" id="offer" aria-label="Already trading, or starting from an idea">
      {/* This one DOES take a section head, where the wish-tag version did not.
          Two objects floating beside a tree were legible as a choice on their
          own; two full-bleed panels are a piece of furniture and need to be
          told what they are before the eye starts reading either one. */}
      <div className="section-head">
        <p className="kicker"><span>—</span> Two ways in</p>
        <SplitWords as="h2" className="h2" text="Which one is you?" />
      </div>

      <div className="fork">
        {OFFER.map((o, i) => (
          <Fragment key={o.id}>
            {/* the seam. A real flex item between the two panels rather than an
                absolutely-positioned centre line — the halves change width on
                hover, and anything pinned to 50% would slide off the join. */}
            {i === 1 && (
              <div className="fork-seam" aria-hidden="true">
                <i className="fork-yarn" />
                <span className="fork-or">or</span>
                <i className="fork-yarn" />
              </div>
            )}
            <Reveal delay={i * 0.1} y={30} className="fork-cell">
              <article className={`fork-half blk blk--${o.dye}`} data-cursor>
                {/* the four yarns, the same stripe .kicker::after and .progress
                    already run — one static gradient, never animated */}
                <i className="blk-rail" aria-hidden="true" />
                {/* the ordinal, cut in outlined Bloom and bled off the top-right
                    corner. It is the only thing in the panel that is allowed to
                    be huge, which is what stops two dense text blocks reading
                    as one wall. */}
                <span className="fork-ord" aria-hidden="true">{o.ord}</span>
                <div className="fork-inner">
                  <WoolIcon name={o.mark} className="fork-medal" />
                  <p className="fork-eyebrow">{o.eyebrow}</p>
                  <h3 className="fork-h">{o.title}</h3>
                  <p className="fork-body">{o.body}</p>
                  <div className="fork-foot">
                    <Magnetic>
                      <button type="button" className="fork-cta" onClick={() => open({ note: o.note })}>
                        {o.cta}
                      </button>
                    </Magnetic>
                    <a className="fork-link" href={o.link.href}>{o.link.label} →</a>
                  </div>
                </div>
              </article>
            </Reveal>
          </Fragment>
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
              {/* 1579px of woven wordmark for a 335px box on a phone —
                  3.37 MB decoded. The phone cut is 760px (2.3x that box).
                  NOT the same file as Chrome.jsx's nav mark: that one is
                  `loom-woven-sm.webp` at 480px, which is right for a 113px nav
                  box and soft at 335. The full file stays the desktop
                  candidate, where the footer word paints it at 880px. */}
              <picture style={{ display: 'contents' }}>
                <source media="(max-width: 767px)" type="image/webp" srcSet="/img/logo/loom-woven-phone.webp" />
                <img
                  className="bolt-lockup"
                  src="/img/logo/loom-woven.webp"
                  alt={BRAND.name}
                  width={1579}
                  height={534}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
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
