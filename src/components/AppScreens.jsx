// AppScreens — real animated in-phone UI previews for the six LOOM apps.
// Pure divs/SVG, no images. Drop-in replacement for the flat <Icon/> mark
// that previously sat inside Products.jsx's .app-phone frame.
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import './appscreens.css'


function StatusBar() {
  return (
    <div className="as-status" aria-hidden="true">
      <span className="as-time">9:41</span>
      <span className="as-dots"><i /><i /><i /></span>
    </div>
  )
}

/* ————————————————— shared isometric helpers —————————————————
   Evora Scan and TrueSize AR are the two screens we could not photograph
   (Evora Scan needs real LiDAR hardware, TrueSize needs real ARKit — the
   Simulator refuses both). They are DRAWN illustrations of the real screens:
   every string, unit, preset and control below is lifted verbatim from the
   Xcode sources. The geometry is projected once, at module load, into a
   single path string per layer so each screen paints in a handful of ops.  */

/** metres → viewBox units, 30° isometric. Returns [x, y]. */
function isoFactory(s, ox, oy) {
  return (x, y, z = 0) => [
    Math.round(((x - y) * s * 0.8660254 + ox) * 100) / 100,
    Math.round((((x + y) * s * 0.5) + oy - z * s) * 100) / 100,
  ]
}
const poly = (pts) => pts.map((p) => `${p[0]},${p[1]}`).join(' ')
const segs = (list) => list.map(([a, b]) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`).join('')

/** A wireframe cuboid sitting on the floor: top face + the two faces the
    camera can see, plus the hidden back edges and a label anchor. */
function isoBox(P, x0, y0, x1, y1, h) {
  const a = P(x0, y0), b = P(x1, y0), c = P(x1, y1), d = P(x0, y1)
  const aT = P(x0, y0, h), bT = P(x1, y0, h), cT = P(x1, y1, h), dT = P(x0, y1, h)
  return {
    base: poly([a, b, c, d]),
    top: poly([aT, bT, cT, dT]),
    right: poly([b, c, cT, bT]),
    left: poly([c, d, dT, cT]),
    hidden: segs([[a, b], [a, d], [a, aT]]),
    at: [
      Math.round(((aT[0] + bT[0] + cT[0] + dT[0]) / 4) * 10) / 10,
      Math.round(((aT[1] + bT[1] + cT[1] + dT[1]) / 4) * 10) / 10,
    ],
  }
}

/* ————————————————— 1. Lahza — live wedding album ————————————————— */
function LahzaScreen({ reduced }) {
  const [count, setCount] = useState(182)
  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => {
      setCount((c) => (c >= 260 ? 182 : c + 1))
    }, 1500)
    return () => clearInterval(id)
  }, [reduced])

  return (
    <div className="as-body as-lahza">
      <div className="as-lahza-head">
        <span className="as-lahza-word">لحظة</span>
        <span className="as-lahza-live"><i /> Live album</span>
      </div>
      <div className="as-lahza-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((t) => (
          <span key={t} className={`as-tile as-tile-${t}`} style={{ '--d': `${t * 0.42}s` }} />
        ))}
      </div>
      <div className="as-lahza-toast"><span className="as-lahza-toast-dot" /> QR scanned</div>
      <div className="as-lahza-count">
        <strong>{count}</strong>
        <span>photos</span>
      </div>
    </div>
  )
}

/* ————————————————— 2. Evora Scan — LiDAR room capture —————————————————
   DRAWN ILLUSTRATION of RoomScanner/CaptureFlow.swift's LiDARCaptureView.
   Strings verbatim: "Cancel", "1 room saved", "Walk slowly around the room
   and cover every wall", "Done". Detected-object labels are RoomPlan
   categories (sofa / table / storage) as mapped in RoomImport.swift.        */

const EV = isoFactory(13, 43.25, 43.1)
const EV_W = 5.4, EV_D = 4.2, EV_H = 2.7   // 5.40 m × 4.20 m, 2.70 m ceiling

const EV_FLOOR = poly([EV(0, 0), EV(EV_W, 0), EV(EV_W, EV_D), EV(0, EV_D)])
const EV_WALL_R = poly([EV(0, 0), EV(EV_W, 0), EV(EV_W, 0, EV_H), EV(0, 0, EV_H)])
const EV_WALL_L = poly([EV(0, 0), EV(0, EV_D), EV(0, EV_D, EV_H), EV(0, 0, EV_H)])
const EV_WINDOW = poly([EV(1.6, 0, 1), EV(3.2, 0, 1), EV(3.2, 0, 2.05), EV(1.6, 0, 2.05)])
const EV_WIN_BAR = segs([
  [EV(2.4, 0, 1), EV(2.4, 0, 2.05)],
  [EV(1.6, 0, 1.52), EV(3.2, 0, 1.52)],
])
const EV_DOOR = poly([EV(0, 1.3), EV(0, 2.4), EV(0, 2.4, 2.05), EV(0, 1.3, 2.05)])

const EV_GRID = segs([
  ...[1, 2, 3, 4].map((y) => [EV(0, y), EV(EV_W, y)]),
  ...[1, 2, 3, 4, 5].map((x) => [EV(x, 0), EV(x, EV_D)]),
])
const EV_MESH = segs([
  ...[1, 2, 3, 4, 5].map((x) => [EV(x, 0), EV(x, 0, EV_H)]),
  ...[1, 2, 3, 4].map((y) => [EV(0, y), EV(0, y, EV_H)]),
  ...[0.9, 1.8].map((z) => [EV(0, 0, z), EV(EV_W, 0, z)]),
  ...[0.9, 1.8].map((z) => [EV(0, 0, z), EV(0, EV_D, z)]),
])
/* ceiling: outline + a light lattice, so the top of the frame is the room
   and not a void. Dashed — you are looking in through it. */
const EV_CEIL = segs([
  [EV(0, 0, EV_H), EV(EV_W, 0, EV_H)], [EV(EV_W, 0, EV_H), EV(EV_W, EV_D, EV_H)],
  [EV(EV_W, EV_D, EV_H), EV(0, EV_D, EV_H)], [EV(0, EV_D, EV_H), EV(0, 0, EV_H)],
  ...[1.4, 2.8, 4.2].map((x) => [EV(x, 0, EV_H), EV(x, EV_D, EV_H)]),
  ...[1.4, 2.8].map((y) => [EV(0, y, EV_H), EV(EV_W, y, EV_H)]),
])
const EV_EDGES = segs([
  [EV(0, 0), EV(EV_W, 0)], [EV(EV_W, 0), EV(EV_W, EV_D)],
  [EV(EV_W, EV_D), EV(0, EV_D)], [EV(0, EV_D), EV(0, 0)],
  [EV(0, 0), EV(0, 0, EV_H)], [EV(EV_W, 0), EV(EV_W, 0, EV_H)],
  [EV(0, EV_D), EV(0, EV_D, EV_H)], [EV(EV_W, EV_D), EV(EV_W, EV_D, EV_H)],
])
const EV_SOFA = isoBox(EV, 0.35, 2.7, 2.35, 3.6, 0.85)
const EV_TABLE = isoBox(EV, 3.05, 0.95, 4.25, 1.75, 0.75)
const EV_STORE = isoBox(EV, 3.65, 0.12, 4.95, 0.57, 1.1)
const EV_CORNERS = [EV(0, 0), EV(EV_W, 0), EV(EV_W, EV_D), EV(0, EV_D), EV(0, 0, EV_H)]

function EvoraScanScreen() {
  return (
    <>
      <div className="as-ev-stage" aria-hidden="true">
        <svg className="as-ev-svg" viewBox="0 0 100 114" preserveAspectRatio="xMidYMid meet">
          <polygon className="as-ev-face as-ev-floor" points={EV_FLOOR} />
          <polygon className="as-ev-face" points={EV_WALL_R} />
          <polygon className="as-ev-face" points={EV_WALL_L} />
          <path className="as-ev-grid" d={EV_GRID} />
          <path className="as-ev-mesh" d={EV_MESH} />
          <path className="as-ev-ceil" d={EV_CEIL} />
          <polygon className="as-ev-open" points={EV_DOOR} />
          <polygon className="as-ev-open as-is-glass" points={EV_WINDOW} />
          <path className="as-ev-open-bar" d={EV_WIN_BAR} />
          <path className="as-ev-edges" d={EV_EDGES} />

          {[EV_STORE, EV_TABLE, EV_SOFA].map((b, i) => (
            <g key={i}>
              <polygon className="as-ev-obj-shadow" points={b.base} />
              <path className="as-ev-obj-hidden" d={b.hidden} />
              <polygon className="as-ev-obj-face as-is-top" points={b.top} />
              <polygon className="as-ev-obj-face" points={b.right} />
              <polygon className="as-ev-obj-face as-is-dark" points={b.left} />
            </g>
          ))}

          <text className="as-ev-tag" x={EV_STORE.at[0]} y={EV_STORE.at[1]}>storage</text>
          <text className="as-ev-tag" x={EV_SOFA.at[0]} y={EV_SOFA.at[1]}>sofa</text>
          <text className="as-ev-tag" x={EV_TABLE.at[0]} y={EV_TABLE.at[1]}>table</text>

          <text className="as-ev-dim" x="76" y="22">5.40 m</text>
          <text className="as-ev-dim" x="20" y="18.5">4.20 m</text>
          <text className="as-ev-dim as-is-left" x="45.5" y="27">2.70 m</text>

          {EV_CORNERS.map((p, i) => (
            <circle className="as-ev-pt" key={i} cx={p[0]} cy={p[1]} r="1.4" style={{ '--d': `${i * 0.34}s` }} />
          ))}
        </svg>
        <span className="as-ev-dots" />
        <span className="as-ev-sweep" />
      </div>

      <div className="as-body as-ev-ui">
        <div className="as-ev-top">
          <span className="as-ev-chip">Cancel</span>
          <span className="as-ev-chip as-ev-chip--saved">1 room saved</span>
        </div>
        <div className="as-ev-foot">
          <p className="as-ev-hint">Walk slowly around the room and cover every wall</p>
          <span className="as-ev-done">Done</span>
        </div>
      </div>
    </>
  )
}

/* ————————————————— 3. Glowbar — daily ritual ring ————————————————— */
function GlowbarScreen() {
  const rows = [
    { label: 'Face Yoga', mins: '12 min' },
    { label: 'Jade Roll', mins: '4 min' },
    { label: 'Gua Sha', mins: '6 min' },
  ]
  return (
    <div className="as-body as-glow">
      <div className="as-glow-ring">
        <svg viewBox="0 0 100 100">
          <circle className="as-glow-track" cx="50" cy="50" r="42" />
          <circle className="as-glow-fill" cx="50" cy="50" r="42" pathLength="1" />
        </svg>
        <div className="as-glow-ring-label">
          <strong>3</strong>
          <span>of 4</span>
        </div>
      </div>
      <div className="as-glow-streak">
        {[0, 1, 2, 3, 4].map((d) => <i key={d} className={d < 4 ? 'is-on' : ''} />)}
      </div>
      <ul className="as-glow-list">
        {rows.map((r) => (
          <li key={r.label}><span className="as-glow-dot" />{r.label}<em>{r.mins}</em></li>
        ))}
      </ul>
    </div>
  )
}

/* ————————————————— 4. Tawsiyat — pickup order ————————————————— */
function TawsiyatScreen({ reduced }) {
  const steps = ['Placed', 'Preparing', 'Ready']
  const [step, setStep] = useState(2)
  const [flip, setFlip] = useState(false)

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), 2000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setFlip((f) => !f), 2600)
    return () => clearInterval(id)
  }, [reduced])

  return (
    <div className="as-body as-taws">
      <div className="as-taws-card">
        <div className="as-taws-row"><span>Chicken Shawarma</span><span>2.50 JD</span></div>
        <div className="as-taws-row"><span>Fries</span><span>1.00 JD</span></div>
        <div className="as-taws-total"><span>Total</span><span>3.50 JD</span></div>
      </div>
      <div className="as-taws-stepper">
        {steps.map((s, i) => (
          <div key={s} className={`as-taws-step ${i <= step ? 'is-done' : ''} ${i === step ? 'is-active' : ''}`}>
            <i />
            <span>{s}</span>
          </div>
        ))}
      </div>
      <div className={`as-taws-code ${flip ? 'is-flip' : ''}`}>
        <span className="as-taws-code-face">482-K</span>
        <span className="as-taws-code-face as-back">917-Q</span>
      </div>
    </div>
  )
}

/* ————————————————— 5. TrueSize AR — place at true scale —————————————————
   DRAWN ILLUSTRATION of ContentView + DimensionsHUD.swift, place mode with
   the Sofa preset placed. Strings verbatim: the Place/Measure segmented
   control, the isPlaced banner "Drag to move · pinch to resize · twist to
   rotate", Preset.all's names, the −10/−1/+1/+10 nudges, the cm field with
   the metres read-out, and "Remove & Reposition". Sofa preset is
   [2.00, 0.85, 0.90] m; the floating labels use Format.pair().             */

const TS = isoFactory(15, 43, 84)
const TS_BOX = isoBox(TS, 0, 0, 2.0, 0.9, 0.85)   // Preset "Sofa"
const TS_GRID = (() => {
  const line = []
  for (let i = -7; i <= 9; i += 0.5) {
    line.push([TS(i, -7), TS(i, 9)])
    line.push([TS(-7, i), TS(9, i)])
  }
  return segs(line)
})()

const TS_ROWS = [
  { label: 'Width', cm: '200', m: '2.00' },
  { label: 'Height', cm: '85', m: '0.85' },
  { label: 'Depth', cm: '90', m: '0.90' },
]

function TrueSizeScreen() {
  return (
    <>
      <div className="as-ts-stage" aria-hidden="true">
        <svg className="as-ts-svg as-ts-svg--floor" viewBox="0 0 100 189" preserveAspectRatio="xMidYMid slice">
          <path className="as-ts-grid" d={TS_GRID} />
        </svg>
        <svg className="as-ts-svg" viewBox="0 0 100 189" preserveAspectRatio="xMidYMid slice">
          <polygon className="as-ts-contact" points={TS_BOX.base} />
          <path className="as-ts-hidden" d={TS_BOX.hidden} />
          <polygon className="as-ts-face as-is-top" points={TS_BOX.top} />
          <polygon className="as-ts-face" points={TS_BOX.right} />
          <polygon className="as-ts-face as-is-dark" points={TS_BOX.left} />
        </svg>
        <span className="as-ts-dots" />
      </div>

      <div className="as-body as-ts-ui">
        <div className="as-ts-seg">
          <span className="is-on">Place</span>
          <span>Measure</span>
        </div>
        <p className="as-ts-banner">Drag to move · pinch to resize · twist to rotate</p>

        <div className="as-ts-labels" aria-hidden="true">
          <span className="as-ts-pill as-ts-pill--h"><b>H</b> 85 cm <em>· 0.85 m</em></span>
          <span className="as-ts-pill as-ts-pill--w"><b>W</b> 200 cm <em>· 2.00 m</em></span>
          <span className="as-ts-pill as-ts-pill--d"><b>D</b> 90 cm <em>· 0.90 m</em></span>
        </div>

        <div className="as-ts-hud">
          <div className="as-ts-presets">
            <span>1m Cube</span><span>Chair</span><span>Table</span><span>Sofa</span><span>Box</span>
          </div>
          <div className="as-ts-rows">
            {TS_ROWS.map((r) => (
              <div className="as-ts-row" key={r.label}>
                <span className="as-ts-rl">{r.label}</span>
                <i>−10</i><i>−1</i>
                <b>{r.cm}</b>
                <u>cm</u>
                <i>+1</i><i>+10</i>
                <em>{r.m} m</em>
              </div>
            ))}
          </div>
          <div className="as-ts-action">Remove &amp; Reposition</div>
        </div>
      </div>
    </>
  )
}

/* ————————————————— 6. Morphic — AI face edit ————————————————— */
function MorphicScreen() {
  return (
    <div className="as-body as-morph">
      <div className="as-morph-stage">
        <div className="as-morph-before" />
        <div className="as-morph-after" />
        <div className="as-morph-mask" aria-hidden="true" />
        <svg className="as-morph-oval" viewBox="0 0 100 100">
          <ellipse cx="50" cy="52" rx="26" ry="34" />
        </svg>
      </div>
      <div className="as-morph-sliders">
        <div className="as-morph-slider"><span className="as-morph-handle as-h1" /></div>
        <div className="as-morph-slider"><span className="as-morph-handle as-h2" /></div>
      </div>
    </div>
  )
}

const SCREEN_MAP = {
  lahza: LahzaScreen,
  'evora-scan': EvoraScanScreen,
  glowbar: GlowbarScreen,
  tawsiyat: TawsiyatScreen,
  truesize: TrueSizeScreen,
  morphic: MorphicScreen,
}

export function AppScreen({ slug, className = '' }) {
  const reduced = useReducedMotion()
  const Screen = SCREEN_MAP[slug]
  if (!Screen) return null
  return (
    <div className={`as-root as-${slug} ${className}`}>
      <StatusBar />
      <Screen reduced={reduced} />
    </div>
  )
}
