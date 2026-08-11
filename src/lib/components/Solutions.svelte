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
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
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
  $effect(() => {
    if (!browser) return
    const key = shown.key
    const portrait = window.matchMedia('(max-width: 719px)').matches
    const from = NICHES.findIndex((n) => n.key === key)
    if (from < 0) return
    const ahead = pinned ? 6 : 3
    const imgs = []
    for (let k = 1; k <= ahead; k++) {
      const n = NICHES[(from + k) % NICHES.length]
      const img = new Image()
      img.src = portrait ? `/img/niches/${n.key}-9x16.webp` : `/img/niches/${n.key}.webp`
      imgs.push(img)
    }
    return () => imgs.forEach((im) => { im.src = '' })
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

  /* ——— THE CARD'S HEIGHT, RESERVED FROM THE REAL DATA — the fix for the
     client-reported "jiggle" ———
     The card is bottom-anchored (`.sol-answer-slot { position: absolute;
     bottom: … }`, see solutions.css) so it can sit straddling the seam of
     the photograph. That means its HEIGHT is its TOP edge: whatever grows
     or shrinks the card pushes the top up or drags it down, and the tour
     changes card thirty times as it scrolls.

     A round of per-element `min-height`s (the deliverable rows, the CTA)
     already reserves the two most obviously variable rows — see the
     comments lower in solutions.css — but measuring the live section still
     showed the card swinging ~100px at 1440 (450px → 552px) because two more
     things were never pinned down: the one-line hook ("A full room on a
     Tuesday.") vs the two-line one ("Own the order before the aggregator
     takes its cut.") is a 17px difference nothing was reserving, and the
     per-row reservations only cover EACH row in isolation, not the sum.

     Rather than add yet another hand-measured magic number (the ones in the
     CSS already required three separate corrections as edge cases were
     found), this reserves the card's height directly from the real copy:
     clone the card that's actually on screen, drop the clone off-screen at
     the SAME width, swap in every industry's name/hook/deliverables/CTA
     label in turn, and take the tallest result. That number becomes
     `--sol-card-h`, which `.sol-panelcard` reserves as a `min-height` (never
     `height` — a row that somehow runs longer than every industry measured
     here still grows instead of clipping). Recomputed on resize because the
     wrap points move with the card's width at every breakpoint (measured
     stable at 390/820/1440). */
  function measureCardHeight() {
    if (!browser || !pinEl) return
    const liveSlot = pinEl.querySelector('.sol-answer-slot')
    const liveCard = liveSlot?.querySelector('.sol-panelcard.has-photo')
    if (!liveSlot || !liveCard) return

    const ghostSlot = liveSlot.cloneNode(true)
    ghostSlot.removeAttribute('id')
    ghostSlot.setAttribute('aria-hidden', 'true')
    ghostSlot.style.visibility = 'hidden'
    ghostSlot.style.pointerEvents = 'none'
    const ghostCard = ghostSlot.querySelector('.sol-panelcard')
    // clear any previously-set reservation so this measures NATURAL height
    ghostCard.style.minHeight = '0'
    liveSlot.parentElement.appendChild(ghostSlot)

    const nameEl = ghostCard.querySelector('.sol-answer-name')
    const hookEl = ghostCard.querySelector('.sol-answer-hook')
    const kickerEl = ghostCard.querySelector('.sol-answer-head .sol-answer-kicker')
    const items = ghostCard.querySelectorAll('.sol-deliverables li > span')
    const ctaText = ghostCard.querySelector('.sol-cta .wool-btn-text, .sol-cta .wool-btn-label')
    /* The two blocks restored to the card are per-industry copy of VERY
       different lengths (the agent paragraph runs 90-190 characters across the
       thirty), so they have to be swapped in the ghost too. Miss them and the
       reservation is measured against whichever industry happened to be
       showing at mount, the card's real height varies underneath a
       bottom-anchored slot, and the tour gets its top-edge step back — the
       exact failure `--sol-card-h` exists to prevent. */
    const moonEl = ghostCard.querySelector('.sol-answer-moon')
    const agentEl = ghostCard.querySelector('.sol-agent-copy')

    let max = 0
    for (const n of NICHES) {
      if (nameEl) nameEl.textContent = n.name
      if (hookEl) hookEl.textContent = n.hook
      if (moonEl) moonEl.textContent = n.moon
      if (agentEl) agentEl.textContent = n.agent
      if (kickerEl) kickerEl.textContent = GROUP_LABEL[n.group]
      n.deliverables.forEach((d, i) => {
        const span = items[i]
        if (!span) return
        const parts = deliverableParts(d)
        span.textContent = ''
        const b = document.createElement('b')
        b.className = 'sol-deliv-t'
        b.textContent = parts.title
        span.appendChild(b)
        if (parts.rest) span.appendChild(document.createTextNode(' — ' + parts.rest))
      })
      if (ctaText) ctaText.textContent = `Build my ${n.name} system`
      max = Math.max(max, ghostCard.getBoundingClientRect().height)
    }

    ghostSlot.remove()
    if (max > 0) pinEl.style.setProperty('--sol-card-h', `${Math.ceil(max)}px`)
    // the reservation just changed the track's layout, so the scroll loop's
    // cached geometry is stale by exactly one write. Refresh it here rather
    // than let the rAF read it back every frame.
    measurePin()
  }

  // Runs once the real card exists, and again whenever the width it wraps
  // at changes — a resize handler, debounced with the same rAF-coalescing
  // idiom the tour's own scroll listener uses just above, so a drag-resize
  // does not re-measure thirty industries on every intermediate pixel.
  $effect(() => {
    if (!browser || !pinEl) return
    let raf = 0
    const run = () => { raf = 0; measureCardHeight() }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(run) }
    schedule()
    window.addEventListener('resize', schedule)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('resize', schedule)
    }
  })
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
                  <WoolButton
                    label={`Ask about "${query}"`}
                    yarn="magenta"
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
                  <WoolButton
                    label={`Build my ${shown.name} system`}
                    yarn="magenta"
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
         picks of the same bolt of cloth; the numeral is oversized, outlined
         and half-buried behind the rule the way a selvedge mark is; the three
         proofs sit on a shared baseline across all four columns (subgrid, so
         the alignment is real and not a guessed min-height).
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
          <div class="sol-core-idx">
            <span class="sol-core-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          </div>
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
         footnote: a torn ticket whose stub carries the price. -->
    <div class="sol-entry">
      <div class="sol-entry-body">
        <span class="sol-entry-tag">Start here</span>
        <span class="sol-entry-title">{ENTRY_OFFER.title}</span>
        <span class="sol-entry-blurb">{ENTRY_OFFER.blurb}</span>
      </div>
      <div class="sol-entry-stub">
        <span class="sol-entry-price">{ENTRY_OFFER.price}</span>
      </div>
    </div>
  </div>
</svelte:element>
