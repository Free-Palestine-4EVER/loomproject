<!--
  THE MACHINE (المصنع) — LOOM's content subscription. Same section grammar as
  Solutions/Process: ThreadDivider, .section-head (kicker/h2/lede), then a
  two-column panel, then a dedicated native-Arabic passage. `mo-` class
  prefix, scoped in machine-offer.css only.

  The "month grid" used to be 22 empty divs standing in for a calendar shape,
  then 20 tiles derived from CASES. It now renders LOOM's OWN posts from
  data/loomPosts.json — see the long note at the import for why that changed
  and what had to change in the copy alongside it. The counters and the
  caption are both DERIVED from that array's length and `kind`, never typed as
  literals here, so the grid can never claim a count the data doesn't back.
-->
<script>
  import Pic from './Pic.svelte'
  import { reducedMotion, reveal, magnetic } from '$lib/motion.svelte.js'
  import { THE_MACHINE } from '$data/offers.js'
  /* ── THE GRID NOW SHOWS LOOM'S OWN POSTS, NOT CLIENT WORK (11 Aug 2026) ──
     Changed at the client's explicit instruction, after the trade-off was put
     to them: the previous grid derived every tile, client name, country and
     year from CASES, and data/machineWork.js opens by explaining why it was
     built that way — an earlier version ran on generic style pieces attached
     to no client, "which forced the caption to admit 'not posts published for
     any one client'. That undercut the section."

     That objection is real and it has NOT gone away, so the copy below now
     says plainly what these are instead of implying a client roster. The
     figcaption no longer claims a client count, the per-tile client tag is
     gone (there is no client to credit), and the reels tally reads zero
     because none of these are video. Nothing here asserts anything the images
     do not support.

     data/machineWork.js and its CASES-derived array are untouched and still in
     the tree — reverting is a two-line import swap. */
  import LOOM_POSTS from '$data/loomPosts.json'
  import { wizard } from '$lib/wizard.svelte.js'

  import SplitWords from './SplitWords.svelte'
  import CountUp from './CountUp.svelte'
  import ThreadDivider from './ThreadDivider.svelte'
  import WoolButton from './WoolButton.svelte'

  import './machine.css'
  import './machine-offer.css'

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'post', label: 'Posts' },
    { id: 'reel', label: 'Reels' },
  ]

  const m = THE_MACHINE

  // Every tile carries `kind` so the filter, the tallies and the caption all
  // stay DERIVED rather than typed — the grid can never claim a count the data
  // does not back. All nineteen are stills today, so `reelsCount` is 0 and the
  // caption's own else-branch says so out loud.
  const WORK = LOOM_POSTS.map((p) => ({ ...p, kind: 'post' }))

  const postsCount = WORK.filter((w) => w.kind === 'post').length
  const reelsCount = WORK.filter((w) => w.kind === 'reel').length
  const totalCount = WORK.length

  let filter = $state('all')
  const visible = $derived(filter === 'all' ? WORK : WORK.filter((w) => w.kind === filter))

  // The cells' pop-in is a CSS animation with a per-cell delay, and a CSS
  // animation starts the moment the element is parsed — mounted at the top of
  // a long page, the whole stagger would have finished long before anyone
  // scrolled here. Gate it on the grid actually being in view, same as the
  // React build's useInView did, via the shared `nearViewport`-style
  // IntersectionObserver pattern but written directly here since it also
  // needs a `once` latch and no fade of its own — reveal() would fight the
  // per-cell stagger CSS already owns.
  let gridEl = $state(null)
  let gridIn = $state(false)
  $effect(() => {
    if (!gridEl || gridIn) return
    if (typeof IntersectionObserver === 'undefined') { gridIn = true; return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { gridIn = true; io.disconnect() }
    }, { rootMargin: '-12% 0px' })
    io.observe(gridEl)
    return () => io.disconnect()
  })

  function onCellError(e) {
    const cell = e.currentTarget.closest('.mo-cell')
    if (cell) cell.style.display = 'none'
  }
</script>

