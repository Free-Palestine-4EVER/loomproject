<!--
  /dashboard — the FORGE workspace.

  Two halves: a rail that makes models (generate panel, account state, top-up)
  and a library that holds every model this account has ever made. The library
  is the spine — the client's ask was "somewhere my past generations live", so
  it is a real grid with thumbnails, status, dates and per-item downloads, and
  it is the thing the page is mostly made of.

  WHAT IS NOT HERE, ON PURPOSE. The forge Cloud Function's entire generation
  surface is `startJob(image, name)`. There is no texture pass, no retopology,
  no remesh, no rigging, no refine stage, and no rename endpoint — so this page
  ships no control for any of them. Every button below performs a real call:
  /me, /jobs, POST /jobs, GET /jobs/:id, POST /orders. Nothing is mocked and
  nothing is decorative.

  ENTITLEMENT IS DISPLAY, NEVER PERMISSION. Free/paid wording and every number
  comes from `auth.user.profile`, verbatim the /me response (freeUsed, credits,
  canGenerate, nextIsFree, modelsMade, priceJod). The function re-decides the
  entitlement inside a transaction on each generate; a 402 coming back is the
  real answer, and it opens the top-up panel rather than being pre-empted.

  ssr = false, prerender = false (+page.js): this is the one genuinely
  per-request route in the app, so nothing here needs a `browser` guard for
  SSR safety — it never runs on the server at all.
