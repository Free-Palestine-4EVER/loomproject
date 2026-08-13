// ————————————————————————————————————————————————————————
// imageWarm — "every photo downloaded before the user scrolls."
//
// THE PROBLEM. `loading="lazy"` (see Pic.svelte and the ~40 call sites across
// src/) exists on purpose: it keeps the FIRST screen fast by not letting the
// browser queue 80+ requests behind the LCP image. But the client's actual
// requirement is stronger than "don't block the first screen" — nothing may
// ever pop in while scrolling, which a plain lazy image cannot promise; it
// only starts fetching when the viewport gets near it, and a fast scroll can
// out-run that fetch.
//
// THE FIX is a WARM-UP PASS, not lazy-loading's removal. Once the `load`
// event fires — the critical path is done and the connection is idle — we
// walk the document and force every remaining lazy image to start fetching
// immediately, batched so the connection pool is never flooded and the
// browser's own network priority still finishes the first screen first.
//
// THE TRICK: setting `img.loading = 'eager'` on an image that is ALREADY in
// the parsed DOM triggers its fetch right away in both Blink and WebKit, and
// — this is the part that matters — it resolves through that element's own
// `<picture>`/`srcset`/`sizes`, exactly like a natural lazy-load would. That
// is the only correct way to do this: hand-building a URL and `new
// Image().src = url`-ing it would either guess the wrong responsive
// candidate (see the wall of comments at the top of Pic.svelte on why a
// wrong-size fetch is the single biggest load-time bug this codebase has
// already had once) or fetch a byte-for-byte duplicate of what the browser
// was about to request anyway.
//
// WHY THIS FILE NEVER DELETES `loading="lazy"` FROM MARKUP: doing that would
// put every image on the page into the INITIAL high-priority fetch queue,
// which starves the LCP element on the very screen this whole site is
// measured on. Warming AFTER `load` gets the same end state — everything
// fetched — without that regression.
//
// INTERACTION WITH viewportBudget.js: that file evicts far-off image bitmaps
// on touch devices to stay under an iOS Safari memory ceiling — a *memory*
// budget, unrelated to whether the bytes have been fetched. This file and
// that one do not fight: `img.loading = 'eager'` is itself the "already
// warmed" marker (the selector below only ever matches an image still
// carrying `loading="lazy"`, and switching it to `'eager'` is permanent —
// eviction only ever touches `src`/`srcset`, never `loading`), so a warmed
// image can be evicted and restored by the budget any number of times
// without this file ever trying to warm it again. And because `/img/*` is
// served with `max-age=86400, s-maxage=2592000` (see vercel.json), a restore
// after eviction resolves out of the browser's HTTP cache with no network
// round trip — the warm-up bought that cache entry once, and the budget is
// free to spend it as many times as it wants for free.
// ————————————————————————————————————————————————————————

import { browser } from '$app/environment'

// How many images to push into flight at once. Six to eight was the brief's
// own number — enough that the warm-up finishes in a handful of round trips
// instead of one per image, not so many that it competes with whatever the
// visitor is doing right now (a click, a video starting, a route change).
const BATCH_SIZE = 7

// `true` while a warm pass is in flight. Guards against overlapping runs —
// the initial `load`-triggered pass and a same-tick `afterNavigate` rescan,
// say — so this file only ever has one walk of the document going at once.
let running = false

function saveData() {
  return !!(browser && navigator.connection && navigator.connection.saveData)
}

function idle(cb) {
  // requestIdleCallback yields to anything more urgent (input, layout,
  // paint) before it fires, which is exactly the "connection is idle"
  // condition the brief asks for between batches. Safari has no
  // requestIdleCallback at all, so it falls back to a macrotask — still
  // yields a full turn of the event loop, just without the "only when truly
  // idle" guarantee Blink gets.
  if (typeof requestIdleCallback === 'function') return requestIdleCallback(cb, { timeout: 1200 })
  return setTimeout(cb, 1)
}

// Resolves once an <img> is done — loaded OR failed — so a single 404 can
// never wedge a whole batch waiting on a `load` that will never fire.
function settle(img) {
  if (img.complete) return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => resolve()
    img.addEventListener('load', done, { once: true })
    img.addEventListener('error', done, { once: true })
  })
}

// The `<img>` half. Walks the document IN ORDER (querySelectorAll returns
// document order), so sections nearest the fold warm first — if the reader
// starts scrolling mid-warm, the images they are about to see are already
// ahead in the queue rather than at the back of it.
async function warmImgBatches() {
  // Anything still `loading="lazy"` AND not already loaded (an image whose
  // fetch a real scroll already kicked off before the warm-up got to it —
  // no reason to wait on it again). Snapshotting once per call rather than
  // re-querying inside the loop: a mid-warm layout change (an accordion, a
  // route's own content) should not reshuffle a batch that is already in
  // flight, and the MutationObserver below schedules its own follow-up pass
  // for anything new that shows up.
  const targets = Array.from(document.querySelectorAll('img[loading="lazy"]')).filter(
    (img) => !img.complete || img.naturalWidth === 0
  )

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    // A Save-Data toggle mid-run (or a route change that wants the floor —
    // see rewarm()) aborts the rest of the queue rather than finishing it.
    if (saveData()) return
    const batch = targets.slice(i, i + BATCH_SIZE)
    for (const img of batch) img.loading = 'eager'
    await Promise.all(batch.map(settle))
    // Hand the thread back between batches instead of firing all N/BATCH_SIZE
    // batches back to back — this is the "advancing on requestIdleCallback"
    // the brief asks for, and it is what keeps the connection pool from
    // seeing 40 requests open at the same instant.
    await new Promise((resolve) => idle(resolve))
  }
}

