// Page sections: Hero, Marquee, Manifesto, Process, Stats, Studios, Contact
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { cubicBezier, motion, useMotionValueEvent, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { BRAND, CLIENT_WALL, PROCESS, STATS } from '../data/site.js'
import { EASE, SplitWords, Reveal, CountUp, Magnetic } from '../lib/motion.jsx'
import { ContactWizard } from './ContactWizard.jsx'
import { LoomHead } from './LoomHead.jsx'
import { MachineChat, useMachineLang } from './MachineChat.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { ThreadDivider } from './Rich.jsx'
import { WoolButton, WoolIcon } from './Wool.jsx'
import './sections-stage.css'
import './process.css'
import './stats.css'
import './studios.css'

export function Hero() {
  const { open: openWizard } = useWizard()
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const mobilePlanetRef = useRef(null)
  const reduced = useReducedMotion()
  const [coarse, setCoarse] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const sync = () => setCoarse(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // The mobile planet's own scroll reaction — deliberately NOT routed through
  // framer's useScroll/useTransform (that system already drives .hero-type
  // and, on desktop, the background parallax). Running a second scroll-linked
  // motion-value system on top of Lenis's own rAF loop is what made scrolling
  // feel stiff on a phone; this is one passive listener, rAF-throttled, that
  // writes a single transform to one small element directly — no React
  // re-render in the loop at all.
  useEffect(() => {
    if (!coarse || reduced) return
    const el = mobilePlanetRef.current
    if (!el) return
    let raf = null
    const update = () => {
      raf = null
      const h = window.innerHeight || 1
      const p = Math.min(1.4, Math.max(0, window.scrollY / h))
      // grows as the reader scrolls past — the opposite direction from the
      // desktop WebGL planet, which recedes/shrinks (PlanetField.js) —
      // because on mobile there's no z-depth to sell "moving away", so
      // "reacts to scroll at all" reads better as it looming closer.
      el.style.setProperty('--ms', (1 + p * 0.55).toFixed(3))
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [coarse, reduced])

  // three.js is ~600KB — far too much to sit in the main bundle for a decorative
  // backdrop, so the field is code-split and fetched after mount. Reduced-motion
  // readers never download it at all: the .hero-canvas-wrap gradient is already
  // the whole picture for them.
  useEffect(() => {
    if (reduced) return
    // ONE WebGL context on touch devices. iOS Safari kills the whole tab when
    // GPU memory runs out — no error, no recovery — and the page-wide companion
    // layer is already a context, and running this one alongside it is what was
    // taking iPhones down partway through the scroll.
    // The hero keeps its CSS gradient and the companion butterfly still flies.
    if (window.matchMedia('(pointer: coarse)').matches) return
    let cancelled = false
    let teardown = null

    ;(async () => {
      const { PlanetField } = await import('../three/PlanetField.js')
      if (cancelled || !canvasRef.current || !wrapRef.current) return
      let field
      try {
        field = new PlanetField(canvasRef.current, { reduced })
      } catch (e) {
        // WebGL unavailable — CSS gradient fallback stays visible
        canvasRef.current.style.display = 'none'
        return
      }
      const onScroll = () => {
        const h = window.innerHeight
        field.setScroll(Math.min(window.scrollY / h, 1.4))
      }
      const onMouse = (e) => {
        field.setMouse((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
      }
      let inView = false
      const sync = () => {
        const locked = document.documentElement.classList.contains('overlay-open')
          || document.documentElement.classList.contains('menu-open')
        ;(inView && !document.hidden && !locked) ? field.start() : field.stop()
      }
      const io = new IntersectionObserver(([en]) => { inView = en.isIntersecting; sync() })
      io.observe(wrapRef.current)
      // A case study or the wizard opening locks scroll but leaves this loop
      // running underneath it — see the identical note in Flyer.jsx.
      const lockObs = new MutationObserver(sync)
      lockObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      document.addEventListener('visibilitychange', sync)
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('mousemove', onMouse, { passive: true })
      teardown = () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('mousemove', onMouse)
        document.removeEventListener('visibilitychange', sync)
        io.disconnect()
        lockObs.disconnect()
        field.dispose()
      }
    })()

    // unmounted before the chunk landed -> nothing was ever wired up
    return () => { cancelled = true; if (teardown) teardown() }
  }, [reduced])

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ['start start', 'end start'] })
  const yType = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '38%'])
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0])
  // Background photo drifts slower than the page scrolls — classic parallax,
  // on top of its own slow ambient background-position drift (styles.css).
  // Desktop only: this is a second scroll-linked motion-value system running
  // alongside Lenis's own rAF loop, and on a phone that's exactly what read
  // as "scroll isn't smooth" — the mobile planet gets its own much lighter
  // scroll reaction instead (see the effect above).
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', reduced || coarse ? '0%' : '14%'])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, reduced || coarse ? 1 : 1.08])
  // A delayed `animate` takes ownership of whatever MotionValue it is bound to,
  // so the scroll hint must NOT share `fade` with .hero-type — sharing it held
  // the whole headline at opacity 0 until t≈2.5s, ~1.4s of blank hero after the
  // loader cleared.
  const hintFade = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  return (
    <section className="hero" id="top" ref={wrapRef}>
      <motion.div className="hero-canvas-wrap" aria-hidden="true" style={{ y: bgY, scale: bgScale }}>
        {/* own layer, own transform — the CSS drift/breathe keyframes below
            animate THIS element's transform; sharing .hero-canvas-wrap with
            framer's scroll-parallax would let the animation win every frame
            (CSS animations override inline styles on the same property) and
            silently kill the parallax the instant the page loaded */}
        <div className="hero-canvas-bg" />
        <canvas ref={canvasRef} className="hero-canvas" />
        {/* Touch-only stand-in for the WebGL planet (Sections.jsx:31 never
            gives touch devices that context). Two nested layers so the
            scroll-driven scale (JS, this element) and the ambient float
            (CSS keyframe, the child) each own their own transform instead
            of fighting over one — the exact bug fixed on .hero-canvas-wrap
            itself earlier tonight. */}
        <div ref={mobilePlanetRef} className="hero-mobile-planet" aria-hidden="true">
          <div className="hero-mobile-planet-inner" />
        </div>
        <div className="hero-vignette" />
      </motion.div>
      <motion.div className="hero-type" style={{ y: yType, opacity: fade }}>
        <motion.p
          className="hero-eyebrow"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.8, ease: EASE }}
        >
          {BRAND.positioning} — Amman<span className="x">,</span> Jordan
        </motion.p>
        <h1 className="hero-h1">
          <span className="hero-line"><motion.span initial={{ y: '108%' }} animate={{ y: '0%' }} transition={{ delay: 1.35, duration: 1, ease: EASE }}>We weave brands</motion.span></span>
          <span className="hero-line hero-line--accent"><motion.span initial={{ y: '108%' }} animate={{ y: '0%' }} transition={{ delay: 1.47, duration: 1, ease: EASE }}>on the edge</motion.span></span>
          <span className="hero-line"><motion.span initial={{ y: '108%' }} animate={{ y: '0%' }} transition={{ delay: 1.59, duration: 1, ease: EASE }}>of creativity<span className="dot">.</span></motion.span></span>
        </h1>
        <motion.p
          className="hero-sub"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8, ease: EASE }}
        >
          One studio for the whole build: the brand, the website, the campaign that sells it,
          and the AI that keeps it running while you sleep.
        </motion.p>
        <motion.div
          className="hero-ctas"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.95, duration: 0.8, ease: EASE }}
        >
          {/* "Start weaving" is one of the 21 photographed spools — and it is the
              headline's own verb, so the hero CTA is real wool, not a CSS pill */}
          <Magnetic><WoolButton label="Start weaving" className="wool-btn--hero" onClick={() => openWizard({})} /></Magnetic>
          <Magnetic><WoolButton label="See the work" href="#work" data-scroll /></Magnetic>
        </motion.div>
      </motion.div>
      <motion.div
        className="hero-scrollhint" aria-hidden="true"
        style={{ opacity: hintFade }}
      >
        <motion.span
          className="hero-scrollhint-in"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}
        >
          <span>Scroll</span><i />
        </motion.span>
      </motion.div>
    </section>
  )
}

