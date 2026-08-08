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

/* ═══════════════════ 1b · THE TREE ═══════════════════ */
/* The centre of the fork: panel · TREE · panel, one row, one section. It is
   a DIV and a grid child, not a section of its own — that is what lets the
   three float as a single composition and keeps the tree between the two
   panels when the row stacks on a phone.

   It is one <img> and a handful of composited transforms — no canvas, no
   particle system. Deliberate: the page already carries two WebGL layers and
   measured ~6x faster with them off, so an element whose only job is to be
   beautiful does not get to allocate a third context. Everything animated
   here is transform or opacity, so it runs on the compositor at no layout
   cost. */
function TreeBreak() {
  const reduced = useReducedMotion()
  return (
    <div className="treebreak" aria-hidden="true">
      <i className="tb-glow" />
      <div className="tb-stage">
        {/* This was a `w`-descriptor srcSet and it never once fired on the
            device it was written for. `bloom-tree-sm.webp 800w` against
            `88vw` on a 390px phone asks for 343 * DPR css pixels: 686 at DPR 2
            (so the 800w cut wins, but the FILE was only 343px wide — the
            descriptor was simply wrong, and the tree came out as a 0.8x
            upscale), and 1029 at DPR 3, where the browser correctly skips the
            cut and takes the full 1600px original — 9.05 MB of decoded bitmap
            for a decorative tree, on exactly the hardware that cannot afford
            it. A media query cannot be argued with by a DPR. The -sm cut is
            regenerated at a real 800px by scripts/shrink-decoded.mjs, which is
            1.9x the 427px box it lands in. */}
        <picture style={{ display: 'contents' }}>
          <source media="(max-width: 767px)" type="image/avif" srcSet="/img/tree/bloom-tree-sm.avif" />
          <source media="(max-width: 767px)" type="image/webp" srcSet="/img/tree/bloom-tree-sm.webp" />
          <source type="image/avif" srcSet="/img/tree/bloom-tree.avif" />
          <img
            className="tb-tree"
            src="/img/tree/bloom-tree.webp"
            alt=""
            width={1860}
            height={1723}
            loading="lazy"
            decoding="async"
          />
        </picture>
        {/* Petals: 7 spans, each drifting on its own duration/delay so the fall
            never reads as a loop. Count is the whole budget — a real petal
            system here would be the third animation layer on a page that is
            already GPU-bound. */}
        {!reduced && (
          <div className="tb-petals">
            {Array.from({ length: 7 }, (_, i) => <span key={i} style={{ '--i': i }} />)}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════ 2 · THE OFFER ═══════════════════ */

/* The fork, rebuilt for the pink sky.
   The two knitted panels that used to live here were cut for a near-black page:
   deep violet and blue wool, a photographed art band, a dark scrim and a drifting
   aura. Every one of those choices is a value decision made against a black
   ground, and on a pale cherry sky they read as two heavy boxes dropped on a
   watercolour. They are gone — material, art bands and all.
   What replaces them is a WISH TAG: the paper card people tie to a blossom tree.
   It is the one object that belongs on this ground both materially (paper is
   light, so it sits on the sky instead of punching a hole in it) and
   narratively (you hang a wish on a cherry tree, and this section asks the
   visitor which wish is theirs). Each tag hangs from a cord that runs up out of
   the frame, so the pair reads as suspended from one shared line — the eye
   grades two hanging objects against their hanger, not against each other.
   Content and function are unchanged: same two choices, same wizard, same
   secondary links. `care` and `proof` are gone from the data with the panels
   that carried them — a fork that has to explain its own process has lost. */
const OFFER = [
  {
    id: 'studio',
    eyebrow: 'Already trading',
    title: 'I have a business already.',
    // Two lines that FIT two lines. The tag clamps the body at two, and the
    // long version was landing as a sentence cut mid-word with an ellipsis —
    // which reads as a bug, not as brevity. The full argument (one frame,
    // every discipline) belongs to the wizard this card opens.
    body: `It runs — it just doesn’t land. We rebuild it around what already sells.`,
    cta: 'Book a call',
    note: 'I have a business already',
    link: { href: '#work', label: 'See the work' },
  },
  {
    id: 'lab',
    eyebrow: 'Starting out',
    title: 'I have a business idea.',
    body: `Nothing exists yet — the easiest place to start. Name, site, launch.`,
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
    // no .section-head — a promo pair is an interstitial, the same grammar
    // Marquee and Stats use. It answers the work above it rather than starting
    // a subject, so it takes the short lead-in clamp.
    <section className="offer" id="offer" aria-label="Already trading, or starting from an idea">
      {/* The sky.
          An <img> rather than a CSS background-image for two reasons: it carries
          its own intrinsic width/height so the box is settled before the bytes
          arrive (a background-image decoding late would repaint, and with
          `position: absolute` here it cannot reflow the row at all), and srcSet
          lets a 390px phone take the 4KB 1100px cut instead of the 14KB one.
          `object-fit: cover` + the mask that fades both edges live in the CSS. */}
      {/* Same correction as the tree, and here the `w` descriptors were doing
          real damage: `100vw` on a 390px phone is 780 css px at DPR 2 and
          1170 at DPR 3, and 1170 is past the 1100w cut — so a DPR-3 iPhone
          took the 2200px original, 10.31 MB of decoded bitmap, for a sky that
          is a blurred watercolour behind a mask that fades both its edges.
          The media query pins every phone to the small cut. (That cut is
          390px wide, not the 1100 its old descriptor claimed; it is left at
          that size on purpose — it is what DPR-2 phones were already being
          served, it reads correctly through the fade, and regenerating it at
          1100 would put 2.7 MB back for no visible gain.) */}
      <picture style={{ display: 'contents' }}>
        <source media="(max-width: 767px)" type="image/webp" srcSet="/img/tree/bloom-sky-sm.webp" />
        <img
          className="offer-sky"
          src="/img/tree/bloom-sky.webp"
          alt=""
          width={2200}
          height={1228}
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
      </picture>
      <div className="offer-row">
        {/* tag · TREE · tag — the tree is the middle grid child, not a section
            of its own, so the three float as one composition and stay in that
            order when the row stacks on a phone. */}
        {OFFER.map((o, i) => (
          <Fragment key={o.id}>
          <Reveal delay={i * 0.08} y={26} className="offer-cell">
            <article className="wish" data-cursor>
              {/* the cord and the eyelet it hangs from. Two leaf elements, no
                  children, purely decorative — the cord runs off the top of the
                  tag and is clipped by the section, which is what sells "this
                  is tied to a branch somewhere above". */}
              <i className="wish-cord" aria-hidden="true" />
              <i className="wish-eye" aria-hidden="true" />
              <p className="wish-eyebrow">{o.eyebrow}</p>
              <h3 className="wish-h">{o.title}</h3>
              <p className="wish-body">{o.body}</p>
              <div className="wish-foot">
                <Magnetic>
                  <button type="button" className="wish-cta" onClick={() => open({ note: o.note })}>
                    {o.cta}
                  </button>
                </Magnetic>
                <a className="wish-link" href={o.link.href}>{o.link.label} →</a>
              </div>
            </article>
          </Reveal>
          {i === 0 && <TreeBreak />}
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
