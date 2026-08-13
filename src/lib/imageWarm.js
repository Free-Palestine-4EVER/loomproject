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

// Measured against production (see the incident this constant fixes):
// `requestIdleCallback(cb, { timeout: 1200 })` DOES always fire — browsers
// guarantee that — so the original bug was never a true infinite hang. It was
// a crawl disguised as one. This site runs a permanent CSS backdrop
// (loom-bg.css) plus a butterfly riding the whole page (Flyer.svelte), and
// under that sustained compositor/main-thread work a real idle period almost
// never arrives before the timeout does — so nearly every batch pays the
// full 1200ms gap rather than the 0-50ms a quiet page would see. Instrumented
// on https://www.loomstudio-jo.com/ with a wrapped requestIdleCallback: 26 of
// 30 call→fire gaps landed at 1200-1600ms, back to back. At BATCH_SIZE 7 for
// ~130 images that is ~19 batches * up to ~1.5s = 25-45s to fully drain —
// long after a real visitor has already scrolled, which is exactly the
// "stalls partway, a jump-scroll pulls fresh requests" symptom that was
// measured. Cutting the ceiling here is what actually fixes the wall-clock
// drain time; nothing about correctness depended on 1200ms specifically.
const IDLE_TIMEOUT = 220

// Hard ceiling on how long this file will ever wait on a single <img>'s
// `load`/`error`. Nothing observed this deadlocking on the running site (zero
// `loading="eager"` images were ever caught incomplete across two
// instrumented runs), but the brief is explicit that no single image may be
// allowed to wedge the whole queue — a cached-but-not-decoding image, an
// AVIF that errors silently without firing `error`, anything — so it is
// bounded unconditionally rather than trusted to always fire.
const SETTLE_TIMEOUT = 4000

// How often the self-heal sweep below re-checks the document for anything
// left behind. This is the backstop for every other pathway in this file
// failing at once (a missed MutationObserver mutation, a batch that threw,
// a tab that was backgrounded through the whole first pass) — cheap because
// the selector only ever matches un-warmed images, so it is a no-op read on
// every tick once the page is fully warm.
const SELF_HEAL_INTERVAL = 2500

// `true` while a warm pass is in flight. Guards against overlapping runs —
// the initial `load`-triggered pass and a same-tick `afterNavigate` rescan,
// say — so this file only ever has one walk of the document going at once.
let running = false

function saveData() {
  return !!(browser && navigator.connection && navigator.connection.saveData)
}

// Advances the batch queue. Always resolves within `IDLE_TIMEOUT` — via a
// genuine idle period if one shows up sooner, via requestIdleCallback's own
// timeout if not, or via the setTimeout fallback on engines (WebKit) that
// have no requestIdleCallback at all. No engine can make this pend forever:
// that guarantee is what turns "stalls" back into "takes a bit longer."
function idle(cb) {
  if (typeof requestIdleCallback === 'function') return requestIdleCallback(cb, { timeout: IDLE_TIMEOUT })
  return setTimeout(cb, IDLE_TIMEOUT)
}

// Resolves once an <img> is done — loaded OR failed OR timed out OR removed
// from the document — so nothing can wedge a batch waiting on an event that
// will never fire. Checking `isConnected` up front (and never attaching
// listeners to a detached element) covers the "element removed from the DOM
// mid-flight" case the brief calls out by name: an unmounted route, an
// accordion that closed, anything — that image is no longer this pass's
// problem, so it resolves immediately instead of being awaited.
function settle(img) {
  if (!img.isConnected || img.complete) return Promise.resolve()
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve()
    }
    img.addEventListener('load', finish, { once: true })
    img.addEventListener('error', finish, { once: true })
    const timer = setTimeout(finish, SETTLE_TIMEOUT)
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
    (img) => img.isConnected && (!img.complete || img.naturalWidth === 0)
  )

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    // A Save-Data toggle mid-run (or a route change that wants the floor —
    // see rewarm()) aborts the rest of the queue rather than finishing it.
    if (saveData()) return
    // Re-check connectedness right before promoting: a batch can sit queued
    // across an `idle()` yield long enough for an earlier route change to
    // have already torn its elements out from under it.
    const batch = targets.slice(i, i + BATCH_SIZE).filter((img) => img.isConnected)
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

