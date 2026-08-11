<!--
  AppsIndex — /apps, the FULL CATALOGUE.

  ── WHY THIS IS NOT `<AppsShowcase />` ────────────────────────────────────
  The home page's `#apps` is a scroll-driven stage: ONE product on screen at
  a time, the rail walking itself as you scroll past a pinned card. It is a
  great way to be shown nine things in sequence and a bad way to compare
  them — you cannot see two products at once, you cannot skip to the ones
  that are actually shipped, and the whole thing costs a scroll listener and
  a pin.

  A catalogue is the other shape. Every product is on the page at the same
  time, at the same size, with all six facts it owns (icon, name, tag,
  status, blurb, screens), its store link where one exists, and NO scroll
  hijack of any kind. There is not one scroll listener in this file.

  ── THE HONEST SPLIT IS THE STRUCTURE, NOT A FOOTNOTE ─────────────────────
  suite.js is emphatic that `status` is not decoration: exactly one of the
  nine installs today, five are built but not publicly installable, and three
  are CONCEPTS with nothing behind them. So the page is cut into those three
  bands, each one carrying a sentence saying precisely what it is claiming —
  see ./facts.js for the mechanical test. A concept is never rendered next to
  a shipped app without that line between them, and no product without an
  `href` is ever given a link, a badge or a "coming soon".

  ── THE DEVICE TREATMENT IS DATA, NOT DECORATION ──────────────────────────
  `kind` is a fact about what the FILES are. 'app' → the three captures in a
  three-phone fan; 'software' → the one wide capture in a MacBook display. A
  portrait phone capture is never stretched across a laptop lid and a 720×325
  desktop grab is never crammed into a phone screen. Both frames are the
  site's own CSS mockups (`appscreens.css`, imported not copied) — no frame
  image is fetched — and a `null` slot draws the brand-tinted placeholder
  rather than a broken image.

  Unlike the home page's stage, EVERY product's images are in the document
  here, because a catalogue you have to scroll-drive is not a catalogue.
  They are all `loading="lazy"` below the first band, so the cost is paid by
  the reader who actually scrolls to them.
-->
<script>
  import { SUITE } from '$data/suite.js'
  import { reveal } from '$lib/motion.svelte.js'
  import SplitWords from '$lib/components/SplitWords.svelte'
  import WoolButton from '$lib/components/WoolButton.svelte'
  import {
    BANDS, bandOf, word,
    TOTAL, LIVE_COUNT, CONCEPT_COUNT, BUILT_COUNT, NOT_PUBLIC_COUNT,
    PHONE_COUNT, DESKTOP_COUNT, STATUSES,
  } from './facts.js'
  import '$lib/components/products-stage.css'  // .pi (the icon) and .pstore (the status chip)
  import '$lib/components/appscreens.css'      // .dv-* — the CSS device frames, loaded 2nd on purpose
  import './apps-index.css'                    // this page's own catalogue layout

  // Real pixel dimensions of the icon files in static/img/suite/ — read off
  // the files, never guessed. Screenshot dimensions travel with the shot
  // itself in suite.js, so only the icons need a table. 2D3D and KUN ship no
  // icon at all and fall back to the CSS squircle.
  const ICON_DIMS = {
    'evora-scan': [128, 128], 'quran-noor': [128, 128], kwakwa: [128, 128],
    ellie: [128, 128], lume: [128, 128], tarz: [128, 128], naqi: [128, 128],
  }

  const n2 = (i) => String(i + 1).padStart(2, '0')

  // ── the hero sentence, counted ────────────────────────────────────────
  const HEADLINE =
    `${word(TOTAL)} products of our own — ${word(LIVE_COUNT).toLowerCase()} you can install ` +
    `right now, and we say so about the rest.`

  /* The fourth tile is the one that has to move with the data. suite.js used
     to carry three concept products and they were cut on 11 Aug 2026 for
     exactly the reason this page exists — a drawn screen beside a real one
     reads as fake — so CONCEPT_COUNT is 0 today. A tile reading "0 · CONCEPTS,
     NOTHING BUILT" is not honesty, it is a boast about an empty set taking up
     a quarter of the strip; the platform split is a fact the data actually
     has. The concept tile returns by itself the day a concept does. */
  const STATS = [
    { v: String(TOTAL), l: 'Products in the suite' },
    { v: String(LIVE_COUNT), l: 'Installable today' },
    { v: String(NOT_PUBLIC_COUNT), l: 'Built, not public yet' },
    CONCEPT_COUNT > 0
      ? { v: String(CONCEPT_COUNT), l: 'Concepts, nothing built' }
      : { v: `${PHONE_COUNT} / ${DESKTOP_COUNT}`, l: 'iPhone / desktop browser' },
  ]

  /* The last line of the lede is a CLAIM ABOUT WHAT IS BELOW IT, so it is
     written from the same counts as the bands rather than typed. The page
     shipped saying "the three at the bottom are drawings" — true of the nine
     products suite.js used to carry, false of the six it carries now, and the
     exact kind of sentence that rots silently because nothing on screen
     changes when the data does. Both branches are true of the data that
     produces them. */
  const HONESTY =
    CONCEPT_COUNT > 0
      ? `The ${word(CONCEPT_COUNT).toLowerCase()} at the bottom ` +
        `${CONCEPT_COUNT === 1 ? 'is a drawing' : 'are drawings'} — designed, not built. ` +
        `We would rather tell you that than sell you a waiting list.`
      : `Nothing on this page is a mockup: every screen below is a capture of software that ` +
        `runs. ${word(NOT_PUBLIC_COUNT)} of them have no public download yet, and each one ` +
        `says so plainly instead of offering you a waiting list.`

  // ── status filter ─────────────────────────────────────────────────────
  // Chips are built from the distinct `status` strings in the data, so a new
  // status in suite.js appears here on its own.
  let status = $state('all')
  const countForStatus = (s) => (s === 'all' ? TOTAL : SUITE.filter((p) => p.status === s).length)
  const visible = $derived(status === 'all' ? SUITE : SUITE.filter((p) => p.status === status))
  const shownIn = (id) => visible.filter((p) => bandOf(p) === id)

  /* One running index across the whole visible catalogue, so the numbering a
     reader sees ("03 / 09") counts what is actually on screen rather than
     jumping around gaps left by the filter. */
  const orderOf = $derived.by(() => {
    const map = new Map()
    let n = 0
    for (const band of BANDS) for (const p of visible.filter((x) => bandOf(x) === band.id)) map.set(p.key, n++)
    return map
  })