export function Marquee() {
  const row = [...CLIENT_WALL, ...CLIENT_WALL]
  return (
    <section className="marquee" aria-label="Selected clients">
      <div className="marquee-track">
        {row.map((c, i) => (
          <span key={i} aria-hidden={i >= CLIENT_WALL.length}>{c}<em>✳</em></span>
        ))}
      </div>
    </section>
  )
}

/** Manifesto headline: each word rises, flips up off its own baseline and
 *  ignites through the brand magenta on its way from unlit grey to white as the
 *  reader scrolls through the section — thread pulling taut through cloth, not
 *  a once-on-enter reveal. Driven by the SAME section scroll progress the media
 *  reaction uses, just windowed to the entrance so it resolves before the
 *  reader is even halfway down.
 *
 *  The words stay real, wrappable text. Each <span> is inline-block (a
 *  transform needs that) but the separating spaces are ordinary text nodes
 *  BETWEEN the spans, not characters inside them: whitespace at the end of an
 *  inline-block is stripped as end-of-line whitespace, which is why the
 *  previous version had to smuggle a NO-BREAK space inside each word — and a
 *  no-break space is exactly what stops a long headline wrapping on a phone.
 *  A plain space text node between two inline-blocks is a real break
 *  opportunity, so the line wraps normally at every width. The h2 keeps the
 *  full sentence in aria-label and every span is aria-hidden, so assistive tech
 *  still reads one clean sentence. */
