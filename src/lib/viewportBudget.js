// ————————————————————————————————————————————————————————
// viewportBudget — what the page is allowed to spend while it is not on screen.
//
// Two separate budgets, both measured, not guessed:
//
// 1. ANIMATION. A full pass down the page leaves ~150 animations running, and
//    the great majority of them are `infinite` CSS loops that keep their
//    element on the compositor for the whole session whether or not the reader
//    is anywhere near them. Measured on the built site at 390x844 with
//    `document.getAnimations()`: 38 `wall-sheen` (one per client name in the
//    marquee), 32 `rc-rise`, and another ~25 `rc-*` loops across Rich.jsx's
//    diagrams, plus the petals, the wish tags and the hero. Off-screen hosts
//    get every INFINITE animation in their subtree paused.
//
// 2. IMAGE MEMORY. Decoded bitmap RAM is `naturalWidth * naturalHeight * 4`
//    bytes and has nothing to do with file size or codec. Measured on the
//    built site at 390x844 (DPR 2 and DPR 3, touch emulated): the whole page
//    is 68 MB of bitmaps, and a fast pass down it peaks with 61 images
//    resident at once. Flicked fast, every lazy image below decodes at once,
//    the tab crosses iOS Safari's memory ceiling and is killed with no error —
//    the exact symptom reported on an iPhone 17 Pro Max. So on touch devices we
//    evict deliberately: an image outside the band drops its src and gets it
//    back before it can be seen again.
//
// Both are idempotent and fully torn down by the returned cleanup.
// ————————————————————————————————————————————————————————

const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/* ——————————————————————— 1 · ANIMATION ———————————————————————
   This half was inert for a while and the failure was silent, which is the
   thing to design against here. It used to observe `.app-card, .lab-card` and
   toggle `is-live` on them, leaning on parking rules in products-showcase.css.
   Both classes were removed from the DOM by a later rewrite, so the selector
   matched zero elements, the observer had nothing to watch, and nothing
   anywhere reported it — the page simply went back to paying for every loop.

   Two things changed so that cannot happen the same way again:

   - The list below is HOSTS, not the animated elements themselves: a container
     that owns loops somewhere inside it. If one of these is renamed the
     others still work, and DEV logs the miss (see `scan`) instead of failing
     quietly.
   - Parking no longer depends on a CSS rule existing somewhere else. We pause
     the real animations through the Web Animations API, which covers CSS
     `animation` and Motion's own loops identically and needs no class contract
     with any stylesheet.

   Only `iterations === Infinity` is ever touched. A one-shot entrance (every
   Reveal, `wm-wall-in`, `mo-cell-in`, the `stg-fan-in` stagger) is left alone:
   pausing one of those off-screen would freeze it half-faded, and it costs
   nothing anyway because it ends. */
const LOOP_HOSTS = [
  '.marquee',      // 38 x wall-sheen, one per client name — the single biggest cluster
  '.rc-visual',    // Rich.jsx diagrams: rc-rise / rc-breathe / rc-spin / rc-ring ...
  '.rc-glyph',     // ... and its smaller glyph variant
  '.rc-spark',     // ... and the sparkline: 28 x rc-rise, the biggest cluster left
  '.rc-thread',    // ... and the woven thread rule (rc-k-thread)
  '.rc-live',      // ... and the pulsing "live" dot in a section head (rc-ring)
  '.tb-petals',    // 7 falling petals on the tree break
  '.foot-petals',  // ...and the same petals where the tree lives NOW, in the footer
  '.footer--bloom', // foot-float on the tree + foot-breathe on the halo
  '.wish',         // the two hanging wish tags
  '.wool-btn',     // wool-breathe on the hero buttons
  '.stg-stage',    // the products stage (sui-blink and friends)
  '.dk',           // the 3D-lab deck previews
  '.wtile',        // Selected Work mosaic tiles
].join(', ')

