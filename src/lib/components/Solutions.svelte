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
  import { browser } from '$app/environment'
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { NICHES, NICHE_GROUPS, CORE_SERVICES, ENTRY_OFFER } from '$data/site.js'
  import { reducedMotion, reveal } from '$lib/motion.svelte.js'
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
  /* WHAT THIS IS AND IS NOT. It is the FALLBACK path's only piece of state:
     which industry an un-pinned section is showing (see `hasTimeline` below —
     no scroll-driven animation, or reduced motion). It is NOT the tour's
     index. While the tour is live nothing in this file knows or needs to know
     which industry is on screen; the browser does, and `.is-on` — the class
     this drives — is outranked by the running animation on every layer and
     every card, so the two can never disagree visibly. */
  let pickedKey = $state(NICHES[0].key)
  let focused = $state(false)

  const typedMatch = $derived(resolveNiche(query))
  const noMatch = $derived(query.trim().length > 1 && !typedMatch)
  const shown = $derived(typedMatch ?? NICHES.find((n) => n.key === pickedKey) ?? NICHES[0])

  /* Every keystroke that RESOLVES to a trade moves the track to it. This is
     the whole of the search fix — see `jumpTo` for why a jump beats the old
     "search suspends the tour" override, and why it is not animated. A query
     that resolves to nothing does not move anything: the visitor keeps the
     photograph they were looking at while the card tells them the loom will
     take their trade anyway. */
  $effect(() => {
    const n = typedMatch
    if (n) jumpTo(n)
  })

  function pick(n) {
    query = n.name
    jumpTo(n)
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

  /* ═══ THE PINNED TOUR — DRIVEN BY THE BROWSER, NOT BY THIS FILE ═══════════
     What the visitor sees is unchanged and is the whole point of the section:
     the stage pins to the viewport and one scroll walks them through all
     thirty industries, each photograph and its card resolving in the same
     place on screen. Nobody gets to flick past it.

     WHAT CHANGED IS WHO DRIVES IT (14 Aug 2026). Everything below used to be
     JavaScript: a passive `scroll` listener, a `requestAnimationFrame` hop, a
     cached `pinTop`/`pinHeight` pair re-measured on resize and after fonts
     landed, `Math.floor(progress * 30)` to pick an industry, a seven-wide
     mount window so the next photograph was decoded before it was needed, a
     six-ahead `new Image()` lookahead gated on an IntersectionObserver, and a
     base64 AVIF decode probe to work out which format to warm. Around three
     hundred lines, every one of them written to answer the same question the
     browser was already answering: how far through this track are we.

     `animation-timeline` answers it natively. The track declares a view
     timeline; every layer and every card claims its own slice of that
     timeline via `animation-range`; the browser interpolates on the
     compositor. There is no scroll handler, no rAF, no index state, and
     nothing this component can be a frame late for — which is the class of
     bug this section has been through four fixes for (see the sticky-vs-JS
     note in solutions.css, and CLAUDE.md's "scroll-tour card shake").

     The three JS jobs that existed only to serve the JS tour went with it:
       · the mount window   → `sol-arm-*`, which switches `background-image`
                              on four industries before and six after the
                              current one and back off outside that, so the
                              same seven-ish decodes are live at any moment.
       · the lookahead      → the same rule. A photograph is armed several
                              industries early and decodes while fully
                              transparent, which is exactly what the old
                              `new Image()` warm-up bought.
       · the AVIF probe     → `image-set()` with `type()`. Format negotiation
                              is the browser's job and it never guessed wrong;
                              the probe's only purpose was telling JS which
                              URL to warm, and JS no longer warms anything.

     WHERE SCROLL-DRIVEN ANIMATION IS MISSING (Safari before 26) the section
     is not a degraded tour, it is a different and complete thing: an ordinary
     un-pinned block showing one industry, changed by the search field and by
     the index below it. Both paths render the same markup — `.is-on` is the
     fallback's switch, and a running animation always outranks it, so the two
     can never both apply. The keyframes themselves live inside an
     `@supports` block for exactly this reason: where the feature is missing
     the `animation-name`s below resolve to nothing at all, rather than to a
     zero-duration time-based animation that would snap every layer to its
     end state and blank the stage. */
  let pinEl = $state(null)

  /* Defaults TRUE, and is only ever falsified. This value decides whether the
     track renders seven screens tall or one, so getting it wrong costs a
     layout shift below the fold — and it is wrong far less often as `true`
     (every current engine) than as `false`. Server-rendered markup therefore
     matches what all but a small tail of visitors will hydrate into. */
  let hasTimeline = $state(true)
  $effect(() => {
    if (!browser) return
    hasTimeline = typeof CSS !== 'undefined' && !!CSS.supports?.('animation-timeline', 'view()')
  })
  /* Reduced motion opts OUT of the pin, same as it always has: hijacking the
     scroll is precisely the thing that setting asks us not to do, and the
     section still works as an ordinary block with a search field. */
  const pinned = $derived(hasTimeline && !reducedMotion.current)

  /* ——— EVERY INDUSTRY'S FOUR SCROLL WINDOWS ———
     Computed once, at module evaluation, into static strings — these are
     inline `animation-range` values, not reactive state; nothing here is ever
     recomputed and nothing reads the scroll position.

     The timeline is the pin track's `contain` range, which for a subject
     taller than the viewport runs from "the track's top edge reaches the top
     of the screen" to "its bottom edge reaches the bottom" — i.e. precisely
     the span during which the sticky inner is parked, and precisely the
     `scrollY - pinTop` over `pinHeight - innerHeight` the deleted rAF loop
     computed by hand. One slice per industry.

       show  — the photograph's own opacity ramp, running three tenths of a
               slice wider than its slice at each end so that consecutive
               industries overlap and dissolve rather than meeting at a frame
               where neither is lit. The keyframe stops (12.5/25/75/87.5) put
               the dissolve ITSELF across a tenth of a slice either side of the
               boundary, which is the thing to preserve if these numbers are
               ever retuned: the card hands over exactly on the boundary, so a
               ramp that finishes there instead of straddling it leaves a real
               window — measured at ~30px of scroll before this was corrected —
               where the new photograph is up and the old card is still under
               it, which reads as the copy lagging the picture.
               The first and last take different keyframes so that the stage is
               never blank on the approach into the section or after the
               release out of it.
       arm   — `background-image` on/off. This is the mount window and the
               lookahead in one declaration; see the block comment above.
               Index 0 arms on the `cover` range instead, which begins about a
               screen before the track pins — the old IntersectionObserver's
               `rootMargin: 900px`, restated as geometry.
       card  — the copy. Cards do NOT cross-fade: two blocks of type at
               partial opacity over a photograph is mush, not a transition, so
               each card holds its slice outright and hands over in the ~1% of
               a slice the ranges overlap by. That overlap is deliberate and
               must not be tidied to an exact abutment: shared endpoints leave
               a frame where the outgoing card has filled to hidden and the
               incoming one has not yet begun, which reads as a blink thirty
               times down the page. */
  const N = NICHES.length
  const SLICE = 100 / N
  const at = (v) => `${(Math.min(N, Math.max(0, v)) * SLICE).toFixed(3)}%`
  const imgSet = (base) =>
    `image-set(url("/img/niches/${base}.avif") type("image/avif"), url("/img/niches/${base}.webp") type("image/webp"))`

  const TOUR = NICHES.map((n, i) => ({
    n,
    yarn: YARN_HEX[GROUP_YARN[n.group] ?? 'magenta'],
    // the two sources, as custom properties the stylesheet switches between at
    // the 719px breakpoint — same pairing the <picture> element used to make,
    // and it still has to be the same breakpoint the box changes shape on.
    wide: imgSet(n.key),
    port: imgSet(`${n.key}-9x16`),
    // plain-URL twins, declared first so that an engine without image-set()
    // still paints something. Not dead code: the fallback path below is the
    // only place they are ever used, and it is the path old WebKit takes.
    wide1x: `url("/img/niches/${n.key}.webp")`,
    port1x: `url("/img/niches/${n.key}-9x16.webp")`,
    showName: i === 0 ? 'sol-show-first' : i === N - 1 ? 'sol-show-last' : 'sol-show-mid',
    showRange: `contain ${at(i - 0.3)} contain ${at(i + 1.3)}`,
    // only the LAST industry stays armed past its own window — it is the one
    // still on screen after the track releases. Every other photograph is
    // dropped again once the tour is six industries clear of it.
    armName: i === N - 1 ? 'sol-arm-last' : 'sol-arm-mid',
    armRange:
      i === 0
        ? `cover 0% contain ${at(i + 6)}`
        : `contain ${at(i - 4)} contain ${at(i + 6)}`,
    cardName: i === 0 ? 'sol-card-first' : i === N - 1 ? 'sol-card-last' : 'sol-card-mid',
    cardRange: `contain ${at(i)} contain ${at(i + 1.01)}`,
    tickRange: `contain ${at(i)} contain ${at(i + 1)}`,
  }))

  /* ——— THE SEARCH NO LONGER FIGHTS THE TOUR ———
     It used to: the rAF loop opened with `if (query.length > 0) return`, so
     the moment anything was typed the scroll stopped driving the stage. That
     read as "search wins", and it was the wrong trade in both directions —
     the visitor was still standing inside a seven-screen track that had
     stopped doing anything, with nothing to do but scroll through the dead
     remainder of it, and clearing the field snapped the photograph back to
     whatever industry the scroll position happened to sit on.

     There is nothing to override now. A resolved query SCROLLS THE TRACK to
     that industry's slice, and the tour — the only thing that ever drives the
     stage — shows it because the visitor is genuinely there. The scroll
     position and the search agree by construction rather than by arbitration.

     `behavior: 'auto'`, and it is not a missing nicety. The inner is pinned,
     so a jump inside the track moves nothing on screen except the industry
     itself: the head, the field and the card box all stay exactly where they
     are. A smooth scroll would animate the tour past every industry in
     between on every keystroke, which is the one thing that WOULD move. */
  function jumpTo(n) {
    pickedKey = n.key
    if (!browser || !pinned || !pinEl) return
    const i = NICHES.indexOf(n)
    if (i < 0) return
    const total = pinEl.offsetHeight - window.innerHeight
    if (total <= 0) return
    const top = pinEl.getBoundingClientRect().top + window.scrollY
    // land mid-slice, not on its leading edge — the edge is where two
    // industries are handing over, and arriving there shows the handover
    // instead of the answer.
    window.scrollTo({ top: top + ((i + 0.5) / N) * total, behavior: 'auto' })
  }

  const sectionAccent = $derived(YARN_HEX[GROUP_YARN[shown.group]])

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
        <div class="sol-stage{noMatch ? ' is-empty' : ''}">
          <!-- ——— THE STACK — THIRTY LAYERS, ONE OPACITY EACH ———
               The rule that produced this shape has not changed and must not
               be relaxed: THE VISIBLE LAYER'S SOURCE IS NEVER MUTATED. A
               single element whose `src`/`srcset` (or `background-image`) is
               patched while it is on screen re-runs source selection and
               decodes a new file for the element the reader is looking at, and
               the gap between the write and the decode PAINTS in WebKit —
               which is what the client reported, repeatedly and correctly, as
               the section flickering on scroll. Preloading does not help:
               warming the HTTP cache does not prevent a re-decode on a live
               node. So every industry owns its own layer, and the only thing
               that ever changes on a VISIBLE one is opacity, which is
               composited and cannot force a decode.

               These are `<i>` elements carrying a background, not `<img>`s,
               and that is load-bearing rather than a preference. An `<img>`
               fetches as soon as it is in the document; a background fetches
               when the box is told to paint one. That single difference is
               what lets `sol-arm-*` (see TOUR above) hold thirty sources in
               the markup while only ~7 are ever live — the job the deleted
               `stageNear` mount window and the deleted `new Image()`
               lookahead used to split between them. `image-set()` with
               `type()` does the format negotiation the deleted AVIF probe was
               guessing at, and the `-9x16` twin is switched in by the
               stylesheet at the same 719px breakpoint the stage changes shape
               on — those two have to stay the same number.

               Decorative, and genuinely so: every industry's name, hook, arc
               and deliverables are real text in the card stacked on top of
               this, and all thirty are real text again in the index below. -->
          {#each TOUR as t (t.n.key)}
            <i
              class="sol-stage-bg{t.n.key === shown.key ? ' is-on' : ''}"
              aria-hidden="true"
              style="--sol-w:{t.wide}; --sol-p:{t.port}; --sol-w1:{t.wide1x}; --sol-p1:{t.port1x}; animation-name:{t.armName},{t.showName}; animation-range:{t.armRange},{t.showRange};"
            ></i>
          {/each}
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
              <!-- ——— THIRTY CARDS, NOT ONE CARD RE-TYPED ———
                   CSS cannot rewrite text, so the copy stacks the same way the
                   photographs do: every industry owns its own card and the
                   timeline decides which is visible. That is more DOM than the
                   single re-templated card it replaces, and it buys three
                   things that were previously JS or were simply absent.

                   It buys the CTA back. The deleted tour tracked an index
                   partly so this button could open the wizard pre-filled with
                   the right trade; with no index in JS, a shared button could
                   only have been a generic one. Each card carrying its own
                   means the ask stays specific — `Build my Law Firms system`,
                   opening on Law Firms — with nothing having to know which
                   card that is.

                   It keeps the accessibility tree honest, also with no JS.
                   `sol-card-*` animates `visibility`, not just opacity, so the
                   twenty-nine cards that are not showing are out of the tab
                   order and out of the a11y tree — their headings do not
                   announce and their buttons cannot be reached. `visibility`
                   is the reason those keyframes are not pure opacity; do not
                   simplify them.

                   And it removes the last remount from the scrub. There is no
                   `{#key}` here and there must never be one (see the
                   "scroll-tour card shake" note in CLAUDE.md): the thirty are
                   mounted once, for the life of the page, and the tour only
                   ever changes which one is painted. The `{#if}` above is a
                   real branch — "nothing matched" is a different card, not a
                   different industry — and is the only structural change left
                   in this subtree. -->
              {#each TOUR as t (t.n.key)}
                <article
                  class="sol-panelcard sol-answer sol-tourcard has-photo{t.n.key === shown.key ? ' is-on' : ''}"
                  style="--panel-yarn:{t.yarn}; animation-name:{t.cardName}; animation-range:{t.cardRange};"
                >
                <i class="sol-answer-thread" aria-hidden="true"></i>
                <div class="sol-answer-left">
                  <div class="sol-answer-head">
                    <span class="sol-answer-badge" aria-hidden="true">
                      {@render groupIcon(t.n.group, 'sol-answer-gicon')}
                    </span>
                    <div class="sol-answer-headtext">
                      <p class="sol-answer-kicker">{GROUP_LABEL[t.n.group]}</p>
                      <h3 class="sol-answer-name">{t.n.name}</h3>
                    </div>
                  </div>
                  <p class="sol-answer-hook">{t.n.hook}</p>
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
                  <p class="sol-answer-moon">{t.n.moon}</p>
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
                    label={mobileCta ? 'Get started' : `Build my ${t.n.name} system`}
                    class="sol-cta"
                    onclick={() => wizard.open({ niche: t.n.name })}
                  />
                </div>
                <div class="sol-answer-right">
                  <p class="sol-answer-label sol-sr-only">What resolves for {t.n.name}</p>
                  <ul class="sol-deliverables">
                    {#each t.n.deliverables as d (d)}
                      {@const parts = deliverableParts(d)}
                      <li>
                        <i class="sol-stitch" aria-hidden="true"></i>
                        <span><b class="sol-deliv-t">{parts.title}</b>{#if parts.rest} — {parts.rest}{/if}</span>
                      </li>
                    {/each}
                  </ul>
                  <p class="sol-agent">
                    <span class="sol-agent-kicker">AI agent</span>
                    <span class="sol-agent-copy">{t.n.agent}</span>
                  </p>
                </div>
                </article>
              {/each}
            {/if}
          </div>
        </div>
      </div>

      <!-- ——— THE TOUR'S OWN PROGRESS — THIRTY TICKS, THE CURRENT ONE LIT ———
           This used to read `tourIndex`, which is to say it used to be the
           only reason this component computed one: a numeral ("07"), a filled
           bar, and a total. The numeral is gone with it — CSS can paint a
           position but it cannot count to seven, and reviving a counter here
           would mean reviving the scroll listener for the sake of two digits.

           What replaces it says more anyway. Thirty ticks, one per industry,
           each lit across its own slice of the same timeline the stage runs
           on, and each carrying its group's yarn — so the rail reads as the
           seven categories in proportion and the visitor can see the shape of
           what is left rather than a fraction of it. The sweep underneath is
           one bar scaled across the whole range.

           `animation-fill-mode: none` on the ticks (see solutions.css) is the
           deliberate difference from every other animation in this section: a
           tick outside its own slice must fall back to its resting style, not
           hold a filled end state. Layers and cards need the opposite. -->
      {#if pinned}
        <div class="sol-tour" aria-hidden="true">
          <span class="sol-tour-track">
            <span class="sol-tour-fill"></span>
            <span class="sol-tour-ticks">
              {#each TOUR as t (t.n.key)}
                <i
                  class="sol-tour-tick"
                  style="--tick-yarn:{t.yarn}; animation-range:{t.tickRange};"
                ></i>
              {/each}
            </span>
          </span>
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