function ManifestoHeadline({ text, progress, reduced }) {
  const words = useMemo(() => text.split(' '), [text])
  const ranges = useMemo(() => inkRanges(words.length), [words])
  const n = words.length
  return (
    <h2 className="h2 manifesto-ink" aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <InkWord word={w} progress={progress} range={ranges[i]} reduced={reduced} />
          {i < n - 1 ? ' ' : null}
        </Fragment>
      ))}
    </h2>
  )
}

/** The word-landing easing: the house expo-out, as a real easing function so
 *  useTransform can bake it into each word's 0 to 1 landing value. */
const INK_EASE = cubicBezier(0.16, 1, 0.3, 1)

/** Per-word scroll windows for the headline.
 *
 *  A strictly linear i/n stagger reads as a queue: seven identical beats one
 *  metronome tick apart. The sine term below front-loads the line (the gaps
 *  between successive words start wide and then close up), so the reveal reads
 *  as a crest rolling along the sentence and settling on the last word, which
 *  is where the meaning is. Windows are 0.34 long against a 0.66 span of
 *  starts, so about four words are in flight at any moment: a wave with a
 *  body, not a row of separate pop-ins.
 *
 *  The last word finishes at 0.61 + 0.34 = 0.95 of the ink window, which lands
 *  well inside the section: nobody is ever parked on a half-grey headline. */
function inkRanges(n) {
  return Array.from({ length: n }, (_, i) => {
    const base = n === 1 ? 0 : i / (n - 1)
    const start = Math.max(0, Math.min(0.66, base * 0.66 + Math.sin(base * Math.PI * 1.5) * 0.05))
    return [start, Math.min(1, start + 0.34)]
  })
}

function InkWord({ word, progress, range, reduced }) {
  // ONE clamped, eased 0->1 value per word; every visual property below is a
  // cheap derivation of it, so a word costs one scroll interpolation rather
  // than five independent scroll subscriptions.
  const t = useTransform(progress, range, [0, 1], { ease: INK_EASE })
  // Pale cloth -> magenta ignition -> deep magenta -> ink. The magenta stop
  // sits early (0.38) so the flare happens while the word is still tilted and
  // rising; by the time it is flat on its baseline it has cooled to the ink.
  // THE RAMP MUST END ON THE INK, NOT ON WHITE. It used to run
  // #6b6284 -> #f21c8c -> #ff9ed1 -> #ffffff, which was the payoff on the old
  // violet ground and is now a headline that fades to invisible exactly as it
  // comes to rest — the last two stops were both lighter than #ffe9f2. The
  // unlit stop lightened for the same reason: on pink, "unlit cloth" is a tint
  // of the ink, not a mid grey.
  const color = useTransform(t, [0, 0.38, 0.7, 1], ['#a896b4', '#f21c8c', '#b3126a', '#33243d'])
  // % units, not px/em: they resolve against the word's own box, so the rise
  // scales with the clamp()ed display size instead of being tuned for one width.
  const y = useTransform(t, [0, 1], ['52%', '0%'])
  const rotateX = useTransform(t, [0, 1], [-74, 0])
  const scale = useTransform(t, [0, 1], [0.93, 1])
  // Never starts at 0: an unlit ghost of the sentence is always present, so the
  // headline reads as ink filling existing cloth, not as missing text.
  const opacity = useTransform(t, [0, 0.3, 1], [0.14, 0.9, 1])
  if (reduced) {
    // var(--ink), not #fff — reduced motion is a large slice of ordinary
    // visitors here (Chrome's Battery Saver forces the query on), and this is
    // the whole headline for every one of them.
    return <span className="ink-word" aria-hidden="true" style={{ color: 'var(--ink)' }}>{word}</span>
  }
  return (
    <motion.span
      className="ink-word"
      aria-hidden="true"
      // Per-word perspective rather than one on the h2: a container perspective
      // has a single vanishing point, so words at the ends of a long line would
      // flip on visibly skewed axes. Per word, every flip is identical.
      style={{ color, y, rotateX, scale, opacity, transformPerspective: 620 }}
    >
      {word}
    </motion.span>
  )
}

