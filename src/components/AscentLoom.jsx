// #ascent — The Ascent, rebuilt as a climb up the inside of a loom.
//
// Two ideas welded together: the altitude climb (sky bands, altimeter, things
// falling away below you) and the loom (warp threads, weft rings, a shuttle
// running each pass). The 3D is a code-split three.js scene — see
// src/three/LoomShaft.js — and everything it draws has a CSS fallback under it,
// so a reduced-motion reader, a touch device, or a machine with no WebGL still
// gets the section, the copy and the CTA.
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton } from './Wool.jsx'
import './ascentloom.css'

const ZONES = [
  { at: 0.00, name: 'Ground', h: 'Rebrand', p: 'We find what you actually stand for, then make it unmistakable.' },
  { at: 0.26, name: 'Rooftops', h: 'Produce', p: 'Photography, film and 3D — generated at the volume your feed eats.' },
  { at: 0.50, name: 'Cloud deck', h: 'Automate', p: 'AI agents that answer, book and sell while you sleep.' },
  { at: 0.74, name: 'Stratosphere', h: 'Ascend', p: 'Then we push. New markets, new formats, new altitude.' },
  { at: 0.92, name: 'Orbit', h: 'All of it', p: 'Six territories on one loom. This is the whole company in one climb.' },
]

const TERRITORIES = [
  { id: 'branding', label: 'Branding', blurb: 'Identity systems built to be unmistakable.' },
  { id: 'social', label: 'Social', blurb: 'Content the feed cannot scroll past.' },
  { id: 'ai', label: 'AI Systems', blurb: 'Agents that answer, book and sell on their own.' },
  { id: 'web', label: 'Web & Apps', blurb: 'Products people actually finish setting up.' },
  { id: '3d', label: '3D & AR', blurb: 'Worlds and objects you can step inside.' },
  { id: 'campaigns', label: 'Campaigns', blurb: 'Launches engineered to hit like an event.' },
]

const MAX_M = 84000

export function AscentLoom() {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const reduced = useReducedMotion()
  const { open } = useWizard()
  const [zone, setZone] = useState(0)
  const [terr, setTerr] = useState(-1)
  const [metres, setMetres] = useState(0)

  const { scrollYProgress: p } = useScroll({ target: wrap, offset: ['start start', 'end end'] })

  const hudO = useTransform(p, [0, 0.04, 0.9, 0.97], [0, 1, 1, 0])
  const ctaO = useTransform(p, [0.86, 0.95], [0, 1])
  const ctaY = useTransform(p, [0.86, 0.97], [40, 0])
  const stageO = useTransform(p, [0.02, 0.08, 0.86, 0.93], [0, 1, 1, 0])

  // HUD state — one subscription, throttled to real changes only
  useEffect(() => {
    const un = p.on('change', (v) => {
      let z = 0
      for (let i = 0; i < ZONES.length; i++) if (v >= ZONES[i].at) z = i
      setZone((c) => (c === z ? c : z))
      // six weft rings evenly spread across the climb
      const t = v < 0.06 ? -1 : Math.min(TERRITORIES.length - 1, Math.floor((v - 0.06) / 0.145))
      setTerr((c) => (c === t ? c : t))
      setMetres(Math.round(v * MAX_M))
    })
    return () => un()
  }, [p])

  // ————— the 3D shaft. Code-split, and skipped entirely for the readers who
  // must not pay for it: reduced-motion, and touch devices (one WebGL context
  // per page there — the companion butterfly already owns it).
  useEffect(() => {
    if (reduced) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    let cancelled = false
    let shaft = null
    let io = null

    ;(async () => {
      const [{ LoomShaft }, THREE] = await Promise.all([
        import('../three/LoomShaft.js'),
        import('three'),
      ])
      if (cancelled || !canvas.current) return
      try {
        shaft = new LoomShaft(canvas.current, THREE, { reduced })
      } catch {
        canvas.current.style.display = 'none'   // no WebGL — the CSS shaft stays
        return
      }
      const unP = p.on('change', (v) => shaft.setProgress(v))
      shaft.setProgress(p.get())

      const onMouse = (e) => shaft.setMouse(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1)
      )
      window.addEventListener('mousemove', onMouse, { passive: true })

      let inView = false
      const sync = () => {
        const locked = document.documentElement.classList.contains('overlay-open')
          || document.documentElement.classList.contains('menu-open')
        ;(inView && !document.hidden && !locked) ? shaft.start() : shaft.stop()
      }
      io = new IntersectionObserver(([en]) => { inView = en.isIntersecting; sync() }, { rootMargin: '200px' })
      io.observe(wrap.current)
      document.addEventListener('visibilitychange', sync)

      shaft._cleanup = () => {
        unP()
        window.removeEventListener('mousemove', onMouse)
        document.removeEventListener('visibilitychange', sync)
      }
    })()

    return () => {
      cancelled = true
      io?.disconnect()
      shaft?._cleanup?.()
      shaft?.dispose()
    }
  }, [p, reduced])

  const z = ZONES[zone]

  return (
    <section className="al" id="ascent" ref={wrap}>
      <div className={`al-pin al-pin--z${zone}`}>
        {/* the sky. Also the whole picture when there is no WebGL. */}
        <div className="al-sky" aria-hidden="true" />
        <div className="al-warp" aria-hidden="true" />
        <canvas ref={canvas} className="al-canvas" aria-hidden="true" />
        <div className="al-vignette" aria-hidden="true" />

        <motion.div className="al-hud" style={{ opacity: hudO }}>
          <div className="al-top">
            <p className="kicker"><span>06</span> The Ascent</p>
            <div className="al-alt">
              <span className="al-m">{metres.toLocaleString()}</span>
              <span className="al-unit">m</span>
              <span className="al-zone">{z.name}</span>
            </div>
          </div>

          <motion.div className="al-stage" style={{ opacity: stageO }}>
            <h2 className="al-h2">{z.h}</h2>
            <p className="al-blurb">{z.p}</p>
          </motion.div>

          <div className="al-rail" aria-hidden="true">
            {TERRITORIES.map((t, i) => (
              <span key={t.id} className={`al-rail-row ${i === terr ? 'is-live' : ''} ${i < terr ? 'is-past' : ''}`}>
                <i /> {t.label}
              </span>
            ))}
          </div>

          <p className="al-passing" aria-live="polite">
            {terr >= 0 ? <><b>{TERRITORIES[terr].label}</b> {TERRITORIES[terr].blurb}</> : 'Six territories on the way up.'}
          </p>
        </motion.div>

        <motion.div className="al-cta" style={{ opacity: ctaO, y: ctaY }}>
          <h2 className="al-cta-h">One loom. Six territories.<br />Every one of them LOOM.</h2>
          <WoolButton label="Start the ascent" size="big" yarn="blue" onClick={() => open({ intent: 'grow' })} />
        </motion.div>
      </div>
    </section>
  )
}
