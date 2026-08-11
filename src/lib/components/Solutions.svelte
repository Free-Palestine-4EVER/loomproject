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
  onMount(() => {
    let raf = 0
    const paint = () => {
      raf = 0
      if (!pinEl || !pinned) return
      const total = pinEl.offsetHeight - window.innerHeight
      if (total <= 0) return
      if (query.length > 0) return
      const y = Math.min(Math.max(-pinEl.getBoundingClientRect().top, 0), total)
      const p = y / total
      // clamp on both ends: at p===1 the raw index is NICHES.length, which
      // is past the end of the array and would blank the card on the last
      // frame.
      const idx = Math.min(NICHES.length - 1, Math.max(0, Math.floor(p * NICHES.length)))
      const key = NICHES[idx].key
      if (pinnedKey !== key) pinnedKey = key
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint) }
    paint()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
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

     THREE ahead, not thirty: preloading the whole set would pull ~30
     renders the moment anyone reaches this section, which is worse than the
     problem. */
  $effect(() => {
    if (!browser) return
    const key = shown.key
    const portrait = window.matchMedia('(max-width: 719px)').matches
    const from = NICHES.findIndex((n) => n.key === key)
    if (from < 0) return
    const imgs = []
    for (let k = 1; k <= 3; k++) {
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

  // The photograph and its scrim errors: fall back to the portrait, don't
  // hide. Seven of the thirty industries have only a `-9x16` render on disk;
  // hiding on error meant those seven showed a BLANK stage on desktop.
  function onStageError(n) {
    return (e) => {
      const img = e.currentTarget
      if (img.dataset.fellBack) { img.style.visibility = 'hidden'; return }
      img.dataset.fellBack = '1'
      // THE <source> ELEMENTS HAVE TO GO FIRST. Setting img.src alone does
      // nothing inside a <picture>: the browser has already resolved a
      // <source>, and that resolution wins over any later src assignment.
      const pic = img.parentElement
      if (pic && pic.tagName === 'PICTURE') pic.querySelectorAll('source').forEach((s) => s.remove())
      img.src = `/img/niches/${n.key}-9x16.webp`
    }
  }

  function deliverableParts(d) {
    const cut = d.indexOf(' — ')
    return cut < 0 ? { title: d, rest: '' } : { title: d.slice(0, cut), rest: d.slice(cut + 3) }
  }
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
  class="solutions{merged ? ' solutions--merged' : ''}"
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
            {#key shown.key}
              <picture style="display:contents">
                <source media="(max-width: 719px)" type="image/avif" srcset="/img/niches/{shown.key}-9x16.avif" />
                <source media="(max-width: 719px)" type="image/webp" srcset="/img/niches/{shown.key}-9x16.webp" />
                <source type="image/avif" srcset="/img/niches/{shown.key}.avif" />
                <img
                  class="sol-stage-bg"
                  src="/img/niches/{shown.key}.webp"
                  alt=""
                  width="1400"
                  height="600"
                  decoding="async"
                  onerror={onStageError(shown)}
                />
              </picture>
            {/key}
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
                  <WoolButton
                    label={`Build my ${shown.name} system`}
                    yarn={yarn}
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

      <!-- the breadth IS the claim — every one of the thirty stays reachable
           here, set as one continuous run of grouped type instead of thirty
           bordered rows. -->
      <nav class="sol-index" aria-label="All industries, by category">
        <p class="sol-idx-flow">
          {#each GROUPS as g, gi (g.id)}
            <span class="sol-idx-group" style="--grp-yarn:{YARN_HEX[GROUP_YARN[g.id]]}">
              <span class="sol-idx-label">{@render groupIcon(g.id, 'sol-idx-gicon')}{g.label}</span>&nbsp;
              {#each NICHES.filter((n) => n.group === g.id) as n, i (n.key)}
                <span>
                  <button
                    type="button"
                    class="sol-idx-btn{n.key === shown.key && !noMatch ? ' is-active' : ''}"
                    aria-pressed={n.key === shown.key && !noMatch}
                    onclick={() => pick(n)}
                  >{n.name}</button>
                  {#if i < NICHES.filter((x) => x.group === g.id).length - 1}<span class="sol-idx-sep" aria-hidden="true">·</span>{/if}
                </span>
              {/each}
              {#if gi < GROUPS.length - 1}<span class="sol-idx-gap" aria-hidden="true"> — </span>{/if}
            </span>
          {/each}
        </p>
      </nav>

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

  <!-- ——— THE FOUR EVERYONE GETS ———
       Below the console on purpose. The console answers "what do you build
       for ME"; this answers "and what does everybody get", which only
       matters once they have seen themselves on the page. -->
  <div class="sol-core" use:reveal={{ delay: 0.08 }}>
    <div class="sol-core-head">
      <h3 class="sol-core-title">Every client gets these four</h3>
      <p class="sol-core-sub">The three above are yours alone. These four are the floor.</p>
    </div>
    <ul class="sol-core-grid">
      {#each CORE_SERVICES as c, i (c.title)}
        <li class="sol-core-card">
          <span class="sol-core-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <h4 class="sol-core-h">{c.title}</h4>
          <p class="sol-core-b">{c.blurb}</p>
          <ul class="sol-core-pts">
            {#each c.points as p (p)}<li>{p}</li>{/each}
          </ul>
        </li>
      {/each}
    </ul>
    <p class="sol-entry">
      <span class="sol-entry-tag">Start here</span>
      <span class="sol-entry-title">{ENTRY_OFFER.title}</span>
      <span class="sol-entry-price">{ENTRY_OFFER.price}</span>
      <span class="sol-entry-blurb">{ENTRY_OFFER.blurb}</span>
    </p>
  </div>
</svelte:element>
