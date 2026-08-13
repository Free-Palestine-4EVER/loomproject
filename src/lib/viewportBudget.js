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
//    …and, since Aug 2026, a second pass that eviction structurally cannot do:
//    DOWNSCALING. Distance-based eviction only helps images that are off
//    screen. It is powerless against a screenful of bitmaps that are all
//    correctly on screen and individually enormous, which is exactly the shape
//    of the crash that was still being reported after the eviction pass
//    shipped. See the DOWNSCALE block below for the measurement.
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
  // MEASURED 10 Aug 2026, playwright fps profile: these two were never hosted
  // at all, so document.getAnimations() still reported them `running` after
  // scrolling to the bottom of the page — full sessions spent, hero and
  // studios both long off-screen.
  '.hero',         // hero-bg-drift + hero-bg-breathe (hero-canvas-bg), the
                    // static-planet float and the mobile-planet float, and
                    // .hero-scrollhint's `drip` — everything alive in the
                    // hero lives under this one section, .hero
  '.studios',       // studios-arc-pulse riding the dashed arc (offset-distance)
].join(', ')

/* ——— the ambient loops that are always on screen ———

   The parking below only ever helps an animation that can go OFF screen. The
   loom background and the film grain never can: they are `position: fixed`
   and they cover the viewport for the whole session, so the IntersectionObserver
   correctly reports them visible forever and correctly never parks them.

   MEASURED 12 Aug 2026 in Chrome 151, 1470x715 viewport at DPR 2 (2940x1430 =
   4.2 MP) over the 29,235px home page: 12.6 fps with those loops running, 60 fps
   with them paused — three A/B pairs back to back, no overlap between the two
   distributions (11.9/12.6/13.2 vs 60/60/60). The same page in Safari holds 60
   either way, and a clean Chromium at DPR 1 holds 60 either way. Brave shows the
   Chrome number, which is the tell: it is Chromium's compositor at 2x, not this
   site's JS. The main thread measures IDLE during the 12 fps state — 4.5ms
   setTimeout latency and zero long tasks — so the cost is entirely raster and
   composite, and nothing in the JS budget below can reach it.

   Everything cheaper was ablated first and rejected on the numbers: the three
   canvases (+6 fps), backdrop-filter (+2), mix-blend-mode (+4), will-change (0),
   and the grain layer removed outright (12.8 -> 14.7). No single loop is the
   offender; it is a cliff, and only pausing the set clears it.

   So: only on Chromium, only at DPR >= 2, set `--ambient-motion: paused`. WebKit
   and Firefox never take this branch and are visually untouched. */