// ————— REACTIVE URLS — the third source, alongside <img> and CSS backgrounds —
//
// AppsShowcase's stage and Solutions' niches gallery both assign image URLs
// from JS as the visitor scrolls, and neither one exists as a DOM node (or a
// computed style) until the scroll event that reveals it fires:
//
//   - AppsShowcase keys its whole imagery column on the SELECTED product
//     (`{#key item.key}`) — only the current product's <img>s are ever
//     mounted, so scrolling to a product that has never been the selection
//     before mounts brand-new <img loading="lazy"> nodes at that exact
//     moment. The DOM/MutationObserver passes above are watching for that,
//     but "watching for it" is still a fetch that starts AT scroll time —
//     too late for the brief ("nothing may arrive while scrolling").
//   - Solutions' niches stage already runs its own short lookahead (3-6
//     industries ahead of the current one, gated on proximity to the
//     section) for exactly this reason, but a jump-scroll can land past that
//     window in one frame, same problem.
//
// Neither is fixable by scanning the rendered document — the URL is not
// there yet — so each component instead REGISTERS a zero-arg function that
// returns its full candidate URL list, evaluated lazily at warm time (not at
// registration time) so it can read the live viewport/format decision the
// component would actually make. This file only collects and fetches; it
// never hardcodes a path, so a ninth SUITE product or a 31st niche is warmed
// automatically the day it's added to that component's own data.
const reactiveSources = new Set()

// Called from a component's `onMount` (with the returned function stored and
// invoked on unmount) — never at module scope, so a component that mounts on
// one route and not another cannot leak a stale entry into a page it never
// appears on.
//
// `fn` may be sync (return the array directly) or async (return a Promise
// that resolves to it) — `collectReactiveUrls` awaits either shape. This
// matters whenever the URL list depends on something that resolves later
// than the component's own render, e.g. Solutions.svelte's AVIF probe: the
// registered function used to read that probe's result synchronously, which
// raced this file's own call-time against the probe's resolve-time and, on
// WebKit, always lost — see the comment above `probeAvif()` in
// Solutions.svelte for the full incident. A producer that can `await` its
// own async decisions before answering removes that race entirely instead
// of this file having to guess when "later" is.
export function registerReactiveUrls(fn) {
  reactiveSources.add(fn)
  return () => reactiveSources.delete(fn)
}

async function collectReactiveUrls() {
  const urls = new Set()
  for (const fn of reactiveSources) {
    let list
    try {
      list = await fn()
    } catch {
      // A registered producer throwing (component torn down mid-call, a
      // ref not yet set) costs that one component's URLs this pass, never
      // the whole warm-up — the self-heal interval and the next navigation
      // both give it another chance.
      list = null
    }
    if (!list) continue
    for (const url of list) {
      if (url && !url.startsWith('data:')) urls.add(url)
    }
  }
  return urls
}

// Same batching contract as warmImgBatches — BATCH_SIZE at a time, yielding
// to idle() between batches — so a component with dozens of reactive URLs
// (the 30-industry niches gallery) cannot flood the connection pool any more
// than the DOM pass can. Runs LAST, after the <img>/background/poster passes
// have fully drained, so it never competes with anything actually on screen
// for bandwidth — these are all, by definition, off-screen right now.
async function warmReactiveUrls() {
  const urls = Array.from(await collectReactiveUrls())
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    if (saveData()) return
    const batch = urls.slice(i, i + BATCH_SIZE)
    for (const url of batch) {
      const img = new Image()
      img.src = url
    }
    // No `settle()` wait here on purpose: these images have no DOM element
    // to hold a batch open, and a warmed-but-still-decoding image costs
    // nothing to hand the thread back on — the HTTP cache entry lands
    // whenever it lands, and that is all this pass promises.
    await new Promise((resolve) => idle(resolve))
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
    // Reactive URLs run LAST and awaited (unlike backgrounds/posters): there
    // can be dozens of these (every SUITE product's bg+3 shots, all 30
    // niches), so they get the same batched/idle treatment as the <img>
    // pass rather than firing all at once the way the rare background case
    // does.
    await warmReactiveUrls()
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
  let healTimer

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

  // SELF-HEAL. Everything above is best-effort by design — `load` fires
  // once, the MutationObserver only reacts to nodes being added/removed (not
  // to a `loading` attribute reverting), and a batch can be starved for a
  // while by the page's own animation load (see IDLE_TIMEOUT above). None of
  // those paths can leave a permanent hole any more on their own, but this
  // is the independent backstop that makes that a guarantee rather than a
  // hope: every SELF_HEAL_INTERVAL, check the document for anything still
  // `loading="lazy"` and, if the normal pass is not already running, kick it.
  // A stall becomes a delay, never a dead end — exactly the brief's bar.
  healTimer = setInterval(() => {
    if (cancelled || running || saveData()) return
    if (document.querySelector('img[loading="lazy"]')) runImageWarm()
  }, SELF_HEAL_INTERVAL)

  return () => {
    cancelled = true
    window.removeEventListener('load', kick)
    mo?.disconnect()
    clearInterval(healTimer)
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