// Pull every non-data `url(...)` out of a CSS `background-image` /
// `background` shorthand value. `getComputedStyle().backgroundImage` always
// comes back as a comma-joined list of already-origin-resolved `url("...")`
// strings (or `image-set(url(...) ..., url(...) ...)` for the two hero
// fallback declarations), so one regex over the computed value covers both
// forms without needing to know which one a given selector used.
const URL_RE = /url\((['"]?)([^'")]+)\1\)/g

// The CSS-background half. There is no element here for `loading='eager'`
// to resolve against — a background-image is not responsive, it is exactly
// one URL — so a plain `new Image().src = url` is the correct primitive
// (the header comment in Pic.svelte's warning about hand-built URLs is
// about *responsive* srcset candidates; a background texture has no
// candidates to pick wrong).
function warmBackgrounds() {
  const urls = new Set()
  // `*` is broad, but this only runs once per warm pass (not per batch) and
  // only after `load` + idle, so the one-time cost of walking the live tree
  // buys correctness a hand-maintained list of selectors could not: any
  // future component that adds a background-image is covered automatically,
  // with no per-component edit and no list to rot (see viewportBudget.js's
  // own LOOP_HOSTS comment for what a hand list does when nobody updates it).
  for (const el of document.querySelectorAll('*')) {
    const bg = getComputedStyle(el).backgroundImage
    if (!bg || bg === 'none') continue
    let m
    while ((m = URL_RE.exec(bg))) {
      const url = m[2]
      if (url && !url.startsWith('data:')) urls.add(url)
    }
  }
  for (const url of urls) {
    const img = new Image()
    img.src = url
  }
}

// The <video poster> half. A poster is a plain image URL on an attribute the
// browser does not treat as lazy at all — but a poster that is only wired up
// by JS after some interaction (a lightbox opening a case-study reel) can
// still be un-warmed at the point this pass runs, so it costs nothing to
// sweep them the same way as the backgrounds.
function warmPosters() {
  for (const video of document.querySelectorAll('video[poster]')) {
    const url = video.poster
    if (url && !url.startsWith('data:')) {
      const img = new Image()
      img.src = url
    }
  }
}

// The one entry point every caller in this file funnels through. Safe to
// call as many times as you like — `running` makes overlapping calls a
// no-op, and warmImgBatches()'s own selector only ever matches images that
// have not been warmed yet, so a repeat call after the first is cheap even
// when it is not skipped outright.
export async function runImageWarm() {
  if (!browser || saveData() || running) return
  running = true
  try {
    await warmImgBatches()
    // Backgrounds and posters are comparatively rare and cheap next to the
    // per-batch <img> walk, so they run once at the end rather than being
    // batched themselves.
    warmBackgrounds()
    warmPosters()
  } finally {
    running = false
  }
}

// Mounted once from +layout.svelte. Waits for `load` (the point the brief
// defines as "the critical path is finished"), then starts the warm pass on
// the next idle slot rather than synchronously in the load handler itself —
// `load` firing does not mean the main thread is free that same tick.
export function mountImageWarm() {
  if (!browser) return () => {}

  let cancelled = false
  let mo

  const kick = () => idle(() => { if (!cancelled) runImageWarm() })

  if (document.readyState === 'complete') {
    kick()
  } else {
    window.addEventListener('load', kick, { once: true })
  }

  // Catches images that exist only because of a LATER interaction — an FAQ
  // accordion opening, the wizard modal mounting its own content, a route's
  // client-side data arriving after first render — none of which fire
  // another `load` event. Cheap to leave running for the life of the page:
  // runImageWarm() is a no-op whenever nothing new is un-warmed, and the
  // observer only re-arms the (idle-scheduled, batched) pass rather than
  // doing any work itself.
  mo = new MutationObserver(() => { if (!cancelled) kick() })
  mo.observe(document.body, { childList: true, subtree: true })

  return () => {
    cancelled = true
    window.removeEventListener('load', kick)
    mo?.disconnect()
  }
}

// Called from +layout.svelte's `afterNavigate` — a client-side route change
// swaps in a whole new document's worth of `loading="lazy"` images (the
// SvelteKit router never triggers a fresh `load` event for that), so the
// warm-up has to be told explicitly to run again. Routed through the same
// idle-scheduled runImageWarm() as the initial pass for the same reason:
// the navigation just finished, the browser is mid-paint of the new route,
// and the warm-up should wait its turn rather than compete with it.
export function rewarmAfterNavigation() {
  if (!browser) return
  idle(() => runImageWarm())
}
