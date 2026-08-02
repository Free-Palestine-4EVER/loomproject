// The contact machine: a figure whose head is a loom frame, warp threads strung
// across the opening, glow behind them, yarn where cables would be.
//
// Two renderers, same state machine:
//   • <video> — the generated clips at /video/contact/<clip>.{webm,mp4}. Preferred.
//   • <canvas> — a procedural loom-head, drawn here. Used until the clips land, and
//     permanently for anyone whose browser refuses the video.
//
// The canvas is not a placeholder rectangle: it is the real fallback and ships as
// finished work, because "the clips are coming" is not a state a visitor should ever
// see. It is abstract on purpose — it does not pretend to be the photoreal render.
import { useEffect, useRef, useState } from 'react'
import { MACHINE_STATES, CLIPS } from '../data/machine.js'
import './machine.css'

const GLOW = {
  magenta: ['#f21c8c', '#7b2fbe'],
  cyan:    ['#59e6ff', '#7b2fbe'],
  gold:    ['#ffc740', '#f21c8c'],
  red:     ['#ff2d38', '#b3126a'],
}
const YARNS = ['#d6247e', '#9b55c9', '#5cc0e8', '#e0a82f']
const CREAM = '#efe7da'

/* ── procedural renderer ─────────────────────────────────────────────────── */