-->
<script>
  import { auth } from '$lib/auth.svelte.js'
  import { jobs as fetchJobs, jobStatus, sendReset, ForgeError } from '$lib/forge.js'
  import { reveal, reducedMotion } from '$lib/motion.svelte.js'
  import WoolButton from '$lib/components/WoolButton.svelte'
  import DashGenerate from '$lib/components/DashGenerate.svelte'
  import DashJobCard from '$lib/components/DashJobCard.svelte'
  import DashInspect from '$lib/components/DashInspect.svelte'
  import DashTopUp from '$lib/components/DashTopUp.svelte'
  import { isRunning, toMs } from '$lib/components/dashutil.js'
  import '$components/dashboard.css'

  // The figure the marketing copy quotes to a SIGNED-OUT reader, who has no
  // profile yet. For a signed-in account the real number is `profile.priceJod`
  // and that is what every panel below uses.
  const PRICE_JOD = 2

  /** Meshy takes roughly 40–90s. Poll often enough that the bar moves, rarely
   *  enough that a tab left open overnight is not a thousand function calls. */
  const POLL_MS = 4000
  const POLL_GIVE_UP_MS = 6 * 60 * 1000

  // ─── sign-in ──────────────────────────────────────────────────────────────
  let mode = $state('signin')
  let email = $state('')
  let password = $state('')
  let busy = $state(false)
  let authError = $state(null)
  let resetSent = $state(false)

  async function submitAuth(e) {
    e.preventDefault()
    authError = null
    busy = true
    try {
      if (mode === 'register') await auth.register(email, password)
      else await auth.signIn(email, password)
    } catch (err) {
      authError = err.message || 'Could not sign you in. Try again in a moment.'
    } finally {
      busy = false
    }
  }

  async function resetPassword() {
    authError = null
    if (!email.trim()) { authError = 'Type your email first, then tap this.'; return }
    try {
      await sendReset(email)
      resetSent = true
    } catch (err) {
      authError = err.message
    }
  }

  // ─── the library ──────────────────────────────────────────────────────────
  let jobList = $state(null)
  let jobsLoading = $state(false)
  let jobsError = $state(null)
  let reloadKey = $state(0)

  // Depend on the uid, not the user object: `auth.refresh()` replaces the
  // object on every /me, and keying the fetch to identity would re-download
  // the whole library every time a poll updated the credit count.
  const uid = $derived(auth.user?.uid || null)
  const profile = $derived(auth.user?.profile || null)

  $effect(() => {
    const who = uid
    reloadKey // re-run on an explicit retry
    if (!who) { jobList = null; jobsError = null; return }
    let alive = true
    jobsLoading = true
    jobsError = null
    fetchJobs()
      .then((r) => { if (alive) jobList = r.jobs || [] })
      .catch((err) => {
        if (!alive) return
        jobsError = err instanceof ForgeError ? err.message : 'Could not load your models.'
      })
      .finally(() => { if (alive) jobsLoading = false })
    return () => { alive = false }
  })

  function mergeJob(next) {
    if (!next?.id) return
    const list = jobList || []
    const at = list.findIndex((j) => j.id === next.id)
    jobList = at < 0 ? [next, ...list] : list.map((j) => (j.id === next.id ? { ...j, ...next } : j))
  }

  function applyProfile(p) {
    if (p) auth.user = { uid: p.uid, email: p.email, profile: p }
  }

  // ─── polling ──────────────────────────────────────────────────────────────
  // Keyed on the SET of unfinished ids, not on the list: a poll that only
  // moves a progress number must not tear its own interval down and start a
  // new one. The effect restarts only when a job actually enters or leaves the
  // running set, which is exactly when the schedule should change.
  const runningKey = $derived((jobList || []).filter(isRunning).map((j) => j.id).join(','))

  $effect(() => {
    const key = runningKey
    if (!key) return
    const ids = key.split(',').slice(0, 4)
    const openedAt = Date.now()
    let stopped = false

    const id = setInterval(async () => {
      if (Date.now() - openedAt > POLL_GIVE_UP_MS) { clearInterval(id); return }
      for (const jid of ids) {
        if (stopped) return
        try {
          const r = await jobStatus(jid)
          if (r?.job) mergeJob(r.job)
          // A finished OR failed job changes the account: a success spends the
          // free model or a credit, a failure is refunded server-side. Either
          // way the panel's numbers are now stale, so re-read /me.
          if (r?.job?.status === 'SUCCEEDED' || r?.job?.status === 'FAILED') {
            auth.refresh().catch(() => {})
          }
        } catch (err) {
          // A transient poll failure is not worth tearing the page down over —
          // the next tick will very likely succeed. A dead session is.
          if (err instanceof ForgeError && err.code === 'UNAUTHENTICATED') {
            stopped = true
            clearInterval(id)
            jobsError = 'Your session expired — sign in again.'
            return
          }
        }
      }
    }, POLL_MS)

    return () => { stopped = true; clearInterval(id) }
  })

  // ─── filter / search / order ──────────────────────────────────────────────
  let filter = $state('all')
  let query = $state('')

  const sorted = $derived(
    [...(jobList || [])].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)),
  )
  const counts = $derived({
    all: sorted.length,
    ready: sorted.filter((j) => j.status === 'SUCCEEDED').length,
    working: sorted.filter(isRunning).length,
    failed: sorted.filter((j) => j.status === 'FAILED').length,
  })
  const shown = $derived(
    sorted
      .filter((j) =>
        filter === 'all' ? true
        : filter === 'ready' ? j.status === 'SUCCEEDED'
        : filter === 'working' ? isRunning(j)
        : j.status === 'FAILED',
      )
      .filter((j) =>
        !query.trim() ? true : (j.name || '').toLowerCase().includes(query.trim().toLowerCase()),
      ),
  )

  const FILTERS = [
    { k: 'all', label: 'All' },
    { k: 'ready', label: 'Ready' },
    { k: 'working', label: 'Working' },
    { k: 'failed', label: 'Failed' },
  ]

  // ─── generate / inspect / top-up wiring ───────────────────────────────────
  let activeId = $state(null)
  let inspectId = $state(null)
  let topUp = $state(false)
  let prefill = $state(null)
  let prefillToken = 0

  const activeJob = $derived((jobList || []).find((j) => j.id === activeId) || null)
  const inspectJob = $derived((jobList || []).find((j) => j.id === inspectId) || null)

  function onStarted(job, p) {
    mergeJob(job)
    activeId = job.id
    applyProfile(p)
    filter = 'all'
    query = ''
  }

  function onRetry(job) {
    prefillToken += 1
    prefill = { name: job.name || '', token: prefillToken }
  }

  /** Svelte action: scroll this node into view as it mounts. Honours reduced
   *  motion by jumping instead of gliding. */
  function bringIntoView(node) {
    node.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion.current ? 'auto' : 'smooth',
    })
  }

  function initial(mail) {
    return (mail || '?').trim().charAt(0).toUpperCase() || '?'
  }
</script>

<svelte:head>
  <title>Your workspace — LOOM FORGE</title>
  <meta
    name="description"
    content="Your FORGE workspace — make a 3D model from a photo, and keep every model you have made, with GLB, FBX, OBJ and USDZ downloads."
  />
</svelte:head>

