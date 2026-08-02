// The Ascent — LOOM Planet.
// A real orthographically-projected sphere: latitude chords and meridian
// ellipses are computed from the live rotation, so the globe genuinely turns
// instead of sliding a flat strip behind a circular mask. Territories ride the
// surface with correct foreshortening and drop behind the limb. All copy lives
// in docked side rails — nothing is ever allowed to overlap the globe.
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useAnimationFrame,
  useReducedMotion,
} from 'motion/react'
import { SplitWords } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton, WoolIcon } from './Wool.jsx'
import './moon.css'

const STAGES = [
  { n: '01', title: 'Rebrand', body: 'We find what you actually stand for, then make it unmistakable.' },
  { n: '02', title: 'Produce', body: 'Photography, film and 3D — generated at the volume your feed eats.' },
  { n: '03', title: 'Automate', body: 'AI agents that answer, book and sell while you sleep.' },
  { n: '04', title: 'Ascend', body: 'Then we push. New markets, new formats, new altitude.' },
]

// Six territories, placed by real latitude/longitude on the sphere. Each is a
// felted medallion from the wool icon set, pinned to the surface.
const TERRITORIES = [
  { id: 'branding', label: 'Branding', icon: 'tag', blurb: 'Identity systems built to be unmistakable.', lat: 32, lon: 0 },
  { id: 'social', label: 'Social', icon: 'share-nodes', blurb: 'Content the feed cannot scroll past.', lat: -14, lon: 58 },
  { id: 'ai', label: 'AI Systems', icon: 'settings', blurb: 'Agents that answer, book and sell on their own.', lat: 24, lon: 120 },
  { id: 'web', label: 'Web & Apps', icon: 'copy', blurb: 'Products people actually finish setting up.', lat: -36, lon: 178 },
  { id: '3d', label: '3D & AR', icon: 'eye', blurb: 'Worlds and objects you can step inside.', lat: 10, lon: 236 },
  { id: 'campaigns', label: 'Campaigns', icon: 'pin', blurb: 'Launches engineered to hit like an event.', lat: -26, lon: 298 },
]

// Latitude circles project to horizontal chords (vertical axis, no tilt):
// half-width = cos(φ), height offset = sin(φ). Static — they never move.
const PARALLELS = [-64, -42, -21, 0, 21, 42, 64].map((deg) => {
  const p = (deg * Math.PI) / 180
  return { deg, width: Math.cos(p) * 100, top: 50 - Math.sin(p) * 50 }
})

// A meridian and its antipode share one projected ellipse, so six ellipses
// cover all twelve 30°-spaced meridians.
const MERIDIANS = [0, 30, 60, 90, 120, 150]

// the four house yarns, in winding order
const STRANDS = [
  'var(--yarn-pink)', 'var(--yarn-violet)', 'var(--yarn-blue)',
  'var(--yarn-gold)', 'var(--yarn-pink)', 'var(--yarn-violet)',
]

const RAD = Math.PI / 180

// Scroll choreography. One place to retune the whole section's pacing.
const T = {
  stageStart: 0.14,
  stageSpan: 0.17,
  stageEnd: 0.14 + 0.17 * 4,
  finale: 0.87,
}

function project(latDeg, lonDeg, rotDeg) {
  const lat = latDeg * RAD
  const lon = (lonDeg + rotDeg) * RAD
  const cosLat = Math.cos(lat)
  return {
    x: cosLat * Math.sin(lon), // −1 … 1, left/right across the disc
    y: -Math.sin(lat), // −1 … 1, top/bottom
    z: cosLat * Math.cos(lon), // > 0 → facing the viewer
  }
}

function Territory({ t, rot, onEnter, onLeave, active }) {
  const style = {
    left: useTransform(rot, (r) => `${50 + project(t.lat, t.lon, r).x * 47}%`),
    top: useTransform(rot, (r) => `${50 + project(t.lat, t.lon, r).y * 47}%`),
    // centre on the projected point via motion's own transform pipeline —
    // a CSS `transform` here would be clobbered by the animated `scale`
    x: '-50%',
    y: '-50%',
    // fade through the limb rather than popping off it, but go fully hidden
    // before the edge — a half-transparent medallion on the rim reads as a
    // rendering glitch, not as something turning away
    opacity: useTransform(rot, (r) => {
      const { z } = project(t.lat, t.lon, r)
      // z 0.3 ≈ 95% of the projected radius — the last point where the label
      // still sits on flat-enough sphere to be legible
      return z <= 0.3 ? 0 : Math.min(1, (z - 0.3) / 0.2)
    }),
    scale: useTransform(rot, (r) => 0.74 + Math.max(0, project(t.lat, t.lon, r).z) * 0.26),
    zIndex: useTransform(rot, (r) => (project(t.lat, t.lon, r).z > 0.3 ? 2 : 0)),
    pointerEvents: useTransform(rot, (r) => (project(t.lat, t.lon, r).z > 0.3 ? 'auto' : 'none')),
  }
  return (
    <motion.button
      type="button"
      className={`gl-mark gl-mark--${t.id}${active ? ' is-active' : ''}`}
      style={style}
      onMouseEnter={() => onEnter(t.id)}
      onMouseLeave={onLeave}
      onFocus={() => onEnter(t.id)}
      onBlur={onLeave}
      aria-label={`${t.label} — ${t.blurb}`}
    >
      <WoolIcon name={t.icon} className="gl-mark-seal" />
      <span className="gl-mark-label">{t.label}</span>
    </motion.button>
  )
}

