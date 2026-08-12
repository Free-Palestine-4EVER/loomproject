<!--
  LOOM FORGE — "send a photo, get a 3D model", 2 JOD each, first one free.

  TWO SURFACES, ONE FLOW. This component renders a small band on the long page
  (#forge, in the SELL run) and owns the popup that does the actual work. The
  band's job is the pitch and the price; every interactive step — account,
  upload, progress, download, payment — happens inside the modal. That split
  is deliberate: the whole feature is one narrow funnel, and a funnel spread
  across a section AND a dialog gives the visitor two places to be half way
  through it.

  WHAT IS AND IS NOT AUTHORITATIVE HERE. Nothing in this file decides whether
  a model is free. `profile.nextIsFree` / `canGenerate` come from the server
  and are used ONLY to pick which panel to paint; the forge function re-checks
  the entitlement inside a Firestore transaction on every generate, and a 402
  coming back is the real answer. Editing this file cannot give anyone a free
  model, which is the property that matters.

  The modal reuses the site's overlay contract rather than inventing a second
  one — `.overlay-open` on <html>, Escape to close, a Tab focus trap (the
  idiom is Nav.svelte's), and a bottom-sheet-shaped panel on phones via CSS
  (forge.css's `.fg-panel.is-sheet` media query) rather than the React build's
  hand-rolled drag-physics sheet (lib/sheet.jsx) — that primitive has not been
  ported, and PORTING.md rule 2 says a spring simulation on the main thread is
  exactly what Svelte's built-in transitions are here to replace. Escape, the
  scrim click, and the close button all still work identically on phone and
  desktop; a phone reader loses the drag-to-dismiss gesture, not the ability
  to close it.

  THE POPUP NEVER OPENS ITSELF. It used to auto-open once per visitor, 14s in,
  gated on a localStorage flag — the client asked for that gone outright
  (11 Aug 2026): it opens from exactly two explicit clicks and nothing else.
  There is no timer and no seen-flag anywhere below.

    1. the #forge section's own "Make one free" CTA;
    2. the woven side tab (`.fg-side-tab`) — a vertical "Try 2D to 3D" ribbon,
       `position: fixed` to the right edge, vertically centered, on every
       viewport. It renders from inside THIS component precisely so it can
       live fixed-to-viewport without the long page needing to mount anything
       "next to the hero" — being `position: fixed`, it reads as parked by the
       hero without being in its DOM subtree.
-->
<script>
  import { browser } from '$app/environment'
  import { fade } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { reveal, magnetic, reducedMotion } from '$lib/motion.svelte.js'
  import { BRAND, CLIQ } from '$data/site.js'
  import WoolButton from './WoolButton.svelte'
  import Pic from './Pic.svelte'
  import ForgeBand from './ForgeBand.svelte'
  import {
    register, signIn, signOut, sendReset, isSignedIn,
    me, startJob, jobStatus, createOrder, fileToDataUrl, ForgeError,
  } from '$lib/forge.js'

  import './forge.css'

  const PRICE_JOD = 2

  /** The four files a finished job actually comes back with — the same four
   *  the popup lists for download off `job.modelUrls`. Named here so the band
   *  prints them in exactly one place instead of twice (the pipeline caption
   *  and the offer plate both read this array). The popup's own list is
   *  deliberately in a DIFFERENT order — glb, usdz, fbx, obj, the two useful
   *  ones first, next to a line explaining what each is for — so it is left
   *  spelled out there rather than sorted to match this. Same four files
   *  either way; if the pipeline ever stops returning one, both lists have to
   *  change. */
  const FORMATS = ['GLB', 'FBX', 'OBJ', 'USDZ']

  /** The three stations of the band, in order.
   *
   *  EVERY CAPTION IS THE OLD LEDE, VERBATIM AND IN ORDER. The band used to
   *  carry one paragraph — "One picture of the thing — a chair, a bottle, a
   *  shoe, a part — and our pipeline rebuilds it as real geometry you can
   *  spin, light and drop into a website, a game or an AR view. About a
   *  minute per model." — under the headline. It is not rewritten here, it is
   *  cut into the three pieces it was always three pieces of, so each one
   *  lands beside the picture of the stage it describes. Read the three
   *  captions plus the chip end to end and you have that sentence back.
   *
   *  THE PICTURES ARE ONE OBJECT AT THREE STAGES. That is the whole point and
   *  it is the thing to preserve if these are ever regenerated: the same sofa
   *  in all three, or the band goes back to illustrating a transformation it
   *  does not show. The source still is LOOM's own studio work. */
  const STAGES = [
    {
      id: 'in',
      img: '/img/forge/stage-photo.webp',
      label: 'You send',
      caption: 'One picture of the thing — a chair, a bottle, a shoe, a part.',
      alt: 'An ordinary phone snapshot of a curved boucle sofa standing on a shop floor',
    },
    {
      id: 'build',
      img: '/img/forge/stage-mesh.webp',
      label: 'We rebuild it',
      caption: 'Our pipeline rebuilds it as real geometry.',
      chip: 'About a minute per model',
      mesh: true,
      alt: 'The same sofa as an untextured grey 3D mesh under a cyan wireframe, in a dark modelling viewport',
    },
    {
      id: 'out',
      img: '/img/forge/stage-model.webp',
      label: 'You get it back',
      caption: 'Spin it, light it, and drop it into a website, a game or an AR view.',
      formats: true,
      alt: 'The same sofa as a finished, fully textured 3D model turning on a lit platform',
    },
  ]

  // ---------------------------------------------------------------------
  // THE SCRUBBER — one value, three ways to move it
  //
  // `t` is the whole state of the band's stage: 0 = the photograph that was
  // sent, 0.5 = the untextured mesh, 1 = the finished model. Everything else
  // here derives from it, and the CSS reads it as one custom property.
  //
  // IT STARTS AT 0.5, NOT 0. A visitor who never touches the control still has
  // to be told the whole story by the frame they land on, and the midpoint is
  // the only position that shows the photograph AND the geometry at once, with
  // the seam between them. Parking at 0 would show a plain snapshot of a sofa
  // and nothing else — the band would look like it had failed to load.
  // ---------------------------------------------------------------------

  let t = $state(0.5)
  let stageEl = $state(null)
  let dragging = false

  /** Which station the frame is currently showing. Thirds, not halves: the
   *  reader is "on" the mesh for the whole middle of the travel, so the live
   *  station does not flicker between two as the handle crosses the exact
   *  midpoint. */
  const liveIndex = $derived(t < 0.34 ? 0 : t < 0.72 ? 1 : 2)
  const liveStage = $derived(STAGES[liveIndex])

  const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n)

  /** Pointer x → t, in the stage's own coordinates. */
  function tFromEvent(e) {
    const r = stageEl?.getBoundingClientRect()
    if (!r || !r.width) return t
    return clamp01((e.clientX - r.left) / r.width)
  }

  function onScrubDown(e) {
    // Ignore the secondary buttons — a right-click on the frame should open
    // the context menu (people save these images), not yank the seam.
    if (e.button != null && e.button !== 0) return
    dragging = true
    // Capture, so a drag that leaves the frame (or the window) keeps tracking
    // and, more importantly, still gets its pointerup. Without this a fast
    // drag off the edge leaves `dragging` true and the seam glued to the
    // cursor for the rest of the page's life.
    e.currentTarget.setPointerCapture?.(e.pointerId)
    t = tFromEvent(e)
  }
  function onScrubMove(e) { if (dragging) t = tFromEvent(e) }
  function onScrubUp(e) {
    dragging = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  /** Arrow keys move by a twentieth; PageUp/Down and the Home/End pair jump
   *  to the stations. This is why the handle is a real `role="slider"` — the
   *  transformation is the whole point of the band and it must not be
   *  reachable only by dragging a mouse. */
  function onScrubKey(e) {
    const STEP = 0.05
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = t + STEP
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = t - STEP
    else if (e.key === 'PageUp') next = t + 0.5
    else if (e.key === 'PageDown') next = t - 0.5
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = 1
    if (next === null) return
    e.preventDefault()
    t = clamp01(next)
  }

  /** The three station buttons under the frame. */
  function setStage(i) { t = i === 0 ? 0 : i === 1 ? 0.5 : 1 }

  /** Meshy takes roughly 40-90s. Poll often enough that the bar moves, rarely
   *  enough that a tab left open overnight is not a thousand function calls:
   *  every 4s, and give up displaying progress after 6 minutes. */
  const POLL_MS = 4000
  const POLL_GIVE_UP_MS = 6 * 60 * 1000

  const STEPS = [
    { n: '01', t: 'Send one photo', d: 'A product, a chair, a bottle, a shoe. One clear shot, plain background, whole object in frame.' },
    { n: '02', t: 'We rebuild it', d: 'Our pipeline reads the shape and the texture and reconstructs it as real geometry — not a flat card.' },
    { n: '03', t: 'Take the files', d: 'GLB, FBX, OBJ and USDZ. Yours to drop into a site, a game, an AR view or a render.' },
  ]

  // ---------------------------------------------------------------------
  // popup open/close
  // ---------------------------------------------------------------------

  let open = $state(false)
  let panelEl = $state(null)
  let triggerEl = null

  // Everything the tool view needs, reset fresh on every open — the React
  // build got this for free because <ForgeTool> unmounted with the dialog and
  // remounted on the next one; here the popup is the same component instance
  // for the page's whole life, so opening explicitly re-seeds the state that
  // used to come from a fresh mount.
  let profile = $state(null)
  let booting = $state(false)
  let entryStep = $state('pitch') // 'pitch' | 'auth'
  let authMode = $state('register')
  let job = $state(null)
  let error = $state(null)
  let busy = $state(false)
  let preview = $state(null)
  let order = $state(null)

  // auth form
  let email = $state('')
  let password = $state('')
  let authBusy = $state(false)
  let authError = $state(null)
  let resetSent = $state(false)

  // dropzone
  let dzOver = $state(false)

  // payment
  let quantity = $state(5)
  let payBusy = $state(false)
  let copied = $state(null)
  const hasAlias = $derived(Boolean(CLIQ.alias))

  function openPopup() {
    profile = null
    entryStep = 'pitch'
    authMode = 'register'
    job = null
    error = null
    busy = false
    preview = null
    order = null
    email = ''
    password = ''
    authBusy = false
    authError = null
    resetSent = false
    quantity = 5
    copied = null
    open = true

    // Refresh the profile for an already-signed-in visitor. A stale `credits`
    // here is the difference between showing somebody the upload panel and
    // showing them a payment wall they already cleared.
    if (isSignedIn()) {
      booting = true
      me()
        .then((r) => { profile = r.profile })
        .catch(() => signOut())
        .finally(() => { booting = false })
    } else {
      booting = false
    }
  }

  function requestClose() {
    open = false
  }

  /** The panel's own entrance. `fade` alone read as a flat cross-dissolve, and
   *  the two surfaces want different physics: on a phone this is a bottom
   *  sheet and should rise, on a desktop it is a card and should settle. One
   *  transform covers both — a short travel plus a hair of scale, which reads
   *  as "up" against the bottom edge and as "forward" against the middle of
   *  the screen. Written as a css() transition rather than tick() so it runs
   *  on the compositor, and Svelte's own transition machinery makes it
   *  interruptible: closing mid-open reverses from wherever it got to instead
   *  of restarting. */
  function panelMotion(node, { duration = 380 } = {}) {
    if (reducedMotion.current) return { duration: 10, css: (t) => `opacity:${t}` }
    return {
      duration,
      easing: cubicOut,
      css: (t, u) => `opacity:${t}; transform: translate3d(0, ${u * 20}px, 0) scale(${0.982 + t * 0.018})`,
    }
  }

  // ── overlay contract: .overlay-open, Escape, Tab focus trap ──────────────
  // Same idiom as Nav.svelte's drawer.
  $effect(() => {
    if (!browser || !open) return
    triggerEl = document.activeElement

    const onKey = (e) => {
      if (e.key === 'Escape') { requestClose(); return }
      if (e.key !== 'Tab') return
      const f = panelEl?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!f || !f.length) return
      const first = f[0], last = f[f.length - 1]
      // Focus starts on the dialog element itself, which is not in `f` — a
      // Shift+Tab from there would otherwise walk straight out of the trap and
      // into the page behind it.
      if (e.shiftKey && document.activeElement === panelEl) { e.preventDefault(); last.focus(); return }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.documentElement.classList.add('overlay-open')
    window.addEventListener('keydown', onKey)
    /* Focus the DIALOG, not its close button. Landing on "Close" is what a
       screen reader then reads first — the first thing a visitor is told about
       the panel should not be how to get rid of it. Focusing the labelled
       dialog element announces its title, and the trap below still keeps Tab
       inside it. */
    const t = setTimeout(() => panelEl?.focus({ preventScroll: true }), 60)

    return () => {
      document.documentElement.classList.remove('overlay-open')
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
      const el = triggerEl
      if (el && document.contains(el)) el.focus()
    }
  })

  // ── poll a running job ────────────────────────────────────────────────────
  // Cleared on job change, on completion and on give-up, so closing the popup
  // mid-generation does not leave an interval running for the rest of the
  // session.
  $effect(() => {
    if (!job || job.status === 'SUCCEEDED' || job.status === 'FAILED') return
    const startedAt = Date.now()
    const id = setInterval(async () => {
      if (Date.now() - startedAt > POLL_GIVE_UP_MS) { clearInterval(id); return }
      try {
        const r = await jobStatus(job.id)
        job = r.job
        if (r.job.status === 'FAILED') {
          error = r.job.error || 'That one failed. Nothing was used — try another photo.'
          // A failed job is refunded server-side; re-read so the panel shows it.
          me().then((p) => { profile = p.profile }).catch(() => {})
        }
      } catch (err) {
        // A transient poll failure is not worth tearing the panel down over —
        // the next tick will very likely succeed.
        if (err instanceof ForgeError && err.code === 'UNAUTHENTICATED') {
          clearInterval(id)
          error = 'Your session expired — sign in again.'
          profile = null
        }
      }
    }, POLL_MS)
    return () => clearInterval(id)
  })

  // ---------------------------------------------------------------------
  // actions
  // ---------------------------------------------------------------------

  // A brand-new registration is the client's requested handoff: "start now,
  // then register, then redirect to the user dashboard" — so a fresh account
  // leaves the popup entirely rather than landing on the upload panel here.
  //
  // A SIGN-IN does not redirect: an account that already exists is exactly
  // the "returning signed-in user" case that must not be shoved through
  // onboarding again, and the CliQ pay panel + upload/poll/download flow
  // living in THIS popup is still the only shipped, QA'd way to reach them.
  function onAuthed(r, mode) {
    authError = null
    if (mode === 'register') {
      window.location.href = '/dashboard'
      return
    }
    profile = r.profile
  }

  async function authSubmit(e) {
    e.preventDefault()
    authError = null
    authBusy = true
    try {
      const r = authMode === 'register' ? await register(email, password) : await signIn(email, password)
      onAuthed(r, authMode)
    } catch (err) {
      authError = err.message
    } finally {
      authBusy = false
    }
  }

  async function authReset() {
    authError = null
    if (!email.trim()) { authError = 'Type your email first, then tap this.'; return }
    try {
      await sendReset(email)
      resetSent = true
    } catch (err) {
      authError = err.message
    }
  }

  function setAuthMode(next) { authMode = next; authError = null }

  async function onPick(file) {
    error = null
    if (!file) return
    busy = true
    try {
      const dataUrl = await fileToDataUrl(file)
      preview = dataUrl
      const r = await startJob(dataUrl, file.name?.slice(0, 60) || null)
      job = r.job
      profile = r.profile
    } catch (err) {
      if (err instanceof ForgeError && err.code === 'PAYMENT_REQUIRED') {
        // Not an error state — it is the paywall, and it has its own panel.
        if (profile) profile = { ...profile, canGenerate: false, nextIsFree: false }
      } else {
        error = err.message || 'That did not work.'
      }
      preview = null
    } finally {
      busy = false
    }
  }

  function again() { job = null; preview = null; error = null }

  function doSignOut() { signOut(); profile = null }

  // ---------------------------------------------------------------------
  // payment
  // ---------------------------------------------------------------------

  async function makeOrder() {
    payBusy = true
    error = null
    try {
      const r = await createOrder(quantity)
      order = r.order
    } catch (err) {
      error = err.message
    } finally {
      payBusy = false
    }
  }

  async function copy(value, which) {
    try {
      await navigator.clipboard.writeText(value)
      copied = which
      setTimeout(() => { copied = null }, 1800)
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers.
      // The value is on screen either way — this button is a convenience, and
      // a failed copy must not look like a failed payment step.
    }
  }

  const waHref = $derived(order
    ? `${BRAND.whatsapp}?text=${encodeURIComponent(
        [
          `Hi LOOM — I'd like to top up my 3D models.`,
          `Reference: ${order.ref}`,
          `Models: ${order.quantity}`,
          `Total: ${order.amountJod} JOD`,
          `Account: ${profile?.email ?? ''}`,
          hasAlias ? `\nI'm sending it on CliQ now.` : `\nPlease send me the CliQ details.`,
        ].join('\n')
      )}`
    : null)
</script>

<!-- The woven side tab — the OTHER explicit way in, next to the section's own
     CTA. Fixed-position, so it renders here (never in App/+page's markup) but
     reads as parked beside the hero at the top of the page on both phone and
     desktop. See forge.css for why its vertical slot clears the WhatsApp FAB
     and .mobile-cta-pill. -->
<button
  type="button"
  class="fg-side-tab"
  onclick={openPopup}
  aria-label="Try 2D to 3D — send a photo, get a 3D model back"
>
  <span>Try 2D to 3D</span>
</button>

<!-- ═══ THE BAND ═══
     THE DESIGN LIVES IN ForgeBand.svelte, not here. Five designs were built
     for this section and four were rejected; the fifth — a dark field of
     drifting wireframe geometry, with the real blue-sofa photograph beside
     the real GLB of that same sofa rendered live — is the one that shipped.
     It is a large, self-contained piece with its own canvas, its own WebGL
     lifecycle and its own scoped styles, and inlining ~800 lines of it here
     would bury the thing THIS file is actually about: the popup below, which
     owns auth, upload, entitlement and payment.

     The band gets exactly one thing from this component — `openPopup`. It
     cannot open the funnel on its own, which is the same split the band has
     always had: two explicit ways in (this CTA and the side tab above), and
     no third. -->
<ForgeBand onmake={openPopup} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fg-scrim"
    transition:fade={{ duration: reducedMotion.current ? 10 : 350, easing: cubicOut }}
    onclick={(e) => { if (e.target === e.currentTarget) requestClose() }}
  >
    <div
      class="fg-panel is-sheet"
      bind:this={panelEl}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fg-title"
      tabindex="-1"
      transition:panelMotion={{ duration: 380 }}
    >
      <!-- Static grab-bar, phone-only via CSS (see the <style> block below):
           the React build tracked isMobile() with a resize listener just to
           decide whether to render this; here it is one media query and no
           live JS breakpoint check. -->
      <div class="fg-sheet-handle" aria-hidden="true">
        <div class="sheet-handle-wrap"><span class="sheet-handle"></span></div>
      </div>

      <button type="button" class="fg-close" onclick={requestClose} aria-label="Close">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div class="fg-body">
        <!-- ============================= the working half ============================= -->

        {#if booting}
          <div class="fg-hero">
            <img
              class="fg-hero-img"
              src="/img/forge/forge-mascots.webp"
              alt="Two LOOM wool mascots — one holding a flat printed photo of an armchair, the other holding the same chair rebuilt as a glowing 3D wireframe"
              width="1400"
              height="781"
              decoding="async"
              onerror={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div class="fg-hero-ink">
              <p class="fg-kicker">2D → 3D</p>
              <h2 class="fg-title" id="fg-title">Turn a photo into a 3D model</h2>
            </div>
          </div>
          <ol class="fg-steps">
            {#each STEPS as s (s.n)}
              <li>
                <span class="fg-step-n">{s.n}</span>
                <h3 class="fg-step-t">{s.t}</h3>
                <p class="fg-step-d">{s.d}</p>
              </li>
            {/each}
          </ol>
          <!-- Loading is a designed state, not a bare sentence: the same
               centred column the pitch uses, so the panel does not visibly
               re-lay-itself-out the moment the profile lands. -->
          <div class="fg-tool">
            <div class="fg-loading">
              <span class="fg-spinner" aria-hidden="true"></span>
              <p class="fg-note" role="status">Checking your account…</p>
            </div>
          </div>

        {:else if !profile && entryStep === 'pitch'}
          <!-- step 1 — the pitch, one unmistakable primary action -->
          <div class="fg-hero">
            <img
              class="fg-hero-img"
              src="/img/forge/forge-mascots.webp"
              alt="Two LOOM wool mascots — one holding a flat printed photo of an armchair, the other holding the same chair rebuilt as a glowing 3D wireframe"
              width="1400"
              height="781"
              decoding="async"
              onerror={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div class="fg-hero-ink">
              <p class="fg-kicker">2D → 3D</p>
              <h2 class="fg-title" id="fg-title">Turn a photo into a 3D model</h2>
            </div>
          </div>
          <ol class="fg-steps">
            {#each STEPS as s (s.n)}
              <li>
                <span class="fg-step-n">{s.n}</span>
                <h3 class="fg-step-t">{s.t}</h3>
                <p class="fg-step-d">{s.d}</p>
              </li>
            {/each}
          </ol>
          <div class="fg-tool">
            <div class="fg-pitch">
              <p class="fg-pitch-price">
                Make an account, your first model is free. After that it's <strong>{PRICE_JOD} JOD</strong> each.
              </p>
              <WoolButton label="Start now" onclick={() => { authMode = 'register'; entryStep = 'auth' }} />
              <p class="fg-pitch-signin">
                Already have an account?
                <button type="button" class="fg-link" onclick={() => { authMode = 'signin'; entryStep = 'auth' }}>Sign in</button>
              </p>
            </div>
          </div>

        {:else if !profile}
          <!-- step 2 — register or sign in. Deliberately no hero/steps repeated
               here: that content already did its job on step 1. -->
          <div class="fg-compact-head">
            <button type="button" class="fg-back" onclick={() => (entryStep = 'pitch')}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
              Back
            </button>
            <p class="fg-stepnav" aria-hidden="true"><i></i><i class="is-on"></i></p>
          </div>
          <div class="fg-tool">
            <h2 class="fg-auth-title" id="fg-title">
              {authMode === 'register' ? 'Make your account' : 'Welcome back'}
            </h2>

            <form class="fg-auth" onsubmit={authSubmit}>
              <p class="fg-auth-lede">
                {#if authMode === 'register'}
                  One more step — email and a password, and your first model is on us.
                {:else}
                  Welcome back — sign in to pick up where you left off.
                {/if}
              </p>

              <div class="fg-tabs" role="tablist" aria-label="Account">
                <button
                  type="button" role="tab" aria-selected={authMode === 'register'}
                  class={authMode === 'register' ? 'is-on' : ''}
                  onclick={() => setAuthMode('register')}
                >Create account</button>
                <button
                  type="button" role="tab" aria-selected={authMode === 'signin'}
                  class={authMode === 'signin' ? 'is-on' : ''}
                  onclick={() => setAuthMode('signin')}
                >Sign in</button>
              </div>

              <label class="fg-field">
                <span>Email</span>
                <input
                  type="email" required autocomplete="email" bind:value={email} placeholder="you@company.com"
                />
              </label>

              <label class="fg-field">
                <span>Password</span>
                <input
                  type="password" required minlength="6" bind:value={password} placeholder="At least 6 characters"
                  autocomplete={authMode === 'register' ? 'new-password' : 'current-password'}
                />
              </label>

              {#if authError}<p class="fg-error" role="alert">{authError}</p>{/if}
              {#if resetSent}<p class="fg-note">Reset link sent — check your inbox.</p>{/if}

              <div class="fg-auth-actions">
                <WoolButton
                  label={authMode === 'register' ? 'Sign up' : 'Log in'}
                  type="submit"
                  disabled={authBusy}
                  class={authBusy ? 'is-busy' : ''}
                />
                {#if authMode === 'signin'}
                  <button type="button" class="fg-link" onclick={authReset}>Forgot password?</button>
                {/if}
              </div>

              <p class="fg-fine">
                We only store your email and how many models you have made. Nothing is shared,
                and the photo you send is used to build your model and nothing else.
              </p>
            </form>
          </div>

        {:else}
          <!-- signed in: unchanged from the shipped tool -->
          <div class="fg-hero">
            <img
              class="fg-hero-img"
              src="/img/forge/forge-mascots.webp"
              alt="Two LOOM wool mascots — one holding a flat printed photo of an armchair, the other holding the same chair rebuilt as a glowing 3D wireframe"
              width="1400"
              height="781"
              decoding="async"
              onerror={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div class="fg-hero-ink">
              <p class="fg-kicker">2D → 3D</p>
              <h2 class="fg-title" id="fg-title">Turn a photo into a 3D model</h2>
            </div>
          </div>
          <ol class="fg-steps">
            {#each STEPS as s (s.n)}
              <li>
                <span class="fg-step-n">{s.n}</span>
                <h3 class="fg-step-t">{s.t}</h3>
                <p class="fg-step-d">{s.d}</p>
              </li>
            {/each}
          </ol>

          {#if job}
            <div class="fg-tool">
              <div class="fg-job">
                <div class="fg-job-art">
                  {#if job.status === 'SUCCEEDED' && job.thumbnailUrl}
                    <img src={job.thumbnailUrl} alt="Your finished 3D model" loading="lazy" decoding="async" />
                  {:else if preview}
                    <img src={preview} alt="The photo you sent" class={job.status === 'FAILED' ? '' : 'is-working'} />
                  {/if}
                </div>

                {#if job.status !== 'SUCCEEDED' && job.status !== 'FAILED'}
                  <p class="fg-job-status">Rebuilding your model — this takes about a minute.</p>
                  <div class="fg-bar"><i style="width: {Math.max(3, Math.min(100, Number(job.progress) || 0))}%"></i></div>
                  <p class="fg-fine">You can close this and come back; it keeps running.</p>
                {/if}

                {#if job.status === 'FAILED'}
                  <p class="fg-error" role="alert">{error || 'That one failed.'}</p>
                  <p class="fg-fine">Nothing was used — your model is still yours to spend.</p>
                  <button type="button" class="fg-pick" onclick={again}>Try another photo</button>
                {/if}

                {#if job.status === 'SUCCEEDED'}
                  <p class="fg-job-status">Done. Here are your files.</p>
                  <div class="fg-files">
                    {#each ['glb', 'usdz', 'fbx', 'obj'] as k (k)}
                      {#if job.modelUrls?.[k]}
                        <a class="fg-file" href={job.modelUrls[k]} download target="_blank" rel="noreferrer">{k.toUpperCase()}</a>
                      {/if}
                    {/each}
                  </div>
                  <p class="fg-fine">
                    GLB drops straight into a website, USDZ opens in AR on an iPhone.
                  </p>
                  {#if profile.canGenerate}
                    <button type="button" class="fg-pick" onclick={again}>Make another</button>
                  {:else}
                    <p class="fg-note">That was your free one. Another is {PRICE_JOD} JOD — reopen this panel to top up.</p>
                  {/if}
                {/if}
              </div>
            </div>

          {:else if !profile.canGenerate}
            <div class="fg-tool">
              <!-- ═══ payment: CliQ, by hand ═══
                   No processor is wired and none is planned for this price
                   point. The panel's whole job is to produce an unambiguous
                   instruction — how much, to whom, quoting what — and get the
                   visitor into WhatsApp with all three already typed out.
                   `CLIQ.alias` in $data/site.js is the switch: filled in, the
                   panel prints it with a copy button; empty, it says the
                   details arrive on WhatsApp. Both paths are ported. -->
              <div class="fg-pay">
                <p class="fg-pay-lead">You have used your free model.</p>
                <p class="fg-fine">
                  Each further model is {PRICE_JOD} JOD, paid by <strong>CliQ</strong>. Pick how
                  many you want and we will confirm on WhatsApp — your models land on this
                  account as soon as the transfer shows up.
                </p>

                {#if !order}
                  <div class="fg-qty">
                    {#each [1, 5, 10, 25] as n (n)}
                      <button
                        type="button"
                        class={quantity === n ? 'is-on' : ''}
                        onclick={() => (quantity = n)}
                      >
                        {n} <span>{n * PRICE_JOD} JOD</span>
                      </button>
                    {/each}
                  </div>
                  {#if error}<p class="fg-error" role="alert">{error}</p>{/if}
                  <button type="button" class="fg-pick" onclick={makeOrder} disabled={payBusy}>
                    {payBusy ? 'One moment…' : `Continue — ${quantity * PRICE_JOD} JOD`}
                  </button>
                {:else}
                  <div class="fg-order">
                    <p class="fg-order-total">
                      {order.quantity} model{order.quantity === 1 ? '' : 's'} · <strong>{order.amountJod} JOD</strong>
                    </p>

                    <dl class="fg-paylines">
                      {#if hasAlias}
                        <div class="fg-payline">
                          <dt>CliQ alias</dt>
                          <dd>
                            <span>{CLIQ.alias}</span>
                            <button type="button" class="fg-copy" onclick={() => copy(CLIQ.alias, 'alias')}>
                              {copied === 'alias' ? 'Copied' : 'Copy'}
                            </button>
                          </dd>
                        </div>
                      {/if}
                      {#if hasAlias && CLIQ.name}
                        <div class="fg-payline">
                          <dt>Account name</dt>
                          <dd><span>{CLIQ.name}</span></dd>
                        </div>
                      {/if}
                      <div class="fg-payline">
                        <dt>Reference</dt>
                        <dd>
                          <span class="fg-ref">{order.ref}</span>
                          <button type="button" class="fg-copy" onclick={() => copy(order.ref, 'ref')}>
                            {copied === 'ref' ? 'Copied' : 'Copy'}
                          </button>
                        </dd>
                      </div>
                    </dl>

                    <p class="fg-fine">
                      {#if hasAlias}
                        Send {order.amountJod} JOD by CliQ to the alias above, put <strong>{order.ref}</strong> in the transfer note, then send us the receipt on WhatsApp.
                      {:else}
                        Message us on WhatsApp and we will send you the CliQ alias. Quote <strong>{order.ref}</strong> so we credit the right account.
                      {/if}
                    </p>

                    <a class="fg-pick" href={waHref} target="_blank" rel="noreferrer">
                      {hasAlias ? 'Send the receipt on WhatsApp' : 'Get the CliQ details on WhatsApp'}
                    </a>
                  </div>
                {/if}
              </div>

              <p class="fg-account">
                Signed in as <strong>{profile.email}</strong>
                {' · '}
                <button type="button" class="fg-link" onclick={doSignOut}>Sign out</button>
              </p>
            </div>

          {:else}
            <div class="fg-tool">
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="fg-drop {dzOver ? 'is-over' : ''} {busy ? 'is-busy' : ''}"
                ondragover={(e) => { e.preventDefault(); dzOver = true }}
                ondragleave={() => (dzOver = false)}
                ondrop={(e) => {
                  e.preventDefault()
                  dzOver = false
                  if (!busy) onPick(e.dataTransfer?.files?.[0])
                }}
              >
                <p class="fg-drop-badge">
                  {profile.nextIsFree ? 'Your first model is free' : `${profile.credits} paid model${profile.credits === 1 ? '' : 's'} left`}
                </p>
                <p class="fg-drop-lead">{busy ? 'Sending your photo…' : 'Drop a photo here'}</p>
                <p class="fg-drop-sub">or</p>
                <button
                  type="button"
                  class="fg-pick"
                  disabled={busy}
                  onclick={() => document.getElementById('fg-file-input')?.click()}
                >
                  Choose a photo
                </button>
                <!-- `capture` is deliberately NOT set: on a phone the file picker
                     still offers the camera, and forcing it would take away the
                     photo library, which is where the product shot the visitor
                     actually wants already lives. -->
                <input
                  id="fg-file-input"
                  type="file"
                  accept="image/*"
                  hidden
                  onchange={(e) => { onPick(e.target.files?.[0]); e.target.value = '' }}
                />
                <p class="fg-fine">One object, filling the frame, plain background. JPEG, PNG or WebP.</p>
              </div>
              {#if error}<p class="fg-error" role="alert">{error}</p>{/if}
              <p class="fg-account">
                Signed in as <strong>{profile.email}</strong>
                {' · '}
                <button type="button" class="fg-link" onclick={doSignOut}>Sign out</button>
              </p>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* SheetHandle only showed on mobile in the React version, via a live
     window.matchMedia('(max-width: 767px)') resize listener (lib/sheet.jsx's
     useIsMobile). That is a second breakpoint tracker for one drag-handle
     bar; a plain media query gets the identical visual result with no JS at
     all, which is the whole spirit of PORTING.md rule 2. */
  .fg-sheet-handle { display: none; }
  @media (max-width: 767px) {
    .fg-sheet-handle { display: block; }
  }
</style>