export function Manifesto() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  // The ink window. Everything the headline does happens between 5% and 42% of
  // the section's travel, i.e. while the section is entering and coming to rest
  // in the middle of the viewport; by the time a reader has it fully on screen
  // the sentence is already resolved white.
  const inkProgress = useTransform(scrollYProgress, [0.05, 0.42], [0, 1])
  // The rule draws itself only once the first words have landed, and a spark
  // head runs at the front of the fill and burns out as it reaches the end:
  // a line being drawn, not a progress bar filling.
  const ruleScale = useTransform(inkProgress, [0.22, 1], [0, 1])
  const headX = useTransform(inkProgress, [0.22, 1], ['-100%', '0%'])
  const headOpacity = useTransform(inkProgress, [0.2, 0.34, 0.9, 1], [0, 1, 1, 0])
  // The laptop answers the same progress: a slow parallax across the whole
  // section, plus a tilt/scale that resolves on the headline's own beat, so the
  // column and the image read as one move rather than two unrelated ones.
  const mediaY = useTransform(scrollYProgress, [0, 1], ['7%', '-7%'])
  const mediaScale = useTransform(inkProgress, [0, 1], [0.9, 1])
  const mediaRotateY = useTransform(inkProgress, [0, 1], [12, 0])
  const mediaRotateX = useTransform(inkProgress, [0, 1], [7, 0])
  const mediaOpacity = useTransform(inkProgress, [0, 0.5], [0.25, 1])
  return (
    <section className="manifesto" ref={ref}>
      <div className="manifesto-grid">
        <div className="manifesto-copy">
          <p className="kicker"><span>—</span> Manifesto</p>
          <ManifestoHeadline
            text="Trends don’t lead our work. Thinking does."
            progress={inkProgress}
            reduced={reduced}
          />
          <span className="manifesto-ink-rule" aria-hidden="true">
            <motion.span
              className="manifesto-ink-fill"
              style={{ scaleX: reduced ? 1 : ruleScale }}
            />
            {!reduced && (
              <motion.span className="manifesto-ink-head" style={{ x: headX, opacity: headOpacity }} />
            )}
          </span>
          <Reveal delay={0.15}>
            <p className="lede" style={{ marginTop: 18 }}>
              LOOM is two studios threaded through one machine — Amman for the engine, Sarajevo for
              the eye. We build brands the way looms build cloth: one decision at a time, under
              tension, until it holds.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <p className="body-dim">
              Creativity doesn’t live in comfort zones. It lives on the edge — where emotion meets
              logic, aesthetics meet performance, and every idea is backed by working technology.
            </p>
          </Reveal>
        </div>
        <motion.div
          className="manifesto-media"
          style={reduced ? undefined : {
            y: mediaY,
            scale: mediaScale,
            rotateY: mediaRotateY,
            rotateX: mediaRotateX,
            opacity: mediaOpacity,
            transformPerspective: 1400,
          }}
        >
          {/* 1700x1275 — at 8.27 MB of decoded bitmap this is the single
              largest resident image on the long page, and `.manifesto-laptop`
              paints it at 150% of its column: 420px on a 390px phone, 655px at
              1440. The phone cut is 900px, 2.1x that box.

              `media`, not a `w` descriptor: at DPR 3 a 420px box asks for
              1260px and any srcset would skip a 900px cut and take the 1700px
              original — which is precisely the phone that cannot afford it.
              `display: contents` keeps the <picture> out of layout, since the
              img is a grid/flex child of `.manifesto-media` and carries its
              own `width: 150%`. */}
          <picture style={{ display: 'contents' }}>
            <source media="(max-width: 767px)" type="image/avif" srcSet="/img/manifesto/laptop-mascot-cutout-sm.avif" />
            <source media="(max-width: 767px)" type="image/webp" srcSet="/img/manifesto/laptop-mascot-cutout-sm.webp" />
            <source type="image/avif" srcSet="/img/manifesto/laptop-mascot-cutout.avif" />
            <img
              className="manifesto-laptop"
              src="/img/manifesto/laptop-mascot-cutout.webp"
              alt="The LOOM website on a laptop, with the studio's yarn-ball mascot climbing out of the screen"
              loading="lazy"
            />
          </picture>
          <p className="manifesto-caption">The edge is intentional.</p>
        </motion.div>
      </div>
    </section>
  )
}

/* ——— PROCESS: the thread geometry ———
   ONE source for where a knot sits, used by both the SVG path and the CSS
   grid. The knots are HTML in grid column i+1, whose centre is at
   (i + 0.5) / 4 of the band; the path's vertices have to land on exactly the
   same fractions or the thread misses its own knots. Expressed against the
   1000-unit viewBox below.

   The band is padded by var(--pad) and the SVG spans only the padded box, so
   both agree without either knowing what --pad currently resolves to. */
const PROC_X = (i, n) => ((i + 0.5) / n) * 1000

/* The sag. A thread strung between two points hangs; a straight line between
   them is a wire. Each span is one quadratic curve dipping SAG units below
   the chord, which is a catenary closely enough at this size and costs one
   control point instead of a solver. The ends run out past the first and last
   knot so the thread reads as continuing off the section rather than starting
   and stopping at the copy. */
