<!--
  The header bar and the mobile drawer.

  THE BAR IS AT ITS DOCUMENTED LIMIT — thirteen tabs, verified at ten visible.
  `.nav-links a.is-extra` drops out below 1860px, not 1360: thirteen labels
  overlapped the "Get started" pill at EVERY width from 1380 to 1820. Do not
  nudge that breakpoint by eye; run the nav-fit check, which walks the viewport
  and prints the gap between the last visible tab and the pill.
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { fly, slide } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'

  import { page } from '$app/state'

  import { BRAND, NICHES, NICHE_GROUPS } from '$data/site.js'
  import { magnetic, reducedMotion } from '$lib/motion.svelte.js'
  import { navigate } from '$lib/scroll.svelte.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import { LINKS } from './nav-links.js'

  import WoolButton from './WoolButton.svelte'
  import Chevron from './Chevron.svelte'

  let open = $state(false)
  let scrolled = $state(false)
  let hidden = $state(false)
  let burgerEl = $state(null)
  let menuEl = $state(null)

  /* THE INDUSTRIES DROPDOWN (desktop) / DISCLOSURE (mobile).
     Solutions already owns the 30-niche index by category (NICHES /
     NICHE_GROUPS in data/site.js); this reuses that SAME data rather than
     hardcoding a second list, and reaches the section itself through a
     CustomEvent (`loom:select-niche`) since the long page may not even be
     mounted when the visitor is on a sub-page — navigate() is what actually
     gets them back to '/' and scrolled to #solutions first, and Solutions
     picks the industry up from there. */
  const NAV_GROUPS = NICHE_GROUPS.filter((g) => g.id !== 'all')
  const NAV_GROUP_YARN = {
    food: 'var(--yarn-gold)', health: 'var(--yarn-blue)', beauty: 'var(--yarn-pink)',
    retail: 'var(--yarn-violet)', property: '#e0244a', services: '#a9a8b6',
    creative: 'var(--yarn-cream)',
  }
  const nichesIn = (id) => NICHES.filter((n) => n.group === id)

  // ── the header's scrolled state ──────────────────────────────────────────
  // Hysteresis, not a single threshold: a bar that toggles at exactly one
  // scrollY flickers when a reader rests the page near it.
  /* ── and, on mobile only, whether it is hidden (reinstated 13 Aug 2026) ──
     This existed once (`git show b93029f`), was deleted a few hours later
     because a permanently-fixed desktop bar is simpler and the client had not
     yet asked for retraction back, and is now reinstated for the phone width
     only — the client wants the bar gone on the way down and back the instant
     they scroll up, but the desktop "always fixed, always visible" decision
     from earlier today stands and must not regress. See the long comment on
     `.nav--hidden` in styles.css for why the mobile/desktop split lives in a
     CSS media query rather than an `if (desktop)` around the class name here:
     short version, CSS is authoritative on what actually paints, so a stale
     `hidden` value surviving a resize can never re-show the retract behaviour
     on a desktop viewport by accident.

     `isMobile()` is read fresh every tick rather than cached, because caching
     it would need its own resize listener to stay correct across an orientation
     flip or a dev-tools resize — `matchMedia(...).matches` is one boolean read
     with no allocation, cheaper than the subscription that would replace it.
     On desktop this is the ONLY work the function does before returning, which
     is the "don't run the delta math needlessly on desktop" half of the ask:
     the guard below still executes every scroll tick (removing the listener
     entirely on desktop would need the same resize plumbing this paragraph
     just talked itself out of), it just does nothing past one comparison.

     Three guards on the delta math itself, same as the original and kept for
     the same reasons:
       · a ~6px dead zone — trackpad inertia and rubber-banding emit tiny
         alternating deltas, and a bar that answers those just flickers;
       · never hidden above 120px of scroll, so the top of the page always
         shows its header rather than it vanishing on the first nudge;
       · never hidden while `html.menu-open` or `html.overlay-open` is set —
         retracting the bar out from under an open drawer or case overlay
         leaves that surface's own header (the drawer renders its own close
         affordance, but the burger that reopens it lives in `.nav`) attached
         to nothing the reader can see or tap. */
  onMount(() => {
    let last = window.scrollY
    const isMobile = () => window.matchMedia('(max-width: 939px)').matches
    const fn = () => {
      const y = window.scrollY
      scrolled = y > 56 ? true : y < 32 ? false : scrolled

      if (!isMobile()) { hidden = false; last = y; return }

      const dy = y - last
      if (Math.abs(dy) > 6) {
        const locked = document.documentElement.classList.contains('menu-open') ||
          document.documentElement.classList.contains('overlay-open')
        hidden = dy > 0 && y > 120 && !locked
        last = y
      }
    }
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  })

  // ── the drawer lock ──────────────────────────────────────────────────────
  $effect(() => {
    if (!browser) return
    document.documentElement.classList.toggle('menu-open', open)
    return () => document.documentElement.classList.remove('menu-open')
  })

  /* ── ONE LOCK AT A TIME ───────────────────────────────────────────────────
     THE BUG (client screenshot, 11 Aug 2026): `<html class="menu-open
     overlay-open">` — both locks live, the drawer still mounted and visible
     behind a blurred scrim, and the Forge "Turn a photo into a 3D model" sheet
     sitting on top of it as a strip at the foot of the screen.

     ROOT CAUSE, and it is not the sheet's CSS. The site has two independent
     lock signals and no arbitration between them:
       · `menu-open`    — set here, by this drawer;
       · `overlay-open` — set by Forge.svelte, WizardModal, NeedModal and
                          Work.svelte, each with its own plain
                          `classList.add`/`remove` (NeedModal's own comment
                          already calls out that it is "not reference-counted").
     Nothing ever said the two are mutually exclusive, and one trigger reaches
     across: `.fg-side-tab` — Forge's fixed "TRY 2D TO 3D" ribbon — is
     z-index 91 (forge.css:25) against this drawer's z-index 75 (styles.css),
     so it floats ON TOP of the open menu and is tappable through it. Tapping
     it opened the second surface without ever closing the first, which is
     exactly the state the client photographed. The sheet was not "cut off"
     either: `.fg-scrim` is `place-items: end stretch` and `.fg-panel`'s height
     is content-driven with a 92vh CAP, so a 391px panel on an 844px screen is
     the sheet behaving correctly — it only read as broken because a full
     drawer was still painted behind it.

     THE FIX IS A CLASS-LEVEL ONE, not a special case for Forge: whenever
     ANYTHING claims `overlay-open`, this drawer stands down. That covers the
     wizard and the needs modal (both of which already close the menu at their
     own call sites, so this is a backstop for them) and any overlay added
     later, including ones reached from a fixed control that outranks the
     drawer, without those components having to know the drawer exists.

     No loop: closing sets `open = false`, which removes `menu-open` — another
     class mutation — but by then this effect has already been torn down.

     SCROLL POSITION IS CAPTURED ONCE BY CONSTRUCTION. This drawer deliberately
     does not capture or restore any offset (its lock is purely
     `html.menu-open { overflow: hidden }`); the overlays that do — NeedModal's
     `window.scrollY` capture, Work.svelte's `body { position: fixed; top:
     -lockedY }` pin — are now the only lock on screen when they run, so their
     capture/restore pair can never be nested inside this one. */
  $effect(() => {
    if (!browser || !open) return
    const root = document.documentElement
    const sync = () => { if (root.classList.contains('overlay-open')) open = false }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  })

  // Contain focus and restore it. Trap Tab inside while open, Escape closes,
  // and the cleanup — which fires on EVERY close path, not just Escape — is
  // what hands focus back to the burger.
  $effect(() => {
    if (!browser || !open) return

    const onKey = (e) => {
      if (e.key === 'Escape') { open = false; return }
      if (e.key !== 'Tab') return
      const f = menuEl?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!f || !f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    window.addEventListener('keydown', onKey)
    /* `preventScroll` — 11 Aug 2026, and it is load-bearing now.

       `.menu-content` is a scroll container (`overflow-y: auto`) whose top
       padding is what holds the first link clear of the fixed header. Moving
       focus into a scroll container scrolls that container to bring the target
       flush into view, and "flush" means past the padding: measured at
       390x844, this line scrolled the drawer 92px the instant it ran, putting
       HOME under the header and the kicker off the top of a container the
       reader has no reason to scroll UP in. It was invisible while the drawer
       centred its (shorter) content and became a bug the moment the content
       was taller than the screen — which, with the redesigned two tiers, it
       always is. Focus still lands on the first link; only the scroll
       side-effect is declined. */
    const t = setTimeout(() => menuEl?.querySelector('a, button')?.focus({ preventScroll: true }), 60)

    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
      burgerEl?.focus()
    }
  })

  // `/type` and `/ai-workshops` are paths, not scroll targets: handing
  // navigate() a string like '/type' as a selector would throw. Close the menu
  // and let a non-hash click bubble as an ordinary navigation — SvelteKit's
  // own router picks it up, which is a whole interceptor's worth of code the
  // React build had to write by hand.
  function go(e, href) {
    if (!href.startsWith('#')) { open = false; return }
    e.preventDefault()
    open = false
    navigate(href)
  }

  /* Shared by the desktop dropdown and the mobile disclosure.

     IT USED TO DISPATCH FIRST and then scroll: the target was always
     `#solutions` on the long page, which — if you were already on it — was
     mounted and listening before the click. Solutions is a ROUTE now
     (/solutions, mounting the same component), so from anywhere else on the
     site the dispatch would fire into an empty room: Solutions registers its
     `loom:select-niche` listener in an $effect that cannot run until after the
     route has committed. Navigate first, then dispatch two frames later —
     one frame for Kit to commit, one for the section to mount and subscribe,
     the same pair scroll.svelte.js waits for a cross-page hash. Navigating to
     /solutions while already on it keeps the component (and its listener)
     mounted, so the same order works from there too. */
  async function pickNiche(n) {
    open = false
    dropOpen = false
    await navigate('/solutions')
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        window.dispatchEvent(new CustomEvent('loom:select-niche', { detail: { key: n.key } }))
      )
    )
  }

  // ── desktop industries dropdown ──────────────────────────────────────────
  // A hover/focus-revealed panel anchored to the existing "Solutions" tab —
  // NOT a fourteenth tab and NOT extra width the bar has to fit, since the
  // trigger is the same <a> the nav-fit check already measures. The panel is
  // absolutely positioned and does not participate in that layout.
  let dropOpen = $state(false)
  let closeTimer = null
  const openNow = () => { clearTimeout(closeTimer); dropOpen = true }
  const closeSoon = () => { closeTimer = setTimeout(() => { dropOpen = false }, 180) }

  $effect(() => {
    if (!browser || !dropOpen) return
    const onKey = (e) => { if (e.key === 'Escape') dropOpen = false }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  $effect(() => () => clearTimeout(closeTimer))

  // ── mobile industries disclosure ─────────────────────────────────────────
  let indOpen = $state(false)

  /* ── THE DRAWER'S HIERARCHY ──────────────────────────────────────────────
     Client: "make the menu more designed". It was twelve links at one size,
     one weight and one colour, centred — a list, not a menu, and the reader
     had to read FAQ with the same effort as WORK to find out it wasn't what
     they wanted.

     TIERS ARE DERIVED, NOT RETYPED. `LINKS` (nav-links.js) is the single
     source the desktop bar, this drawer and the footer sitemap all render
     from, and its own header comment is emphatic that a tab added there has
     to turn up everywhere without anyone remembering to edit a second list.
     So this splits that array by href instead of declaring its own: every
     entry lands in exactly one tier (the two filters are complements), in
     LINKS order, with LINKS' own label and href. Add a tab tomorrow and it
     appears here as a secondary link with no edit; promote it by adding its
     href to the set below and nothing else.

     WHY THESE FIVE. They are the four things a stranger can actually buy or
     check — the portfolio, the offer, the price, the way to talk to someone —
     plus Home, which is first in the list because it is first in the scroll.
     Everything else is capability and proof: real destinations, but ones a
     visitor goes to after they have decided to care, which is precisely the
     difference the type sizes now state. */
  const PRIMARY_HREFS = new Set(['#top', '/work', '/solutions', '/pricing', '/contact'])
  const PRIMARY = LINKS.filter((l) => PRIMARY_HREFS.has(l.href))
  const SECONDARY = LINKS.filter((l) => !PRIMARY_HREFS.has(l.href))

  /* WHERE THE READER ACTUALLY IS. A menu that cannot say which of its own
     entries you are looking at is a list of URLs; this is the "active-state
     treatment" the drawer was missing.

     Computed ONCE, when the drawer opens, and never again — deliberately not
     a scroll listener. `html.menu-open { overflow: hidden }` means the page
     physically cannot move while this is on screen, so a listener would fire
     zero times and cost a subscription for it. Route links (/type,
     /ai-workshops) resolve against the pathname; on the long page the hash
     tabs resolve by measurement, taking the last section whose top has passed
     under the header — the same "which band am I in" question a scroll-spy
     answers, asked once instead of sixty times a second. */
  let currentHref = $state(null)
  $effect(() => {
    if (!browser || !open) return
    const path = page.url.pathname
    const route = LINKS.find((l) => !l.href.startsWith('#') && l.href === path)
    if (route) { currentHref = route.href; return }
    if (path !== '/') { currentHref = null; return }

    let best = null
    let bestTop = -Infinity
    for (const l of LINKS) {
      if (!l.href.startsWith('#')) continue
      const el = document.querySelector(l.href)
      if (!el) continue
      // 120px ≈ the fixed bar plus a little — a section counts as "current"
      // once its top has gone under the header, not once it has left the
      // screen entirely.
      const top = el.getBoundingClientRect().top - 120
      if (top <= 0 && top > bestTop) { bestTop = top; best = l.href }
    }
    currentHref = best
  })

  // ── the account control ──────────────────────────────────────────────────
  // Deliberately NOT a fourteenth nav tab. The nav-fit check verifies the bar
  // by measuring the gap between the last visible `.nav-links a` and
  // `.nav-cta`'s left edge, and `.nav-cta` grows leftward as its own content
  // grows — so this rides inside it, sized to add as little width as the
  // burger does, rather than adding a label to LINKS.
  /* ── WHICH TAB IS LIT, IN THE DESKTOP BAR ────────────────────────────────
     `.nav-links a.is-current` used to be written from OUTSIDE this component,
     by a scroll-spy in interactions.js: an IntersectionObserver over a
     hardcoded list of section ids that toggled the class on whichever tab
     matched. That was the only way to answer "where am I" when every tab was
     an anchor into one page.

     Every tab is a route now, so the question is just the pathname and the
     answer is static for the life of the page — no observer, no rAF, and no
     hardcoded second copy of the id list to fall out of sync (it already had:
     'crew', 'ascent', 'lab' and 'own-apps' were still being observed long
     after those sections left the site). The spy has been removed; this is
     what replaced it.

     '#top' — Home, the only hash left in LINKS — lights on the long page and
     nowhere else, which is exactly what it means. */
  const isCurrent = (href) =>
    href.startsWith('#') ? page.url.pathname === '/' : page.url.pathname === href

  /* THE ACCOUNT UI IS GONE (13 Aug 2026). Sign in, the avatar, its menu and
     the outside-click/Escape effect that served it all existed for ONE thing:
     /dashboard, the Forge workspace. Forge is deleted — the band, the popup,
     the dashboard, the auth singleton and the API client with it — so an
     account has nothing left to be an account OF. Nothing else on this site
     is gated, so this header now has exactly one action in it. */

  /* THE MOBILE MENU'S BACKGROUND — code-generated, nothing fetched. Lane,
     size, drift, duration and delay all derive from the index by the same
     integer hash, so the set is identical every time the drawer opens rather
     than reshuffling, and nothing shifts between the server render and a
     rerender. No Math.random anywhere. */
  const petals = Array.from({ length: 14 }, (_, i) => {
    const h = ((i * 2654435761) % 1000) / 1000
    const g = ((i * 40503) % 997) / 997
    return {
      leaf: i % 3 === 0,
      style:
        `--x:${4 + ((i * 6.8) % 92)}%;--s:${0.6 + h * 0.9};--dx:${-70 + g * 130}px;` +
        `--rot:${180 + h * 420}deg;--dur:${9 + h * 8}s;--delay:${-(g * 16).toFixed(2)}s;` +
        `--o:${0.35 + g * 0.35}`,
    }
  })
</script>

<header class="nav {scrolled ? 'nav--scrolled' : ''} {hidden ? 'nav--hidden' : ''}">
  <a class="nav-logo" href="#top" onclick={(e) => go(e, '#top')} aria-label="LOOM — home">
    <img class="logo-woven" src="/img/logo/loom-woven-sm.webp" alt="LOOM" width="480" height="162" />
  </a>

  <nav class="nav-links" aria-label="Primary">
    {#each LINKS as l (l.href)}
      {#if l.href === '/solutions'}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="nav-drop" onmouseenter={openNow} onmouseleave={closeSoon}>
          <a
            href={l.href}
            class="nav-drop-trigger{l.extra ? ' is-extra' : ''}{isCurrent(l.href) ? ' is-current' : ''}"
            aria-current={isCurrent(l.href) ? 'page' : undefined}
            onclick={(e) => { dropOpen = false; go(e, l.href) }}
            onfocus={openNow}
            aria-haspopup="true"
            aria-expanded={dropOpen}
          >
            <span data-text={l.label}>{l.label}</span>
            <Chevron class="nav-drop-chev{dropOpen ? ' is-open' : ''}" />
          </a>

          {#if dropOpen}
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <div
              class="nav-drop-panel"
              role="menu"
              aria-label="Browse by industry"
              transition:fly={{ y: -8, duration: 200, easing: cubicOut }}
              onmouseenter={openNow}
              onmouseleave={closeSoon}
            >
              <p class="nav-drop-lede">Thirty industries — the loom already knows yours.</p>
              <div class="nav-drop-grid">
                {#each NAV_GROUPS as g (g.id)}
                  <div class="nav-drop-col" style="--grp-yarn:{NAV_GROUP_YARN[g.id]}">
                    <p class="nav-drop-glabel">{g.label}</p>
                    <ul>
                      {#each nichesIn(g.id) as n (n.key)}
                        <li>
                          <button type="button" role="menuitem" onclick={() => pickNiche(n)}>{n.name}</button>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <a
          href={l.href}
          class="{l.extra ? 'is-extra' : ''}{isCurrent(l.href) ? ' is-current' : ''}"
          aria-current={isCurrent(l.href) ? 'page' : undefined}
          onclick={(e) => go(e, l.href)}
        >
          <span data-text={l.label}>{l.label}</span>
        </a>
      {/if}
    {/each}
  </nav>

  <div class="nav-cta">
    <div class="magnetic" use:magnetic={{ strength: 0.25 }}>
      <WoolButton label="Get started" size="small" onclick={() => { open = false; wizard.open({}) }} />
    </div>

    <button
      bind:this={burgerEl}
      class="burger {open ? 'is-open' : ''}"
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      onclick={() => (open = !open)}
    ><span></span><span></span></button>
  </div>
</header>

{#if open}
  <div
    class="menu"
    bind:this={menuEl}
    role="dialog"
    aria-modal="true"
    aria-label="Main menu"
    transition:slide={{ duration: 480, easing: cubicOut }}
  >
    <!-- Three layers: a soft gradient ground, two woven hatch passes at a
         whisper of opacity, and a small drift of petals reusing the footer's
         own foot-fall keyframe and hashed-not-random positioning. Reduced
         motion drops the drift and the bloom pulse, keeps the gradient and the
         hatch. -->
    <div class="menu-bg" aria-hidden="true">
      <span class="menu-bg-weave"></span>
      <span class="menu-bg-bloom menu-bg-bloom--a"></span>
      <span class="menu-bg-bloom menu-bg-bloom--b"></span>
      <span class="menu-bg-bloom menu-bg-bloom--c"></span>
      {#if !reducedMotion.current}
        <div class="menu-petals">
          {#each petals as p}<i class={p.leaf ? 'is-leaf' : ''} style={p.style}></i>{/each}
        </div>
      {/if}
    </div>

    <!--
      THE STAGGER IS CSS NOW, NOT TWELVE JS TRANSITIONS.

      Every row carries a `--i` and styles.css runs one `menu-rise` keyframe
      off `animation-delay: calc(var(--i) * 38ms)`. Three reasons it moved:
      it is one declaration instead of a `svelte/transition` instance per row
      (there were fourteen, each with its own rAF tick); the delays are now
      readable as a single ramp in one place rather than as `20 + i * 28`
      arithmetic repeated at four call sites with different constants; and —
      the real one — `in:fly` runs at full amplitude for a reader with
      prefers-reduced-motion, which is what the old markup did on every one of
      those fourteen elements. A keyframe is switched off by the media query
      styles.css already has, so the reduced-motion reader now gets the drawer
      at rest, instantly, without this file having to branch on a rune.

      `--i` is a POSITION IN THE RAMP, not an index into any one list: the
      kicker is 0, the five primary links are 1-5, the secondary block is 6,
      and the industries and the footer meta follow it. That is why the
      secondary grid takes one number for the whole block rather than one per
      chip — seven chips rippling in individually read as a loading state.
    -->
    <div class="menu-content">
      <p class="menu-kicker" style="--i:0">
        <span>Menu</span>
        <i class="menu-kicker-thread" aria-hidden="true"></i>
        <span>Amman, Jordan</span>
      </p>

      <!-- TIER ONE — the four things a stranger can buy or check, plus Home.
           Set in the studio's own LOOM Organic at 40px+ (the face is caps-only
           and stops reading below roughly 40, so the floor is a `max()`, not a
           hope), with the index numerals carrying the rhythm and a yarn thread
           that draws itself under the row you are actually on. -->
      <nav class="menu-primary" aria-label="Main">
        {#each PRIMARY as l, i (l.href)}
          <a
            href={l.href}
            class="menu-p{currentHref === l.href ? ' is-current' : ''}"
            aria-current={currentHref === l.href ? 'page' : undefined}
            style="--i:{i + 1}"
            onclick={(e) => go(e, l.href)}
          >
            <span class="menu-p-idx" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span class="menu-p-word">{l.label}</span>
            <span class="menu-p-thread" aria-hidden="true"></span>
          </a>
        {/each}
      </nav>

      <!-- TIER TWO — capability and proof. Every label and destination is
           unchanged from LINKS; only the weight it is given is. -->
      <nav class="menu-secondary" aria-label="More" style="--i:{PRIMARY.length + 1}">
        <p class="menu-s-label">Also here</p>
        <div class="menu-s-grid">
          {#each SECONDARY as l (l.href)}
            <a
              href={l.href}
              class="menu-s{currentHref === l.href ? ' is-current' : ''}"
              aria-current={currentHref === l.href ? 'page' : undefined}
              onclick={(e) => go(e, l.href)}
            >{l.label}</a>
          {/each}
        </div>
      </nav>

      <!-- The industries are a secondary way in, not competing with WORK /
           SOLUTIONS / PRICING for the same scale of type. -->
      <div style="--i:{PRIMARY.length + 2}" class="menu-rise">
        <div class="menu-industries">
          <button
            type="button"
            class="menu-ind-toggle"
            aria-expanded={indOpen}
            onclick={() => (indOpen = !indOpen)}
          >
            <span>Browse by industry</span>
            <Chevron class="menu-ind-chev{indOpen ? ' is-open' : ''}" />
          </button>

          {#if indOpen}
            <div class="menu-ind-panel" transition:slide={{ duration: 350, easing: cubicOut }}>
              <div class="menu-ind-inner">
                {#each NAV_GROUPS as g (g.id)}
                  <div class="menu-ind-group" style="--grp-yarn:{NAV_GROUP_YARN[g.id]}">
                    <p class="menu-ind-glabel">{g.label}</p>
                    <div class="menu-ind-chips">
                      {#each nichesIn(g.id) as n (n.key)}
                        <button type="button" onclick={() => pickNiche(n)}>{n.name}</button>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="menu-meta" style="--i:{PRIMARY.length + 3}">
        <WoolButton label="Start weaving" size="big" onclick={() => { open = false; wizard.open({}) }} />
        <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp {BRAND.phoneJO}</a>
        <a href="mailto:{BRAND.email}">{BRAND.email}</a>
        <!-- The Sign in / Dashboard / Sign out block that used to sit here was
             left behind when Forge and the `auth` singleton were deleted: it
             still read `auth.loading`, which no longer exists anywhere in this
             file, so opening the drawer threw a ReferenceError. Gone with the
             thing it served. -->
      </div>
    </div>
  </div>
{/if}