function animationBudget() {
  // Every host we have paused, with the animations we paused ON it. We keep
  // our own list rather than re-querying on the way back in, so we can never
  // resume an animation that something else deliberately paused.
  const paused = new WeakMap()

  const park = (host) => {
    if (paused.has(host)) return
    const list = []
    for (const a of host.getAnimations({ subtree: true })) {
      const t = a.effect?.getTiming?.()
      if (!t || t.iterations !== Infinity) continue
      if (a.playState !== 'running') continue
      a.pause()
      list.push(a)
    }
    paused.set(host, list)
  }

  const unpark = (host) => {
    const list = paused.get(host)
    if (!list) return
    paused.delete(host)
    for (const a of list) { try { a.play() } catch { /* animation is gone with its element */ } }
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? unpark(e.target) : park(e.target)
    },
    // a quarter-viewport of lead-in: the loops are mid-cycle by the time the
    // host is actually legible, so nothing ever reads as "starting on arrival"
    { rootMargin: '25% 0px' }
  )

  const seen = new WeakSet()
  const scan = () => {
    const found = document.querySelectorAll(LOOP_HOSTS)
    for (const el of found) {
      if (seen.has(el)) continue
      seen.add(el)
      io.observe(el)
    }
    return found.length
  }

  // The animation half of this file has already died once by matching nothing
  // at all. In dev, say so out loud the moment it happens again.
  //
  // Checking only the WHOLE list is too coarse, and that is how it rotted the
  // second time: the footer was rebuilt around the bloom tree, `.tb-petals`
  // stopped matching, and because the other selectors still matched something
  // the list looked alive while 40 off-screen infinite loops ran on a phone.
  // So report per selector, and separately report loops nothing covers — that
  // second list is what actually catches a NEW cluster nobody has hosted yet.
  if (import.meta.env.DEV) {
    setTimeout(() => {
      const dead = LOOP_HOSTS.split(', ').filter((s) => !document.querySelectorAll(s).length)
      if (dead.length) {
        console.warn(`[viewportBudget] LOOP_HOSTS selectors matching nothing on this route: ${dead.join(', ')} — verify they still exist before trusting the budget.`)
      }
      const orphans = new Map()
      for (const a of document.getAnimations()) {
        const el = a.effect?.target
        if (!el?.closest || a.effect?.getTiming?.().iterations !== Infinity) continue
        if (LOOP_HOSTS.split(', ').some((s) => el.closest(s))) continue
        orphans.set(a.animationName, (orphans.get(a.animationName) || 0) + 1)
      }
      if (orphans.size) {
        console.warn('[viewportBudget] infinite animations no LOOP_HOST covers:',
          [...orphans].map(([n, c]) => `${c}x ${n}`).join(', '))
      }
    }, 4000)
  }

  scan()

  // the grids mount with the page, but the case overlay and the lab can add
  // hosts later — watch rather than assume
  const mo = new MutationObserver(scan)
  mo.observe(document.body, { childList: true, subtree: true })

  return () => {
    mo.disconnect()
    io.disconnect()
    // leave nothing frozen behind us
    for (const el of document.querySelectorAll(LOOP_HOSTS)) unpark(el)
  }
}

/* ——————————————————————— 2 · IMAGE MEMORY ——————————————————————— */

