// The Poster Machine — type a line, pick a cut and a palette, get a real
// 1600×2000 poster PNG set in LOOM Bloom. Everything is drawn to a canvas from
// the live font, so what downloads is exactly what is on screen.
//
// This is the section that closes the argument the typeface opens: we made the
// tool, we made the type, and you leave with a printable artefact.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Reveal, Magnetic } from '../lib/motion.jsx'
import './postermachine.css'

const W = 1600
const H = 2000

const CUTS = [
  { id: 'regular', label: 'Regular', family: 'LOOM Bloom' },
  { id: 'rose', label: 'Rose', family: 'LOOM Bloom Rose' },
  { id: 'daisy', label: 'Daisy', family: 'LOOM Bloom Daisy' },
  { id: 'tulip', label: 'Tulip', family: 'LOOM Bloom Tulip' },
  { id: 'ivy', label: 'Ivy', family: 'LOOM Bloom Ivy' },
]

const PALETTES = [
  { id: 'atelier', label: 'Atelier', bg: '#120a1f', ink: '#f2f0f7', accent: '#f21c8c', swatch: ['#120a1f', '#f21c8c'] },
  { id: 'magenta', label: 'Thread', bg: '#f21c8c', ink: '#12060f', accent: '#ffe08a', swatch: ['#f21c8c', '#12060f'] },
  { id: 'bone', label: 'Bone', bg: '#efe7da', ink: '#14100c', accent: '#b3126a', swatch: ['#efe7da', '#b3126a'] },
  { id: 'neon', label: 'Neon', bg: '#05060a', ink: '#59e6ff', accent: '#f21c8c', swatch: ['#05060a', '#59e6ff'] },
]

const LAYOUTS = [
  { id: 'stack', label: 'Stack' },
  { id: 'band', label: 'Band' },
  { id: 'frame', label: 'Frame' },
]

const ORNS = ['❀', '✿', '❦']

const SEEDS = [
  ['BLOOM', 'ANYWAY'],
  ['MADE', 'IN AMMAN'],
  ['NO', 'TEMPLATES'],
  ['CUT', 'YOUR OWN'],
  ['WOVEN', 'ON A LOOM'],
  ['SAY IT', 'BIGGER'],
]

/** Largest font size at which `text` fits `max` px wide, capped at `cap`. */
function fitSize(ctx, text, family, max, cap) {
  if (!text) return cap
  ctx.font = `400 100px "${family}", sans-serif`
  const w = ctx.measureText(text).width || 1
  return Math.min(cap, (max / w) * 100)
}

function drawPoster(ctx, { l1, l2, family, palette, layout }) {
  const p = PALETTES.find((x) => x.id === palette) || PALETTES[0]
  const pad = 120

  ctx.save()
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, W, H)

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  const inner = W - pad * 2
  const A = (l1 || '').toUpperCase()
  const B = (l2 || '').toUpperCase()

  if (layout === 'band') {
    const s1 = fitSize(ctx, A, family, inner, 460)
    ctx.font = `400 ${s1}px "${family}", sans-serif`
    ctx.fillStyle = p.ink
    ctx.fillText(A, pad, pad + s1 * 0.82)

    const bandTop = pad + s1 * 1.05
    const bandH = H - bandTop - pad - 120
    ctx.fillStyle = p.accent
    ctx.fillRect(pad, bandTop, inner, bandH)

    const s2 = fitSize(ctx, B, family, inner - 120, 360)
    ctx.font = `400 ${s2}px "${family}", sans-serif`
    ctx.fillStyle = p.bg
    ctx.fillText(B, pad + 60, bandTop + bandH / 2 + s2 * 0.34)
  } else if (layout === 'frame') {
    ctx.strokeStyle = p.ink
    ctx.lineWidth = 10
    ctx.strokeRect(pad * 0.6, pad * 0.6, W - pad * 1.2, H - pad * 1.2)

    ctx.fillStyle = p.accent
    ctx.font = `400 96px "${family}", sans-serif`
    ctx.textAlign = 'center'
    for (let i = 0; i < 5; i++) {
      const o = ORNS[i % ORNS.length]
      ctx.fillText(o, pad * 0.6 + ((i + 0.5) * (W - pad * 1.2)) / 5, pad * 0.6 + 100)
      ctx.fillText(o, pad * 0.6 + ((i + 0.5) * (W - pad * 1.2)) / 5, H - pad * 0.6 - 34)
    }

    const s1 = fitSize(ctx, A, family, inner - 160, 400)
    const s2 = fitSize(ctx, B, family, inner - 160, 300)
    ctx.fillStyle = p.ink
    ctx.font = `400 ${s1}px "${family}", sans-serif`
    ctx.fillText(A, W / 2, H / 2 - 20)
    ctx.font = `400 ${s2}px "${family}", sans-serif`
    ctx.fillText(B, W / 2, H / 2 + s2 * 1.05)
    ctx.textAlign = 'left'
  } else {
    // stack — the default: two lines flush left, rules top and bottom
    ctx.fillStyle = p.ink
    ctx.fillRect(pad, pad, inner, 8)

    const s1 = fitSize(ctx, A, family, inner, 480)
    const s2 = fitSize(ctx, B, family, inner, 480)
    const s = Math.min(s1, s2)
    const y = H / 2 - s * 0.25
    ctx.font = `400 ${s}px "${family}", sans-serif`
    ctx.fillText(A, pad, y)
    ctx.fillStyle = p.accent
    ctx.fillText(B, pad, y + s * 0.92)

    ctx.fillStyle = p.ink
    ctx.fillRect(pad, H - pad - 150, inner, 8)
  }

  // footer line, always
  ctx.fillStyle = p.ink
  ctx.globalAlpha = layout === 'frame' ? 0 : 0.72
  ctx.font = `400 40px "${family}", sans-serif`
  ctx.fillText('LOOM BLOOM', pad, H - pad - 60)
  ctx.textAlign = 'right'
  ctx.fillText('LOOMSTUDIO-JO.COM', W - pad, H - pad - 60)
  ctx.textAlign = 'left'
  ctx.globalAlpha = 1
  ctx.restore()
}

