<!--
  Two cities, one thread drawn between their cards, plus a live local clock
  each. The clock is the section's real asset — it leads each card and is the
  one thing on the page that keeps moving after the entrance settles.
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { BRAND } from '$data/site.js'
  import { reducedMotion, reveal } from '$lib/motion.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import './sections-stage.css'
  import './studios.css'

  // Studio hours are a visual threshold only (drives the awake pill and the
  // day/night tint of each card) — not a claim printed anywhere, so there is
  // nothing here for the client's "verify every number" rule to catch.
  const STUDIO_OPEN = 9
  const STUDIO_CLOSE = 19

  /** Local clock for one city, plus the two derived numbers the card actually
   *  needs to *show* the time-zone story instead of just stating it: `hour`
   *  for the awake/asleep pill, `dayFrac` (0–1 through the 24h clock) for the
   *  daytrack marker's position. One Intl formatter, parsed once per tick
   *  rather than three separate `format()` calls for the same instant.
   *
   *  SSR: the clock cannot know the visitor's real time on the server, so it
   *  starts at the same placeholder in every environment ('--:--', noon) —
   *  never a server-computed wall clock, which would be wrong the instant it
   *  reached the browser and would mismatch whatever the client computes on
   *  hydration. `onMount` is what turns it into the real, ticking value; it
   *  is genuinely client-only, unlike this file's use of `use:reveal`. */
  function cityClock(tz) {
    let display = $state('--:--')
    let hour = $state(12)
    let dayFrac = $state(0.5)

    onMount(() => {
      const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
      const tick = () => {
        const parts = fmt.formatToParts(new Date())
        const h = Number(parts.find((p) => p.type === 'hour').value)
        const m = Number(parts.find((p) => p.type === 'minute').value)
        display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        hour = h
        dayFrac = (h + m / 60) / 24
      }
      tick()
      const id = setInterval(tick, 30_000)
      return () => clearInterval(id)
    })

    return {
      get display() { return display },
      get hour() { return hour },
      get dayFrac() { return dayFrac },
    }
  }

  const amman = cityClock('Asia/Amman')
  const sarajevo = cityClock('Europe/Sarajevo')

  const cities = [
    { name: 'Amman', country: 'Jordan', role: 'HQ — strategy, AI & production', clock: amman, phone: BRAND.phoneJO, href: BRAND.whatsapp, action: 'WhatsApp us' },
    { name: 'Sarajevo', country: 'Bosnia & Herzegovina', role: 'Design & campaign studio', clock: sarajevo, phone: 'By appointment', href: `mailto:${BRAND.email}`, action: 'Email the studio' },
  ]

  /** Measures the Amman and Sarajevo cards and builds a single quadratic-bezier
   *  thread between them — over their top edges side by side (desktop), or
   *  through the row gap between them stacked (mobile; see `stacked` below).
   *  Apex is the true bezier midpoint, not a guess, so the "2,100 km" label
   *  always sits exactly on the line — in the layouts that show that label at
   *  all; see the render side for why stacked doesn't. */
  let stageEl = $state(null)
  let cardEls = $state([null, null])
  let geo = $state(null)

  onMount(() => {
    const stage = stageEl
    if (!stage) return

    // Top-edge anchor in the stage's own coordinates, read from the layout box
    // rather than getBoundingClientRect: the cards ride a fade-rise entrance
    // (and a hover lift), so a rect measured mid-transform pins the arc below
    // where the cards settle — i.e. through them instead of over them. It has
    // to walk the offsetParent chain, not read offsetTop once — `reveal`'s own
    // inline transform makes the element its own offsetParent even though it
    // is position:static.
    const anchor = (el, xf, yf = 0) => {
      let x = 0, y = 0
      for (let n = el; n && n !== stage; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop }
      return { x: x + el.offsetWidth * xf, y: y + el.offsetHeight * yf }
    }

    const measure = () => {
      const a = cardEls[0]
      const b = cardEls[1]
      if (!a || !b) return
      const topA = anchor(a, 0.86, 0)
      const topB = anchor(b, 0.14, 0)
      // Side-by-side (desktop grid) the cards' top edges sit at nearly the
      // same y and far apart in x; stacked (mobile, one column) it is the
      // reverse. Comparing |dy| to |dx| reads the layout straight off the DOM
      // rather than duplicating the grid's own breakpoint here.
      const stacked = Math.abs(topB.y - topA.y) > Math.abs(topB.x - topA.x)
      let p0, p2, ctrl
      if (stacked) {
        // "Over the top edges" only reads as a thread pulled taut when the
        // cards are side by side — applied to a stacked column it draws a
        // loop above Amman, over its own header, before dropping down past
        // its full height to reach Sarajevo. Anchoring bottom-of-Amman to
        // top-of-Sarajevo instead keeps the curve entirely inside the row gap
        // between them, where it can't cross either card's content.
        p0 = anchor(a, 0.5, 1)
        p2 = anchor(b, 0.5, 0)
        ctrl = { x: (p0.x + p2.x) / 2 + 22, y: (p0.y + p2.y) / 2 }
      } else {
        p0 = topA
        p2 = topB
        ctrl = { x: (p0.x + p2.x) / 2, y: Math.min(p0.y, p2.y) - 92 }
      }
      const apex = {
        x: 0.25 * p0.x + 0.5 * ctrl.x + 0.25 * p2.x,
        y: 0.25 * p0.y + 0.5 * ctrl.y + 0.25 * p2.y,
      }
      geo = {
        w: stage.offsetWidth, h: stage.offsetHeight,
        d: `M ${p0.x} ${p0.y} Q ${ctrl.x} ${ctrl.y} ${p2.x} ${p2.y}`,
        apex, stacked,
      }
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  })
</script>

<section class="studios" id="studio">
  <div class="section-head">
    <p class="kicker"><span>—</span> Studios</p>
    <SplitWords as="h2" class="h2" text="Two cities. One loom." />
    <p class="lede" style="margin-top: 22px" use:reveal={{ delay: 0.15 }}>
      Two thousand one hundred kilometres of thread between Amman and Sarajevo, pulled tight.
      When one studio sleeps, the other is already sewing.
    </p>
  </div>

  <div class="studios-stage" bind:this={stageEl}>
    {#if geo}
      <div class="studios-thread" aria-hidden="true">
        <svg class="studios-arc" viewBox="0 0 {geo.w} {geo.h}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="studios-arc-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="var(--magenta)" stop-opacity="0.65" />
              <stop offset="50%" stop-color="var(--cyan)" stop-opacity="0.8" />
              <stop offset="100%" stop-color="var(--magenta)" stop-opacity="0.65" />
            </linearGradient>
          </defs>
          <path d={geo.d} stroke="url(#studios-arc-grad)" stroke-width="1.6" fill="none" stroke-dasharray="1 7" stroke-linecap="round" />
        </svg>
        {#if browser && !reducedMotion.current}
          <span class="studios-arc-pulse" style="offset-path: path('{geo.d}')"></span>
        {/if}
        <!-- Stacked, the whole gap the curve has to fit in is one row-gap
             (18–40px) tall — nowhere near enough for this label without it
             lapping into a card's own padding. The dashed thread and the
             travelling pulse still make the same point on mobile; this one
             badge is the one piece of the desktop treatment that doesn't
             survive the narrower stage. -->
        {#if !geo.stacked}
          <span class="studios-arc-label" style="left: {geo.apex.x}px; top: {geo.apex.y}px">
            <i></i>2,100 km
          </span>
        {/if}
      </div>
    {/if}

    <div class="studios-grid">
      {#each cities as c, i (c.name)}
        {@const isAwake = c.clock.hour >= STUDIO_OPEN && c.clock.hour < STUDIO_CLOSE}
        {@const isDay = c.clock.hour >= 6 && c.clock.hour < 19}
        <div use:reveal={{ delay: i * 0.1 }}>
          <article
            class="studio-card {isDay ? 'is-day' : 'is-night'}"
            bind:this={cardEls[i]}
            data-cursor
          >
            <header>
              <h3>{c.name}</h3>
              <span class="studio-pill {isAwake ? 'is-awake' : 'is-asleep'}">
                <i aria-hidden="true"></i>{isAwake ? 'Awake' : 'Asleep'}
              </span>
            </header>
            <p class="studio-country">{c.country}</p>
            <div class="studio-clock" aria-label="Local time in {c.name}">
              <span class="studio-clock-time">{c.clock.display}</span>
              <span class="studio-clock-tz" aria-hidden="true">local</span>
            </div>
            <div class="studio-daytrack" aria-hidden="true">
              <span class="studio-daytrack-band"></span>
              {#each [6, 12, 18] as h (h)}
                <i class="studio-daytrack-tick" style="left: {(h / 24) * 100}%"></i>
              {/each}
              <span
                class="studio-daytrack-mark {isDay ? 'is-sun' : 'is-moon'}"
                style="left: {c.clock.dayFrac * 100}%"
              ></span>
            </div>
            <p class="studio-role">{c.role}</p>
            <footer>
              <span>{c.phone}</span>
              <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{c.action} →</a>
            </footer>
          </article>
        </div>
      {/each}
    </div>
  </div>
</section>