// centred in the 44-unit viewBox the CSS now gives the thread
const PROC_MID = 22
const PROC_SAG = 11
function procPath(n) {
  const y = PROC_MID
  let d = `M 0 ${y - 2}`
  // lead-in to the first knot
  d += ` Q ${PROC_X(0, n) / 2} ${y + PROC_SAG} ${PROC_X(0, n)} ${y}`
  for (let i = 1; i < n; i++) {
    const a = PROC_X(i - 1, n), b = PROC_X(i, n)
    d += ` Q ${(a + b) / 2} ${y + PROC_SAG} ${b} ${y}`
  }
  // run-out past the last
  const last = PROC_X(n - 1, n)
  d += ` Q ${(last + 1000) / 2} ${y + PROC_SAG} 1000 ${y - 2}`
  return d
}

/* One knot colour per station, in dye order — the thread arrives undyed and
   picks up a colour at each station it passes. Same four yarns Proof's stat
   rail uses, so the two sections read as the same studio. */
const PROC_YARN = ['var(--yarn-blue)', 'var(--yarn-violet)', 'var(--yarn-pink)', 'var(--yarn-gold)']

export function Process() {
  const reduced = useReducedMotion()
  const count = PROCESS.length
  const bandRef = useRef(null)

  /* Ends at 'end 0.75' rather than at the section's end: the thread should
     finish dyeing while the band is still comfortably on screen, not on the
     frame it leaves. A draw that completes off-screen is a draw nobody sees. */
  const { scrollYProgress } = useScroll({ target: bandRef, offset: ['start 0.9', 'end 0.75'] })

  const [lit, setLit] = useState(() => (reduced ? count : 0))
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (reduced) return
    // A knot lights once the thread has actually REACHED it. Knot i sits at
    // (i + 0.5)/count along the path, so that fraction — not i/count — is the
    // threshold, or every knot lights half a span early.
    const n = PROC_X(0, count) / 1000 <= p
      ? Math.min(count, Math.floor(p * count + 0.5))
      : 0
    setLit((prev) => (prev === n ? prev : n))
  })

  const d = procPath(count)

  return (
    /* id added 10 Aug 2026 when this moved up under Work: it is now the
       "how is that possible?" answer to the case studies, which is a thing
       worth linking someone straight to. No nav tab — the sequence up top is
       already thirteen labels. */
    <section className="proc" id="process">
      <ThreadDivider />
      <div className="proc-head">
        <p className="kicker"><span>—</span> Process</p>
        <SplitWords as="h2" className="h2 proc-h2" text="One process. No templates. No shortcuts." />
        <Reveal delay={0.15}>
          <p className="lede proc-lede">
            Four stations on one line. Your brand enters as raw thread and leaves wearing itself.
          </p>
        </Reveal>
      </div>

      <div className="proc-band" ref={bandRef}>
        {/* THE THREAD. Two copies of one path: the raw one always fully
            drawn, the dyed one drawn over it by scroll. Stretched with
            preserveAspectRatio="none" so the sag spans any width, which is
            why the stroke needs `vector-effect: non-scaling-stroke` (in the
            CSS) and why the knots are HTML rather than <circle>s — a circle
            in a non-uniformly scaled viewBox renders as an ellipse. */}
        <svg
          className="proc-thread"
          viewBox="0 0 1000 44"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {/* raw grey in, full magenta out — the lede, drawn */}
            <linearGradient id="proc-dye" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--ink-faint)" />
              <stop offset="0.35" stopColor="var(--yarn-violet)" />
              <stop offset="1" stopColor="var(--magenta)" />
            </linearGradient>
          </defs>
          <path className="proc-raw" d={d} fill="none" strokeWidth="2" strokeLinecap="round" />
          <motion.path
            className="proc-dyed"
            d={d}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ pathLength: reduced ? 1 : scrollYProgress }}
          />
        </svg>

        {/* Knots and stations are siblings in one grid — the knot rides the
            thread's row, the station hangs above or below it by nth-child.
            Rendered as two runs rather than interleaved so `nth-child(2n)`
            addresses stations, not knot/station pairs. */}
        {PROCESS.map((p, i) => (
          <span
            key={`knot-${p.n}`}
            className={`proc-knot proc-c${i + 1} ${i < lit ? 'is-lit' : ''}`}
            style={{ '--knot': PROC_YARN[i % 4] }}
            aria-hidden="true"
          />
        ))}

        {PROCESS.map((p, i) => (
          <Reveal
            key={p.n}
            delay={i * 0.07}
            /* rises from below for a station that hangs below the thread and
               drops from above for one that hangs over it — the entry runs
               outward from the line rather than all four sliding the same way */
            y={i % 2 ? 24 : -24}
            className={`proc-st proc-c${i + 1} ${i % 2 ? 'is-down' : 'is-up'} ${i < lit ? 'is-lit' : ''}`}
            style={{ '--knot': PROC_YARN[i % 4] }}
          >
            <span className="proc-n">{p.n}</span>
            <h3 className="proc-t">{p.title}</h3>
            <p className="proc-b">{p.body}</p>
            <i className="proc-tie" aria-hidden="true" />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/** One glyph per fact, not decoration: a weave for brands, a globe for reach,
 *  a tool grid for the lab, and the two-pin thread that echoes the Studios
 *  section for the studio count — so a reader who only skims icons still gets
 *  the shape of each claim before reading the number. Line-art in `currentColor`
 *  so the four-way accent rotation below (magenta/cyan/violet/gold, the same
 *  four the rest of the site cycles through) recolours icon, index and rule
 *  together from one CSS variable instead of four separate props. */
function StatIcon({ i }) {
  const glyphs = [
    // brands woven — three threads crossing at different depths
    <svg key="0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 9 L28 23" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 23 L28 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <path d="M4 16 L28 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
    </svg>,
    // countries shipped to — globe + orbit
    <svg key="1" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="16" cy="16" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      <path d="M16 6 V26 M6.4 16 H25.6" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>,
    // apps & tools in the lab — a small grid, one cell lit
    <svg key="2" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {[[6, 6], [18, 6], [6, 18], [18, 18]].map(([x, y], gi) => (
        <rect key={gi} x={x} y={y} width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" opacity={gi === 3 ? 1 : 0.5} />
      ))}
    </svg>,
    // studios — the same two-pin-and-thread motif as the Studios arc below
    <svg key="3" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M9.5 21.5 L22.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1 4" opacity="0.55" />
      <circle cx="9.5" cy="21.5" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="22.5" cy="10.5" r="4" stroke="currentColor" strokeWidth="1.6" />
    </svg>,
  ]
  return glyphs[i] || glyphs[0]
}

/** Thin rule under each stat that draws itself in, timed to land just after
 *  its CountUp finishes counting (CountUp's own duration is 1.6s) — so the
 *  fill reads as the number's own weight settling onto the line, not an
 *  unrelated second animation firing on the same card. */
function StatRule({ reduced, delay }) {
  return (
    <span className="stat-rule" aria-hidden="true">
      <motion.span
        className="stat-rule-fill"
        initial={{ scaleX: reduced ? 1 : 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: reduced ? 0 : 1.3, ease: EASE, delay: reduced ? 0 : delay }}
      />
    </span>
  )
}

const STAT_ACCENTS = ['var(--magenta)', 'var(--cyan)', 'var(--violet)', 'var(--gold)']

export function Stats() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-12%', '12%'])
  return (
    <section className="stats" aria-label="Studio in numbers" ref={ref}>
      <motion.div className="stats-bg" style={{ y }} aria-hidden="true">
        {/* full-bleed behind the stats: 1440px of box on a desktop, 390px on
            a phone, off one 1400px file. The 800px phone cut is 2x that box.
            Media query rather than a descriptor, for the DPR-3 reason the
            manifesto laptop above spells out. */}
        <picture style={{ display: 'contents' }}>
          <source media="(max-width: 767px)" type="image/avif" srcSet="/img/weave-alt-sm.avif" />
          <source media="(max-width: 767px)" type="image/webp" srcSet="/img/weave-alt-sm.webp" />
          <source type="image/avif" srcSet="/img/weave-alt.avif" />
          <img src="/img/weave-alt.webp" alt="" loading="lazy" />
        </picture>
      </motion.div>
      <div className="stats-grid">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.07} className="stat" style={{ '--accent': STAT_ACCENTS[i % 4] }}>
            <span className="stat-index">{String(i + 1).padStart(2, '0')}</span>
            <span className="stat-icon"><StatIcon i={i} /></span>
            <div className="stat-value"><CountUp value={s.value} suffix={s.suffix} /></div>
            <div className="stat-label">{s.label}</div>
            <StatRule reduced={reduced} delay={i * 0.07 + 0.35} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// Studio hours are a visual threshold only (drives the awake pill and the
// day/night tint of each card) — not a claim printed anywhere, so there is
// nothing here for the client's "verify every number" rule to catch.
const STUDIO_OPEN = 9
const STUDIO_CLOSE = 19

/** Local clock for one city, plus the two derived numbers the card actually
 *  needs to *show* the time-zone story instead of just stating it: `hour` for
 *  the awake/asleep pill, `dayFrac` (0–1 through the 24h clock) for the
 *  daytrack marker's position. One Intl formatter, parsed once per tick
 *  rather than three separate `format()` calls for the same instant. */
function useCityClock(tz) {
  const [clock, setClock] = useState({ display: '--:--', hour: 12, minute: 0, dayFrac: 0.5 })
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
    const tick = () => {
      const parts = fmt.formatToParts(new Date())
      const hour = Number(parts.find((p) => p.type === 'hour').value)
      const minute = Number(parts.find((p) => p.type === 'minute').value)
      setClock({
        display: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        hour, minute,
        dayFrac: (hour + minute / 60) / 24,
      })
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [tz])
  return clock
}

/** Measures the Amman and Sarajevo cards and builds a single quadratic-bezier
 *  thread between them — over their top edges side by side (desktop), or
 *  through the row gap between them stacked (mobile; see `stacked` below).
 *  Apex is the true bezier midpoint, not a guess, so the "2,100 km" label
 *  always sits exactly on the line — in the layouts that show that label at
 *  all; see the render side for why stacked doesn't. */
function useTwoCityArc() {
  const stageRef = useRef(null)
  const cardRefs = useRef([])
  const [geo, setGeo] = useState(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    // Top-edge anchor in the stage's own coordinates, read from the layout box rather
    // than getBoundingClientRect: the cards ride a Reveal fade-rise (and a hover lift),
    // so a rect measured mid-transform pins the arc 36px below where the cards settle —
    // i.e. through them instead of over them. It has to walk the offsetParent chain,
    // not read offsetTop once: Reveal's wrapper keeps an inline transform, which makes
    // it the offsetParent even though it is position:static.
    const anchor = (el, xf, yf = 0) => {
      let x = 0, y = 0
      for (let n = el; n && n !== stage; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop }
      return { x: x + el.offsetWidth * xf, y: y + el.offsetHeight * yf }
    }
    const measure = () => {
      const a = cardRefs.current[0]
      const b = cardRefs.current[1]
      if (!a || !b) return
      const topA = anchor(a, 0.86, 0)
      const topB = anchor(b, 0.14, 0)
      // Side-by-side (desktop grid) the cards' top edges sit at nearly the
      // same y and far apart in x; stacked (mobile, one column) it is the
      // reverse. Comparing |dy| to |dx| reads the layout straight off the
      // DOM rather than duplicating the grid's own breakpoint here.
      const stacked = Math.abs(topB.y - topA.y) > Math.abs(topB.x - topA.x)
      let p0, p2, ctrl
      if (stacked) {
        // "Over the top edges" only reads as a thread pulled taut when the
        // cards are side by side — applied to a stacked column it draws a
        // loop above Amman, over its own header, before dropping down past
        // its full height to reach Sarajevo. Anchoring bottom-of-Amman to
        // top-of-Sarajevo instead keeps the curve entirely inside the row
        // gap between them, where it can't cross either card's content.
        p0 = anchor(a, 0.5, 1)
        p2 = anchor(b, 0.5, 0)
        ctrl = { x: (p0.x + p2.x) / 2 + 22, y: (p0.y + p2.y) / 2 }
      } else {
        p0 = topA
        p2 = topB
        ctrl = { x: (p0.x + p2.x) / 2, y: Math.min(p0.y, p2.y) - 92 }
      }
      const apex = {
        x: 0.25 * p0.x + 0.5 * ctrl.x + 0.25 * p2.x,
        y: 0.25 * p0.y + 0.5 * ctrl.y + 0.25 * p2.y,
      }
      setGeo({
        w: stage.offsetWidth, h: stage.offsetHeight,
        d: `M ${p0.x} ${p0.y} Q ${ctrl.x} ${ctrl.y} ${p2.x} ${p2.y}`,
        apex, stacked,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])

  return { stageRef, cardRefs, geo }
}

export function Studios() {
  const reduced = useReducedMotion()
  const amman = useCityClock('Asia/Amman')
  const sarajevo = useCityClock('Europe/Sarajevo')
  const cities = [
    { name: 'Amman', country: 'Jordan', role: 'HQ — strategy, AI & production', clock: amman, phone: BRAND.phoneJO, href: BRAND.whatsapp, action: 'WhatsApp us' },
    { name: 'Sarajevo', country: 'Bosnia & Herzegovina', role: 'Design & campaign studio', clock: sarajevo, phone: 'By appointment', href: `mailto:${BRAND.email}`, action: 'Email the studio' },
  ]
  const { stageRef, cardRefs, geo } = useTwoCityArc()
  return (
    <section className="studios" id="studio">
      <div className="section-head">
        <p className="kicker"><span>—</span> Studios</p>
        <SplitWords as="h2" className="h2" text="Two cities. One loom." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Two thousand one hundred kilometres of thread between Amman and Sarajevo, pulled tight.
            When one studio sleeps, the other is already sewing.
          </p>
        </Reveal>
      </div>
      <div className="studios-stage" ref={stageRef}>
        {geo && (
          <div className="studios-thread" aria-hidden="true">
            <svg className="studios-arc" viewBox={`0 0 ${geo.w} ${geo.h}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="studios-arc-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--magenta)" stopOpacity="0.65" />
                  <stop offset="50%" stopColor="var(--cyan)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--magenta)" stopOpacity="0.65" />
                </linearGradient>
              </defs>
              <path d={geo.d} stroke="url(#studios-arc-grad)" strokeWidth="1.6" fill="none" strokeDasharray="1 7" strokeLinecap="round" />
            </svg>
            {!reduced && (
              <span className="studios-arc-pulse" style={{ offsetPath: `path('${geo.d}')` }} />
            )}
            {/* Stacked, the whole gap the curve has to fit in is one
                row-gap (18–40px) tall — nowhere near enough for this label
                without it lapping into a card's own padding. The dashed
                thread and the travelling pulse still make the same point
                on mobile; this one badge is the one piece of the desktop
                treatment that doesn't survive the narrower stage. */}
            {!geo.stacked && (
              <span className="studios-arc-label" style={{ left: geo.apex.x, top: geo.apex.y }}>
                <i />2,100 km
              </span>
            )}
          </div>
        )}
        <div className="studios-grid">
          {cities.map((c, i) => {
            // Two thresholds, not one: "awake" (the pill, the story's own
            // stakes) is stricter than "day" (the card's tint and the
            // sun/moon on the daytrack) — a studio can be lit and daylit at
            // 07:00 without anyone at a desk yet.
            const isAwake = c.clock.hour >= STUDIO_OPEN && c.clock.hour < STUDIO_CLOSE
            const isDay = c.clock.hour >= 6 && c.clock.hour < 19
            return (
              <Reveal key={c.name} delay={i * 0.1}>
                <article
                  className={`studio-card ${isDay ? 'is-day' : 'is-night'}`}
                  ref={(el) => { cardRefs.current[i] = el }}
                  data-cursor
                >
                  <header>
                    <h3>{c.name}</h3>
                    <span className={`studio-pill ${isAwake ? 'is-awake' : 'is-asleep'}`}>
                      <i aria-hidden="true" />{isAwake ? 'Awake' : 'Asleep'}
                    </span>
                  </header>
                  <p className="studio-country">{c.country}</p>
                  {/* The clock is the section's real asset — it now leads the
                      card instead of hiding in the header next to the city
                      name, and it is the one thing on the card that keeps
                      moving after the Reveal settles. */}
                  <div className="studio-clock" aria-label={`Local time in ${c.name}`}>
                    <span className="studio-clock-time">{c.clock.display}</span>
                    <span className="studio-clock-tz" aria-hidden="true">local</span>
                  </div>
                  <div className="studio-daytrack" aria-hidden="true">
                    <span className="studio-daytrack-band" />
                    {[6, 12, 18].map((h) => (
                      <i key={h} className="studio-daytrack-tick" style={{ left: `${(h / 24) * 100}%` }} />
                    ))}
                    <span
                      className={`studio-daytrack-mark ${isDay ? 'is-sun' : 'is-moon'}`}
                      style={{ left: `${c.clock.dayFrac * 100}%` }}
                    />
                  </div>
                  <p className="studio-role">{c.role}</p>
                  <footer>
                    <span>{c.phone}</span>
                    <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{c.action} →</a>
                  </footer>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function Contact() {
  // The machine's state is owned here, not in the wizard: the wizard reports where the
  // visitor is, and the head and the transcript both read from that one value.
  const [mstate, setMstate] = useState('idle')
  const [lang, setLang] = useMachineLang()
  const reduced = useReducedMotion()

  return (
    <section className="contact" id="contact">
      <p className="kicker kicker--center"><span>—</span> Contact</p>
      <h2 className="contact-h2">
        <SplitWords text="Ready to push" />
        <br />
        <span className="contact-accent"><SplitWords text="boundaries?" delay={0.15} /></span>
      </h2>
      <Reveal delay={0.2}>
        <p className="contact-sub">Tell the machine what you are making. A human answers — fast, and in your language.</p>
      </Reveal>
      <Reveal delay={0.3}>
        <div className="contact-machine">
          <div className="contact-machine-figure">
            <LoomHead state={mstate} reduced={reduced} />
            <MachineChat state={mstate} lang={lang} onLang={setLang} reduced={reduced} />
          </div>
          <div className="contact-machine-form">
            <ContactWizard onState={setMstate} />
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.35} className="contact-direct">
        <span>Prefer it direct?</span>
        {/* the number stays readable as text next to it — the knit carries the
            action, not the digits */}
        <Magnetic>
          <WoolButton label="WhatsApp" size="small" href={BRAND.whatsapp} target="_blank" rel="noreferrer" />
        </Magnetic>
        <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">{BRAND.phoneJO}</a>
        <i aria-hidden="true">·</i>
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
      </Reveal>
    </section>
  )
}
