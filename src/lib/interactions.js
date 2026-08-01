// Site-wide interaction layer — pointer spotlight, 3D card tilt, ambient thread trail.
// Pure DOM + rAF, mounted once from App. All effects bail out under reduced-motion
// or coarse pointers, and every listener is passive.

const FINE = () => window.matchMedia('(pointer:fine)').matches
const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Cards lit by a cursor-following radial highlight + subtle 3D tilt. */
function spotlightAndTilt() {
  const SEL = '.case-card, .process-card, .studio-card, .lab-card, .app-card, .sol-card, .wintent'
  const onMove = (e) => {
    const el = e.target.closest?.(SEL)
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    // tilt is deliberately tiny — presence, not novelty
    const rx = (0.5 - py) * 5
    const ry = (px - 0.5) * 5
    el.style.setProperty('--rx', `${rx.toFixed(2)}deg`)
    el.style.setProperty('--ry', `${ry.toFixed(2)}deg`)
    el.classList.add('is-lit')
  }
  const onOut = (e) => {
    const el = e.target.closest?.(SEL)
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.classList.remove('is-lit')
  }
  document.addEventListener('mousemove', onMove, { passive: true })
  document.addEventListener('mouseout', onOut, { passive: true })
  return () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseout', onOut)
  }
}

/** A short luminous thread that trails the cursor — the brand motif, alive. */
function threadTrail() {
  const canvas = document.createElement('canvas')
  canvas.className = 'thread-trail'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio, 2)
  const resize = () => {
    w = window.innerWidth; h = window.innerHeight
    canvas.width = w * dpr; canvas.height = h * dpr
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
    ctx.scale(dpr, dpr)
  }
  resize()
  window.addEventListener('resize', resize)

  const pts = []
  const MAX = 18
  let mx = -999, my = -999, moving = 0
  const onMove = (e) => { mx = e.clientX; my = e.clientY; moving = 1 }
  window.addEventListener('mousemove', onMove, { passive: true })

  let raf
  const loop = () => {
    raf = requestAnimationFrame(loop)
    if (moving) { pts.push({ x: mx, y: my }); if (pts.length > MAX) pts.shift() }
    else if (pts.length) pts.shift()
    ctx.clearRect(0, 0, w, h)
    if (pts.length < 3) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length
      ctx.beginPath()
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y)
      ctx.lineTo(pts[i].x, pts[i].y)
      ctx.strokeStyle = `rgba(242, 28, 140, ${(t * 0.5).toFixed(3)})`
      ctx.lineWidth = t * 2.4
      ctx.stroke()
    }
    moving = 0
  }
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMove)
    canvas.remove()
  }
}

/** Section headings get a scroll-linked accent — nav marks the active section. */
function activeSectionNav() {
  const ids = ['work', 'solutions', 'apps', 'lab', 'ascent', 'contact']
  const links = new Map()
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const id = a.getAttribute('href')?.replace('#', '')
    if (id) links.set(id, a)
  })
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        const a = links.get(en.target.id)
        if (a) a.classList.toggle('is-current', en.isIntersecting)
      })
    },
    { rootMargin: '-45% 0px -45% 0px' }
  )
  ids.forEach((id) => {
    const el = document.getElementById(id)
    if (el) io.observe(el)
  })
  return () => io.disconnect()
}

export function mountInteractions() {
  const cleanups = [activeSectionNav()]
  if (FINE() && !REDUCED()) {
    cleanups.push(spotlightAndTilt(), threadTrail())
  }
  return () => cleanups.forEach((fn) => fn && fn())
}