</script>

<!-- The product icon. Seven of the nine ship a real icon file; 2D3D and KUN
     don't — they are desktop tools, not app-store products with a square
     glyph — so those draw the CSS squircle carrying the product's initial.
     No image request, no 404. -->
{#snippet productIcon(it)}
  {#if it.icon}
    {@const d = ICON_DIMS[it.key] || [128, 128]}
    <span class="pi pi--photo px-icon">
      <img src={it.icon} alt="" aria-hidden="true" loading="lazy" decoding="async" width={d[0]} height={d[1]} />
    </span>
  {:else}
    <span class="pi px-icon" style="--g1:{it.grad[0]};--g2:{it.grad[1]}" aria-hidden="true">
      <em>{it.name.trim()[0]}</em>
    </span>
  {/if}
{/snippet}

<!-- A `shot` is either `{ src, w, h }` or `null`, and `null` is a first-class
     case: it draws a soft panel in the product's own two colours carrying its
     initial. There is no <img> in that branch, so nothing is requested and
     nothing 404s. -->
{#snippet screen(shot, it, label)}
  {#if shot}
    <img src={shot.src} width={shot.w} height={shot.h} loading="lazy" decoding="async" alt="{it.name} — {label}" />
  {:else}
    <div class="dv-ph" aria-hidden="true"><em>{it.name.trim()[0]}</em></div>
  {/if}
{/snippet}

{#snippet phone(shot, it, label)}
  <div class="dv-phone">
    <div class="dv-screen">
      {@render screen(shot, it, label)}
      <span class="dv-island" aria-hidden="true"></span>
    </div>
  </div>
{/snippet}

{#snippet laptop(shot, it)}
  <div class="dv-mac">
    <div class="dv-lid">
      <span class="dv-cam" aria-hidden="true"></span>
      <div class="dv-screen">{@render screen(shot, it, 'desktop screenshot')}</div>
    </div>
    <div class="dv-base" aria-hidden="true"></div>
  </div>
{/snippet}

<!-- ═══ 1. HERO ════════════════════════════════════════════════════════ -->
<section class="px-hero" aria-labelledby="px-title">
  <div class="section-head">
    <p class="kicker"><span>—</span> The suite</p>
    <SplitWords as="h1" class="h2" text={HEADLINE} />
    <div use:reveal={{ delay: 0.15 }}>
      <p class="lede" style="margin-top:22px">
        {PHONE_COUNT} of them run on iPhone and {DESKTOP_COUNT} in a desktop
        browser. This page is the whole catalogue, all of it on one screen —
        every product with what it does, the screens it actually has, and the
        exact stage it is at. {HONESTY}
      </p>
    </div>
  </div>

  <div class="px-stats" use:reveal={{ delay: 0.2, y: 24 }}>
    {#each STATS as s (s.l)}
      <div class="px-stat"><b>{s.v}</b><span>{s.l}</span></div>
    {/each}
  </div>
</section>

<!-- ═══ 2. STATUS FILTER ═══════════════════════════════════════════════
     Chips come from the data's own `status` strings. Nothing is renamed on
     the way through — 'Concept' says Concept. -->
<section class="px-controls" aria-label="Filter products by status">
  <div use:reveal={{ delay: 0.05, y: 22 }}>
    <p class="px-ctl-label" id="px-lbl-status">Status</p>
    <div class="px-chips" role="group" aria-labelledby="px-lbl-status">
      <button
        type="button" class="filter px-chip" class:is-active={status === 'all'}
        aria-pressed={status === 'all'} onclick={() => (status = 'all')} data-cursor
      >All<i>{TOTAL}</i></button>
      {#each STATUSES as s (s)}
        <button
          type="button" class="filter px-chip" class:is-active={status === s}
          aria-pressed={status === s} onclick={() => (status = s)} data-cursor
        >{s}<i>{countForStatus(s)}</i></button>
      {/each}
    </div>
    <p class="px-result" aria-live="polite">
      <b>{visible.length}</b> of {TOTAL} shown
      {#if status !== 'all'}
        <button type="button" class="px-clear" onclick={() => (status = 'all')} data-cursor>Show all</button>
      {/if}
    </p>
  </div>
</section>

<!-- ═══ 3. THE CATALOGUE, IN THREE HONEST BANDS ════════════════════════ -->
{#each BANDS as band, bi (band.id)}
  {@const items = shownIn(band.id)}
  {#if items.length}
    <section class="px-band px-band--{band.id}" aria-labelledby="px-band-{band.id}">
      <div class="px-band-head" use:reveal={{ y: 22 }}>
        <h2 id="px-band-{band.id}">
          <span class="px-band-n">{n2(bi)}</span>
          {band.label}
          <i>{items.length}</i>
        </h2>
        <p>{band.note}</p>
      </div>

      <div class="px-list">
        {#each items as it (it.key)}
          <article class="px-item" class:is-flipped={(orderOf.get(it.key) ?? 0) % 2 === 1}>
            <div class="px-info" use:reveal={{ y: 24 }}>
              <p class="px-index">{n2(orderOf.get(it.key) ?? 0)} <i>/</i> {n2(visible.length - 1)}</p>
              <div class="px-id">
                {@render productIcon(it)}
                <div>
                  <h3>{it.name}</h3>
                  <p class="px-tag">{it.tag}</p>
                </div>
              </div>
              <p class="px-blurb">{it.blurb}</p>
              <div class="px-meta">
                <span class="pstore" data-s={it.status}><i></i>{it.status}</span>
                <span class="px-kind">{it.kind === 'app' ? 'iPhone' : 'Desktop browser'}</span>
              </div>
              <!-- The link slot exists for every product; the LINK exists only
                   where suite.js carries an href. A store badge that 404s
                   costs more trust than the badge ever earned, so the
                   alternative is a plain sentence saying there is nowhere to
                   send you — never a disabled button pretending to be one. -->
              <div class="px-cta">
                {#if it.href}
                  <a class="px-store" href={it.href} target="_blank" rel="noreferrer" data-cursor>
                    View on the App Store
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M17 7H9M17 7v8" /></svg>
                  </a>
                {:else}
                  <p class="px-nolink">
                    {#if it.status === 'Concept'}
                      No build, no link — this is a design.
                    {:else}
                      No public download yet.
                    {/if}
                  </p>
                {/if}
              </div>
            </div>

            <!-- `--dv-h` is the height contract every device frame in
                 appscreens.css sizes itself from. On the home page it is set
                 by `.stg`; this page has no `.stg`, so it is set here, and
                 the responsive steps live in apps-index.css beside it. -->
            <div
              class="px-stagebox"
              class:is-phones={it.kind === 'app'}
              class:is-laptop={it.kind !== 'app'}
              style="--g1:{it.grad[0]};--g2:{it.grad[1]}"
              use:reveal={{ y: 24, delay: 0.06 }}
            >
              <div class="dv-stage">
                {#if it.kind === 'app'}
                  <div class="dv-fan">
                    <div class="dv-slot dv-slot--l">{@render phone(it.shots[1], it, 'app screenshot 2')}</div>
                    <div class="dv-slot dv-slot--m">{@render phone(it.shots[0], it, 'app screenshot 1')}</div>
                    <div class="dv-slot dv-slot--r">{@render phone(it.shots[2], it, 'app screenshot 3')}</div>
                  </div>
                {:else}
                  <div class="dv-slot dv-slot--m">{@render laptop(it.shots[0], it)}</div>
                {/if}
              </div>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}
{/each}

<!-- ═══ 4. CLOSING BAND ════════════════════════════════════════════════ -->
<section class="px-end" aria-labelledby="px-end-h">
  <div use:reveal={{ y: 26 }}>
    <p class="kicker"><span>—</span> Next</p>
    <h2 class="h2" id="px-end-h">{BUILT_COUNT} of these are running software. We build them the same way for clients.</h2>
    <p class="lede" style="margin-top:20px">
      Everything above was designed, built and shipped in-house — the app, the
      brand around it and the screens it is sold with. If you have a product
      that needs the same, or want to see what that looks like for someone
      else's brand, both roads are one click away.
    </p>
    <div class="px-end-cta">
      <WoolButton label="Start a project" href="/contact" />
      <a class="px-link" href="/work" data-cursor>
        See the client work
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M17 7H9M17 7v8" /></svg>
      </a>
    </div>
  </div>
</section>