function drawFrame(ctx, W, H, t, state, reduced) {
  const { glow } = MACHINE_STATES[state] ?? MACHINE_STATES.idle
  const [c1, c2] = GLOW[glow] ?? GLOW.magenta

  ctx.clearRect(0, 0, W, H)

  // Cyclorama: a soft pool of light behind the figure, not a flat fill.
  const cyc = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.72)
  cyc.addColorStop(0, 'rgba(60,54,78,0.55)')
  cyc.addColorStop(1, 'rgba(13,7,22,0)')
  ctx.fillStyle = cyc
  ctx.fillRect(0, 0, W, H)

  // Frame geometry — a 4:3 opening, sized off the shorter axis so it holds up in
  // both the wide desktop column and the tall mobile one.
  const fw = Math.min(W * 0.62, H * 0.52)
  const fh = fw * 0.78
  const fx = (W - fw) / 2
  const fy = H * 0.40 - fh / 2
  const breathe = reduced ? 0 : Math.sin(t * 0.9) * 2

  // Neck and shoulders, behind the frame. Drawn as one path so the trapezius line
  // is continuous — a separate neck rectangle over a separate shoulder shape reads
  // as a cone sitting on a hill, which is what the first pass looked like.
  const neckY = fy + fh - fh * 0.08   // neck starts just inside the frame
  const shoulderY = H * 0.74          // where the trapezius levels out
  const neckHalf = W * 0.075
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(W * 0.04, H)
  // left trapezius, rising into the neck
  ctx.bezierCurveTo(W * 0.08, H * 0.86, W * 0.28, shoulderY + 12, W * 0.38, shoulderY)
  ctx.bezierCurveTo(W * 0.45, H * 0.725, W / 2 - neckHalf, H * 0.715, W / 2 - neckHalf, neckY)
  ctx.lineTo(W / 2 + neckHalf, neckY)
  // and back down the right side, mirrored
  ctx.bezierCurveTo(W / 2 + neckHalf, H * 0.715, W * 0.55, H * 0.725, W * 0.62, shoulderY)
  ctx.bezierCurveTo(W * 0.72, shoulderY + 12, W * 0.92, H * 0.86, W * 0.96, H)
  ctx.closePath()
  const skin = ctx.createLinearGradient(0, neckY, 0, H)
  skin.addColorStop(0, 'rgba(206,196,208,0.34)')
  skin.addColorStop(0.55, 'rgba(150,140,166,0.26)')
  skin.addColorStop(1, 'rgba(13,7,22,0)')
  ctx.fillStyle = skin
  ctx.fill()
  // A rim light down the left edge of the neck, so it reads as a body and not a fill.
  ctx.beginPath()
  ctx.moveTo(W / 2 - neckHalf, neckY)
  ctx.lineTo(W / 2 - neckHalf, H * 0.72)
  ctx.strokeStyle = 'rgba(239,231,218,0.16)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.translate(0, breathe)

  // Glow behind the weave.
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(fx + 10, fy + 10, fw - 20, fh - 20, 8)
  ctx.clip()
  const pulse = reduced ? 0.62 : 0.52 + Math.sin(t * 1.6) * 0.14
  const g = ctx.createRadialGradient(
    fx + fw / 2, fy + fh / 2, 0,
    fx + fw / 2, fy + fh / 2, fw * 0.62,
  )
  g.addColorStop(0, c1)
  g.addColorStop(0.55, c2)
  g.addColorStop(1, '#120a1e')
  ctx.globalAlpha = pulse
  ctx.fillStyle = g
  ctx.fillRect(fx, fy, fw, fh)
  ctx.globalAlpha = 1

  // 'sent' — the weave fills bottom-up in gold and holds.
  if (state === 'sent') {
    const p = reduced ? 1 : Math.min(1, (t % 4) / 2.2)
    const fill = ctx.createLinearGradient(0, fy + fh, 0, fy + fh - fh * p)
    fill.addColorStop(0, 'rgba(255,199,64,0.85)')
    fill.addColorStop(1, 'rgba(255,199,64,0)')
    ctx.fillStyle = fill
    ctx.fillRect(fx, fy + fh - fh * p, fw, fh * p)
  }

  // 'error' — a horizontal tear that jumps rather than sweeps.
  if (state === 'error' && !reduced) {
    const ty = fy + ((t * 220) % fh)
    ctx.fillStyle = 'rgba(255,45,56,0.5)'
    ctx.fillRect(fx, ty, fw, 3)
  }
  ctx.restore()

  // Warp threads. The shuttle is the whole point of the 'listen' state: a band of
  // light passing through the weave the way a real shuttle passes through a loom.
  const n = 26
  const shuttle = (Math.sin(t * 1.1) * 0.5 + 0.5) * fw
  const listening = state === 'listen' || MACHINE_STATES[state]?.clip === 'listen'
  for (let i = 0; i < n; i++) {
    const x = fx + 14 + ((fw - 28) * i) / (n - 1)
    // Two threads snap in the error state and hang loose.
    const snapped = state === 'error' && (i === 7 || i === 18)
    const near = 1 - Math.min(1, Math.abs(x - (fx + shuttle)) / (fw * 0.16))
    const lit = listening && !reduced ? near : 0
    ctx.beginPath()
    ctx.moveTo(x, fy + 12)
    if (snapped) {
      ctx.quadraticCurveTo(x + 14, fy + fh * 0.55, x - 8, fy + fh * 0.72)
    } else {
      const sway = reduced ? 0 : Math.sin(t * 1.3 + i * 0.4) * 1.6
      ctx.quadraticCurveTo(x + sway, fy + fh / 2, x, fy + fh - 12)
    }
    ctx.strokeStyle = lit > 0
      ? `rgba(255,255,255,${0.35 + lit * 0.6})`
      : `rgba(239,231,218,${snapped ? 0.25 : 0.34})`
    ctx.lineWidth = 1 + lit * 1.2
    ctx.stroke()
  }

  // The frame itself — brushed aluminium and pale wood.
  ctx.beginPath()
  ctx.roundRect(fx, fy, fw, fh, 12)
  const metal = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh)
  metal.addColorStop(0, 'rgba(214,208,222,0.85)')
  metal.addColorStop(0.5, 'rgba(140,132,158,0.65)')
  metal.addColorStop(1, 'rgba(214,208,222,0.8)')
  ctx.strokeStyle = metal
  ctx.lineWidth = Math.max(6, fw * 0.028)
  ctx.stroke()

  // Yarn running out of the frame and off the bottom of the canvas.
  YARNS.forEach((col, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const ox = fx + (side < 0 ? 0 : fw)
    const oy = fy + fh * (0.45 + i * 0.09)
    const drift = reduced ? 0 : Math.sin(t * 0.7 + i) * 6
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.bezierCurveTo(
      ox + side * (34 + i * 12), oy + 40 + drift,
      ox + side * (12 - i * 16), H * 0.80,
      ox + side * (70 + i * 26), H + 20,
    )
    ctx.strokeStyle = col
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.globalAlpha = 1
  })

  ctx.restore()
}

