// ————————————————————————————————————————————————————————
// viewportBudget — what the page is allowed to spend while it is not on screen.
//
// Two separate budgets, both measured, not guessed:
//
// 1. ANIMATION. The apps showcase and the 3D Lab carry 23 `infinite` CSS
//    animations between them (appscreens.css 9, labpreviews.css 14) — six
//    phone UIs and six tool previews, all looping forever whether or not the
//    reader is anywhere near them. Every one of those keeps its element on the
//    compositor for the whole session. That is where the page starts to drag,
//    on desktop as well as phones. Cards outside the viewport get `is-live`
//    removed and products-showcase.css parks their animations.
//
// 2. IMAGE MEMORY. A full pass down the page decodes ~200 MB of bitmaps across
//    ~100 images. Scrolled slowly, WebKit has time to evict behind you and
//    nothing goes wrong. Flicked fast, every lazy image below decodes at once,
//    the tab crosses iOS Safari's memory ceiling and is killed with no error —
//    the exact symptom reported on an iPhone 17 Pro Max. So on touch devices we
//    evict deliberately: an image more than ~2 viewports away drops its src and
//    gets it back before it can be seen again.
//
// Both are idempotent and fully torn down by the returned cleanup.
// ————————————————————————————————————————————————————————

const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/** Cards whose decorative loops are only worth running while they are read. */
const LIVE_SELECTOR = '.app-card, .lab-card'

function animationBudget() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.target.classList.toggle('is-live', e.isIntersecting)
    },
    // a quarter-viewport of lead-in: the loops are mid-cycle by the time the
    // card is actually legible, so nothing ever reads as "starting on arrival"
    { rootMargin: '25% 0px' }
  )

  const seen = new WeakSet()
  const scan = () => {
    for (const el of document.querySelectorAll(LIVE_SELECTOR)) {
      if (seen.has(el)) continue
      seen.add(el)
      io.observe(el)
    }
  }
  scan()

  // the grids mount with the page, but the case overlay and the lab can add
  // cards later — watch rather than assume
  const mo = new MutationObserver(scan)
  mo.observe(document.body, { childList: true, subtree: true })

  return () => { mo.disconnect(); io.disconnect() }
}

export function imageBudget({ force = false } = {}) {
  // Desktop has no such ceiling and eviction there would only cost re-decodes.
  // `force` exists so the pass can be exercised from a desktop browser, where
  // no amount of viewport emulation makes `pointer: coarse` true.
  if (!force && !window.matchMedia('(pointer: coarse)').matches) return () => {}

  // An image is only safe to blank if its box does not depend on the bitmap.
  // Rather than reason about each one, evict, measure, and put it straight back
  // if the layout so much as twitched — then never touch that image again.
  const pinned = new WeakSet()

  const evict = (img) => {
    if (pinned.has(img) || img.dataset.budgetSrc || !img.currentSrc) return
    const before = img.getBoundingClientRect()
    const src = img.getAttribute('src')
    const srcset = img.getAttribute('srcset')
    img.dataset.budgetSrc = src ?? ''
    if (srcset) img.dataset.budgetSrcset = srcset
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
    const srcset = img.dataset.budgetSrcset
    if (srcset) { img.setAttribute('srcset', srcset); delete img.dataset.budgetSrcset }
    if (src) img.setAttribute('src', src)
  }

  // A fast scroll through an image-dense section (the apps/lab showcase is
  // the worst of them: 11 device frames + 11 unique stills in one screenful)
  // can cross the eviction boundary for dozens of images between two
  // IntersectionObserver callbacks. Restoring all of them synchronously in
  // that one callback is a real main-thread stall — exactly "scrolling turns
  // stiff right where the phones are". Evictions stay synchronous (freeing
  // memory can't wait); restores are queued and drained a few per frame.
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

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) queueRestore(e.target)
        else { const i = restoreQueue.indexOf(e.target); if (i !== -1) restoreQueue.splice(i, 1); evict(e.target) }
      }
    },
    // Two viewports of headroom in both directions. Wide enough that a restore
    // has decoded long before the image could be seen, tight enough that a fast
    // flick never holds more than a handful of bitmaps at once.
    { rootMargin: '200% 0px' }
  )

  const seen = new WeakSet()
  const scan = () => {
    for (const img of document.images) {
      if (seen.has(img)) continue
      seen.add(img)
      io.observe(img)
    }
  }
  scan()

  const mo = new MutationObserver(scan)
  mo.observe(document.body, { childList: true, subtree: true })

  return () => {
    mo.disconnect()
    io.disconnect()
    // leave nothing blanked behind us
    for (const img of document.images) restore(img)
  }
}

export function mountViewportBudget() {
  const offAnim = animationBudget()
  const offImg = imageBudget()
  if (import.meta.env.DEV) window.__imageBudget = imageBudget
  return () => { offAnim(); offImg(); delete window.__imageBudget }
}
