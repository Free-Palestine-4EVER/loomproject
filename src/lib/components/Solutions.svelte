<!--
  Solutions — a one-line search that resolves straight to the answer, plus a
  compact typographic index carrying all 30 industries as plain text.

  This replaced the "rack" build: a two-pane master/detail with a 30-row
  scrolling list on the left, every row wearing the exact same yellow yarn
  pill as its "icon" (an icon that told you nothing, 30 times over). The
  user's verdict was blunt — too long, too much, too retarded — and it was
  right: the section was more machinery than the point it exists to make.

  The point is one sentence: whatever industry you're in, the loom already
  knows it. So the section now IS that sentence, demonstrated in place — type
  your trade (or tap it in the index below) and one tailored answer resolves
  right under the search field, no list to scroll to get there. The index
  stays because the breadth is the claim, but it's set as plain grouped type
  in newspaper-index columns — honest, dense, and a fraction of the height a
  row-per-industry list demanded. No per-ROW image: the mark that killed the
  old rack build was one identical icon on all 30 rows, so nothing here
  repeats per-niche. What every group DOES get is one honest, group-truthful
  icon (below) — seven, not thirty, and every one of them actually draws its
  own trade.

  Second pass (client brief: real search behaviour, a pink stage, icons, more
  design): the console — search field plus the one resolved answer — sits on
  its own pink ground, built off the same grammar the footer's bloom-sky
  uses. The search field carries an actual glass icon and a cycling,
  typewriter placeholder that stops the instant a visitor focuses or types.
  The answer card carries a group-icon badge next to its name, and the index
  below carries the same seven icons ahead of their group labels.
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { NICHES, NICHE_GROUPS, CORE_SERVICES, ENTRY_OFFER } from '$data/site.js'
  import { reducedMotion, reveal } from '$lib/motion.svelte.js'
  import { registerReactiveUrls } from '$lib/imageWarm.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from './SplitWords.svelte'
  /* The wool spool was the CTA here until 13 Aug 2026. It is a photograph
     with the label burned into it, which is right for a poster and wrong
     inside a dense card — see GradientButton.svelte's header. The knitted
     buttons are untouched everywhere else on the site. */
  import GradientButton from './GradientButton.svelte'
  import Pic from './Pic.svelte'
  import './solutions.css'

  /** `merged` = this is act two of the Counter section, not a section of its
   *  own (the long page mounts it as <Solutions merged />). Two full section
   *  heads back to back — "pick what you need", then "pick your industry" —
   *  read as two separate asks when they are one qualifier, and the second
   *  big headline made the first one feel answered and closed. Merged, the
   *  tag renders as a DIV and the head drops to a rule-and-sub-head: same
   *  words, one beat. Standalone still works and is what /studio previews. */
  let { merged = false } = $props()
  const Tag = $derived(merged ? 'div' : 'section')

  // WoolIcon's 20 names (arrow-right, plus, list, user, trash, settings,
  // home, lock, unlock, eye, search, heart, cart, tag, phone, pin, calendar,
  // upload, share-nodes, copy) are generic UI glyphs, not trade marks:
  // nothing in that set reads as "restaurant" or "dental clinic" or
  // "barbershop", so borrowing one per group would either lie (a lock icon
  // on Property) or repeat (home on both Property AND every group that isn't
  // food/health/beauty). They're also photographed medallions shot for a
  // dark stage — cream felt on a lavender rope reads fine on white, but at
  // 300+ repaints (30 index rows) that's 30 network requests for icons that
  // don't even name the right trade. Seven small inline SVGs, one per
  // NICHE_GROUPS id, colour themselves from the same --panel-yarn/--grp-yarn
  // custom properties the section already threads through everything else,
  // cost nothing to repeat, and actually draw the group they stand for.
  const GROUP_ICON_PATHS = {
    food: 'M6 2.5v6a2 2 0 0 0 4 0v-6|M8 8.5V21|M15.4 2.5c-1.5 1-2.3 2.7-2.3 4.5 0 1.9 1 3.4 2.3 4.2V21',
    health: 'M12 8.2v7.6M8.2 12h7.6',
    beauty: 'M8.3 7.7L19.5 18M8.3 16.3L19.5 6',
    retail: 'M6.3 8h11.4l-1 12h-9.4l-1-12z|M9 8V6.6a3 3 0 0 1 6 0V8',
    property: 'M4 11.3L12 4.5l8 6.8|M6.5 10.3V19.5h11V10.3',
    services: 'M15.3 5a4 4 0 0 0-5.5 5.3L4 16l3 3 5.7-5.7A4 4 0 0 0 18 8.5l-2.6 2.6-2-2 2.6-2.6z',
    creative: 'M12 3.3l1.8 5.2 5.2 1.8-5.2 1.8L12 17.3l-1.8-5.2-5.2-1.8 5.2-1.8L12 3.3z',
  }
  const GROUP_CIRCLE = { health: { cx: 12, cy: 12, r: 8.3 } } // health's glyph is a ring + cross, not pure paths

  // A short list of real niche names, worded the way someone actually types
  // them into a search box (lowercase, sometimes shortened) — the same
  // trades NICHES already lists, not invented ones. "car rental" and "dental
  // clinics" lead the list because they're the client's own two examples for
  // this exact feature.
  const SEARCH_EXAMPLES = [
    'car rental', 'dental clinics', 'restaurants', 'real estate',
    'barbershops', 'law firms', 'cafés', 'wedding venues',
  ]

  // Same seven-groups-seven-yarns map the old build used — kept, because the
  // colour coding is the one piece of the previous design that was actually
  // doing real work.
  const GROUP_YARN = {
    food: 'gold', health: 'blue', beauty: 'magenta', retail: 'violet',
    property: 'crimson', services: 'grey', creative: 'cream',
  }
  const YARN_HEX = {
    gold: 'var(--yarn-gold)', blue: 'var(--yarn-blue)', magenta: 'var(--yarn-pink)',
    violet: 'var(--yarn-violet)', crimson: '#e0244a', grey: '#a9a8b6', cream: 'var(--yarn-cream)',
  }

  /* One yarn per core deliverable, in the order the four warp threads are
     already drawn everywhere else on this section (gold → pink → violet →
     blue). Existing tokens only — nothing new is being invented here, the
     four cards are just picking up the same rope the index and the ledger
     rule already ran on. */
  const CORE_YARNS = [
    'var(--yarn-gold)', 'var(--yarn-pink)', 'var(--yarn-violet)', 'var(--yarn-blue)',
  ]

  const GROUPS = NICHE_GROUPS.filter((g) => g.id !== 'all')
  const GROUP_LABEL = Object.fromEntries(GROUPS.map((g) => [g.id, g.label]))
  const yarnOf = (n) => GROUP_YARN[n.group] ?? 'magenta'

  // Strip accents so "cafe" reaches "Cafés & Coffee" — nobody visiting types
  // the é, and a false "not on the list" on the site's own example query
  // would undercut the entire pitch of this section on the very first thing
  // a visitor tries.
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

  // Cheapest possible "does the loom know this trade" resolver: exact name,
  // then starts-with, then a loose includes — in that priority order so
  // typing "cafe" resolves to Cafés & Coffee before it ever risks matching
  // something that merely contains those letters deeper in another name.
  function resolveNiche(raw) {
    const q = fold(raw.trim().toLowerCase())
    if (!q) return null
    return (
      NICHES.find((n) => fold(n.name.toLowerCase()) === q) ||
      NICHES.find((n) => fold(n.name.toLowerCase()).startsWith(q)) ||
      NICHES.find((n) => fold(n.name.toLowerCase()).includes(q)) ||
      null
    )
  }

  // ——— MOBILE CTA LABEL — the phone card's own "same length for all
  // thirty" rule ———
  // Every other row on the phone's stripped-down card is fixed length by
  // construction (see solutions.css's mobile block: a two-line-clamped
  // name, a one-line-clamped hook). The CTA was the one row that was NOT
  // fixed length — its label carries the industry's own name ("Build my
  // Med Spas & Aesthetics system" vs "Build my Law Firms system"), which
  // is exactly the per-industry variance that already reopened this same
  // tour's jiggle bug once (see the desktop CTA `min-height` reservations
  // elsewhere in solutions.css, and `--sol-card-h` above). At the
  // ~15%-of-stage budget the client set for the phone card there is no
  // room left to reserve two lines for the longest label across thirty
  // industries, so the label itself goes constant instead: "Get started"
  // opens the exact same wizard, pre-filled with the exact same industry
  // (`wizard.open({ niche: shown.name })` at the CTA call below is
  // unchanged) — only the button's own caption stops carrying the name.
  // A `matchMedia` flag, not CSS-only truncation: an ellipsis-clipped
  // "Build my Med Spas & Aesthetics s…" is still the WIDEST possible label
  // fighting for the smallest possible pill, and on a narrow enough phone
  // it can wrap before it ever gets far enough to clip. A fixed string
  // never can, and it costs nothing on desktop, which never reads this flag.
  let mobileCta = $state(false)
  $effect(() => {
    if (!browser) return
    const mq = window.matchMedia('(max-width: 939px)')
    mobileCta = mq.matches
    const onChange = (e) => { mobileCta = e.matches }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  })

  let query = $state('')
  let pinnedKey = $state(NICHES[0].key)
  let focused = $state(false)

  const typedMatch = $derived(resolveNiche(query))
  const noMatch = $derived(query.trim().length > 1 && !typedMatch)
  const shown = $derived(typedMatch ?? NICHES.find((n) => n.key === pinnedKey) ?? NICHES[0])

  function pick(n) {
    pinnedKey = n.key
    query = n.name
  }

  // Bridge for the nav's industries dropdown (Nav.svelte) and its
  // mobile-menu twin — both live outside this section and the long page may
  // not even be mounted when one is clicked (a sub-page route), so a
  // CustomEvent is the only channel that reaches this component either way.
  // navigate() already gets the visitor back to '/' and to '#solutions'
  // before this fires; this just resolves which industry to land on once it
  // does. `$effect` (not a plain top-level `window.addEventListener`) so it
  // is torn down on unmount — this is a top-level effect, not one nested
  // inside onMount, per the porting rule that only top-level `$effect` runs.
  $effect(() => {
    if (!browser) return
    const onSelect = (e) => {
      const key = e?.detail?.key
      const n = NICHES.find((x) => x.key === key)
      if (n) pick(n)
    }
    window.addEventListener('loom:select-niche', onSelect)
    return () => window.removeEventListener('loom:select-niche', onSelect)
  })

  // Cycling only when there's nothing real to fight: idle, empty, unfocused,
  // motion allowed. The instant any of those flips — a tap into the field, a
  // keystroke — this goes false and the typewriter freezes on its current
  // word instead of finishing its animation underneath the cursor.
  const cycling = $derived(!reducedMotion.current && !focused && query.length === 0)

  // Type-on, hold, delete, next — a plain setTimeout chain, not an interval,
  // because the four phases (type/hold/delete/gap) each need their own delay
  // and a single tick rate can't express that.
  let example = $state(SEARCH_EXAMPLES[0])
  $effect(() => {
    if (!browser || !cycling) { example = SEARCH_EXAMPLES[0]; return }
    let timer
    const s = { i: 0, char: 0, deleting: false }
    const TYPE_MS = 62, HOLD_MS = 1500, DELETE_MS = 34, GAP_MS = 420
    const tick = () => {
      const word = SEARCH_EXAMPLES[s.i]
      if (!s.deleting) {
        s.char += 1
        example = word.slice(0, s.char)
        if (s.char >= word.length) { s.deleting = true; timer = setTimeout(tick, HOLD_MS) }
        else timer = setTimeout(tick, TYPE_MS)
      } else {
        s.char -= 1
        example = word.slice(0, s.char)
        if (s.char <= 0) { s.deleting = false; s.i = (s.i + 1) % SEARCH_EXAMPLES.length; timer = setTimeout(tick, GAP_MS) }
        else timer = setTimeout(tick, DELETE_MS)
      }
    }
    timer = setTimeout(tick, GAP_MS)
    return () => clearTimeout(timer)
  })

  const placeholder = $derived(
    reducedMotion.current
      ? 'Try "cafés", "dental", "real estate"…'
      : cycling ? `Try "${example}"…` : 'Type an industry…'
  )

  /* ——— THE PINNED TOUR ———
     The section pins to the viewport and the scroll walks the visitor
     through every one of the thirty industries — the client's ask was that
     nobody gets to skip past this with one flick. The search field still
     wins: the moment anything is typed, `query` is non-empty and the scroll
     stops writing, so a visitor who knows their trade is never fighting the
     page for control of it.

     Reduced motion opts OUT of the pin entirely (see `pinned`): hijacking
     the scroll is precisely the thing that setting asks us not to do, and
     the section still works as an ordinary block with a search field. */
  let pinEl = $state(null)
  const pinned = $derived(!reducedMotion.current)
  let tourIndex = $state(0)

  /* ——— THE PIN MECHANISM STAYS NATIVE `position: sticky` (13 Aug 2026) ———
     A same-session pass briefly replaced this with a JS-driven `position:
     absolute` + `transform: translateY()`, written from a scroll handler, on
     the theory that `position: sticky` recomputing its own offset against the
     scroller every frame was the actual source of the client's Safari
     "shake" (the two backdrop-filter-layer-promotion attempts before it had
     already shipped and both failed — see the removed-blur comments on
     `.sol-bar` and `.sol-panelcard` in solutions.css, which stay removed).
     That replacement is REVERTED. The reason is iOS Safari specifically:
     WebKit throttles `scroll` event dispatch during momentum scrolling, so a
     pin whose position is written from a scroll handler cannot keep up with
     a flick on the exact platform the client is complaining about — this
     component's own instrumentation caught a 15-36px lag from adding a
     single `requestAnimationFrame` hop between the scroll event and the
     write, even writing synchronously in the handler; real iOS momentum
     throttling is worse than that and is not something this environment can
     measure. `position: sticky` is positioned by the compositor directly on
     iOS, with no JS round trip at all, which is precisely why it is the
     right primitive here — trading its subtle paint artifact for a gross,
     visible positional lag is a worse bug, not a fix. So: native sticky,
     for every visitor, unconditionally — see `.sol-pin.is-pinned
     .sol-pin-inner` in solutions.css. */

  // Same rAF-throttled, passive-listener contract as Products.svelte's
  // stage — a scroll-linked progress read, not a spring simulation on the
  // main thread (see PORTING.md rule 2).
  /* NOT ONE LAYOUT READ PER SCROLL FRAME. The loop below used to open with
     `pinEl.getBoundingClientRect().top` and `pinEl.offsetHeight` — two
     properties the browser cannot answer without flushing pending layout
     first. Doing that inside a scroll-driven rAF is textbook layout
     thrashing, and here it landed on the worst possible frame: the same tick
     the compositor is resolving this element's `position: sticky` offset and
     Svelte may be swapping the card's text. A forced synchronous layout there
     is a very plausible source of the sub-pixel judder the client keeps
     reporting and that no position probe can see, because nothing MOVES —
     the frame just misses its deadline and the sticky box lands late.
     So the geometry is cached: the track's document offset and its height are
     read ONCE on mount and re-read only on resize (and after fonts land,
     which is the other thing that can change the track's top). Inside the
     rAF only `window.scrollY` is touched, which is a stored scalar on the
     window and costs nothing. */
  let pinTop = 0
  let pinHeight = 0
  /* Component-scope, not local to onMount, because `measureCardHeight()` below
     writes `--sol-card-h` on this same element — a layout change to the track
     — and the cached numbers have to be refreshed when it does. */
  const measurePin = () => {
    if (!pinEl || !browser) return
    const r = pinEl.getBoundingClientRect()
    pinTop = r.top + window.scrollY
    pinHeight = pinEl.offsetHeight
  }

  onMount(() => {
    let raf = 0
    const measure = measurePin

    const paint = () => {
      raf = 0
      if (!pinEl || !pinned) return
      const total = pinHeight - window.innerHeight
      if (total <= 0) return
      if (query.length > 0) return
      const y = Math.min(Math.max(window.scrollY - pinTop, 0), total)
      const p = y / total
      // clamp on both ends: at p===1 the raw index is NICHES.length, which
      // is past the end of the array and would blank the card on the last
      // frame.
      const idx = Math.min(NICHES.length - 1, Math.max(0, Math.floor(p * NICHES.length)))
      const key = NICHES[idx].key
      if (pinnedKey !== key) pinnedKey = key
    }

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint) }
    // resize is the only thing allowed to re-measure, and it re-measures
    // BEFORE painting so the cached numbers are never a frame stale.
    const onResize = () => { measure(); onScroll() }

    measure()
    paint()
    // web fonts reflow the copy above the track, which moves `pinTop`. One
    // re-measure when they land, not a read every frame forever.
    document.fonts?.ready?.then(measure).catch(() => {})
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  })

  $effect(() => {
    tourIndex = NICHES.findIndex((n) => n.key === shown.key)
  })

  /* ——— PRELOAD THE NEXT FEW INDUSTRIES ———
     Eager loading fixes the current photograph; it does not fix the NEXT
     one, which is what the reader is about to scroll into. So as the tour
     advances, quietly fetch the renders a few industries ahead. `new
     Image()` warms the HTTP cache and nothing else.

     SIX ahead while the tour is actually pinned (was three, always): a
     trackpad flick can cross more than three industries between two
     animation frames, which outran the old lookahead and made
     `.sol-stage-bg`'s `src` land on an image that was not decoded yet — a
     real decode stall on the one frame the sticky box is also being
     recalculated, which is what reads as "the section jiggles" even though
     nothing actually moved (see the note on `stageFallback` above: the
     <picture> is a single stable node now, not a remount, so this is the
     other half of the same fix). Six, not thirty: preloading the whole set
     would pull ~30 renders the moment anyone reaches this section, which is
     worse than the problem. Three ahead everywhere else — the pin is the
     only place the tour can be scrolled PAST this fast. */
  /* ——— THE LOOKAHEAD IS GATED ON PROXIMITY, AND IT HAS TO BE ———
     MEASURED (13 Aug 2026, production build, 1440×900): the homepage pulled
     1,310 KB of images before a reader had scrolled a pixel, and six of the
     ten heaviest files were industry renders — burger, cafe, catering,
     fine-dining, dental, bakery, ~250 KB together — for a section several
     screens down that nobody had reached. This effect was the cause: it reads
     `shown.key`, which has a value from the first render, so the "few
     industries ahead" warm-up ran at mount and raced the hero for bandwidth.
     Cloudflare's own Observatory flagged exactly this ("resource load duration
     exceeding 10% of LCP").
     The lookahead itself is right and stays — it is what keeps a fast flick
     from landing on an undecoded render. It just may not start until the
     section is within a screen of the viewport. */
  let nearTour = $state(false)
  $effect(() => {
    if (!browser || !pinEl || nearTour) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { nearTour = true; io.disconnect() } },
      { rootMargin: '900px 0px' } // ~one screen of warning: enough for six renders to land before the first one is needed, not so much that they compete with the hero
    )
    io.observe(pinEl)
    return () => io.disconnect()
  })

  /* AND IT PREFETCHES THE FORMAT THE BROWSER WILL ACTUALLY USE. The warm-up
     hardcoded `.webp` while the <picture> below offers AVIF first, so on every
     modern browser these six requests warmed a cache entry nothing would ever
     read, and the AVIF was then fetched a second time on display — the burger
     render appeared TWICE in the measurement above, 61 KB of WebP plus 35 KB
     of AVIF. One decode probe, once per session, settles which extension to
     warm. */
  let avifOk = $state(null)
  // Resolved once, by the SAME probe below — every other reader (the
  // registerReactiveUrls callback further down, the lookahead effect)
  // awaits this instead of reading `avifOk` synchronously, which is what
  // used to race: `warmReactiveUrls()` in imageWarm.js calls the registered
  // function once, at whatever instant its own pass reaches it, with no
  // guarantee the probe below has settled by then.
  //
  // THE OLD PROBE WAS ALSO WRONG, independent of timing. It used a
  // hand-built 1×1 AVIF (the classic Modernizr/caniuse test payload) as a
  // `data:` URI. Instrumented against production's own WebKit: that exact
  // byte string fails to decode in WebKit's data-URI image loader — `onerror`
  // fires in ~3ms, every time, not a slow resolve — even though the SAME
  // engine decodes a real `.avif` file fetched from the network without any
  // trouble (verified against /img/niches/wedding-9x16.avif: loads fine).
  // So on WebKit this never raced to the wrong answer, it computed the wrong
  // answer instantly and confidently: `avifOk` landed on `false`, the
  // registry warmed `.webp` for every niche, and the real `<picture>` element
  // — whose format choice is native browser codec negotiation, not this JS
  // probe — picked `.avif` anyway. Every niches image was double-fetched in
  // WebKit; the three seen "late" in production were just the ones the
  // jump-scroll test actually mounted a `<picture>` for.
  //
  // The fix is a probe WebKit can actually decode: a real (ffmpeg-encoded,
  // not hand-assembled) 2×2 AVIF, confirmed here to decode correctly as a
  // `data:` URI in the same engine that rejected the old one.
  let avifOkPromise = null
  function probeAvif() {
    if (avifOkPromise) return avifOkPromise
    avifOkPromise = new Promise((resolve) => {
      if (!browser) return resolve(false)
      const probe = new Image()
      probe.onload = () => { const ok = probe.width > 0; avifOk = ok; resolve(ok) }
      probe.onerror = () => { avifOk = false; resolve(false) }
      // Real (ffmpeg libaom-av1) 2×2 AVIF — see the comment above for why
      // this replaced the old hand-built 1×1 test payload.
      probe.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAAD5bWV0YQAAAAAAAAAvaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAFBpY3R1cmVIYW5kbGVyAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAARAAAAQABAAAAAQAAASEAAAAWAAAAKGlpbmYAAAAAAAEAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAAGppcHJwAAAAS2lwY28AAAAUaXNwZQAAAAAAAAACAAAAAgAAABBwaXhpAAAAAAMICAgAAAAMYXYxQ4EADAAAAAATY29scm5jbHgAAgACAAIAAAAAF2lwbWEAAAAAAAAAAQABBAECgwQAAAAebWRhdAoFGAA2wCAyDRgAAABQAAAAALASmcg='
    })
    return avifOkPromise
  }
  $effect(() => {
    if (!browser) return
    probeAvif()
  })

  /* ——— PREWARM ALL THIRTY, NOT JUST THE LOOKAHEAD WINDOW ———
     The lookahead effect below (and `stageNear`, further down) both exist to
     keep the CURRENT scrub smooth — a handful of industries ahead of
     wherever the reader actually is. Neither one helps a jump-scroll straight
     to the bottom of the page: that lands on an industry that was never
     "ahead" of anything, so nothing pre-fetched it and nothing pre-mounted
     its <img>. imageWarm.js's reactive-URL pass is the fix — it runs once,
     late (after the page's own DOM/background warm-up has drained), and
     covers every industry regardless of scroll position.

     Registered as a lazily-evaluated function, not a static list, so it
     reads the SAME live decisions the lookahead effect above makes right
     before imageWarm.js actually calls it: the portrait breakpoint (mirrored
     exactly from the <picture> media query at `(max-width: 719px)` below)
     and the AVIF probe. The function is ASYNC — it awaits `probeAvif()`
     rather than reading `avifOk` synchronously — because imageWarm.js's
     `warmReactiveUrls()` calls this exactly once, at whatever instant its
     own batched pass reaches it, with no guarantee the probe has settled by
     then. `warmReactiveUrls()` awaits whatever this returns, so there is no
     "falls back to webp because the probe hasn't resolved yet" case left:
     it either already has, or this suspends until it does. Warming the
     wrong one would be wasted bytes on top of leaving the real candidate
     cold — see the brief's point 4. */
  onMount(() => {
    return registerReactiveUrls(async () => {
      const portrait = window.matchMedia('(max-width: 719px)').matches
      const ext = (await probeAvif()) ? 'avif' : 'webp'
      return NICHES.map((n) => (portrait ? `/img/niches/${n.key}-9x16.${ext}` : `/img/niches/${n.key}.${ext}`))
    })
  })

  $effect(() => {
    if (!browser || !nearTour) return
    const key = shown.key
    const portrait = window.matchMedia('(max-width: 719px)').matches
    const from = NICHES.findIndex((n) => n.key === key)
    if (from < 0) return
    let cancelled = false
    const imgs = []
    // Same reasoning as the registry callback above: await the probe rather
    // than reading `avifOk` synchronously, so a lookahead that fires before
    // the probe settles can't warm the wrong extension either.
    probeAvif().then((ok) => {
      if (cancelled) return
      const ext = ok ? 'avif' : 'webp'
      const ahead = pinned ? 6 : 3
      for (let k = 1; k <= ahead; k++) {
        const n = NICHES[(from + k) % NICHES.length]
        const img = new Image()
        img.src = portrait ? `/img/niches/${n.key}-9x16.${ext}` : `/img/niches/${n.key}.${ext}`
        imgs.push(img)
      }
    })
    return () => { cancelled = true; imgs.forEach((im) => { im.src = '' }) }
  })

  /* While the pinned tour owns the screen, the site's global bottom pill
     steps aside — on a phone it is fixed at the bottom and the tour's
     answer card is a bottom sheet, so "Start a project" would sit right on
     top of "Build my <industry> system". See the `html.sol-tour-live` rule
     in solutions.css. An observer on the pin track, not a scroll handler:
     this needs to be true for exactly as long as the sticky inner is
     parked, which is precisely what the track's own intersection reports. */
  $effect(() => {
    if (!browser || !pinEl || !pinned) return
    const root = document.documentElement
    const io = new IntersectionObserver(
      ([e]) => root.classList.toggle('sol-tour-live', e.isIntersecting),
      { threshold: 0 }
    )
    io.observe(pinEl)
    return () => { io.disconnect(); root.classList.remove('sol-tour-live') }
  })

  const sectionAccent = $derived(YARN_HEX[GROUP_YARN[shown.group]])

  // ——— THE STAGE PHOTOGRAPH — ONE STABLE NODE, NEVER REMOUNTED ———
  // This used to be `{#key shown.key}` around the whole <picture>: a fresh
  // <source>/<img> tree destroyed and recreated on every one of the 30
  // industries the pinned tour scrubs through. That is real DOM churn
  // (layout + paint + a fresh decode) happening on the exact same rAF tick
  // the browser is also recalculating a `position: sticky` box's offset —
  // and it is the one part of this component an automated position-sampling
  // pass (getBoundingClientRect every frame) cannot see, because remounting
  // doesn't move anything, it just stutters the frame the swap lands on.
  // Client report after that pass came back clean: "still jiggles." This is
  // the fix — the <picture>/<img> below is now a single element for the
  // whole scrub; `src`/`srcset` update in place (a plain attribute patch,
  // not a remount), and the two error-fallback bits that used to reach into
  // the DOM by hand (`img.dataset`, `pic.querySelectorAll('source').remove()`)
  // are now ordinary reactive state instead, since there's no longer a fresh
  // node per industry to hang imperative flags off of.
  //
  // Seven of the thirty industries have only a `-9x16` render on disk, so an
  // errored `-wide` source falls back to the portrait instead of hiding —
  // `stageFallback` remembers which keys already fell back so the `<source>`
  // set is skipped for them; `stageBroken` remembers the rare case where even
  // the fallback 404s, and only then is the node hidden (never removed, so a
  // later WORKING industry reusing this same element still shows).
  let stageFallback = $state(new Set())
  let stageBroken = $state(new Set())

  /* ——— WHICH STAGE IMAGES ARE MOUNTED ———
     Every industry gets its own <img> in the stage (see the markup), but only
     the ones in this window carry a real `src`. That is what makes the
     cross-fade free of decode: a photograph is mounted, fetched and decoded
     while it is still fully transparent, two to four industries before it is
     shown, so by the time it fades in there is nothing left to do but
     composite an opacity.

     The window is deliberately asymmetric — the tour almost always travels
     forwards, so it reaches further ahead (4) than behind (2). Behind is not
     zero because a reader scrolling back up needs the same guarantee.

     Keep this SMALL. Every key in here is a live <img> holding a decoded
     bitmap; widening it to all 30 would hold ~30 full-size decodes in memory
     for a section most visitors scroll past. */
  const stageNear = $derived.by(() => {
    const set = new Set([shown.key])
    const i = NICHES.findIndex((n) => n.key === shown.key)
    if (i < 0) return set
    for (let d = -2; d <= 4; d++) {
      const j = i + d
      if (j >= 0 && j < NICHES.length) set.add(NICHES[j].key)
    }
    return set
  })
  function onStageError(n) {
    return () => {
      if (stageFallback.has(n.key)) {
        if (!stageBroken.has(n.key)) { const s = new Set(stageBroken); s.add(n.key); stageBroken = s }
        return
      }
      const s = new Set(stageFallback); s.add(n.key); stageFallback = s
    }
  }

  function deliverableParts(d) {
    const cut = d.indexOf(' — ')
    return cut < 0 ? { title: d, rest: '' } : { title: d.slice(0, cut), rest: d.slice(cut + 3) }
  }

  /* ——— THE GHOST MEASURER IS GONE (13 Aug 2026) ———
     This used to be `measureCardHeight()`: on mount and on every resize, it
     cloned the on-screen card off-screen, swapped every one of the thirty
     industries' name/hook/deliverables/CTA label through it in turn, and
     wrote the tallest result to `--sol-card-h` — a `min-height` reservation
     on `.sol-panelcard` — because the card used to be BOTTOM-anchored
     (`.sol-answer-slot { bottom: … }`), which meant its height was its own
     top edge, and the tour changes card thirty times a scrub.
     Both premises are gone. "THE ANSWER LOSES ITS CARD" and the mobile "15%
     budget" pass (see solutions.css) removed the card's plate entirely and
     re-anchored the block from the TOP (desktop: `top: clamp(…)`) or flush
     to the stage's own edges (mobile: `left/right/bottom: 0`) — a fixed
     anchor a taller card can only grow AWAY from, never move. And every row
     that actually varies by industry (name, hook, the arc, each deliverable,
     the agent note) now carries its OWN `min-height` + `line-clamp` reserved
     in that row's own line-height, verified against all thirty by
     `qa/sol-align.mjs`. Nothing above this comment writes to `--sol-card-h`
     any more and nothing below reads it — nothing left to clone, swap and
     measure thirty times on every resize. */
