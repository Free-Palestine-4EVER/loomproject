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
import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion, useInView } from 'motion/react'
import { BRAND, WIZARD, SERVICES } from '../data/site.js'
import { EASE, SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton, WoolIcon } from './Wool.jsx'
import { NeedModal } from './NeedModal.jsx'
import { hasNeedDetail } from '../data/needs.js'

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

export function Counter({ children = null }) {
  const { open } = useWizard()
  // Which need's panel is showing, or null. The tile used to call open()
  // straight through to the contact wizard; it now opens the detail panel and
  // the panel's own CTA carries the same seed on to the wizard. A need with
  // no entry in NEEDS still goes direct, so the panel is an upgrade rather
  // than a gate on the eight tiles.
  const [openNeed, setOpenNeed] = useState(null)
  const pick = useCallback((need) => {
    if (hasNeedDetail(need)) setOpenNeed(need)
    else open({ note: need })
  }, [open])
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
            // modulo stagger by COLUMN COUNT — each row restarts at 0 instead
            // of waiting on the one above it. Two columns now, not four.
            <Reveal key={need} delay={(i % 2) * 0.06} y={22} className="cnt-cell">
              <button
                type="button"
                className="cnt-tile"
                onClick={() => pick(need)}
                aria-haspopup="dialog"
                aria-label={`${need} — what LOOM delivers`}
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
                    /* Eight of these mount together and they are the densest
                       screenful on the page, so the decode budget is the
                       thing being managed here, not the file size. Decoded
                       RAM is width x height x 4 regardless of codec, and the
                       phones this is for run at DPR 3 — which is exactly why
                       there is no srcset: a `w` descriptor lets a DPR-3
                       phone ask for, and get, the largest cut on offer. A
                       single fixed source is the only thing that puts a hard
                       CEILING on the pixels. 1100x471 is 2.07 MB decoded,
                       16.6 MB for the grid.

                       ONE cut at every width now: the 21:9 `-wide` panorama.
                       The tile used to swap art direction at 719px — a 2:3
                       `-pc` portrait above it, the panorama below — and the
                       media query had to sit exactly on banners.css's
                       aspect-ratio switch or the source would letterbox in
                       the gap. Desktop went 21:9 too (2 columns instead of
                       4), so the switch has nothing left to switch and the
                       whole class of mismatch bugs goes with it. The `-pc`
                       portraits stay on disk, referenced by nothing.

                       1100x471 for a box that is ~600px at 1440 and the full
                       column on a phone — one file, no srcset, and therefore
                       no way for a DPR-3 phone to talk itself into a bigger
                       decode than the ceiling.

                       `display: contents` so the <picture> adds no box: the
                       img is absolutely positioned against `.cnt-band` by
                       `.counter .cnt-photo`, and a wrapper with a layout box
                       would become its containing block instead. Same reason
                       everywhere else this file wraps an img. */
                    <picture style={{ display: 'contents' }}>
                      <source type="image/avif" srcSet={`/img/needs/${b.photo}-wide.avif`} />
                      <img
                        className="cnt-photo"
                        src={`/img/needs/${b.photo}-wide.webp`}
                        alt=""
                        width={1100}
                        height={471}
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

      {/* Act two, mounted by App.jsx as <Counter><Solutions merged /></Counter>.
          It sits between the grid and the CTA on purpose: "pick what you need"
          and "pick your industry" are the same question asked two ways, and
          the quote button has to close BOTH of them rather than land between
          them. Nothing else is ever passed here. */}
      {children}

      <NeedModal need={openNeed} onClose={() => setOpenNeed(null)} />

      <Reveal delay={0.1} className="cnt-foot">
        {/* 'Request a quote' is one of the 21 photographed spools and is unused
            elsewhere on the site. It sits on bare --bg, so it cannot clash with
            a block — the label was chosen before the colour, because Wool.jsx
            gives the `yarn` prop no effect on a photographed pill. */}
        <Magnetic>
          <WoolButton label="Request a quote" size="big" onClick={() => open({})} />
        </Magnetic>
        {/* Points DOWN, not back up. Work used to sit below this section, so
            "see the work" was the forward move; since the reorder the cases
            are already read by the time anyone gets here, and sending them
            back up is a leak. The Machine is the next thing to sell. */}
        <a className="cnt-foot-link" href="#the-machine" data-scroll>or see what we sell →</a>
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

/* Third full rebuild — rejected twice before this, and the note below records
   why neither fix was actually a different idea.

   V1 was two knitted panels on the near-black page. V2 replaced them with
   paper wish tags flanking the bloom tree on a pink sky — legible only
   because the tree stood between them. The tree has since moved to the
   footer, where it closes the page instead of dividing one, so that ground
   is gone. V3 kept the sky's lesson (put the section back on the site's own
   dark) but not its shape: two full-bleed woven panels on a yarn seam,
   `1fr 1fr` at rest, one taking the room on `:hover`/`:focus-within` while
   the other gave it up. Rejected a third time.

   All three are the SAME complaint answered three different ways: every
   version put up two coloured blocks and asked the visitor to pick a side of
   the page. That is a shape (a fork in a literal hallway), not a question,
   and changing the material each panel is cut from — knit, then paper, then
   knit again — never changed the shape being rejected. So this version does
   not have two of anything on screen at once.

   It's a SWITCH: one small toggle, two felt lozenges on a stitched track,
   sitting above ONE answer card. Press a side and the thumb sews itself
   across the track; the card below crossfades to that answer (opacity + a
   14px settle, `AnimatePresence mode="wait"` — the same crossfade idiom
   Solutions.jsx already uses for its search answer). There is exactly one
   panel in the layout at any moment, so there is nothing for two panels to
   compete over and no hover-driven width to get stuck mid-tap on a phone.

   State is real React state (`active`), set by `onClick`, not `:hover` or
   `:focus-within` — V3's actual bug wasn't 1.34:0.66, it was building the
   whole mechanic on a pseudo-class that a touchscreen cannot release. A tap
   here is a normal click on a normal `role="radio"` button; both answers stay
   permanently reachable as buttons, never revealed only by touching the
   other one first.

   MATERIAL: staying IN the wool language on purpose, not departing from it —
   a physical two-position toggle is exactly the kind of small hardware object
   the site already owns (the counter's felted medallions, the bolt's dashed
   rivet), so the felt track and `.blk` dye on the answer card read as the
   same material family the rest of the page is cut from. What's actually new
   is the SHAPE: one modest, centred object instead of a full-bleed pair —
   the section finally looks like a question being asked, not a hallway. */
const OFFER = [
  {
    id: 'studio',
    ord: '01',
    // magenta is the house key and goes to the option most visitors are in
    dye: 'magenta',
    mark: 'tag',
    eyebrow: 'Already trading',
    title: 'I have a business already.',
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

/* ——— THE FORK (redesigned 10 Aug 2026) ———

   WHAT WAS WRONG. A radio toggle above a stage that showed ONE of the two
   answers at a time. Four faults, and the first is the fatal one:

     It hid half the question. "Which one is you?" is a fork, and a fork with
     one branch behind a click is not a fork — it is a quiz. The visitor who
     was the OTHER option had to guess that there was another option and go
     looking for it. Meanwhile the single card floated in the middle of a
     full-width band with dead space either side of it, so the section read as
     half-empty AND as too tall for what it said.

     Weak hierarchy — the toggle (chrome) sat above the card (content) at
     similar visual weight, so the eye landed on the switch, not the choice.
     Templated — a rounded card on a dark band, again.
     Flat — the whole craft budget was a sliding thumb nobody saw slide,
     because you only see it if you click the thing you already skipped.

   NOW: both branches, side by side, filling the band. The visitor does not
   operate a control — they read two sentences and pick the one that is them,
   which is the actual job. Hovering or focusing a branch grows it and dims the
   other, so the choosing is felt rather than administered; the seam between
   them is the loom thread, which is the one place this page's motif belongs.

   NO AnimatePresence, NO active state, NO aria-live. There is nothing to swap
   any more — two static articles, each with its own heading and its own CTA,
   which is also two landmarks for a screen reader instead of one live region
   announcing replacements. */
export function OfferPair() {
  const { open } = useWizard()

  return (
    <section className="ofk" id="offer" aria-label="Already trading, or starting from an idea">
      <div className="ofk-head">
        <p className="kicker"><span>—</span> Two ways in</p>
        <SplitWords as="h2" className="h2 ofk-h2" text="Which one is you?" />
      </div>

      <Reveal y={26} className="ofk-wrap">
        <div className="ofk-fork">
          {OFFER.map((o, i) => (
            <article key={o.id} className={`ofk-branch blk blk--${o.dye}`} data-cursor>
              {/* the shared four-yarn stripe every dyed shape on this page
                  paints with — not a new one for this section */}
              <i className="blk-rail" aria-hidden="true" />

              <header className="ofk-top">
                <span className="ofk-mark"><WoolIcon name={o.mark} /></span>
                <span className="ofk-eyebrow">{o.eyebrow}</span>
                <span className="ofk-ord" aria-hidden="true">{o.ord}</span>
              </header>

              <h3 className="ofk-h">{o.title}</h3>
              <p className="ofk-body">{o.body}</p>

              <div className="ofk-foot">
                <Magnetic>
                  <button type="button" className="ofk-cta" onClick={() => open({ note: o.note })}>
                    {o.cta}
                  </button>
                </Magnetic>
                <a className="ofk-link" href={o.link.href}>{o.link.label} <span aria-hidden="true">→</span></a>
              </div>
            </article>
          ))}

          {/* THE SEAM. One thread down the join, and the only thing between
              the two branches — a border would make them two boxes, which is
              what the card layout already was. Decorative and pointer-events
              none so it never eats a click meant for a branch. */}
          <i className="ofk-seam" aria-hidden="true" />
        </div>
      </Reveal>
    </section>
  )
}

/* ═══════════════════ 3 · THE BOLT ═══════════════════ */

export function Bolt() {
  const { open } = useWizard()
  const reduced = useReducedMotion()
  const frameRef = useRef(null)
  // watch the FRAME, not the shuttle. The shuttle's own resting position is
  // translateX(-140%) — fully outside the felt, by design, so it isn't visible
  // before it plays. Put whileInView on that same element and you are asking
  // an IntersectionObserver whether an element sitting off past the left edge
  // of the viewport is in the viewport — it never is, at rest, so it never
  // reports entering. That was true of the ORIGINAL once-only version too: the
  // shuttle wasn't "spent once and gone", it was firing on nobody, ever. Proved
  // with a bare IntersectionObserver on `.bolt-weft` in a real browser before
  // touching this — isIntersecting stayed false through a full scroll past it.
  // The frame never moves, so it is a fair trigger for a child that does.
  const shuttleOn = useInView(frameRef, { once: false, margin: '-12% 0px' })
  return (
    <section className="bolt" id="bolt" aria-label={BRAND.positioning}>
      <Reveal y={28}>
        <div className="bolt-frame felt stitched" ref={frameRef}>
          <i className="bolt-rail bolt-rail--top" aria-hidden="true" />
          <i className="bolt-rail bolt-rail--bot" aria-hidden="true" />
          {/* the shuttle: ONE weft pass, transform only, replayed on every
              crossing rather than spent once. wool.css:79's lesson was about a
              layer left permanently compositing behind static content — a
              blurred halo rasterised and live on 36 buttons at once, forever.
              This is the opposite shape: idle off-frame at rest, it only
              costs anything for the 1.25s it is actually crossing the frame,
              and there is still exactly one of it. Retriggering on each pass
              (instead of the fixed target the intersection bug above meant it
              never reached) is what actually answers "fires once and is gone
              forever" — the fix underneath is what makes it fire at all. */}
          {!reduced && (
            <motion.i
              className="bolt-weft"
              aria-hidden="true"
              initial={{ x: '-140%' }}
              animate={{ x: shuttleOn ? '340%' : '-140%' }}
              // forward pass is the whole point and eases in on a delay; the
              // reset back to the start line happens off-view while scrolling
              // away, so it snaps rather than spending a second easing where
              // nobody is looking
              transition={shuttleOn
                ? { duration: 1.25, ease: EASE, delay: 0.2 }
                : { duration: 0 }}
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

            {/* the seam. A bolt of cloth is folded, not flat — this is the
                crease, not a divider borrowed for decoration. It is what the
                fork's seam already does between two panels (banners.css:574);
                here it does the same job with one panel and one CTA either
                side of it, so the felt between them reads as the fabric's
                own fold instead of unused canvas. Desktop only — stacked on
                a phone, copy sits directly above the CTA and there is no gap
                left to fold. */}
            <div className="bolt-seam" aria-hidden="true">
              <i className="bolt-yarn" />
              <span className="bolt-rivet" />
              <i className="bolt-yarn" />
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