{#if auth.loading}
  <!-- ─── boot: the first /me has not resolved. Never assume signed out. ──── -->
  <div class="dash-page">
    <div class="dash-shell dash-shell--narrow">
      <div class="dash-boot" role="status">
        <span class="dash-boot-mark" aria-hidden="true"></span>
        <p class="dash-note">Checking your account…</p>
      </div>
    </div>
  </div>
{:else if !auth.user}
  <!-- ─── signed out ──────────────────────────────────────────────────────── -->
  <div class="dash-page">
    <div class="dash-shell dash-shell--auth">
      <a class="dash-back" href="/">← Return to the site</a>

      <div class="dash-gate">
        <div class="dash-gate-pitch" use:reveal={{ y: 24 }}>
          <p class="dash-kicker"><span>—</span> FORGE workspace</p>
          <h1 class="dash-h1">Every model you make, in one place.</h1>
          <p class="dash-lede">
            Send one photograph. We rebuild it as real geometry and hand you the files —
            your first model is free, then it is {PRICE_JOD} JOD each.
          </p>
          <ul class="dash-gate-list">
            <li><span aria-hidden="true">01</span> One clear photo, plain background</li>
            <li><span aria-hidden="true">02</span> We reconstruct the shape and the texture</li>
            <li><span aria-hidden="true">03</span> GLB, FBX, OBJ and USDZ, yours to keep</li>
          </ul>
        </div>

        <div class="dash-auth-card" use:reveal={{ y: 24, delay: 0.06 }}>
          <div class="dash-tabs" role="tablist" aria-label="Account">
            <button
              type="button" role="tab" aria-selected={mode === 'signin'}
              class={mode === 'signin' ? 'is-on' : ''}
              onclick={() => { mode = 'signin'; authError = null; resetSent = false }}
            >Sign in</button>
            <button
              type="button" role="tab" aria-selected={mode === 'register'}
              class={mode === 'register' ? 'is-on' : ''}
              onclick={() => { mode = 'register'; authError = null; resetSent = false }}
            >Create account</button>
          </div>

          <form onsubmit={submitAuth}>
            <label class="dash-field">
              <span>Email</span>
              <input
                type="email" required autocomplete="email" value={email} placeholder="you@company.com"
                oninput={(e) => (email = e.target.value)}
              />
            </label>
            <label class="dash-field">
              <span>Password</span>
              <input
                type="password" required minlength="6" value={password} placeholder="At least 6 characters"
                autocomplete={mode === 'register' ? 'new-password' : 'current-password'}
                oninput={(e) => (password = e.target.value)}
              />
            </label>

            {#if authError}<p class="dash-error" role="alert">{authError}</p>{/if}
            {#if resetSent}<p class="dash-ok" role="status">Reset link sent — check your inbox.</p>{/if}

            <WoolButton
              label={mode === 'register' ? 'Sign up' : 'Log in'}
              type="submit"
              disabled={busy}
              class={busy ? 'is-busy' : ''}
            />

            {#if mode === 'signin'}
              <button type="button" class="dash-link" onclick={resetPassword}>
                Forgotten your password?
              </button>
            {/if}
          </form>
        </div>
      </div>
    </div>
  </div>
{:else}
  <!-- ─── the workspace ───────────────────────────────────────────────────── -->
  <div class="dash-page">
    <div class="dash-shell">
      <header class="dash-top">
        <a class="dash-back" href="/">← Return to the site</a>
        <div class="dash-who">
          <span class="dash-avatar" aria-hidden="true">{initial(auth.user.email)}</span>
          <span class="dash-who-mail" title={auth.user.email}>{auth.user.email}</span>
          <button type="button" class="dash-signout" onclick={() => auth.signOut()}>Sign out</button>
        </div>
      </header>

      <div class="dash-grid">
        <!-- ── rail ────────────────────────────────────────────────────────── -->
        <aside class="dash-rail" aria-label="Make a model">
          <div class="dash-card dash-card--gen" use:reveal={{ y: 20 }}>
            <DashGenerate
              {profile}
              {activeJob}
              {prefill}
              onstarted={onStarted}
              onneedcredits={() => { topUp = true }}
            />
          </div>

          <div class="dash-card dash-card--acct" use:reveal={{ y: 20, delay: 0.05 }}>
            <h2 class="dash-card-title">Account</h2>
            <dl class="dash-stats">
              <div class="dash-stat">
                <dt>Free model</dt>
                <dd>{profile?.freeUsed ? 'Used' : 'Ready'}</dd>
              </div>
              <div class="dash-stat">
                <dt>Credits</dt>
                <dd>{profile?.credits ?? '—'}</dd>
              </div>
              <div class="dash-stat">
                <dt>Made</dt>
                <dd>{profile?.modelsMade ?? '—'}</dd>
              </div>
            </dl>
            {#if !topUp}
              <button type="button" class="dash-topup-open" onclick={() => (topUp = true)}>
                Add models{#if profile?.priceJod != null}&nbsp;· {profile.priceJod} JOD each{/if}
              </button>
            {/if}
          </div>

          {#if topUp}
            <!-- Bring it into view: with the rail sticky and scrollable, a
                 panel that opens below the account card can otherwise appear
                 entirely off the bottom of the rail. -->
            <div class="dash-card dash-card--pay" use:bringIntoView>
              <DashTopUp {profile} onclose={() => (topUp = false)} />
            </div>
          {/if}
        </aside>

        <!-- ── library ─────────────────────────────────────────────────────── -->
        <main class="dash-main">
          <div class="dash-lib-head">
            <div class="dash-lib-title">
              <p class="dash-kicker"><span>—</span> Your library</p>
              <h1 class="dash-h1">
                {#if counts.all}{counts.all} model{counts.all === 1 ? '' : 's'}{:else}Nothing yet{/if}
              </h1>
            </div>

            {#if counts.all > 0}
              <div class="dash-lib-tools">
                <div class="dash-chips" role="group" aria-label="Filter models">
                  {#each FILTERS as f (f.k)}
                    <button
                      type="button"
                      class="dash-chip"
                      class:is-on={filter === f.k}
                      aria-pressed={filter === f.k}
                      onclick={() => (filter = f.k)}
                    >
                      {f.label}
                      <span class="dash-chip-n">{counts[f.k]}</span>
                    </button>
                  {/each}
                </div>
                <div class="dash-search">
                  <label class="dash-sr" for="dash-q">Search your models by name</label>
                  <input
                    id="dash-q"
                    type="search"
                    placeholder="Search by name"
                    value={query}
                    oninput={(e) => (query = e.target.value)}
                  />
                </div>
              </div>
            {/if}
          </div>

          {#if jobsError}
            <div class="dash-state dash-state--error" role="alert">
              <p class="dash-error">{jobsError}</p>
              <button type="button" class="dash-retry" onclick={() => (reloadKey += 1)}>
                Try loading again
              </button>
            </div>
          {:else if jobList === null || (jobsLoading && !jobList)}
            <!-- Skeletons in the SHAPE of the grid, so nothing jumps when the
                 real cards land. -->
            <div class="dash-lib" aria-hidden="true">
              {#each [0, 1, 2, 3, 4, 5] as i (i)}
                <div class="dash-skel" style={`--d:${i * 0.06}s`}>
                  <span class="dash-skel-art"></span>
                  <span class="dash-skel-line"></span>
                  <span class="dash-skel-line dash-skel-line--short"></span>
                </div>
              {/each}
            </div>
            <p class="dash-sr" role="status">Loading your models…</p>
          {:else if counts.all === 0}
            <div class="dash-state dash-state--empty" use:reveal={{ y: 24 }}>
              <span class="dash-empty-art" aria-hidden="true">
                <span></span><span></span><span></span>
              </span>
              <h2 class="dash-h2">Your first model starts here</h2>
              <p class="dash-lede">
                Send one photograph and it will appear here as a model you can turn,
                download and drop into a site, a game or an AR view.
                {#if profile?.nextIsFree}The first one is free.{/if}
              </p>
              <button type="button" class="dash-retry" onclick={() => onRetry({ name: '' })}>
                Choose a photo
              </button>
              <ol class="dash-empty-steps">
                <li><span aria-hidden="true">01</span> Pick one clear photo of the object</li>
                <li><span aria-hidden="true">02</span> We rebuild it — 40 to 90 seconds</li>
                <li><span aria-hidden="true">03</span> Take the GLB, FBX, OBJ and USDZ</li>
              </ol>
            </div>
          {:else if shown.length === 0}
            <div class="dash-state dash-state--empty">
              <h2 class="dash-h2">Nothing matches</h2>
              <p class="dash-lede">
                No model here is called “{query}”{filter !== 'all' ? ' with that status' : ''}.
              </p>
              <button
                type="button"
                class="dash-retry"
                onclick={() => { query = ''; filter = 'all' }}
              >Clear the filters</button>
            </div>
          {:else}
            <div class="dash-lib">
              {#each shown as job, i (job.id)}
                <div use:reveal={{ y: 22, delay: Math.min(i, 8) * 0.04 }}>
                  <DashJobCard
                    {job}
                    oninspect={(j) => (inspectId = j.id)}
                    onretry={onRetry}
                  />
                </div>
              {/each}
            </div>
          {/if}
        </main>
      </div>
    </div>
  </div>

  <DashInspect job={inspectJob} onclose={() => (inspectId = null)} />
{/if}
