// The butterfly that rides down the whole page.
//
// A fixed, full-viewport canvas above the copy and below the nav. It is fed
// scroll PROGRESS (0..1 across the document) and scroll VELOCITY in viewport
// heights per second; Companion.js turns those into a flight path with lag,
// buffeting and a flap that beats harder the faster you move.
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import './flyer.css'

export function Flyer() {
  const canvasRef = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    // three + the model is ~700KB for a decorative flyer. Reduced-motion
    // readers never download any of it.
    if (reduced) return
    let cancelled = false
    let teardown = null

    ;(async () => {
      const { Companion } = await import('../three/Companion.js')
      if (cancelled || !canvasRef.current) return
      let field
      try {
        field = new Companion(canvasRef.current, { reduced: false })
      } catch (e) {
        // WebGL unavailable (or the context limit is already spent on the hero)
        canvasRef.current.style.display = 'none'
        return
      }

      let lastY = window.scrollY
      let lastT = performance.now()

      const onScroll = () => {
        const now = performance.now()
        const dt = Math.max(16, now - lastT) / 1000
        const dy = window.scrollY - lastY
        lastY = window.scrollY
        lastT = now
        const doc = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
        field.setScroll(window.scrollY / doc, dy / window.innerHeight / dt)
      }
      onScroll()

      const onVis = () => { document.hidden ? field.stop() : field.start() }
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll, { passive: true })
      document.addEventListener('visibilitychange', onVis)

      teardown = () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
        document.removeEventListener('visibilitychange', onVis)
        field.dispose()
      }
    })()

    // unmounted before the chunk landed -> nothing was ever wired up
    return () => { cancelled = true; if (teardown) teardown() }
  }, [reduced])

  if (reduced) return null
  return (
    <div className="flyer-layer" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
