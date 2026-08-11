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

  import { BRAND, NICHES, NICHE_GROUPS } from '$data/site.js'
  import { magnetic, reducedMotion } from '$lib/motion.svelte.js'
  import { navigate } from '$lib/scroll.svelte.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import { auth } from '$lib/auth.svelte.js'
  import { LINKS } from './nav-links.js'

  import WoolButton from './WoolButton.svelte'
  import Chevron from './Chevron.svelte'

  let open = $state(false)
  let scrolled = $state(false)
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
  onMount(() => {
    const fn = () => { scrolled = window.scrollY > 56 ? true : window.scrollY < 32 ? false : scrolled }
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
    const t = setTimeout(() => menuEl?.querySelector('a, button')?.focus(), 60)

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

  // Shared by the desktop dropdown and the mobile disclosure. Dispatches FIRST
  // so a listener already mounted on the long page can act on it the instant
  // the scroll lands.
  function pickNiche(n) {
    window.dispatchEvent(new CustomEvent('loom:select-niche', { detail: { key: n.key } }))
    open = false
    dropOpen = false
    navigate('#solutions')
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

  // ── the account control ──────────────────────────────────────────────────
  // Deliberately NOT a fourteenth nav tab. The nav-fit check verifies the bar
  // by measuring the gap between the last visible `.nav-links a` and
  // `.nav-cta`'s left edge, and `.nav-cta` grows leftward as its own content
  // grows — so this rides inside it, sized to add as little width as the
  // burger does, rather than adding a label to LINKS.
  let authOpen = $state(false)
  let authEl = $state(null)

  $effect(() => {
    if (!browser || !authOpen) return
    const onDoc = (e) => { if (authEl && !authEl.contains(e.target)) authOpen = false }
    const onKey = (e) => { if (e.key === 'Escape') authOpen = false }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  })

  const initial = $derived((auth.user?.email || '?').trim().charAt(0).toUpperCase() || '?')

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

<header class="nav {scrolled ? 'nav--scrolled' : ''}">
  <a class="nav-logo" href="#top" onclick={(e) => go(e, '#top')} aria-label="LOOM — home">
    <img class="logo-woven" src="/img/logo/loom-woven-sm.webp" alt="LOOM" width="480" height="162" />
  </a>

  <nav class="nav-links" aria-label="Primary">
    {#each LINKS as l (l.href)}
      {#if l.href === '#solutions'}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="nav-drop" onmouseenter={openNow} onmouseleave={closeSoon}>
          <a
            href={l.href}
            class="nav-drop-trigger{l.extra ? ' is-extra' : ''}"
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
        <a href={l.href} class={l.extra ? 'is-extra' : undefined} onclick={(e) => go(e, l.href)}>
          <span data-text={l.label}>{l.label}</span>
        </a>
      {/if}
    {/each}
  </nav>

  <div class="nav-cta">
    <div class="magnetic" use:magnetic={{ strength: 0.25 }}>
      <WoolButton label="Get started" size="small" onclick={() => { open = false; wizard.open({}) }} />
    </div>

    <!-- Signed out: a small pill that is the ONLY way into /dashboard from the
         header, since that route has no nav tab either. Signed in: a round
         initial that opens a two-item menu. `loading` renders NOTHING rather
         than flashing "Sign in" before an existing session resolves. -->
    {#if !auth.loading}
      {#if !auth.user}
        <a class="nav-auth-pill" href="/dashboard" aria-label="Sign in to your account">Sign in</a>
      {:else}
        <div class="nav-auth" bind:this={authEl}>
          <button
            type="button"
            class="nav-auth-avatar"
            aria-haspopup="menu"
            aria-expanded={authOpen}
            aria-label="Account menu — {auth.user.email || 'signed in'}"
            onclick={() => (authOpen = !authOpen)}
          >{initial}</button>

          {#if authOpen}
            <div class="nav-auth-menu" role="menu" transition:fly={{ y: -6, duration: 180, easing: cubicOut }}>
              <span class="nav-auth-email">{auth.user.email}</span>
              <a role="menuitem" href="/dashboard" onclick={() => (authOpen = false)}>Dashboard</a>
              <button type="button" role="menuitem" onclick={() => { authOpen = false; auth.signOut() }}>Sign out</button>
            </div>
          {/if}
        </div>
      {/if}
    {/if}

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

    <div class="menu-content">
      <div class="menu-links">
        {#each LINKS as l, i (l.href)}
          <a
            href={l.href}
            onclick={(e) => go(e, l.href)}
            in:fly={{ y: 60, duration: 300, delay: 20 + i * 28, easing: cubicOut }}
          >{l.label}</a>
        {/each}
      </div>

      <!-- The industries are a secondary way in, not competing with WORK /
           SOLUTIONS / PRICING for the same scale of type. -->
      <div in:fly={{ y: 24, duration: 300, delay: 20 + LINKS.length * 28, easing: cubicOut }}>
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

      <div class="menu-meta" in:fly={{ y: 0, duration: 300, delay: 300, easing: cubicOut }}>
        <WoolButton label="Start weaving" size="big" onclick={() => { open = false; wizard.open({}) }} />
        <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp {BRAND.phoneJO}</a>
        <a href="mailto:{BRAND.email}">{BRAND.email}</a>
        {#if !auth.loading}
          {#if !auth.user}
            <a href="/dashboard" onclick={() => (open = false)}>Sign in</a>
          {:else}
            <a href="/dashboard" onclick={() => (open = false)}>Dashboard — {auth.user.email}</a>
            <button type="button" onclick={() => { auth.signOut(); open = false }}>Sign out</button>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}
