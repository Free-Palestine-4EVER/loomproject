// AppScreens — real animated in-phone UI previews for the six LOOM apps.
// Pure divs/SVG, no images. Drop-in replacement for the flat <Icon/> mark
// that previously sat inside Products.jsx's .app-phone frame.
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import './appscreens.css'

export const APP_SCREENS = ['lahza', 'evora-scan', 'glowbar', 'tawsiyat', 'truesize', 'morphic']

function StatusBar() {
  return (
    <div className="as-status" aria-hidden="true">
      <span className="as-time">9:41</span>
      <span className="as-dots"><i /><i /><i /></span>
    </div>
  )
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

/* ————————————————— 2. Evora Scan — LiDAR room capture ————————————————— */
function EvoraScanScreen() {
  return (
    <div className="as-body">
      <div className="as-evora-stage">
        <svg className="as-evora-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <path
            className="as-evora-outline"
            d="M14 78 L14 30 L40 14 L86 14 L86 62 L60 78 Z"
            pathLength="1"
          />
          <circle className="as-evora-pt as-pt-1" cx="14" cy="78" r="2.6" />
          <circle className="as-evora-pt as-pt-2" cx="14" cy="30" r="2.6" />
          <circle className="as-evora-pt as-pt-3" cx="40" cy="14" r="2.6" />
          <circle className="as-evora-pt as-pt-4" cx="86" cy="14" r="2.6" />
          <circle className="as-evora-pt as-pt-5" cx="86" cy="62" r="2.6" />
          <circle className="as-evora-pt as-pt-6" cx="60" cy="78" r="2.6" />
        </svg>
        <span className="as-evora-scanline" aria-hidden="true" />
      </div>
      <div className="as-evora-chip">Room captured · 24.6 m²</div>
    </div>
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

/* ————————————————— 5. TrueSize — AR measure ————————————————— */
function TrueSizeScreen() {
  return (
    <div className="as-body as-true">
      <div className="as-true-view">
        <i className="as-true-corner as-tc-tl" />
        <i className="as-true-corner as-tc-tr" />
        <i className="as-true-corner as-tc-bl" />
        <i className="as-true-corner as-tc-br" />
        <div className="as-true-grid" />
        <svg className="as-true-sofa" viewBox="0 0 100 60">
          <path d="M10 40 L10 28 Q10 22 16 22 L84 22 Q90 22 90 28 L90 40 M6 40 L94 40 M6 40 L6 46 M94 40 L94 46 M14 40 L14 34 M86 40 L86 34" />
        </svg>
        <span className="as-true-scan" aria-hidden="true" />
        <div className="as-true-dim"><i /><em>2.10 m</em><i /></div>
      </div>
    </div>
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