function LoomCanvas({ state, reduced }) {
  const ref = useRef(null)
  // State lives in a ref so a state change never restarts the animation loop —
  // restarting it would reset `t` and visibly jump the whole scene.
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    let raf = 0
    let start = performance.now()

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const r = cv.getBoundingClientRect()
      cv.width = Math.max(1, Math.round(r.width * dpr))
      cv.height = Math.max(1, Math.round(r.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return r
    }
    let rect = size()

    const tick = (now) => {
      const t = (now - start) / 1000
      drawFrame(ctx, rect.width, rect.height, t, stateRef.current, reduced)
      if (!reduced) raf = requestAnimationFrame(tick)
    }

    // The machine lives in the LAST section of a 28,000px page, and this used to
    // redraw a ~770x960 canvas at 60fps from first paint onward — the whole way
    // down, off screen, on battery. Only run it when it can actually be seen.
    // `start` is re-based on re-entry so the animation resumes rather than
    // jumping forward by however long the reader was elsewhere.
    let running = false
    let elapsed = 0
    const run = (on) => {
      if (on === running) return
      running = on
      if (on) {
        start = performance.now() - elapsed
        raf = requestAnimationFrame(tick)
      } else {
        elapsed = performance.now() - start
        cancelAnimationFrame(raf)
      }
    }
    const io = new IntersectionObserver(([e]) => run(!!e?.isIntersecting), { rootMargin: '200px' })
    io.observe(cv)
    const onVis = () => { if (document.hidden) run(false) }
    document.addEventListener('visibilitychange', onVis)

    const ro = new ResizeObserver(() => {
      rect = size()
      if (reduced || !running) drawFrame(ctx, rect.width, rect.height, 0, stateRef.current, reduced)
    })
    ro.observe(cv)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reduced])

  // Reduced motion still needs a repaint when the state changes — there is no loop
  // running to pick it up.
  useEffect(() => {
    if (!reduced) return
    const cv = ref.current
    if (!cv) return
    const r = cv.getBoundingClientRect()
    drawFrame(cv.getContext('2d'), r.width, r.height, 0, state, true)
  }, [state, reduced])

  return <canvas ref={ref} className="loomhead-canvas" aria-hidden="true" />
}

/* ── video renderer ──────────────────────────────────────────────────────── */

// Note the missing `reduced` gate on autoPlay. Chrome's Battery Saver forces
// prefers-reduced-motion on, so gating the clip on it blanks the machine for anyone
// running low — we have been bitten by exactly this before. The clips are muted,
// slow and ambient; the aggressive motion lives in the canvas fallback, which does
// honour the preference.
function LoomVideo({ state, onFail }) {
  const active = (MACHINE_STATES[state] ?? MACHINE_STATES.idle).clip
  return (
    <>
      {CLIPS.map((clip) => (
        <video
          key={clip}
          className={`loomhead-video ${clip === active ? 'is-on' : ''}`}
          // 'sent' and 'error' are one-shot beats; the ambient states loop.
          loop={clip === 'idle' || clip === 'listen'}
          muted
          playsInline
          preload="auto"
          autoPlay
          poster="/video/contact/idle-poster.jpg"
          aria-hidden="true"
          // Any clip failing means the set is not deployed — fall back wholesale
          // rather than showing three loom-heads and one black hole.
          onError={() => onFail()}
        >
          <source src={`/video/contact/${clip}.webm`} type="video/webm" />
          <source src={`/video/contact/${clip}.mp4`} type="video/mp4" />
        </video>
      ))}
    </>
  )
}

/* ── public component ────────────────────────────────────────────────────── */

export function LoomHead({ state = 'idle', reduced = false }) {
  const [fallback, setFallback] = useState(false)
  return (
    <div className={`loomhead loomhead--${(MACHINE_STATES[state] ?? MACHINE_STATES.idle).glow}`}>
      {fallback
        ? <LoomCanvas state={state} reduced={reduced} />
        : <LoomVideo state={state} onFail={() => setFallback(true)} />}
      <div className="loomhead-vignette" aria-hidden="true" />
    </div>
  )
}