export function imageBudget({ force = false } = {}) {
  // Desktop has no such ceiling and eviction there would only cost re-decodes.
  // `force` exists so the pass can be exercised from a desktop browser, where
  // no amount of viewport emulation makes `pointer: coarse` true.
  if (!force && !window.matchMedia('(pointer: coarse)').matches) return () => {}

  // An image is only safe to blank if its box does not depend on the bitmap.
  // Rather than reason about each one, evict, measure, and put it straight back
  // if the layout so much as twitched — then never touch that image again.
  const pinned = new WeakSet()

  // A `<picture>`'s <source srcset> outranks the <img src> entirely, so
  // blanking the src alone would leave the browser free to keep — or re-pick —
  // the full-size candidate and the eviction would do nothing at all. Every
  // source has to be stripped first, and put back before the src on the way
  // in, or the img momentarily resolves against a picture with no sources.
  const sourcesOf = (img) =>
    img.parentElement && img.parentElement.tagName === 'PICTURE'
      ? img.parentElement.querySelectorAll('source')
      : []

  const evict = (img) => {
    if (pinned.has(img) || img.dataset.budgetSrc || !img.currentSrc) return
    const before = img.getBoundingClientRect()
    const src = img.getAttribute('src')
    const srcset = img.getAttribute('srcset')
    img.dataset.budgetSrc = src ?? ''
    if (srcset) img.dataset.budgetSrcset = srcset
    for (const s of sourcesOf(img)) {
      const ss = s.getAttribute('srcset')
      if (ss != null) { s.dataset.budgetSrcset = ss; s.removeAttribute('srcset') }
    }
    img.removeAttribute('srcset')
    img.src = BLANK
    const after = img.getBoundingClientRect()
    if (Math.abs(after.width - before.width) > 0.5 || Math.abs(after.height - before.height) > 0.5) {
      pinned.add(img)
      restore(img)
    }
  }

  const restore = (img) => {
    const src = img.dataset.budgetSrc
    if (src == null) return
    delete img.dataset.budgetSrc
    for (const s of sourcesOf(img)) {
      const ss = s.dataset.budgetSrcset
      if (ss != null) { s.setAttribute('srcset', ss); delete s.dataset.budgetSrcset }
    }
    const srcset = img.dataset.budgetSrcset
    if (srcset) { img.setAttribute('srcset', srcset); delete img.dataset.budgetSrcset }
    if (src) img.setAttribute('src', src)
  }

  // A fast scroll through an image-dense section (the Work mosaic is the worst
  // of them: every tile carries a MacBook frame, an iPhone frame, two
  // screenshots and a cover) can cross the eviction boundary for dozens of
  // images between two IntersectionObserver callbacks. Restoring all of them
  // synchronously in that one callback is a real main-thread stall — exactly
  // "scrolling turns stiff right where the phones are". Evictions stay
  // synchronous (freeing memory can't wait); restores are queued and drained a
  // few per frame.
  const restoreQueue = []
  let draining = false
  const drain = () => {
    draining = true
    for (let n = 0; n < 4 && restoreQueue.length; n++) restore(restoreQueue.shift())
    if (restoreQueue.length) requestAnimationFrame(drain)
    else draining = false
  }
  const queueRestore = (img) => {
    if (!restoreQueue.includes(img)) restoreQueue.push(img)
    if (!draining) drain()
  }

  // TWO boundaries, not one. The old pass restored and evicted at the same
  // 200% line, which has two problems: an image sitting exactly on the line
  // thrashes (evict, restore, evict) as the page settles, and — the expensive
  // one — a single boundary means the RESIDENT band is as wide as the RESTORE
  // lead needs to be. It does not have to be. Restoring early is cheap;
  // holding a bitmap is not.
  //
  //   RESTORE_MARGIN  how far ahead a bitmap is put back. 75% of 844px is
  //                   ~630px of runway; the queue drains 4 images per frame,
  //                   so even a hard flick has ~10 frames to decode before the
  //                   image could be seen.
  //   EVICT_MARGIN    where the bitmap is dropped. The gap between the two is
  //                   the hysteresis: nothing can evict and restore on the
  //                   same scroll tick.
  //
  // Resident band is viewport + 2 x EVICT: 844 + 2 x 928 = ~2.7k px, down from
  // ~4.2k at the old shared 200%. Measured effect on the peak is in the
  // report; the pop-in cost was measured too (zero blank <img> at the top of
  // the viewport through a full-speed flick).
  const RESTORE_MARGIN = '75% 0px'
  const EVICT_MARGIN = '110% 0px'

  const restoreIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) queueRestore(e.target)
  }, { rootMargin: RESTORE_MARGIN })

  const evictIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) continue
      const i = restoreQueue.indexOf(e.target)
      if (i !== -1) restoreQueue.splice(i, 1)
      evict(e.target)
    }
  }, { rootMargin: EVICT_MARGIN })

  // THE ACTUAL BUDGET.
  //
  // A distance rule alone cannot promise a ceiling, and a ceiling is the only
  // thing the crash cares about. Two viewports of Selected Work is 16 case
  // covers, 3 MacBook frames, 5 iPhone frames and 6 screenshots — all of them
  // correctly sized for the box they are painted in, none of them wasteful,
  // and together still ~80 MB. Sizing every asset down further would only make
  // the page look worse; what is needed is a cap.
  //
  // So: after the distance pass has had its say, if what is left resident is
  // still over budget, keep evicting — furthest from the viewport first —
  // until it is not. Cheap because it only runs when we are over, and it only
  // ever touches images more than a full viewport outside the frame, which is
  // strictly outside RESTORE_MARGIN. That last part is load-bearing: an image
  // evicted while it is still inside the restore band would never get an
  // intersection change to bring it back, and would sit blank until the reader
  // scrolled it away and back.
  //
  // 52 MB against an iOS Safari per-tab ceiling that starts biting somewhere
  // north of ~200 MB for the whole tab: the bitmaps are the largest single
  // line, but the JS heap, the WebGL context, the compositor's own layer
  // backing and the decoded fonts all sit next to them.
  const BUDGET_BYTES = 52 * 1024 * 1024

  let sweepQueued = false
  const sweep = () => {
    sweepQueued = false
    const live = []
    let total = 0
    for (const img of document.images) {
      if (img.dataset.budgetSrc !== undefined) continue
      if (img.naturalWidth <= 2) continue
      const bytes = img.naturalWidth * img.naturalHeight * 4
      // A pinned image still costs its bytes and still has to be paid for out
      // of the budget — it just cannot be the one we evict to get back under.
      total += bytes
      if (!pinned.has(img)) live.push([img, bytes, 0])
    }
    if (total <= BUDGET_BYTES) return

    const vh = window.innerHeight
    for (const e of live) {
      const r = e[0].getBoundingClientRect()
      // gap between the element's box and the viewport box, 0 if they overlap
      e[2] = r.top > vh ? r.top - vh : r.bottom < 0 ? -r.bottom : 0
    }
    live.sort((a, b) => b[2] - a[2])

    for (const [img, bytes, gap] of live) {
      if (total <= BUDGET_BYTES) break
      if (gap <= vh) break // sorted furthest-first, so everything after this is nearer
      evict(img)
      if (img.dataset.budgetSrc !== undefined) total -= bytes
    }
  }
  // Coalesced, and never inside an IntersectionObserver callback: the sweep
  // reads layout for every live image, and doing that synchronously while the
  // observer is still delivering entries is a forced reflow in the middle of a
  // scroll — the same stall the restore queue exists to avoid.
  const scheduleSweep = () => {
    if (sweepQueued) return
    sweepQueued = true
    setTimeout(sweep, 150)
  }

  const seen = new WeakSet()
  const scan = () => {
    for (const img of document.images) {
      if (seen.has(img)) continue
      seen.add(img)
      restoreIO.observe(img)
      evictIO.observe(img)
      // a newly decoded bitmap is the only thing that can put us over
      img.addEventListener('load', scheduleSweep)
    }
  }
  scan()

  window.addEventListener('scroll', scheduleSweep, { passive: true })

  const mo = new MutationObserver(scan)
  mo.observe(document.body, { childList: true, subtree: true })

  return () => {
    mo.disconnect()
    restoreIO.disconnect()
    evictIO.disconnect()
    window.removeEventListener('scroll', scheduleSweep)
    // leave nothing blanked behind us
    for (const img of document.images) {
      img.removeEventListener('load', scheduleSweep)
      restore(img)
    }
  }
}

export function mountViewportBudget() {
  const offAnim = animationBudget()
  const offImg = imageBudget()
  if (import.meta.env.DEV) window.__imageBudget = imageBudget
  return () => { offAnim(); offImg(); delete window.__imageBudget }
}