</script>

{#snippet groupIcon(group, cls = '')}
  {#if group === 'health'}
    <svg viewBox="0 0 24 24" class="sol-gicon {cls}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="8.3" /><path d="M12 8.2v7.6M8.2 12h7.6" />
    </svg>
  {:else if GROUP_ICON_PATHS[group]}
    <svg viewBox="0 0 24 24" class="sol-gicon {cls}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      {#each GROUP_ICON_PATHS[group].split('|') as d}<path {d} />{/each}
    </svg>
  {/if}
{/snippet}

<!-- `merged` = this is act two of the Counter section, not a section of its
     own (the long page mounts it as <Solutions merged />). -->
<svelte:element this={Tag}
  class="solutions{merged ? ' solutions--merged' : ''} section-anchor"
  id="solutions"
  style="--sol-tint:{sectionAccent}"
  aria-label={merged ? 'Solutions by industry' : undefined}
>
  <!-- THE PIN TRACK. Its height is what the visitor scrolls THROUGH while
       the stage inside it stays parked — 30 industries' worth. `.is-pinned`
       is the only thing that turns the behaviour on, so reduced-motion
       users get the same markup as an ordinary block. -->
  <div class="sol-pin{pinned ? ' is-pinned' : ''}" bind:this={pinEl}>
    <div class="sol-pin-inner">
      {#if merged}
        <div class="sol-act2">
          <span class="sol-act2-rule" aria-hidden="true"></span>
          <SplitWords as="h3" class="sol-act2-h" text="Or start from your industry." />
          <div use:reveal={{ delay: 0.12 }}>
            <p class="sol-act2-lede">Thirty of them, and the loom already knows yours — type it in.</p>
          </div>
        </div>
      {:else}
        <div class="section-head">
          <p class="kicker"><span>—</span> Solutions</p>
          <SplitWords as="h2" class="h2" text="Thirty industries. One loom." />
          <div use:reveal={{ delay: 0.15 }}>
            <p class="lede" style="margin-top:10px">Type your industry — the loom already knows it.</p>
          </div>
        </div>
      {/if}

      <div class="sol-console" use:reveal={{ delay: 0.05 }}>
        <!-- ——— THE SEARCH BAR — its own row, above the photograph ——— -->
        <div class="sol-bar">
          <label class="sol-bar-label" for="sol-search">Find your industry</label>
          <div class="sol-bar-field">
            <svg class="sol-bar-glass" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
              <circle cx="10.3" cy="10.3" r="6.3" />
              <path d="M19.5 19.5l-4.7-4.7" />
            </svg>
            <input
              id="sol-search"
              class="sol-search"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder={placeholder}
              bind:value={query}
              onfocus={() => (focused = true)}
              onblur={() => (focused = false)}
              list="sol-search-list"
              aria-describedby="sol-answer"
            />
            <datalist id="sol-search-list">
              {#each NICHES as n (n.key)}<option value={n.name}></option>{/each}
            </datalist>
          </div>
          <span class="sol-bar-count" aria-hidden="true">{NICHES.length} industries</span>
        </div>

        <!-- ——— THE STAGE ——— -->
        <div class="sol-stage">
          {#if !noMatch}
            <!-- ——— THE FLICKER FIX — 11 Aug 2026 ———
                 THE VISIBLE IMAGE'S `src` IS NEVER MUTATED. THAT IS THE WHOLE
                 POINT OF THIS BLOCK; do not "simplify" it back to one <img>.

                 What it was: a single <picture>/<img> whose `src` and the
                 <source> `srcset`s were patched in place as `shown.key`
                 changed. That was already the fix for an earlier bug (a
                 `{#key}` block that destroyed and rebuilt the whole subtree 30
                 times per scrub) — but it only removed the teardown, not the
                 decode. Changing `srcset`/`src` on an element that is ON SCREEN
                 makes the browser re-run source selection and decode a new
                 file for the element the reader is looking at. Between the
                 attribute write and the decode landing there is a gap, and in
                 WebKit that gap paints — reported by the client, repeatedly and
                 correctly, as the section FLICKERING on scroll. Eager
                 preloading did not help: warming the HTTP cache does not
                 prevent a re-decode on the live node.

                 What it is now: every industry owns its OWN <img>, stacked in
                 the same box, and the scrub only cross-fades OPACITY between
                 them. Opacity is compositor-only — it cannot flicker, and it
                 cannot force a decode. An image is mounted with a real `src`
                 only once it enters a window around the current index
                 (`stageNear`), so it decodes while still fully transparent,
                 several industries before anyone sees it. Nodes are keyed by
                 `n.key`, so sliding the window never re-creates a node that is
                 already decoded.

                 The `{#each}` is keyed and MUST stay keyed: an unkeyed each
                 would recycle DOM nodes between industries, which reintroduces
                 exactly the src-mutation-on-a-visible-node this removes. -->
            {#each NICHES as n (n.key)}
              {#if stageNear.has(n.key)}
                <picture style="display:contents">
                  {#if !stageFallback.has(n.key)}
                    <source media="(max-width: 719px)" type="image/avif" srcset="/img/niches/{n.key}-9x16.avif" />
                    <source media="(max-width: 719px)" type="image/webp" srcset="/img/niches/{n.key}-9x16.webp" />
                    <source type="image/avif" srcset="/img/niches/{n.key}.avif" />
                  {/if}
                  <img
                    class="sol-stage-bg{n.key === shown.key ? ' is-on' : ''}"
                    src={stageFallback.has(n.key) ? `/img/niches/${n.key}-9x16.webp` : `/img/niches/${n.key}.webp`}
                    alt=""
                    width="1400"
                    height="600"
                    decoding="async"
                    loading="lazy"
                    aria-hidden={n.key === shown.key ? undefined : 'true'}
                    style={stageBroken.has(n.key) ? 'visibility:hidden' : undefined}
                    onerror={onStageError(n)}
                  />
                </picture>
              {/if}
            {/each}
          {/if}
          <i class="sol-stage-scrim" aria-hidden="true"></i>

          <!-- The answer STRADDLES the photograph's bottom edge instead of
               floating inside it. -->
          <div id="sol-answer" role="region" aria-live="polite" aria-label="Selected industry" class="sol-answer-slot">
            <!-- NO keyed block around either card — that is load-bearing,
                 not tidying (see the "scroll-tour card shake" note in
                 CLAUDE.md). A key that changes per niche would remount the
                 card on every industry the tour walks past, restarting its
                 entrance transition on every step — on a phone the tour
                 changes industry roughly every 350ms, well inside a 400ms
                 entrance, so the card would never once reach rest. This
                 only swaps structure between "an industry resolved" and
                 "nothing matched" (a real `{#if}` branch change), never
                 between one industry and the next. -->
            {#if noMatch}
              <article
                class="sol-panelcard sol-answer sol-answer--empty"
                in:fly={{ y: reducedMotion.current ? 0 : 10, duration: reducedMotion.current ? 10 : 400, easing: cubicOut }}
              >
                <i class="sol-answer-thread" aria-hidden="true"></i>
                <div class="sol-answer-left">
                  <p class="sol-answer-kicker">Not on the list — yet</p>
                  <h3 class="sol-answer-name">&ldquo;{query}&rdquo;</h3>
                  <p class="sol-answer-hook">
                    Tell us what you actually do and the loom sets itself up for it — same agents,
                    same content engine, tuned to your trade instead of these thirty.
                  </p>
                  <GradientButton
                    label={`Ask about "${query}"`}
                    class="sol-cta"
                    onclick={() => wizard.open({ niche: query })}
                  />
                </div>
              </article>
            {:else}
              {@const yarn = yarnOf(shown)}
              <article
                class="sol-panelcard sol-answer has-photo"
                style="--panel-yarn:{YARN_HEX[yarn]}"
                in:fly={{ y: reducedMotion.current ? 0 : 10, duration: reducedMotion.current ? 10 : 400, easing: cubicOut }}
              >
                <i class="sol-answer-thread" aria-hidden="true"></i>
                <div class="sol-answer-left">
                  <div class="sol-answer-head">
                    <span class="sol-answer-badge" aria-hidden="true">
                      {@render groupIcon(shown.group, 'sol-answer-gicon')}
                    </span>
                    <div class="sol-answer-headtext">
                      <p class="sol-answer-kicker">{GROUP_LABEL[shown.group]}</p>
                      <h3 class="sol-answer-name">{shown.name}</h3>
                    </div>
                  </div>
                  <p class="sol-answer-hook">{shown.hook}</p>
                  <!-- ——— THE ARC, WHICH WAS SITTING IN THE DATA UNUSED ———
                       Client: "the content where the button is needs more".
                       Nothing had actually been deleted from this card — the
                       kicker, name, hook, three deliverables and CTA are the
                       same nodes they have always been — but the LEFT column
                       was four short lines and a button, and `NICHES` carries
                       two fields the card never rendered: `moon` and `agent`.
                       `moon` is the industry's arc ("From the neighbourhood
                       spot to the name people book a week ahead") and it goes
                       here, between the hook and the ask, because that is the
                       gap the button was standing in on its own. Verbatim
                       from the data — not one word is written here. -->
                  <p class="sol-answer-moon">{shown.moon}</p>
                  <!-- ——— ONE CTA TREATMENT, THIRTY INDUSTRIES ———
                       This used to be `yarn={yarn}`, i.e. the group's own
                       colour driving the knitted button's fallback texture —
                       so the site's single most important conversion rendered
                       gold on Restaurants, hot pink on Barbershops, grey on
                       Law Firms and cream on NGOs. Thirty industries, thirty
                       different primary buttons: not a system, an accident of
                       a data field leaking into the brand.
                       Every other primary wool CTA on the site is one fixed
                       yarn per surface (Pricing → magenta, FAQ/Hiring →
                       violet, AnswerEngine → gold) and the "not on the list"
                       card a few lines above was already magenta — so the
                       resolved card matches it. The industry's own colour is
                       NOT lost, it just stops being the button: it now sets
                       the kicker's ink and the accent rule beside it (see
                       `.sol-console .sol-answer-kicker` in solutions.css),
                       which is where a per-category signal belongs. -->
                  <GradientButton
                    label={mobileCta ? 'Get started' : `Build my ${shown.name} system`}
                    class="sol-cta"
                    onclick={() => wizard.open({ niche: shown.name })}
                  />
                </div>
                <div class="sol-answer-right">
                  <p class="sol-answer-label sol-sr-only">What resolves for {shown.name}</p>
                  <ul class="sol-deliverables">
                    {#each shown.deliverables as d (d)}
                      {@const parts = deliverableParts(d)}
                      <li>
                        <i class="sol-stitch" aria-hidden="true"></i>
                        <span><b class="sol-deliv-t">{parts.title}</b>{#if parts.rest} — {parts.rest}{/if}</span>
                      </li>
                    {/each}
                  </ul>
                  <p class="sol-agent">
                    <span class="sol-agent-kicker">AI agent</span>
                    <span class="sol-agent-copy">{shown.agent}</span>
                  </p>
                </div>
              </article>
            {/if}
          </div>
        </div>
      </div>

      <!-- the tour's own progress — thirty ticks, the current one lit. -->
      {#if pinned}
        <div class="sol-tour" aria-hidden="true">
          <span class="sol-tour-now">{String(tourIndex + 1).padStart(2, '0')}</span>
          <span class="sol-tour-track">
            <span class="sol-tour-fill" style="transform:scaleX({(tourIndex + 1) / NICHES.length})"></span>
          </span>
          <span class="sol-tour-all">{NICHES.length}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- ——— THE INDEX — ALL THIRTY, OUTSIDE THE PIN ———————————————————————
       This lived INSIDE `.sol-pin-inner`, which is `height: 100svh; overflow:
       hidden` — a fixed viewport with a head, a search bar, a photographic
       stage and a progress rail already in it. There was nothing left for
       thirty industry names, so the index had been squeezed into
       `columns: 5; max-height: clamp(76px,13vh,116px); overflow: hidden` and
       was doing exactly what a clipped multi-column box does: orphaning rows
       mid-name ("E-commerce Brands"), stranding the " — " group separator at
       the foot of a column with nothing after it ("Catering & Events —"), and
       — because the whole thing was ONE paragraph of inline type — running
       each category's LABEL inline off the back of the previous category's
       last industry ("… — × BEAUTY").

       No amount of column tuning fixes a block that is 300px of content in a
       110px box. So it moves out of the pin entirely: it is now a sibling of
       the pin track, landing the moment the tour releases — which is exactly
       when "now show me all of them" is the question — with no height cap at
       all. And it stops being an inline paragraph: seven real groups, each a
       block with its own heading above its own list, so a label can never
       collide with a name and a name can never be cut. Nothing is clipped
       because nothing is constrained; the grid reflows 2 → 3 → 4 → 7 columns
       and every column grows to its content. -->
  <nav class="sol-index" aria-label="All industries, by category" use:reveal={{ delay: 0.05 }}>
    <div class="sol-idx-head">
      <p class="sol-idx-kicker">All {NICHES.length}, by category</p>
      <span class="sol-idx-rule" aria-hidden="true"></span>
    </div>
    <div class="sol-idx-grid">
      {#each GROUPS as g (g.id)}
        <div class="sol-idx-group" style="--grp-yarn:{YARN_HEX[GROUP_YARN[g.id]]}">
          <h3 class="sol-idx-label">
            {@render groupIcon(g.id, 'sol-idx-gicon')}<span class="sol-idx-labeltext">{g.label}</span>
          </h3>
          <ul class="sol-idx-list">
            {#each NICHES.filter((n) => n.group === g.id) as n (n.key)}
              <li>
                <button
                  type="button"
                  class="sol-idx-btn{n.key === shown.key && !noMatch ? ' is-active' : ''}"
                  aria-pressed={n.key === shown.key && !noMatch}
                  onclick={() => pick(n)}
                >{n.name}</button>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </nav>

  <!-- ——— THE FOUR EVERYONE GETS ———
       Below the console on purpose. The console answers "what do you build
       for ME"; this answers "and what does everybody get", which only
       matters once they have seen themselves on the page. -->
  <div class="sol-core" use:reveal={{ delay: 0.08 }}>
    <div class="sol-core-head">
      <p class="sol-core-kicker">The floor</p>
      <h3 class="sol-core-title">Every client gets these four</h3>
      <p class="sol-core-sub">The three above are yours alone. These four are the floor.</p>
    </div>

    <!-- ——— FOUR COLUMNS OF ONE BOLT, NOT FOUR ROWS OF A LEDGER ———
         The previous pass set these as a tall stacked ledger: four full-width
         rows, one under the next, half a screen of scrolling to learn what is
         a single four-part fact. But the sentence above them is "every client
         gets these FOUR" — a set, not a sequence. A set has to be taken in at
         once or it is not read as a set at all, so it is laid across in one
         line: four equal columns, comparable at a glance.
         What keeps it from being four plain boxes: there are no boxes. One
         warp rule runs across the top of all four and each column hangs off
         its own segment of it, tinted with its own yarn, so they read as four
         picks of the same bolt of cloth; the three proofs sit on a shared
         baseline across all four columns (subgrid, so the alignment is real
         and not a guessed min-height).

         EACH COLUMN NOW LEADS WITH A PICTURE (Aug 2026). Everything above was
         true and the block still read flat, for a reason the structure could
         not fix: four columns of body copy at one weight give the eye nothing
         to land on, so "every client gets these four" arrived as a paragraph
         in four pieces rather than as four things. Each column opens with its
         own still life now, shot in the same felted-wool language as
         /img/needs, and the numeral has moved OUT of its own row and onto the
         picture's bottom edge — one object instead of a label above a label.
         The warp rule moved above the picture with it.

         WHAT THE PICTURES ARE ALLOWED TO BE is a content rule, not a taste
         one, and it is written out at CORE_SERVICES in site.js: these four are
         the least evidenced things on the page (two of them have no case study
         at all), so not one of them may be illustrated with a screenshot, a
         dashboard or a chart carrying a number. Every screen and card inside
         them is blank on purpose. Read that comment before replacing an image.

         Copy untouched — every title, blurb and point is CORE_SERVICES
         verbatim, in order. -->
    <ol class="sol-core-grid">
      {#each CORE_SERVICES as c, i (c.title)}
        <li
          class="sol-core-card"
          style="--card-yarn:{CORE_YARNS[i % CORE_YARNS.length]}"
          use:reveal={{ delay: 0.1 + i * 0.07 }}
        >
          <span class="sol-core-warp" aria-hidden="true"></span>
          <!-- Same art-direction contract as the need tiles and WorkshopsPromo:
               a failed decode removes the <img> and leaves the figure's own
               tinted plate rather than a broken-image hole. The numeral is a
               sibling of the picture, not a child of it, so it survives that. -->
          <figure class="sol-core-fig">
            <Pic
              src={c.img}
              alt={c.alt}
              sizes="(max-width: 700px) 92vw, (max-width: 1079px) 44vw, 22vw"
              width="1200"
              height="896"
              loading="lazy"
              decoding="async"
              onerror={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <span class="sol-core-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          </figure>
          <h4 class="sol-core-h">{c.title}</h4>
          <p class="sol-core-b">{c.blurb}</p>
          <ul class="sol-core-pts">
            {#each c.points as p (p)}
              <li><i class="sol-stitch" aria-hidden="true"></i><span>{p}</span></li>
            {/each}
          </ul>
        </li>
      {/each}
    </ol>

    <!-- ——— THE TRIPWIRE ———
         Same words, same figure, given the shape of an offer instead of a
         footnote: a torn ticket whose stub carries the price.

         Redesigned 12 Aug 2026 — the old build had two dead zones: the body's
         middle third was empty pink (the blurb capped at 62ch, the grid cell
         kept going past it), and the stub was a big blank frame with a number
         floating alone in the centre. Nothing below is new copy. It's the
         same three frozen ENTRY_OFFER strings, only re-cut: the price split
         on its own space into figure + unit, the blurb split on its own
         sentence boundary into promise + cost. -->
    <div class="sol-entry">
      <div class="sol-entry-body">
        <span class="sol-entry-tag">Start here</span>
        <span class="sol-entry-title">{ENTRY_OFFER.title}</span>
        <!-- THE SENTENCE WAS ALREADY A COMPARISON — it just ran on as the
             tail of a paragraph, so the eye discounted "a hundred finished
             images" as the usual filler line and never really landed on the
             clause doing the actual selling: what a studio day costs for a
             twelfth of the pictures. `.split('. ')` cuts on the period that
             was already there — no character added, none removed — and the
             two halves get opposed instead of run together: the give in the
             dim ink everything else uses, the cost in full ink with its own
             rule, so it reads as an argument and not a footnote. -->
        <div class="sol-entry-case">
          <p class="sol-entry-give">{ENTRY_OFFER.blurb.split('. ')[0]}.</p>
          <p class="sol-entry-cost">{ENTRY_OFFER.blurb.split('. ')[1]}</p>
        </div>
      </div>
      <!-- THE HUNDRED, SHOWN NOT STATED. A 10×10 dot field sized in
           `background-size: 10% 10%` rather than counted out as 100 real
           elements — a single radial-gradient tiled by percentage IS exactly
           100 marks regardless of the box's final clamped size, which a
           `{#each Array(100)}` loop would need JS and a hundred DOM nodes to
           guarantee instead. It also used to be the exact rectangle of dead
           air the client was complaining about; now it's the one thing
           living there. Purely decorative — the number is already read as
           text two lines up — so it's `aria-hidden` and drops out below 760,
           where the ticket unfolds to one column and the text alone owns the
           full measure. -->
      <span class="sol-entry-count" aria-hidden="true"></span>
      <div class="sol-entry-stub">
        <!-- notches: a real ticket is scored where the stub tears free, and
             the tear line meets the outer edge at two points. Two circles
             the exact colour of the page floor (`--bg`, not white — the card
             sits on the pink ground, not on paper) punched at those two
             points read as an actual perforation, not a decorative dash. -->
        <span class="sol-entry-notch sol-entry-notch--top" aria-hidden="true"></span>
        <span class="sol-entry-notch sol-entry-notch--bottom" aria-hidden="true"></span>
        <span class="sol-entry-price">
          <span class="sol-entry-fig">{ENTRY_OFFER.price.split(' ')[0]}</span>
          <span class="sol-entry-unit">{ENTRY_OFFER.price.split(' ')[1]}</span>
        </span>
      </div>
    </div>
  </div>
</svelte:element>