function Globe({ rot, tilt = true }) {
  const meridians = useMemo(() => MERIDIANS, [])
  return (
    <div className={`gl-body${tilt ? ' gl-body--live' : ''}`}>
      <span className="gl-surface" aria-hidden="true" />
      <span className="gl-weave" aria-hidden="true" />

      <span className="gl-graticule" aria-hidden="true">
        {PARALLELS.map((p) => (
          <span
            key={p.deg}
            className={`gl-parallel${p.deg === 0 ? ' gl-parallel--equator' : ''}`}
            style={{ width: `${p.width}%`, top: `${p.top}%` }}
          />
        ))}
        {meridians.map((m, i) => (
          <motion.span
            key={m}
            className="gl-meridian"
            style={{
              // the strand colour is set here rather than in CSS: parallels and
              // meridians are both spans, so nth-of-type would count both
              '--strand': STRANDS[i % STRANDS.length],
              width: useTransform(rot, (r) => `${Math.abs(Math.cos((m + r) * RAD)) * 100}%`),
              opacity: useTransform(rot, (r) => 0.35 + Math.abs(Math.cos((m + r) * RAD)) * 0.65),
            }}
          />
        ))}
      </span>

      <span className="gl-specular" aria-hidden="true" />
      <span className="gl-terminator" aria-hidden="true" />
      <span className="gl-limb" aria-hidden="true" />
    </div>
  )
}