<section class="mo" id="the-machine" style="--mo-tint: var(--cyan)">
  <ThreadDivider />
  <!-- the warp the month is woven on — one painted gradient, no elements -->
  <span class="mo-warp" aria-hidden="true"></span>
  <div class="section-head">
    <p class="kicker">
      <span>—</span> The Machine
      <span class="mo-kicker-ar" lang="ar">{m.nameAr}</span>
    </p>
    <SplitWords as="h2" class="h2" text={m.h2} />
    <p class="lede" style="margin-top: 22px" use:reveal={{ delay: 0.15 }}>{m.ledeEn}</p>
  </div>

  <div class="mo-panel">
    <div class="mo-left" use:reveal>
      <ul class="mo-bullets">
        {#each m.bullets as b (b.en)}
          <li>
            <i class="mo-stitch" aria-hidden="true"></i>
            <span class="mo-bullet-en">{b.en}</span>
            <!-- no dir="rtl" — see the comment on .mo-bullet-ar in
                 machine-offer.css for why -->
            <span class="mo-bullet-ar" lang="ar">{b.ar}</span>
          </li>
        {/each}
      </ul>

      <!-- The price is the section's strongest single claim and it used to be
           its quietest element — a flat bar of body text. It is a plate now:
           the numeral in the display face at headline weight, the hedge
           ("from", and the note) kept deliberately small but never dropped. -->
      <div class="mo-price">
        <span class="mo-price-tag">From</span>
        <p class="mo-price-value">
          <CountUp value={m.priceFromJod} />
          <span class="mo-price-cur">JOD</span>
          <span class="mo-price-unit">/month</span>
        </p>
        <p class="mo-price-note">{m.priceNote}</p>
        <span class="mo-price-ar" lang="ar" aria-hidden="true">{m.nameAr}</span>
      </div>

      <div class="mo-cta-row">
        <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
          <WoolButton
            label={m.ctaLabel}
            class="mo-cta"
            onclick={() => wizard.open({ note: `${m.nameEn} (${m.nameAr}) — content subscription` })}
          />
        </div>
      </div>
    </div>

    <div class="mo-right" use:reveal={{ delay: 0.1 }}>
      <figure class="mo-month">
        <div class="mo-month-top">
          <span class="mo-month-label">Real work, month-shaped</span>
          <!-- a real filter now, not a static colour key — role="radiogroup"
               for the same reason OfferPair's switch is (Banners.jsx): the
               three states are mutually exclusive -->
          <div class="mo-filter" role="radiogroup" aria-label="Filter the grid">
            {#each FILTERS as f (f.id)}
              <button
                type="button"
                role="radio"
                aria-checked={filter === f.id}
                class="mo-filter-opt{filter === f.id ? ' is-active' : ''}"
                onclick={() => (filter = f.id)}
              >
                {#if f.id !== 'all'}
                  <i class="mo-key mo-key--{f.id}" aria-hidden="true"></i>
                {/if}
                {f.label}
                <span class="mo-filter-n">{f.id === 'all' ? totalCount : f.id === 'post' ? postsCount : reelsCount}</span>
              </button>
            {/each}
          </div>
        </div>

        <div bind:this={gridEl} class="mo-grid-viz{gridIn ? ' is-in' : ''}">
          {#if visible.length === 0}
            <p class="mo-grid-empty">No reels in this set yet — see posts.</p>
          {:else}
            {#each visible as w, i (w.id)}
              <span
                class="mo-cell mo-cell--{w.kind}"
                style={reducedMotion.current ? undefined : `--d: ${i * 0.022}s`}
              >
                <!-- THE SIZE, not just the format.

                     These twenty cells render at 58 CSS px on desktop, and the
                     source files are up to 1300px wide — measured, that is ~11x
                     the width and ~125x the pixel data, twenty times over, for
                     the single heaviest image block on the page.

                     <Pic> picks a rung off the generated ladder instead. The
                     `sizes` below is what makes that work: without it a srcset
                     defaults to 100vw, the browser assumes the image fills the
                     screen, and it picks the LARGEST variant — which is exactly
                     the bug we are fixing. The cells are bigger on a phone
                     (the grid drops to fewer columns), hence the two-branch
                     value rather than a flat px.

                     Pic still handles the uneven avif coverage correctly: a
                     <source> is only ever emitted for a file the encoder
                     actually wrote, because <picture> does NOT retry the next
                     source when the chosen one 404s — it would silently blank
                     the tile for every avif-capable browser. -->
                <Pic
                  class="mo-cell-photo"
                  src={w.src}
                  sizes="(max-width: 767px) 22vw, 58px"
                  alt={w.alt}
                  width={w.width}
                  height={w.height}
                  loading="lazy"
                  decoding="async"
                  onerror={onCellError}
                />
              </span>
            {/each}
          {/if}
        </div>

        <div class="mo-month-foot" aria-hidden="true">
          <span class="mo-tally">
            <b>{postsCount}</b> posts
          </span>
          <span class="mo-tally mo-tally--reel">
            <b>{reelsCount}</b> reels
          </span>
          <span class="mo-tally mo-tally--sum">
            <b>{totalCount}</b> pieces
          </span>
        </div>

        <!-- Says exactly what these are. No client is named or implied, because
             none of these were made for one — they are the studio's own feed,
             which is the honest version of the same argument: this is what a
             month off the machine looks like. -->
        <figcaption class="mo-grid-caption">
          {totalCount} pieces from LOOM's own feed, arranged in a month's shape — the studio
          running the machine on itself.
          {#if reelsCount > 0}
            {` ${postsCount} stills, ${reelsCount} reels.`}
          {:else}
            {' All stills; no reels in this set yet — no video asset exists in this build.'}
          {/if}
        </figcaption>
      </figure>
    </div>
  </div>

  <div class="mo-arabic-wrap" use:reveal={{ delay: 0.2 }}>
    <p class="mo-arabic" lang="ar" dir="rtl">{m.arabicPitch}</p>
  </div>
</section>