function ambientMotionBudget() {
  const root = document.documentElement
  const apply = () => {
    // `chrome` is present in Chrome, Edge, Brave, Arc and every other Chromium.
    // Feature-detect the engine rather than parse a UA string: Brave in
    // particular reports whatever it likes, and it has the same compositor.
    const isChromium = !!(window.chrome || navigator.userAgentData?.brands?.length)
    const dense = window.devicePixelRatio >= 2
    if (isChromium && dense) root.style.setProperty('--ambient-motion', 'paused')
    else root.style.removeProperty('--ambient-motion')
  }
  apply()
  // Dragging the window to a 1x external display should give the motion back.
  const mq = window.matchMedia('(resolution >= 2dppx)')
  mq.addEventListener?.('change', apply)
  return () => {
    mq.removeEventListener?.('change', apply)
    root.style.removeProperty('--ambient-motion')
  }
}

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
  // teardown has to unpark orphans too, and a WeakMap cannot be iterated
  const observed = new Set()
  const scan = () => {
    const found = document.querySelectorAll(LOOP_HOSTS)
    for (const el of found) {
      if (seen.has(el)) continue
      seen.add(el)
      observed.add(el)
      io.observe(el)
    }
    sweepOrphans()
    return found.length
  }

  /* ——— the self-discovering half ———

     LOOP_HOSTS is a hand-written list and it has now rotted TWICE (see the note
     above it). The DEV warning below catches that, but only for whoever happens
     to be looking at a console — which is why it went unnoticed both times.

     MEASURED 12 Aug 2026, Chrome 151 at DPR 2 on the built home page, after one
     pass to the bottom: `document.getAnimations()` reported 157 running, of
     which the hosted selectors covered a minority. At 2x that is enough to wedge
     Chrome's compositor hard enough that CDP `Runtime.evaluate` times out after
     45 SECONDS — the tab stops answering at all, which is the "damn slow in
     Chrome, blazing in Safari" report this whole pass started from.

     So stop trusting the list to be complete. Ask the document what is actually
     looping and park the ones nothing covers, keyed on the animation's own host
     element. The curated list stays: it parks a whole SUBTREE in one observer
     entry, which is much cheaper than one entry per animation for the big
     clusters (38 x wall-sheen in the marquee, 32 x rc-rise). This only mops up
     what the list misses, so a future rename degrades to "slightly more
     observers" instead of "the budget silently stops working". */
  const sweepOrphans = () => {
    for (const a of document.getAnimations()) {
      if (a.effect?.getTiming?.().iterations !== Infinity) continue
      // Pseudo-element animations report their originating element here, which
      // is exactly the element whose box we want to test for visibility.
      const el = a.effect?.target
      if (!el?.closest || seen.has(el)) continue
      // Already inside a curated host? That observer owns it; leave it alone.
      if (el.closest(LOOP_HOSTS)) continue
      // `position: fixed` ambient layers (the loom background, the grain) are
      // on screen for the whole session by construction. They can never be
      // parked by an observer, and ambientMotionBudget() handles them instead.
      if (getComputedStyle(el).position === 'fixed') continue
      seen.add(el)
      observed.add(el)
      io.observe(el)
    }
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

  /* A loop can also START without any DOM mutation — a Reveal adding a class,
     a `:hover`, an animation with a long `animation-delay` finally firing. The
     MutationObserver never sees those, so the orphan sweep would miss them for
     the rest of the session. Re-sweep as the reader moves, throttled to one
     rAF per scroll burst: the sweep is a single getAnimations() pass and only
     touches loops it has not already claimed. */
  let queued = false
  const onScroll = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; sweepOrphans() })
  }
  window.addEventListener('scroll', onScroll, { passive: true })

  return () => {
    window.removeEventListener('scroll', onScroll)
    mo.disconnect()
    io.disconnect()
    // leave nothing frozen behind us — curated hosts AND swept orphans
    for (const el of observed) unpark(el)
    observed.clear()
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

  // Nothing is safe to blank until the browser is actually DONE with it, and
  // "done" turned out to be three questions, not one. `currentSrc` alone
  // answers none of them: it is set the moment a candidate is CHOSEN, so a
  // request still in flight has one and a request that 404'd has one too.
  //
  // MEASURED BUG, both halves of it, on the industry cards in Solutions.jsx.
  // That card references `/img/niches/<key>.avif` unconditionally and lets
  // onError/onLoad decide, so the seven niches whose desktop render does not
  // exist yet 404, and onError hides the <img>:
  //
  //   - a FAILED image keeps its currentSrc and reports naturalWidth 0. A
  //     display:none img can never intersect, so the evict observer fired on
  //     it immediately, this guard let it through, and `img.src = BLANK`
  //     pointed it at the 1x1 gif. The gif decoded, `load` fired, and the
  //     card put its photo layout back on — `.has-photo` with no photo and,
  //     because that class drops the card's plate, no background either. Copy
  //     on the bare console. Silent, because this whole pass is touch-only:
  //     the same card on a non-touch desktop was perfect.
  //   - an image still IN FLIGHT has a currentSrc as well, and writing `src`
  //     over it ABORTS the pending request — which fires `error`. So eviction
  //     could manufacture that same broken card out of a render that was
  //     merely slow. Reproduced on a cold cache with two niches that DO have
  //     art, which is what makes this the more dangerous half.
  //
  // `complete` covers in flight; `naturalWidth` covers failed (it stays 0
  // where any decoded bitmap is at least 1 — the blank gif included, which is
  // why re-eviction is checked by dataset rather than by size).
  //
  // …and that dataset check is `!== undefined`, matching `oversized` and the
  // sweep: an image with no `src` attribute at all (a pure <picture>/srcset
  // one) parks the empty string, which the old truthiness test read as "not
  // evicted" and would have evicted a second time, over the blank gif.
  const evict = (img) => {
    if (pinned.has(img) || img.dataset.budgetSrc !== undefined) return
    if (!img.currentSrc || !img.complete || img.naturalWidth === 0) return
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

  /* MEASURED BUG, the client's own report: "images load, but when I scroll
     ... all the way down and come back they load again". `restore()` above
     writes the real `src`/`srcset` straight onto the visible element. Even
     when the bytes are sitting in the HTTP cache with zero network time, the
     element still has to go through Blink/WebKit's normal resource pipeline —
     fetch-from-cache, then decode — before it can paint, and THAT step is
     what reads as "loading" a second time: a blank frame (or the previous
     paint) held for however long the decode takes, then the photo pops in.
     A decode from cache is fast, but "fast" is not zero, and a scroller who
     is actively looking at the element sees exactly one dropped frame's
     worth of it — which is the whole bug.

     So the swap has to happen only once the bitmap is ALREADY decoded. A
     detached clone of the element (a `<picture>` clone if it lives in one, so
     `sizes`/media-conditioned `<source>`s resolve to the same candidate the
     real element will pick) is given the pending src/srcset and asked to
     `decode()` — off-screen, at whatever pace the network/decoder actually
     runs at — and only once that promise resolves do we touch the visible
     element at all. At that point the browser already has the fully decoded
     bitmap cached against that exact URL, so the real write below paints in
     the same frame it happens on. */
  const decodeAhead = async (img) => {
    const picture = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement : null
    const host = picture ? picture.cloneNode(true) : img.cloneNode(false)
    const clone = picture ? host.querySelector('img') : host
    if (!clone) return
    clone.removeAttribute('src')
    clone.removeAttribute('srcset')
    if (picture) {
      const realSources = sourcesOf(img)
      const cloneSources = host.querySelectorAll('source')
      realSources.forEach((s, i) => {
        const ss = s.dataset.budgetSrcset
        if (ss != null && cloneSources[i]) cloneSources[i].setAttribute('srcset', ss)
      })
    }
    const srcset = img.dataset.budgetSrcset
    if (srcset) clone.setAttribute('srcset', srcset)
    const src = img.dataset.budgetSrc
    if (src) clone.setAttribute('src', src)
    // Attached (not display:none) so `sizes`/media-conditioned <source>s
    // resolve exactly as the real element's would, but pushed off the
    // rendered page and out of layout/paint — the whole point is that
    // nothing here is ever seen.
    host.style.cssText = 'position:fixed;left:-99999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
    host.setAttribute('aria-hidden', 'true')
    document.body.appendChild(host)
    try { await clone.decode() } catch { /* a decode failure is still "done" — restore() below will surface the real error */ }
    host.remove()
  }

  /* ——————————————————— 2b · DOWNSCALE ———————————————————
     MEASURED BUG, and the one the tab was actually dying of.

     Eviction is a rule about DISTANCE, so the most it can ever promise is
     "nothing far away is resident". It says nothing about what one screenful
     costs, and a screenful is not free. Measured on the built page at 390x844
     with DPR 3, walking every image on the route and recording its natural
     size against the box it is painted in:

       section        imgs   decoded   needed@DPR3
       the-machine      20   111.8 MB      1.6 MB
       work             23    55.3 MB     58.6 MB
       counter          15    20.3 MB     19.6 MB
       whole page       86   213.2 MB

     Everything on the page is sized for its box except one section, where
     twenty full case renders — 1312x1968, 1400x1750, 1680x1260 — are painted
     into 48x48 thumbnails. Each one is 5-10 MB of RAM for 2,304 CSS pixels,
     they are all on screen together, and the eviction pass cannot touch a
     single one of them: `gap` is 0 for every one, and the sweep deliberately
     stops at `gap <= vh` because blanking an image the reader can see is worse
     than the memory. Peak resident bitmaps measured 115 MB in Chromium and
     113 MB in WebKit at that section, on top of ~30 MB of JS heap and ~24 MB
     of layer backing. That is the iOS Safari tab kill.

     So: an image whose decoded bitmap is far larger than the pixels its own
     box can show is redrawn ONCE, at the size it actually needs, and its src
     is swapped for the small result. 1312x1968 -> 144x216 is 10 MB -> 0.12 MB
     for a thumbnail that is pixel-identical at DPR 3. Nothing is hidden,
     nothing pops, and it is a property of the image rather than of where the
     reader is, so it survives any future scroll.

     Rules that keep it safe:
     - Aspect ratio is PRESERVED and the target COVERS the box, so `object-fit:
       cover` crops exactly as it did. Squashing to the box's own ratio would
       silently restyle every cropped thumbnail on the page.
     - Same-origin only (a tainted canvas cannot be read back), and only above
       DOWNSCALE_MIN_BYTES, so the pass never spends a draw on an image that
       was never a problem.
     - The ORIGINAL src/srcset (and every <picture><source>) is kept, and put
       straight back if the box ever grows past what the small copy can serve —
       a rotation, a breakpoint change, an overlay that opens the same <img>
       bigger. That check runs on resize.
     - The before/after box is compared exactly the way `evict` does it: if
       swapping the bitmap moved the layout at all, it is reverted and the
       image is pinned forever after.
     - Encoding is async and rate-limited (see DOWNSCALE_CONCURRENCY). A draw
       plus an encode is real work and a burst of twenty of them inside one
       scroll callback is the same stall the restore queue exists to avoid. */
  const DOWNSCALE_MIN_BYTES = 512 * 1024 // never bother below half a megabyte
  const DOWNSCALE_RATIO = 4              // …or below 4x more pixels than needed
  const origOf = new WeakMap()           // img -> { src, srcset, sizes, sources: [[el, srcset]] }
  const smallOf = new WeakMap()          // img -> { url, w, h } (h/w = px of the SMALL bitmap)
  const madeUrls = new Set()             // every object URL we minted, for teardown
  const dsQueue = []
  let dsDraining = false
  let dsBusy = 0

  const dpr = () => Math.min(window.devicePixelRatio || 1, 3)

  // Pixels this image's own box can actually show, at this device's DPR, with
  // the aspect ratio left alone (so `cover` still crops rather than squashing).
  const targetSize = (img) => {
    const r = img.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return null
    const k = dpr()
    const scale = Math.min(1, Math.max((r.width * k) / img.naturalWidth, (r.height * k) / img.naturalHeight))
    return {
      w: Math.max(1, Math.round(img.naturalWidth * scale)),
      h: Math.max(1, Math.round(img.naturalHeight * scale)),
    }
  }

  const sameOrigin = (url) => {
    try { return new URL(url, location.href).origin === location.origin } catch (e) { return false }
  }

  // Is this element still showing the small copy we made for it?
  //
  // MEASURED BUG, and the reason this exists at all. The swap is invisible to
  // React: it writes `src` from its own vdom, so any later render that touches
  // that prop — a filter changing which case a tile shows, a list reusing a
  // node under the same key — puts a full-size image back on an element the
  // WeakMap still believes is 141 KB. Measured at the month grid: 20 tiles
  // shrunk to 4.0 MB total, then a re-render put every original back and the
  // section sat at 97.0 MB with the pass convinced there was nothing to do.
  // So the bookkeeping is verified against the DOM before it is trusted, and
  // dropped the moment it stops matching — the sweep then judges whatever is
  // on the element now on its own merits, and shrinks that instead.
  const syncSmall = (img) => {
    const small = smallOf.get(img)
    if (!small) return false
    // An EVICTED image is holding the blank gif; the real src is parked in the
    // dataset, and that is what has to match. Otherwise prefer `currentSrc`,
    // which is what the browser ACTUALLY chose — a <picture> whose <source>
    // was rewritten from outside would leave our blob sitting in the `src`
    // attribute while a full-size candidate is what is really decoded.
    // `currentSrc` is empty for the frame or two before the small copy has
    // loaded, so the attribute is the fallback, not the other way round.
    const cur = img.dataset.budgetSrc !== undefined
      ? img.dataset.budgetSrc
      : (img.currentSrc || img.getAttribute('src'))
    if (cur === small.url) return true
    smallOf.delete(img)
    origOf.delete(img)
    delete img.dataset.budgetSmall
    URL.revokeObjectURL(small.url)
    madeUrls.delete(small.url)
    return false
  }

  // …and the other half of that: an element whose src is rewritten from
  // outside on EVERY render would be re-encoded forever. Four swaps is enough
  // for a tile that legitimately changes which case it shows; past that we
  // stop and let the image cost what it costs, which is exactly the behaviour
  // before this pass existed. A bounded amount of memory is worth more than an
  // unbounded amount of CPU on a phone.
  const DOWNSCALE_MAX_TRIES = 4
  const dsTries = new WeakMap()

  const oversized = (img) => {
    if (pinned.has(img) || syncSmall(img) || img.dataset.budgetSrc !== undefined) return false
    if ((dsTries.get(img) || 0) >= DOWNSCALE_MAX_TRIES) return false
    if (!img.complete || img.naturalWidth <= 2) return false
    if (img.naturalWidth * img.naturalHeight * 4 < DOWNSCALE_MIN_BYTES) return false
    if (!sameOrigin(img.currentSrc || img.src)) return false
    const t = targetSize(img)
    if (!t) return false
    return img.naturalWidth * img.naturalHeight > t.w * t.h * DOWNSCALE_RATIO
  }

  // Blob, not a data: URL — base64 is a third bigger again and it is the
  // STRING that would then be retained for the life of the document.
  const encode = (canvas) => new Promise((resolve) => {
    let settled = false
    const done = (b) => { if (!settled) { settled = true; resolve(b) } }
    try {
      canvas.toBlob((b) => {
        // Safari only grew canvas WebP export in 16.4; older ones hand back a
        // PNG (or null) and we take it rather than shipping nothing.
        if (b) return done(b)
        try { canvas.toBlob(done, 'image/png') } catch (e) { done(null) }
      }, 'image/webp', 0.86)
    } catch (e) { done(null) }
  })

  const downscale = async (img) => {
    if (!oversized(img)) return
    const t = targetSize(img)
    if (!t) return
    let blob
    try {
      const canvas = document.createElement('canvas')
      canvas.width = t.w
      canvas.height = t.h
      const cx = canvas.getContext('2d', { alpha: true })
      if (!cx) return
      cx.imageSmoothingQuality = 'high'
      cx.drawImage(img, 0, 0, t.w, t.h)
      blob = await encode(canvas)
      // Drop the 2D context's own backing store immediately rather than
      // waiting for GC — on a phone it is the same order of magnitude as the
      // bitmap we are here to reclaim.
      canvas.width = canvas.height = 1
    } catch (e) { return }
    if (!blob) return
    // The page moved under the encode; re-check rather than trusting the
    // decision we made a few frames ago.
    if (!oversized(img)) return

    const before = img.getBoundingClientRect()
    const sources = []
    for (const s of sourcesOf(img)) {
      const ss = s.getAttribute('srcset')
      if (ss != null) { sources.push([s, ss]); s.removeAttribute('srcset') }
    }
    origOf.set(img, {
      src: img.getAttribute('src'),
      srcset: img.getAttribute('srcset'),
      sizes: img.getAttribute('sizes'),
      sources,
    })
    img.removeAttribute('srcset')
    img.removeAttribute('sizes')
    const url = URL.createObjectURL(blob)
    madeUrls.add(url)
    dsTries.set(img, (dsTries.get(img) || 0) + 1)
    smallOf.set(img, { url, w: t.w, h: t.h })
    // A DOM marker as well as the WeakMap: the swap is invisible to React,
    // which will happily write its own `src` prop back over ours on any later
    // render, and the attribute is how `syncSmall` notices that happened.
    img.dataset.budgetSmall = `${t.w}x${t.h}`
    img.src = url

    const after = img.getBoundingClientRect()
    if (Math.abs(after.width - before.width) > 0.5 || Math.abs(after.height - before.height) > 0.5) {
      pinned.add(img)
      restoreFull(img)
    }
  }

  // Put the original bytes back — either because the small copy is no longer
  // big enough for the box, or because we are tearing down.
  const restoreFull = (img) => {
    const small = smallOf.get(img)
    if (!small) return
    const o = origOf.get(img)
    smallOf.delete(img)
    origOf.delete(img)
    delete img.dataset.budgetSmall
    URL.revokeObjectURL(small.url)
    madeUrls.delete(small.url)
    if (!o) return
    for (const [el, ss] of o.sources) el.setAttribute('srcset', ss)
    if (o.srcset != null) img.setAttribute('srcset', o.srcset)
    if (o.sizes != null) img.setAttribute('sizes', o.sizes)
    // An evicted image is holding the BLANK gif in its src attribute and the
    // real one in dataset.budgetSrc; write there instead, or restore() would
    // put the dead blob URL back on the way in.
    if (img.dataset.budgetSrc !== undefined) img.dataset.budgetSrc = o.src ?? ''
    else if (o.src != null) img.setAttribute('src', o.src)
    // …and if it never had one (a pure srcset/<picture> image), do not leave a
    // revoked blob URL sitting in an attribute we invented.
    else img.removeAttribute('src')
  }

  // Concurrency, not a per-frame count. The expensive half of a downscale is
  // the ENCODE, which the browser runs off the main thread; the main-thread
  // half is one drawImage blit into a ~250px canvas, which is sub-millisecond.
  // Measured end to end on the heavy section (20 images, warm cache, 390x844
  // DPR 3): ~25 ms per image, so draining one at a time took 5 s and left the
  // peak at 89 MB, four at a time took 690 ms, and eight takes ~350 ms — which
  // is short enough that a full-speed flick no longer holds the whole 112 MB
  // at once. Past eight the encodes queue behind each other anyway and only
  // the blits pile up, so this is where it stops.
  const DOWNSCALE_CONCURRENCY = 8
  const dsDrain = () => {
    while (dsBusy < DOWNSCALE_CONCURRENCY && dsQueue.length) {
      // BIGGEST FIRST. The queue arrives in DOM order, which is meaningless
      // here: a 10 MB image and a 0.6 MB image cost the same ~25 ms to
      // replace. Taking the largest one still waiting drops the resident total
      // as fast as it can possibly fall, and the area under that curve is
      // exactly what the tab is killed for.
      let at = 0
      for (let i = 1; i < dsQueue.length; i++) {
        const a = dsQueue[i], b = dsQueue[at]
        if (a.naturalWidth * a.naturalHeight > b.naturalWidth * b.naturalHeight) at = i
      }
      const img = dsQueue.splice(at, 1)[0]
      dsBusy++
      downscale(img).catch(() => {}).then(() => {
        dsBusy--
        requestAnimationFrame(dsDrain)
      })
    }
    if (!dsQueue.length && !dsBusy) dsDraining = false
  }
  const queueDownscale = (img) => {
    if (dsQueue.includes(img)) return
    dsQueue.push(img)
    if (!dsDraining) { dsDraining = true; requestAnimationFrame(dsDrain) }
  }

  // A box that has GROWN — rotation, a breakpoint, an overlay showing the same
  // <img> large — must get its real bytes back, or the reader is looking at a
  // thumbnail blown up. Cheap: only images we actually shrank are checked.
  const recheckSizes = () => {
    for (const img of document.images) {
      if (!syncSmall(img)) continue
      const small = smallOf.get(img)
      const r = img.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      const k = dpr()
      if (r.width * k > small.w + 1 || r.height * k > small.h + 1) restoreFull(img)
    }
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
    const batch = restoreQueue.splice(0, 4)
    // decodeAhead() first, THEN write — see the comment above it. Awaiting
    // the whole batch (rather than decoding one at a time) is what keeps
    // this at "4 images per frame-ish" instead of turning into 4 sequential
    // round trips; the decode promises all run concurrently.
    Promise.all(batch.map((img) => decodeAhead(img))).then(() => {
      for (const img of batch) restore(img)
      if (restoreQueue.length) requestAnimationFrame(drain)
      else draining = false
    })
  }
  const queueRestore = (img) => {
    if (!restoreQueue.includes(img)) restoreQueue.push(img)
    if (!draining) drain()
  }

  // ONE boundary now, not two — and it only ever RESTORES.
  //
  // This used to be a matched evict/restore pair of IntersectionObservers:
  // anything past EVICT_MARGIN (110% of a viewport) lost its src the instant
  // it left that band, on every scroll, at any distance. That is what the
  // client actually reported ("scroll down and back, and they load again"):
  // a normal scroll-to-bottom-and-back re-evicts and re-restores the ENTIRE
  // page roughly every 1-2 viewports, because 110% away is nothing — it is
  // crossed within a second of ordinary scrolling.
  //
  // MEASURED, decoded-bitmap footprint per route (naturalWidth x
  // naturalHeight x 4, summed over every <img>, no eviction applied):
  //
  //   route        390x844    1440x900
  //   /              113 MB     127 MB
  //   /work         11.5 MB    19.5 MB
  //   /machine      11.1 MB    22.6 MB
  //   /solutions     8.1 MB    14.1 MB
  //   /apps          348 MB     354 MB
  //
  // Home is not "a few tens of MB" — distance eviction earns its keep there,
  // and /apps shows a route can be far worse. So eviction stays, but the
  // DISTANCE half of it is now gone entirely: the only thing left that can
  // evict an image is the budget sweep below, which only fires once total
  // resident bitmaps are actually OVER BUDGET, and even then only picks the
  // single furthest image from the viewport, one at a time, and never an
  // image within one full viewport of the reader (`gap <= vh` in the sweep,
  // unchanged). That is already "many viewports away, not one or two" by
  // construction — it does not need its own separate, more aggressive rule
  // sitting in front of it doing the same job worse.
  //
  // RESTORE_MARGIN still exists and is now the ONLY margin: it decides how
  // far ahead of the reader a bitmap the budget sweep evicted gets its lead
  // time to decode back in, via decodeAhead() above. Raised from 75% to
  // 200% of a viewport (from ~630px to ~1.9k px of runway at 932px) because
  // decodeAhead() is now doing real work — an off-DOM clone, a decode()
  // await, THEN the write — and that needs to finish before the image is on
  // screen, not just before it is legible.
  const RESTORE_MARGIN = '200% 0px'

  const restoreIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) queueRestore(e.target)
  }, { rootMargin: RESTORE_MARGIN })

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
  // Raised from 52 MB to 160 MB, 13 Aug 2026, alongside dropping the
  // distance-only evictIO above. MEASURED, raw decoded footprint of the home
  // page at REST — the route this budget spends the most time watching — is
  // 113 MB at 390x844 and 127 MB at 1440x900 (see the table above evictIO's
  // old declaration). That is a snapshot, not the real peak: #apps
  // (AppsShowcase.svelte, "THE STAGE") mounts a brand-new <img> per product
  // as the reader scrolls past its rail — a deliberate scroll-scrubbed
  // design, not a bug — and every product mounted so far stays in the
  // document, so the resident total keeps climbing through that section.
  // MEASURED end to end, a full scroll-to-bottom-and-back with this budget
  // effectively disabled to observe the real number (qa/scroll-reload.mjs):
  // peak resident bitmaps reached 121 MB at 430x932 and 141 MB at 1440x900.
  // 52 MB was nowhere near that; 90 MB and then 140 MB were each tried and
  // still too tight — 140 MB left zero margin against the measured 141 MB
  // peak, and any touch-capable device at that viewport (an iPad in
  // landscape, not just phones — `pointer: coarse` is what gates this whole
  // pass, not screen size) would have started firing the sweep again on
  // perfectly ordinary scrolling, which is exactly the extra eviction that,
  // combined with the old distance rule, produced the client's reload
  // report. 160 MB sits comfortably above the measured 141 MB peak, while
  // staying well under the iOS Safari per-tab ceiling this budget exists for
  // (starts biting somewhere north of ~200 MB for the whole tab: JS heap,
  // the WebGL context, the compositor's own layer backing and the decoded
  // fonts all sit next to the bitmaps, not on top of a separate ceiling).
  // Genuinely heavy routes (measured: /apps at 348-354 MB AT REST, before
  // its own showcase mounts anything extra) still hit this ceiling and still
  // get the furthest-first eviction below — this number is a real cap, not a
  // formality.
  const BUDGET_BYTES = 160 * 1024 * 1024

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
      // Grossly oversized bitmaps are queued for the downscale pass here,
      // whether or not we are currently over budget: the waste is a property
      // of the image, not of where the reader happens to be, and paying for it
      // once is strictly cheaper than measuring it again on every sweep.
      // Guarded by the byte floor first so the rect read only happens for the
      // handful of images that could possibly qualify.
      if (bytes >= DOWNSCALE_MIN_BYTES && !pinned.has(img) && oversized(img)) queueDownscale(img)
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

  // The moment an oversized bitmap exists is the moment to start replacing it,
  // and waiting for the coalesced sweep is 150ms of holding 10 MB for a 48px
  // thumbnail. That matters most in exactly the case that crashes: a hard
  // flick spends well under a second inside the heavy section and every image
  // in it decodes at once, so the queue has to be moving before the sweep
  // would even have run. Measured: peak resident bitmaps through a full-speed
  // flick fell from 79 MB to the number in the report by starting here
  // instead. One getBoundingClientRect per large image, and only for images
  // already past the byte floor, so this is not the sweep in disguise.
  const onImgLoad = (e) => {
    const img = e.currentTarget
    if (img.naturalWidth > 2 && img.naturalWidth * img.naturalHeight * 4 >= DOWNSCALE_MIN_BYTES
        && !pinned.has(img) && oversized(img)) queueDownscale(img)
    scheduleSweep()
  }

  const seen = new WeakSet()
  const scan = () => {
    for (const img of document.images) {
      if (seen.has(img)) continue
      seen.add(img)
      restoreIO.observe(img)
      // a newly decoded bitmap is the only thing that can put us over
      img.addEventListener('load', onImgLoad)
      // …and one that is ALREADY decoded when we get here (the hero, anything
      // above the fold) never fires another load event, so it would otherwise
      // wait for a scroll to be judged.
      if (img.complete) onImgLoad({ currentTarget: img })
    }
  }
  scan()

  window.addEventListener('scroll', scheduleSweep, { passive: true })

  // A rotation or a breakpoint change can make a downscaled bitmap too small
  // for its own box; recheck before the next sweep would notice.
  const onResize = () => { recheckSizes(); scheduleSweep() }
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('orientationchange', onResize, { passive: true })

  const mo = new MutationObserver(scan)
  mo.observe(document.body, { childList: true, subtree: true })

  return () => {
    mo.disconnect()
    restoreIO.disconnect()
    window.removeEventListener('scroll', scheduleSweep)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onResize)
    dsQueue.length = 0
    // leave nothing blanked, nothing shrunk and no object URL behind us
    for (const img of document.images) {
      img.removeEventListener('load', onImgLoad)
      restoreFull(img)
      restore(img)
    }
    for (const url of madeUrls) URL.revokeObjectURL(url)
    madeUrls.clear()
  }
}

export function mountViewportBudget() {
  const offAmbient = ambientMotionBudget()
  const offAnim = animationBudget()
  const offImg = imageBudget()
  if (import.meta.env.DEV) window.__imageBudget = imageBudget
  return () => { offAmbient(); offAnim(); offImg(); delete window.__imageBudget }
}
