// Site-wide interaction layer — pointer spotlight, 3D card tilt, ambient thread trail.
// Pure DOM + rAF, mounted once from App. All effects bail out under reduced-motion
// or coarse pointers, and every listener is passive.

const FINE = () => window.matchMedia('(pointer:fine)').matches
const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Cards lit by a cursor-following radial highlight + subtle 3D tilt. */
function spotlightAndTilt() {
  const SEL = '.case-card, .studio-card, .lab-card, .app-card, .sol-card, .wintent'
  // The rect used to be read on EVERY mousemove — a forced full-document layout
  // measured at 2.0ms median on this page. Cache it per card and invalidate only
  // on the events that can actually move it, so onMove does writes only.
  let cur = null
  let rect = null
  const invalidate = () => { rect = null }
  const onMove = (e) => {
    const el = e.target.closest?.(SEL)
    if (!el) return
    if (el !== cur) { cur = el; rect = null }
    if (!rect) rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
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
    if (el === cur) { cur = null; rect = null }
  }
  document.addEventListener('mousemove', onMove, { passive: true })
  document.addEventListener('mouseout', onOut, { passive: true })
  window.addEventListener('scroll', invalidate, { passive: true })
  window.addEventListener('resize', invalidate, { passive: true })
  return () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseout', onOut)
    window.removeEventListener('scroll', invalidate)
    window.removeEventListener('resize', invalidate)
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
  // MEASURED 10 Aug 2026: this rAF loop used to run forever the instant the
  // page mounted, whether or not the cursor had ever moved — a full-viewport
  // clearRect() every frame, unconditionally, for the entire session. A
  // reader who scrolls with a trackpad/keyboard and never touches the mouse
  // paid that every frame with nothing on screen to show for it. Now the loop
  // stops itself the moment the trail is empty and nothing is moving, and a
  // single mousemove is what wakes it back up.
  let raf = null
  const onMove = (e) => {
    mx = e.clientX; my = e.clientY; moving = 1
    if (raf == null) raf = requestAnimationFrame(loop)
  }
  window.addEventListener('mousemove', onMove, { passive: true })

  function loop() {
    if (moving) { pts.push({ x: mx, y: my }); if (pts.length > MAX) pts.shift() }
    else if (pts.length) pts.shift()
    ctx.clearRect(0, 0, w, h)
    if (pts.length >= 3) {
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
    }
    moving = 0
    // still shrinking the tail (or a fresh point just landed) -> keep going;
    // an empty trail with nothing moving has nothing left to animate
    if (pts.length) raf = requestAnimationFrame(loop)
    else raf = null
  }

  return () => {
    if (raf != null) cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMove)
    canvas.remove()
  }
}

/* ── THE SCROLL-SPY IS GONE (11 Aug 2026) ─────────────────────────────────
   `activeSectionNav()` lived here: an IntersectionObserver over a hardcoded
   list of section ids that toggled `is-current` on whichever `.nav-links a`
   had the matching hash. It existed because every nav tab was an anchor into
   one very long page, so "which tab am I on" could only be answered by
   measuring the scroll.

   Nine of those tabs are dedicated routes now (see nav-links.js), so the
   question is the pathname and Nav.svelte answers it directly with a derived
   `isCurrent(href)` — no observer, no per-scroll work, and nothing left to
   fight it. Keeping the spy would have done exactly that fighting: it wrote
   the same class from outside the component, so on '/' it would have stripped
   `is-current` off Home the moment the hero left the band, and on a route
   page it would have found no ids at all and left Nav's answer standing only
   by luck.

   The id list was also a second, hand-maintained copy of the page's structure
   and it had already rotted — 'crew', 'ascent', 'lab' and 'own-apps' were
   still being observed long after those sections left the site. It is not
   replaced by another list here; it is replaced by the URL.

   Removed from this file entirely rather than left as a no-op, because a
   disabled observer with a stale id array is the thing that rots next. */


export function mountInteractions() {
  const cleanups = []
  if (FINE() && !REDUCED()) {
    cleanups.push(spotlightAndTilt(), threadTrail())
  }
  return () => cleanups.forEach((fn) => fn && fn())
}
