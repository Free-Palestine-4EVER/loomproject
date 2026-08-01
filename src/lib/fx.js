// FX pack — an extra, self-contained layer of motion on top of interactions.js.
// Pure DOM + rAF + IntersectionObserver. No libraries. Transform/opacity/filter only.
// Entirely disabled under prefers-reduced-motion; hover-only bits gated to fine pointers.
import './fx.css'

const FINE = () => window.matchMedia('(pointer:fine)').matches
const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ————————————————————————————————————————————————————————
   1. Scroll-velocity marquee — speeds up + skews with scroll speed,
      eases back to rest when scrolling stops.
   ———————————————————————————————————————————————————————— */
function velocityMarquee() {
  const track = document.querySelector('.marquee-track')
  if (!track) return () => {}

  let lastY = window.scrollY
  let lastT = performance.now()
  let rawV = 0 // px/ms, signed
  let skew = 0
  let speed = 1

  const onScroll = () => {
    const now = performance.now()
    const y = window.scrollY
    const dt = Math.max(now - lastT, 1)
    rawV = (y - lastY) / dt
    lastY = y
    lastT = now
  }
  window.addEventListener('scroll', onScroll, { passive: true })

  let raf
  const loop = () => {
    raf = requestAnimationFrame(loop)
    // decay the raw sample toward 0 between scroll events so it settles
    rawV *= 0.9
    const targetSkew = Math.max(-4, Math.min(4, rawV * 6))
    const targetSpeed = 1 + Math.min(Math.abs(rawV) * 2.2, 3.5)
    skew += (targetSkew - skew) * 0.12
    speed += (targetSpeed - speed) * 0.08
    track.style.setProperty('--mq-skew', `${skew.toFixed(3)}deg`)
    track.style.setProperty('--mq-speed', speed.toFixed(3))
  }
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('scroll', onScroll)
    track.style.removeProperty('--mq-skew')
    track.style.removeProperty('--mq-speed')
  }
}

/* ————————————————————————————————————————————————————————
   2. Text scramble on nav-link hover — original text preserved
      via data-original, restored no matter how the hover ends.
   ———————————————————————————————————————————————————————— */
const SCRAMBLE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+-/\\'

function navScramble() {
  if (!FINE()) return () => {}
  const spans = Array.from(document.querySelectorAll('.nav-links a span'))
  const timers = new Map()

  const settle = (el) => {
    const t = timers.get(el)
    if (t) { clearInterval(t.interval); clearTimeout(t.timeout); timers.delete(el) }
    const original = el.dataset.original
    if (original !== undefined) el.textContent = original
  }

  const scramble = (el) => {
    if (timers.has(el)) return
    const original = el.dataset.original ?? (el.dataset.original = el.textContent)
    const duration = 350
    const stepMs = 32
    const start = performance.now()
    const len = original.length
    const interval = setInterval(() => {
      const p = (performance.now() - start) / duration
      let out = ''
      for (let i = 0; i < len; i++) {
        const ch = original[i]
        if (ch === ' ') { out += ' '; continue }
        // reveal glyphs left-to-right as progress advances
        out += p > i / len
          ? ch
          : SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0]
      }
      el.textContent = out
    }, stepMs)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      el.textContent = original
      timers.delete(el)
    }, duration)
    timers.set(el, { interval, timeout })
  }

  const onEnter = (e) => scramble(e.currentTarget)
  spans.forEach((s) => s.addEventListener('mouseenter', onEnter))

  return () => {
    spans.forEach((s) => s.removeEventListener('mouseenter', onEnter))
    timers.forEach((_, el) => settle(el))
  }
}

/* ————————————————————————————————————————————————————————
   3. Stat glitch — one quick chromatic-aberration flicker
      when a .stat-value enters the viewport.
   ———————————————————————————————————————————————————————— */
function statGlitch() {
  const els = document.querySelectorAll('.stat-value')
  if (!els.length) return () => {}
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return
        const el = en.target
        io.unobserve(el)
        el.classList.add('fx-glitch')
        setTimeout(() => el.classList.remove('fx-glitch'), 420)
      })
    },
    { threshold: 0.6 }
  )
  els.forEach((el) => io.observe(el))
  return () => io.disconnect()
}

/* ————————————————————————————————————————————————————————
   4. Confetti threads — short glowing thread particles bursting
      from a point, drawn on a screen-blended canvas.
   ———————————————————————————————————————————————————————— */