export function PosterMachine() {
  const canvasRef = useRef(null)
  const [l1, setL1] = useState('BLOOM')
  const [l2, setL2] = useState('ANYWAY')
  const [cut, setCut] = useState('rose')
  const [palette, setPalette] = useState('atelier')
  const [layout, setLayout] = useState('stack')
  const [ready, setReady] = useState(false)

  const family = (CUTS.find((c) => c.id === cut) || CUTS[0]).family

  // The canvas draws from the loaded font, not from CSS — so the face has to be
  // explicitly loaded before the first paint or the poster comes out in Arial.
  useEffect(() => {
    let live = true
    const load = async () => {
      try {
        await Promise.all(CUTS.map((c) => document.fonts.load(`400 100px "${c.family}"`)))
        await document.fonts.ready
      } catch { /* older browsers just paint a beat later */ }
      if (live) setReady(true)
    }
    load()
    return () => { live = false }
  }, [])

  const paint = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    drawPoster(ctx, { l1, l2, family, palette, layout })
  }, [l1, l2, family, palette, layout])

  useEffect(() => { paint() }, [paint, ready])

  const shuffle = () => {
    const s = SEEDS[Math.floor(Math.random() * SEEDS.length)]
    setL1(s[0]); setL2(s[1])
    setCut(CUTS[Math.floor(Math.random() * CUTS.length)].id)
    setPalette(PALETTES[Math.floor(Math.random() * PALETTES.length)].id)
    setLayout(LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id)
  }

  const download = () => {
    const cv = canvasRef.current
    if (!cv) return
    cv.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `loom-bloom-poster-${(l1 || 'poster').toLowerCase().replace(/\W+/g, '-')}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  }

  return (
    <section className="pm" id="poster-machine">
      <div className="pm-inner">
        <header className="pm-head">
          <div>
            <p className="tf-tag">The poster machine</p>
            <h2 className="tf-h2">Make something with it, right now</h2>
            <p className="pm-lede">
              Type a line, pick a cut and a palette. The poster is drawn to a
              canvas from the live font — what you see is what downloads, at
              1600 × 2000, free to print.
            </p>
          </div>
          <div className="pm-actions">
            <button className="pm-btn" onClick={shuffle}>Shuffle</button>
            <Magnetic strength={0.2}>
              <button className="pm-btn pm-btn--fill" onClick={download}>
                Download PNG<span>1600 × 2000</span>
              </button>
            </Magnetic>
          </div>
        </header>

        <div className="pm-body">
          <div className="pm-controls">
            <label className="pm-field">
              <span>Line one</span>
              <input value={l1} onChange={(e) => setL1(e.target.value.slice(0, 18))} maxLength={18} spellCheck="false" />
            </label>
            <label className="pm-field">
              <span>Line two</span>
              <input value={l2} onChange={(e) => setL2(e.target.value.slice(0, 18))} maxLength={18} spellCheck="false" />
            </label>

            <fieldset className="pm-group">
              <legend>Cut</legend>
              <div className="pm-chips">
                {CUTS.map((c) => (
                  <button
                    key={c.id}
                    className={`pm-chip ${cut === c.id ? 'is-on' : ''}`}
                    onClick={() => setCut(c.id)}
                    aria-pressed={cut === c.id}
                  >{c.label}</button>
                ))}
              </div>
            </fieldset>

            <fieldset className="pm-group">
              <legend>Palette</legend>
              <div className="pm-chips">
                {PALETTES.map((p) => (
                  <button
                    key={p.id}
                    className={`pm-chip pm-chip--sw ${palette === p.id ? 'is-on' : ''}`}
                    onClick={() => setPalette(p.id)}
                    aria-pressed={palette === p.id}
                  >
                    <i style={{ background: p.swatch[0] }} />
                    <i style={{ background: p.swatch[1] }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="pm-group">
              <legend>Layout</legend>
              <div className="pm-chips">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    className={`pm-chip ${layout === l.id ? 'is-on' : ''}`}
                    onClick={() => setLayout(l.id)}
                    aria-pressed={layout === l.id}
                  >{l.label}</button>
                ))}
              </div>
            </fieldset>
          </div>

          <Reveal className="pm-stage" y={26}>
            <canvas ref={canvasRef} width={W} height={H} className="pm-canvas"
                    aria-label="Poster preview" role="img" />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
