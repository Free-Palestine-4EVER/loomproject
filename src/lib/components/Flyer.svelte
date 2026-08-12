<!--
  The butterfly that rides down the whole page.

  A fixed, full-viewport canvas above the copy and below the nav. It is fed
  scroll PROGRESS (0..1 across the document) and scroll VELOCITY in viewport
  heights per second; Companion.js turns those into a flight path with lag,
  buffeting and a flap that beats harder the faster you move.

  ═══════════════════════════════════════════════════════════════════════════
  COMPANION.JS ITSELF IS NOT PORTED. IT IS COPIED, BYTE FOR BYTE.

  Everything below this comment is a mount wrapper. The flight code in
  $three/Companion.js, $three/butterfly-model.js, $three/butterflyAsset.js and
  $three/flight/* is framework-agnostic three.js and moved across untouched,
  because it carries a lot of expensively-learned maths that a rewrite would
  put back at risk:

    · Body attitude is ONE quaternion, composed fresh each frame and SLERPed
      toward — never lookAt()/rotateZ() applied in sequence.
    · Vertical stroke-coupling lives in exactly ONE place (the model's own
      update()). A second one in Companion.js is what "flying reads as
      glitching in place" turned out to be.
    · THREE.Matrix4.lookAt(eye, target, up) sets +Z = normalize(eye - target)
      — it builds a CAMERA basis, and cameras look down -Z. Companion.js did
      not compensate for that for a long time, which pointed the butterfly's
      +Z a full 180° from the aim vector: it flew backwards, and every "bias
      the heading toward the reader" tweak steered its BACK at the reader
      harder. It stayed symmetric and wings-spread throughout, which is what
      made it survive review.
    · Every eased value uses a per-SECOND rate, never a per-frame fraction, so
      dt === 0 snaps to target — which is what lets renderOnce() reuse the same
      helpers for the reduced-motion static frame.
    · Scratch THREE objects are allocated once in the constructor and mutated
      in place; orienting the creature costs zero garbage per frame.

  Untouched code is code that cannot regress. Do not "modernise" that layer.
  ═══════════════════════════════════════════════════════════════════════════

  ——— THE DUCK IS GONE (11 Aug 2026, client request) ———
  This component used to fade the butterfly toward transparent whenever its
  projected on-screen box was over rendered text. That system is deleted, not
  disabled: the butterfly is now always at full opacity, everywhere on the
  page. It is a standing client decision, not an oversight to be helpfully
  corrected the next time someone notices a wing crossing a headline.

  What went with it: a second per-frame rAF loop that projected the wingspan
  and allocated a fresh box object every frame; a ~7.5Hz scan that ran
  querySelectorAll('p, h1, h2, h3, h4, li, button, a') over a 34,000px document
  and called getBoundingClientRect() on all ~440 matches, then walked the text
  nodes of every candidate with a TreeWalker and Range.getClientRects() to
  total glyph area; and a four-axis Schmitt trigger that existed purely to stop
  that binary predicate strobing at text boundaries. ~180 lines and a second
  animation loop, to decide an opacity.

  Kept from that era, because none of it is about the duck: the WebGL
  capability check, the save-data/low-memory gate, and booting off an idle
  callback rather than out of the scroll handler's own task.
-->
<script>
  import { browser } from '$app/environment'
  import { reducedMotion } from '$lib/motion.svelte.js'
  import { hasWebGL } from '$three/webglSupport.js'
  import './flyer.css'

  // A device that has told us outright it cannot afford a decorative WebGL
  // layer. Deliberately does NOT include "is a phone": the butterfly is not
  // what makes this page expensive, so deleting it from every phone would cost
  // the site its signature and buy almost nothing. `saveData` is the reader
  // asking not to be sent 700 KB of decorative JS, and `deviceMemory <= 2` is a
  // browser reporting a 2 GB phone. Safari reports neither, so an iPhone still
  // gets the companion — correctly, because an iPhone is not the problem.
  function isTooSmallToFly() {
    try {
      if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2) return true
      if (navigator.connection && navigator.connection.saveData === true) return true
    } catch { /* neither API exists here; that is not a reason to bail */ }
    return false
  }

  // Starts false on the SERVER, which is the important part: `hasWebGL()` and
  // `navigator.deviceMemory` do not exist there, and the React version's
  // `useState(() => !hasWebGL())` would have thrown during a server render.
  // The prerendered HTML therefore contains no canvas at all, and the layer is
  // something only a capable client adds.
  let canFly = $state(false)
  let canvas = $state(null)

  $effect(() => {
    if (!browser) return
    canFly = hasWebGL() && !isTooSmallToFly()
  })

  $effect(() => {
    if (!canFly || !canvas) return

    // Read once into a local so the effect does not re-subscribe to the rune
    // mid-boot; the effect already re-runs when it changes.
    const reduced = reducedMotion.current

    let cancelled = false
    let teardown = null
    let idle = 0
    let timer = 0
    let bootIdleHandle = 0

    // three + the model is ~700 KB for a decorative flyer, and it used to be
    // fetched the moment this mounted — straight into contention with the
    // hero's own first paint. Wait for the main thread to go quiet, or for the
    // reader to scroll, whichever lands first. The butterfly starts in the hero
    // either way; it is only ever a few hundred ms later than it was.
    const boot = async () => {
      const { Companion } = await import('$three/Companion.js')
      if (cancelled || !canvas) return

      let field
      try {
        field = new Companion(canvas, { reduced })
      } catch {
        // WebGL unavailable, or the context limit is already spent on the hero.
        canvas.style.display = 'none'
        return
      }

      /* REDUCED MOTION KEEPS THE BUTTERFLY, IT JUST STOPS IT FLYING.
         This used to render nothing at all, and that turned out to be a content
         bug wearing an accessibility hat: CHROME FORCES
         `prefers-reduced-motion: reduce` WHENEVER ENERGY SAVER IS ON — a laptop
         off its charger, which is most laptops — so the site's one creature
         silently vanished for a large slice of ordinary Chrome visitors while
         Safari next to it showed it fine. That is the exact symptom that got
         reported, twice.

         The setting asks for less MOTION, not less content. So a reduced
         visitor gets the butterfly rendered once, parked, with no scroll
         listener attached and no animation loop running — Companion's own
         `reduced` path already draws that single frame. It is a still
         illustration of the mascot, which is exactly what the media query is
         asking for, instead of a hole where it used to be.

         The rule that reduced motion kills Lenis and the FX pack is unchanged —
         those are motion. This one is a picture. */
      if (reduced) {
        field.renderOnce()
        teardown = () => field.dispose()
        return
      }

      /* ── HOW SCROLL REACHES THE FLIGHT (rewritten 13 Aug 2026) ───────────
         The old version did all of its work synchronously inside the scroll
         event, and it had two faults that both show up as the butterfly
         hitching while the page moves.

         ONE — IT FORCED LAYOUT ON EVERY SCROLL EVENT.
         `document.documentElement.scrollHeight` is a layout read. Read it
         while anything on the page has dirtied layout and the browser must
         flush style and layout for the WHOLE document before it can answer —
         and this document is 36,000px with nineteen other scroll listeners on
         it, several of which write styles from their own handlers. Whether
         this one stalls therefore depends on whether it happens to be
         registered after a writer, which is why it is intermittent, and when
         it does stall it stalls the main thread — so every other animation on
         the page drops the same frames the butterfly does. That is the
         "it glitches and the other animations get affected" symptom exactly.
         The height is cached now and re-measured only when it can actually
         change: on resize, and from a ResizeObserver, whose callback runs
         AFTER layout, where the read is free.

         TWO — THE VELOCITY WAS QUANTISED BY A 16ms FLOOR.
         `dt = max(16, now - lastT)` was written for a 60Hz assumption. On a
         120Hz display real frames are 8.3ms, so every sample was divided by
         roughly twice the elapsed time — and the moment the browser coalesced
         two frames into one event, dt was honest again and the velocity
         target doubled. The flight speed was therefore swinging on event
         cadence rather than on how fast the reader is actually scrolling,
         which is a glitch that costs ZERO dropped frames and so never shows
         up in a frame-time profile. Sampling once per rAF removes the reason
         the floor existed; 4ms is left only as a divide-by-zero guard.

         Sampling in rAF also means at most one sample per painted frame no
         matter how fast the events arrive, and it lands in the same frame the
         renderer is about to draw. */
      let lastY = window.scrollY
      let lastT = performance.now()
      let docH = 1
      let queued = 0

      const measureDoc = () => {
        docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      }

      const sample = () => {
        queued = 0
        const now = performance.now()
        const dt = Math.max(4, now - lastT) / 1000
        const y = window.scrollY
        const dy = y - lastY
        lastY = y
        lastT = now
        field.setScroll(y / docH, dy / window.innerHeight / dt)
      }

      const onScroll = () => { if (!queued) queued = requestAnimationFrame(sample) }
      const onResize = () => { measureDoc(); onScroll() }

      measureDoc()
      sample()

      // The page grows after first paint — lazy images landing, sections
      // expanding — and a stale height would put the butterfly at the wrong
      // point of its path. This fires after layout, so the read costs nothing.
      const docObs = new ResizeObserver(measureDoc)
      docObs.observe(document.documentElement)

      const onVis = () => { document.hidden ? field.stop() : field.start() }
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onResize, { passive: true })
      document.addEventListener('visibilitychange', onVis)

      // A case study or the wizard opening locks page scroll but leaves the
      // butterfly's own rAF loop running underneath it — a second animation
      // loop fighting the overlay's own scroll/drag every frame, which is
      // exactly the "opens fine, then scrolling goes stiff" symptom. Same
      // overlay-open/menu-open signal Lenis and MobileChrome already watch.
      const lockObs = new MutationObserver(() => {
        const locked = document.documentElement.classList.contains('overlay-open')
          || document.documentElement.classList.contains('menu-open')
        locked ? field.stop() : (document.hidden || field.start())
      })
      lockObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

      // Dev-only handle so a QA probe can read attitude/velocity straight off
      // the instance instead of inferring it from pixels. Never in a build.
      if (import.meta.env.DEV) window.__loomFlyer = field

      teardown = () => {
        lockObs.disconnect()
        docObs.disconnect()
        if (queued) cancelAnimationFrame(queued)
        delete window.__loomFlyer
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)
        document.removeEventListener('visibilitychange', onVis)
        field.dispose()
      }
    }

    // PERF: the scroll listener used to call boot() straight from the scroll
    // event's own task. boot()'s dynamic import is async (fine either way), but
    // once it resolved the continuation — `new Companion()`, which
    // synchronously builds 20 meshes and paints a canvas texture — ran in THAT
    // SAME task, landing its block exactly when the visitor had just started
    // scrolling. bootIdle re-defers through requestIdleCallback so the heavy
    // work always starts in a browser-reported idle window, never inside the
    // input handler.
    const bootIdle = () => {
      if (window.requestIdleCallback) bootIdleHandle = requestIdleCallback(boot, { timeout: 600 })
      else bootIdleHandle = setTimeout(boot, 0)
    }

    const start = () => {
      window.removeEventListener('scroll', start)
      if (idle) cancelIdleCallback?.(idle)
      clearTimeout(timer)
      bootIdle()
    }

    window.addEventListener('scroll', start, { passive: true, once: true })
    idle = window.requestIdleCallback ? requestIdleCallback(start, { timeout: 2500 }) : 0
    // Safari has no requestIdleCallback, and the timeout is the backstop when
    // the main thread never goes quiet.
    timer = setTimeout(start, window.requestIdleCallback ? 3000 : 1400)

    // Torn down before the chunk landed -> nothing was ever wired up.
    return () => {
      cancelled = true
      window.removeEventListener('scroll', start)
      if (idle) cancelIdleCallback?.(idle)
      clearTimeout(timer)
      if (bootIdleHandle) { cancelIdleCallback?.(bootIdleHandle); clearTimeout(bootIdleHandle) }
      if (teardown) teardown()
    }
  })
</script>

<!-- Nothing is going to be drawn into it, and an empty full-viewport <canvas>
     is still a compositor layer the size of the screen — so don't render one. -->
{#if canFly}
  <div class="flyer-layer" aria-hidden="true">
    <canvas bind:this={canvas}></canvas>
  </div>
{/if}
