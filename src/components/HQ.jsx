// LOOM HQ — the full-viewport film.
//
// The section is tall; a 100svh stage inside it pins to the top. Scrolling walks
// you down the building one floor at a time, and each floor is a shot that takes
// the entire screen. The incoming shot does not crossfade — it WEAVES in, through
// a repeating vertical-warp mask that thickens from bare threads into solid
// fabric. It is the only transition that had any business being on this site.
//
// Only the active clip is ever playing, and only clips within one floor of the
// active one are even given a `src` — otherwise this section would pull every
// video in the film on mount.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform, useReducedMotion } from 'motion/react'
import { HQ_READY } from '../data/hq.js'
import { SplitWords, Reveal, EASE } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton } from './Wool.jsx'
import './hq.css'

const BASE = '/video/hq'

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return coarse
}

/** Title characters rise out of a mask, restaged on every floor change.
 *  Chars are grouped into nowrap words on purpose: masking each character makes
 *  every one its own inline-block, and without the grouping the line breaks
 *  mid-word — "One more ta / ke". */
function PlateTitle({ text }) {
  const words = String(text).split(' ')
  let n = 0
  return (
    <h3 className="hq-plate-title" aria-label={text}>
      {words.map((w, wi) => (
        <span className="hq-word" key={wi} aria-hidden="true">
          {[...w].map((c, ci) => {
            const delay = 0.12 + n++ * 0.018
            return (
              <span className="hq-char-mask" key={ci}>
                <motion.span
                  className="hq-char"
                  initial={{ y: '108%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.8, ease: EASE, delay }}
                >
                  {c}
                </motion.span>
              </span>
            )
          })}
        </span>
      ))}
    </h3>
  )
}

export function HQ() {
  const floors = HQ_READY
  const reduced = useReducedMotion()
  const coarse = useCoarsePointer()
  const { open } = useWizard()
  const sectionRef = useRef(null)
  const trackRef = useRef(null)
  const stageRef = useRef(null)
  const videoRefs = useRef([])
  const [active, setActive] = useState(0)
  const [sound, setSound] = useState(false)

  // Clips are only fetched once they are adjacent to the active floor. The set
  // never shrinks — a floor you have already visited stays warm so scrolling
  // back up is instant.
  const [warm, setWarm] = useState(() => new Set([0, 1]))

  const count = floors.length

  // Measured on the track, not the section — the intro copy above the pin is not
  // part of the film and must not eat into the floor mapping.
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const i = Math.min(count - 1, Math.max(0, Math.floor(p * count)))
    setActive((prev) => (prev === i ? prev : i))
  })

  useEffect(() => {
    setWarm((prev) => {
      const next = new Set(prev)
      let grew = false
      for (const i of [active - 1, active, active + 1]) {
        if (i >= 0 && i < count && !next.has(i)) { next.add(i); grew = true }
      }
      return grew ? next : prev
    })
  }, [active, count])

  // Nothing decodes while the section is off screen — a 1080p clip running
  // behind the footer is pure battery burn. This is state rather than a direct
  // pause() call because playback has to RESUME on the way back in; an observer
  // that only pauses leaves the first floor dead if you enter it without ever
  // changing floor.
  const [onScreen, setOnScreen] = useState(false)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // One clip plays at a time. Leaving a floor rewinds it, so coming back always
  // restarts the shot on its first frame rather than mid-move — but going off
  // screen only pauses, so scrolling away and back resumes where you were.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === active && onScreen) {
        v.muted = !sound
        const p = v.play()
        if (p && p.catch) p.catch(() => {})
        return
      }
      v.pause()
      v.muted = true
      if (i !== active && v.currentTime > 0.05) {
        try { v.currentTime = 0 } catch { /* not seekable yet */ }
      }
    })
  }, [active, sound, warm, onScreen])

  // The stage opens and closes like a screen: slightly inset and rounded at both
  // ends of the scroll, full-bleed for the body of the film.
  const stageScale = useTransform(scrollYProgress, [0, 0.035, 0.965, 1], [0.9, 1, 1, 0.9])
  const stageRadius = useTransform(scrollYProgress, [0, 0.035, 0.965, 1], [34, 0, 0, 34])
  const scale = useSpring(stageScale, { stiffness: 160, damping: 28, mass: 0.6 })

  // Pointer parallax — the shot leans a few pixels toward the cursor. Fine
  // pointers only; on touch there is no cursor to lean toward.
  const px = useSpring(0, { stiffness: 90, damping: 20 })
  const py = useSpring(0, { stiffness: 90, damping: 20 })
  useEffect(() => {
    if (reduced || coarse) return
    const el = stageRef.current
    if (!el) return
    const move = (e) => {
      const r = el.getBoundingClientRect()
      px.set(((e.clientX - r.left) / r.width - 0.5) * -22)
      py.set(((e.clientY - r.top) / r.height - 0.5) * -14)
    }
    const leave = () => { px.set(0); py.set(0) }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) }
  }, [reduced, coarse, px, py])

  const railFill = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  const jumpTo = useCallback((i) => {
    const el = trackRef.current
    if (!el) return
    // Land in the middle of the target floor's scroll band, not on its edge, so
    // the jump never settles on a transition boundary.
    const { top: trackTop } = el.getBoundingClientRect()
    const start = trackTop + window.scrollY
    const top = start + (el.offsetHeight - window.innerHeight) * ((i + 0.5) / count)
    if (window.__lenis) window.__lenis.scrollTo(top, { duration: 1.2 })
    else window.scrollTo({ top, behavior: 'smooth' })
  }, [count])

  const current = floors[active]
  const srcFor = useCallback((f) => `${BASE}/${f.clip}${coarse ? '-720' : ''}.mp4`, [coarse])

  // Position in the reel that is actually shipping, not the shot's number in the
  // full fourteen-shot script — otherwise an unfinished film counts "05 / 03".
  const reel = useCallback((i) => String(i + 1).padStart(2, '0'), [])

  const head = useMemo(() => (
    <div className="hq-head">
      <p className="kicker"><span>07</span> LOOM HQ</p>
      <SplitWords as="h2" className="h2" text="The studio that never sleeps." />
      <Reveal delay={0.15}>
        <p className="lede" style={{ marginTop: 22 }}>
          We did not shoot a team photo. We filmed the building. Every discipline LOOM sells has a
          floor in this mill, and someone on it at three in the morning — scroll to ride the lift down.
        </p>
      </Reveal>
    </div>
  ), [])

  if (!count) return null

  // Reduced motion gets the same film with none of the machinery: no pin, no
  // mask, no parallax. Crucially the video still plays — Chrome's battery saver
  // forces prefers-reduced-motion on, and silently swapping a stills gallery in
  // for a laptop on 19% battery would be a worse bug than the one it avoids.
  if (reduced) {
    return (
      <section className="hq hq--static" id="hq">
        {head}
        <div className="hq-static-list">
          {floors.map((f) => (
            <figure className="hq-static-item" key={f.id} style={{ '--accent': f.accent }}>
              <video
                src={srcFor(f)} poster={`${BASE}/${f.clip}.jpg`}
                muted loop playsInline autoPlay preload="metadata"
              />
              <figcaption>
                <span className="hq-static-dept">{f.shot} · {f.dept}</span>
                <h3>{f.title}</h3>
                <p>{f.line}</p>
                <span className="hq-static-cast">{f.cast}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section
      className="hq" id="hq" ref={sectionRef}
      style={{ '--floors': count }}
      aria-label="LOOM HQ — the film"
    >
      {head}

      <div className="hq-track" ref={trackRef}>
      <div className="hq-pin">
        <motion.div
          className="hq-stage" ref={stageRef}
          style={{ scale, borderRadius: stageRadius, '--accent': current.accent }}
        >
          {/* ——— the shots ——— */}
          <motion.div className="hq-reel" style={{ x: px, y: py }}>
            {floors.map((f, i) => {
              const state = i === active ? 'is-on' : i < active ? 'is-past' : 'is-next'
              return (
                <div className={`hq-layer ${state}`} key={f.id} aria-hidden={i !== active}>
                  <video
                    ref={(el) => { videoRefs.current[i] = el }}
                    src={warm.has(i) ? srcFor(f) : undefined}
                    poster={`${BASE}/${f.clip}.jpg`}
                    muted loop playsInline preload="none"
                  />
                </div>
              )
            })}
          </motion.div>

          <div className="hq-vignette" aria-hidden="true" />
          <div className="hq-bleed" aria-hidden="true" />
          <div className="hq-warp" aria-hidden="true" />

          {/* ——— slate ——— */}
          <div className="hq-slate">
            <span className="hq-slate-dot" />
            <span>{`S${reel(active)}`}</span>
            <span className="hq-slate-sep">/</span>
            <span>{current.dept}</span>
          </div>

          <button
            className={`hq-sound ${sound ? 'is-on' : ''}`}
            onClick={() => setSound((s) => !s)}
            aria-pressed={sound}
            aria-label={sound ? 'Mute the film' : 'Play the film with sound'}
            data-cursor
          >
            <span className="hq-eq" aria-hidden="true"><i /><i /><i /><i /></span>
            <span className="hq-sound-label">{sound ? 'Sound on' : 'Sound off'}</span>
          </button>

          {/* ——— floor rail ——— */}
          <nav className="hq-rail" aria-label="Floors">
            <span className="hq-rail-line" aria-hidden="true">
              <motion.span className="hq-rail-fill" style={{ height: railFill }} />
            </span>
            <ul>
              {floors.map((f, i) => (
                <li key={f.id}>
                  <button
                    className={i === active ? 'is-on' : ''}
                    style={{ '--accent': f.accent }}
                    onClick={() => jumpTo(i)}
                    aria-current={i === active ? 'true' : undefined}
                    data-cursor
                  >
                    <span className="hq-rail-no">{reel(i)}</span>
                    <span className="hq-rail-dept">{f.dept}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* ——— nameplate: keyed on the floor so it restages every change ——— */}
          <div className="hq-plate" key={current.id}>
            <motion.p
              className="hq-plate-cast"
              initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <span className="hq-plate-rule" />{current.cast}
            </motion.p>
            <PlateTitle text={current.title} />
            <motion.p
              className="hq-plate-line"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.26 }}
            >
              {current.line}
            </motion.p>
          </div>

          <div className="hq-count" aria-hidden="true">
            <span className="hq-count-now">{reel(active)}</span>
            <span className="hq-count-of">/ {String(count).padStart(2, '0')}</span>
          </div>
        </motion.div>
      </div>
      </div>

      <div className="hq-outro">
        <Reveal>
          <p className="hq-outro-line">Eight characters. One building. Your brand on the loom by Thursday.</p>
        </Reveal>
        <Reveal delay={0.12}>
          <WoolButton
            label="Book a floor"
            yarn="gold"
            size="big"
            onClick={() => open({ note: 'I watched the film' })}
          />
        </Reveal>
      </div>
    </section>
  )
}