let threadCanvas, threadCtx, threadDpr
function ensureThreadCanvas() {
  if (threadCanvas) return
  threadCanvas = document.createElement('canvas')
  threadCanvas.className = 'fx-threads-canvas'
  threadCanvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(threadCanvas)
  threadCtx = threadCanvas.getContext('2d')
  threadDpr = Math.min(window.devicePixelRatio || 1, 2)
  const resize = () => {
    threadCanvas.width = window.innerWidth * threadDpr
    threadCanvas.height = window.innerHeight * threadDpr
    threadCanvas.style.width = window.innerWidth + 'px'
    threadCanvas.style.height = window.innerHeight + 'px'
    threadCtx.setTransform(threadDpr, 0, 0, threadDpr, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)
}

const THREAD_COLORS = ['242, 28, 140', '89, 230, 255', '123, 47, 190', '255, 199, 64']

export function burstThreads(x, y) {
  if (REDUCED()) return
  ensureThreadCanvas()
  const N = 24
  const duration = 700
  const start = performance.now()
  const particles = Array.from({ length: N }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 1.4 + Math.random() * 2.6
    return {
      angle, speed,
      len: 14 + Math.random() * 22,
      color: THREAD_COLORS[(Math.random() * THREAD_COLORS.length) | 0],
      wobble: Math.random() * Math.PI * 2,
    }
  })

  const tick = (now) => {
    const p = (now - start) / duration
    if (p >= 1) {
      threadCtx.clearRect(0, 0, threadCanvas.width, threadCanvas.height)
      return
    }
    threadCtx.clearRect(0, 0, threadCanvas.width, threadCanvas.height)
    threadCtx.globalCompositeOperation = 'screen'
    particles.forEach((pt) => {
      const dist = pt.speed * p * 90
      const ease = 1 - Math.pow(1 - p, 2)
      const cx = x + Math.cos(pt.angle) * dist * ease
      const cy = y + Math.sin(pt.angle) * dist * ease + p * p * 26 // slight gravity
      const tailAngle = pt.angle + Math.sin(pt.wobble + p * 6) * 0.2
      const tx = cx - Math.cos(tailAngle) * pt.len
      const ty = cy - Math.sin(tailAngle) * pt.len
      const alpha = (1 - p) * 0.9
      threadCtx.beginPath()
      threadCtx.moveTo(tx, ty)
      threadCtx.lineTo(cx, cy)
      threadCtx.strokeStyle = `rgba(${pt.color}, ${alpha.toFixed(3)})`
      threadCtx.lineWidth = 2
      threadCtx.lineCap = 'round'
      threadCtx.stroke()
    })
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function confettiThreads() {
  window.__burstThreads = burstThreads
  const onClick = (e) => {
    const btn = e.target.closest?.('.wsend .btn')
    if (!btn) return
    burstThreads(e.clientX, e.clientY)
  }
  document.addEventListener('click', onClick)
  return () => {
    document.removeEventListener('click', onClick)
    delete window.__burstThreads
    if (threadCanvas) { threadCanvas.remove(); threadCanvas = null }
  }
}

/* ————————————————————————————————————————————————————————
   5. Section-edge glow — top-edge gradient line briefly intensifies
      as each section crosses the viewport center.
   ———————————————————————————————————————————————————————— */
function sectionEdgeGlow() {
  const sections = Array.from(document.querySelectorAll('main > section'))
  if (!sections.length) return () => {}
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        en.target.classList.toggle('fx-edge-glow', en.isIntersecting)
      })
    },
    { rootMargin: '-49% 0px -49% 0px' }
  )
  sections.forEach((s) => io.observe(s))
  return () => io.disconnect()
}

/* ————————————————————————————————————————————————————————
   6. Hero type shimmer — a light sweep across .hero-h1 every ~9s.
   ———————————————————————————————————————————————————————— */
function heroShimmer() {
  const el = document.querySelector('.hero-h1')
  if (!el) return () => {}
  el.classList.add('fx-shimmer-host')
  let timeout, active
  const fire = () => {
    el.classList.add('fx-shimmer')
    active = setTimeout(() => el.classList.remove('fx-shimmer'), 1200)
    timeout = setTimeout(fire, 9000)
  }
  timeout = setTimeout(fire, 9000)
  return () => {
    clearTimeout(timeout)
    clearTimeout(active)
    el.classList.remove('fx-shimmer', 'fx-shimmer-host')
  }
}

export function mountFx() {
  if (REDUCED()) return () => {}

  const cleanups = [
    velocityMarquee(),
    navScramble(),
    statGlitch(),
    confettiThreads(),
    sectionEdgeGlow(),
    heroShimmer(),
  ]

  return () => cleanups.forEach((fn) => fn && fn())
}