function ProgressTrack({ progress, stage }) {
  const scaleX = useTransform(progress, [T.stageStart, T.stageEnd], [0, 1], { clamp: true })
  return (
    <div className="moon-track" aria-hidden="true">
      <span className="moon-track-rail">
        <motion.span className="moon-track-fill" style={{ scaleX }} />
      </span>
      <ul className="moon-track-marks">
        {STAGES.map((s, i) => (
          <li key={s.n} className={i <= stage ? 'is-lit' : ''}>
            <span className="moon-track-dot" />
            {s.n}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Moon() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { open } = useWizard()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })

  const rot = useMotionValue(0)
  const spin = useRef(0)
  const paused = useRef(false)
  const [stage, setStage] = useState(-1)
  const [hovered, setHovered] = useState(null)
  const [facing, setFacing] = useState(TERRITORIES[0].id)

  const scrollRot = useTransform(scrollYProgress, [0, 1], [0, 300])

  // One frame loop drives rotation, the active stage and the readout, so the
  // continuous work stays off React's render path.
  useAnimationFrame((_, delta) => {
    if (reduced) return
    if (!paused.current) spin.current += (delta / 1000) * 4.5
    const r = spin.current + scrollRot.get()
    rot.set(r)

    const p = scrollYProgress.get()
    const next = p < T.stageStart ? -1 : Math.min(3, Math.floor((p - T.stageStart) / T.stageSpan))
    setStage((cur) => (cur === next ? cur : next))

    // whichever territory is closest to dead-centre owns the readout
    let best = null
    let bestZ = -2
    for (const t of TERRITORIES) {
      const { z } = project(t.lat, t.lon, r)
      if (z > bestZ) { bestZ = z; best = t.id }
    }
    setFacing((cur) => (cur === best ? cur : best))
  })

  const onEnter = useCallback((id) => { paused.current = true; setHovered(id) }, [])
  const onLeave = useCallback(() => { paused.current = false; setHovered(null) }, [])

  const readout = TERRITORIES.find((t) => t.id === (hovered || facing)) || TERRITORIES[0]

  const globeY = useTransform(scrollYProgress, [0, 1], ['9vh', '-5vh'])
  const globeScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.88, 1, 1.08])
  const globeFade = useTransform(scrollYProgress, [T.finale - 0.05, T.finale + 0.06], [1, 0.12])
  const starsFarY = useTransform(scrollYProgress, [0, 1], ['0%', '-5%'])
  const starsNearY = useTransform(scrollYProgress, [0, 1], ['0%', '-13%'])
  const chromeOpacity = useTransform(scrollYProgress, [0, 0.06, T.finale - 0.04, T.finale + 0.03], [0, 1, 1, 0])
  const finaleOpacity = useTransform(scrollYProgress, [T.finale, T.finale + 0.09], [0, 1])
  const finaleY = useTransform(scrollYProgress, [T.finale, T.finale + 0.09], [22, 0])

  const fibreFar = useMemo(() => fibreField(34, 420, 17, 0.82), [])
  const fibreNear = useMemo(() => fibreField(18, 520, 401, 0.7), [])

  if (reduced) {
    return (
      <section className="moon moon--static" id="ascent">
        <p className="kicker kicker--light kicker--center"><span>07</span> The Ascent</p>
        <p className="moon-subhead moon-subhead--center">One planet. Six territories. Every one of them LOOM.</p>
        <div className="moon-static-globe">
          <Globe rot={rot} tilt={false} />
        </div>
        <ul className="moon-territory-list">
          {TERRITORIES.map((t) => (
            <li key={t.id} className={`gl-mark--${t.id}`}>
              <span className="moon-territory-dot" aria-hidden="true" />
              <h3>{t.label}</h3>
              <p>{t.blurb}</p>
            </li>
          ))}
        </ul>
        <ol className="moon-static-stages">
          {STAGES.map((s) => (
            <li key={s.n}>
              <span className="moon-stage-n">{s.n}</span>
              <h3 className="moon-stage-title">{s.title}</h3>
              <p className="moon-stage-body">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="moon-finale moon-finale--static">
          <h2 className="moon-finale-h2">Reach the moon with us.</h2>
          <WoolButton label="Start the ascent" size="big" yarn="blue" onClick={() => open({ intent: 'grow' })} />
        </div>
      </section>
    )
  }

  return (
    <section className="moon" id="ascent" ref={ref}>
      <div className="moon-sticky">
        <motion.span className="moon-stars moon-stars--far" style={{ backgroundImage: fibreFar, y: starsFarY }} aria-hidden="true" />
        <motion.span className="moon-stars moon-stars--near" style={{ backgroundImage: fibreNear, y: starsNearY }} aria-hidden="true" />

        <motion.div className="moon-grid" style={{ opacity: chromeOpacity }}>
          <header className="moon-head">
            <p className="kicker kicker--light"><span>07</span> The Ascent</p>
            <p className="moon-subhead">One planet. Six territories. Every one of them LOOM.</p>
          </header>

          <div className="moon-rail moon-rail--left">
            {[STAGES[0], STAGES[2]].map((s, i) => (
              <StageCard key={s.n} stage={s} index={i * 2} current={stage} align="right" />
            ))}
          </div>

          <div className="moon-core">
            <motion.div className="gl" style={{ y: globeY, scale: globeScale, opacity: globeFade }}>
              <span className="gl-atmosphere" aria-hidden="true" />
              <Globe rot={rot} />
              <div className="gl-marks">
                {TERRITORIES.map((t) => (
                  <Territory
                    key={t.id}
                    t={t}
                    rot={rot}
                    active={readout.id === t.id}
                    onEnter={onEnter}
                    onLeave={onLeave}
                  />
                ))}
              </div>
            </motion.div>

            <p className={`moon-readout gl-mark--${readout.id}`} aria-live="polite">
              <span className="moon-readout-dot" aria-hidden="true" />
              <strong>{readout.label}</strong>
              <span className="moon-readout-body">{readout.blurb}</span>
            </p>
          </div>

          <div className="moon-rail moon-rail--right">
            {[STAGES[1], STAGES[3]].map((s, i) => (
              <StageCard key={s.n} stage={s} index={i * 2 + 1} current={stage} align="left" />
            ))}
          </div>

          <ProgressTrack progress={scrollYProgress} stage={stage} />
        </motion.div>

        {/* it covers the whole section, so it must stop intercepting clicks
            on the globe while it is still faded out */}
        <motion.div
          className="moon-finale"
          style={{
            opacity: finaleOpacity,
            y: finaleY,
            pointerEvents: useTransform(finaleOpacity, (o) => (o > 0.03 ? 'auto' : 'none')),
          }}
        >
          <SplitWords as="h2" className="moon-finale-h2" text="Reach the moon with us." />
          <WoolButton label="Start the ascent" size="big" yarn="blue" onClick={() => open({ intent: 'grow' })} />
        </motion.div>
      </div>
    </section>
  )
}

function StageCard({ stage, index, current, align }) {
  const state = current === index ? 'is-active' : current > index ? 'is-past' : 'is-future'
  return (
    <article className={`moon-stage moon-stage--${align} ${state}`}>
      <span className="moon-stage-rule" aria-hidden="true" />
      <span className="moon-stage-n">{stage.n}</span>
      <h3 className="moon-stage-title">{stage.title}</h3>
      <p className="moon-stage-body">{stage.body}</p>
    </article>
  )
}

// Deterministic drifting-fibre field, baked into one tiling SVG data URI.
// The previous version stacked 180 box-shadows on a 2px span: a single element
// with a ~2200x1400 paint area that the compositor had to re-rasterise on every
// parallax frame. One repeating texture costs a single upload instead.
function fibreField(count, tile, seedStart, brightChance) {
  let seed = seedStart
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
  let dots = ''
  for (let i = 0; i < count; i++) {
    const x = (rand() * tile).toFixed(1)
    const y = (rand() * tile).toFixed(1)
    const r = (0.6 + rand() * 0.9).toFixed(2)
    const a = (rand() > brightChance ? 0.95 : 0.4).toFixed(2)
    dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="rgb(242,240,247)" opacity="${a}"/>`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}">${dots}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
