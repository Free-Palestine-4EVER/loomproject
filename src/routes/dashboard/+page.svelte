<!--
  /dashboard — a signed-in FORGE account's own page: entitlement state and
  past jobs, read straight from the same `forge` Cloud Function Forge.jsx
  already trusts ($lib/auth.svelte.js wraps the exact same $lib/forge.js
  calls). Nothing on this page is invented: the three stats come verbatim off
  `user.profile` (the /me response) and the job list is a live GET /jobs — no
  placeholder row, no guessed count.

  Signed out, this renders a sign-in prompt rather than an empty shell. While
  `auth.loading` is true (the first /me check has not resolved yet) it renders
  a loading state, never assuming signed-out — the exact same contract
  lib/auth.svelte.js documents at its `loading` field.

  ssr = false, prerender = false (+page.js): this is the one route in the app
  that is genuinely per-request, so unlike every other file in this batch,
  nothing here needs a `browser` guard purely for SSR safety — it never runs
  on the server at all. Ported from src/components/Dashboard.jsx.
-->
<script>
  import { auth } from '$lib/auth.svelte.js'
  import { jobs as fetchJobs, ForgeError } from '$lib/forge.js'
  import WoolButton from '$lib/components/WoolButton.svelte'
  import ModelViewer from '$lib/components/ModelViewer.svelte'
  import '$components/dashboard.css'

  // Same figure Forge.jsx's own copy quotes — marketing copy, not an
  // entitlement value; the real number for a signed-in account is
  // `p.priceJod`, read below.
  const PRICE_JOD = 2

  const JOB_LABEL = { PENDING: 'Queued', IN_PROGRESS: 'Rebuilding', SUCCEEDED: 'Done', FAILED: 'Failed' }

  // ─── sign-in form state ─────────────────────────────────────────────────
  let mode = $state('signin')
  let email = $state('')
  let password = $state('')
  let busy = $state(false)
  let authError = $state(null)

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

  // ─── signed-in job list ─────────────────────────────────────────────────
  let jobList = $state(null)
  let jobsError = $state(null)

  // $effect is called during component initialisation (top level of
  // <script>), not nested inside a callback — an $effect started from inside
  // another hook is an orphan that never runs (PORTING.md rule 3). Re-runs
  // if `auth.user` changes identity (e.g. sign-out then a different sign-in).
  $effect(() => {
    if (!auth.user) { jobList = null; jobsError = null; return }
    let alive = true
    jobList = null
    jobsError = null
    fetchJobs()
      .then((r) => { if (alive) jobList = r.jobs || [] })
      .catch((err) => {
        if (!alive) return
        jobsError = err instanceof ForgeError ? err.message : 'Could not load your models.'
      })
    return () => { alive = false }
  })

  function jobWhen(job) {
    return job.createdAt
      ? new Date(job.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : null
  }

  function avatarInitial(mail) {
    return (mail || '?').trim().charAt(0).toUpperCase() || '?'
  }

  function onJobThumbError(e) {
    e.currentTarget.style.display = 'none'
  }

  // ─── inline 3D preview: click-to-expand, one WebGL context at a time ─────
  // Browsers cap concurrent live WebGL contexts (~16), and this page can list
  // many completed jobs at once — mounting a viewer per row up front would
  // spend the budget on rows nobody is looking at. `openJobId` holding a
  // single id means opening a different job's viewer un-mounts the previous
  // one first (Svelte destroys the old `{#if}` branch before rendering the
  // new one), which runs ModelViewer's own teardown — geometry/material/
  // texture disposal, then `releaseRenderer()` handing the GL context back —
  // before the next viewer ever asks for a context of its own.
  let openJobId = $state(null)

  function toggleViewer(id) {
    openJobId = openJobId === id ? null : id
  }
</script>

<svelte:head>
  <title>Your Account — LOOM</title>
  <meta
    name="description"
    content="Your FORGE account — see your free and paid 2D-to-3D models, past jobs and downloads. Sign in to check your credits."
  />
</svelte:head>

{#if auth.loading}
  <div class="dash-page">
    <div class="dash-wrap dash-wrap--loading">
      <p class="dash-note">Checking your account…</p>
    </div>
  </div>
{:else if !auth.user}
  <div class="dash-page">
    <div class="dash-wrap dash-wrap--auth">
      <a class="dash-back" href="/">← Return to the site</a>
      <div class="dash-auth-card">
        <p class="dash-kicker"><span>—</span> Your account</p>
        <h1 class="dash-h1">Sign in to see your models</h1>
        <p class="dash-lede">
          One account for FORGE, the 2D→3D tool — your first model is free, then it's
          {PRICE_JOD} JOD each. Sign in to see what you've made and what's left.
        </p>

        <div class="dash-tabs" role="tablist" aria-label="Account">
          <button type="button" role="tab" aria-selected={mode === 'signin'}
            class={mode === 'signin' ? 'is-on' : ''}
            onclick={() => { mode = 'signin'; authError = null }}
          >Sign in</button>
          <button type="button" role="tab" aria-selected={mode === 'register'}
            class={mode === 'register' ? 'is-on' : ''}
            onclick={() => { mode = 'register'; authError = null }}
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

          {#if authError}
            <p class="dash-error" role="alert">{authError}</p>
          {/if}

          <WoolButton
            label={mode === 'register' ? 'Sign up' : 'Log in'}
            type="submit"
            disabled={busy}
            class={busy ? 'is-busy' : ''}
          />
        </form>
      </div>
    </div>
  </div>
{:else}
  {@const p = auth.user.profile}
  <div class="dash-page">
    <div class="dash-wrap">
      <a class="dash-back" href="/">← Return to the site</a>

      <header class="dash-head">
        <div class="dash-avatar" aria-hidden="true">{avatarInitial(auth.user.email)}</div>
        <div class="dash-head-copy">
          <p class="dash-kicker"><span>—</span> Your account</p>
          <h1 class="dash-h1">{auth.user.email}</h1>
        </div>
        <button type="button" class="dash-signout" onclick={() => auth.signOut()}>Sign out</button>
      </header>

      <section class="dash-stats" aria-label="Account status">
        <div class="dash-stat">
          <span class="dash-stat-n">{p.freeUsed ? 'Used' : 'Ready'}</span>
          <span class="dash-stat-l">Free model</span>
        </div>
        <div class="dash-stat">
          <span class="dash-stat-n">{p.credits}</span>
          <span class="dash-stat-l">Paid model{p.credits === 1 ? '' : 's'} left</span>
        </div>
        <div class="dash-stat">
          <span class="dash-stat-n">{p.modelsMade}</span>
          <span class="dash-stat-l">Model{p.modelsMade === 1 ? '' : 's'} made</span>
        </div>
      </section>

      {#if !p.canGenerate}
        <p class="dash-note dash-note--warn">
          You're out of free and paid models. Top up from the FORGE panel on the home page —
          {p.priceJod || PRICE_JOD} JOD gets you another.
        </p>
      {/if}

      <section class="dash-jobs">
        <h2 class="dash-h2">Your models</h2>

        {#if jobsError}
          <p class="dash-error" role="alert">{jobsError}</p>
        {/if}

        {#if jobList === null && !jobsError}
          <p class="dash-note">Loading your models…</p>
        {/if}

        {#if jobList && jobList.length === 0}
          <p class="dash-empty">
            You haven't made a model yet. <a href="/">Make one on the home page</a>.
          </p>
        {/if}

        {#if jobList && jobList.length > 0}
          <ul class="dash-job-list">
            {#each jobList as job (job.id)}
              {@const done = job.status === 'SUCCEEDED'}
              {@const failed = job.status === 'FAILED'}
              <li class="dash-job {done ? 'is-done' : failed ? 'is-failed' : 'is-running'}">
                <div class="dash-job-row">
                  <div class="dash-job-thumb">
                    {#if job.thumbnailUrl}
                      <img src={job.thumbnailUrl} alt="" loading="lazy" decoding="async" onerror={onJobThumbError} />
                    {:else}
                      <span class="dash-job-ph" aria-hidden="true"></span>
                    {/if}
                  </div>
                  <div class="dash-job-meta">
                    <p class="dash-job-name">{job.name || 'Untitled model'}</p>
                    <p class="dash-job-sub">
                      {#if jobWhen(job)}<span>{jobWhen(job)}</span>{/if}
                      <span class="dash-job-status dash-job-status--{job.status?.toLowerCase() || 'pending'}">
                        {JOB_LABEL[job.status] || job.status}
                      </span>
                    </p>
                  </div>
                  {#if done && job.modelUrls}
                    <div class="dash-job-files">
                      {#if job.modelUrls.glb}
                        <button
                          type="button"
                          class="dash-job-view"
                          onclick={() => toggleViewer(job.id)}
                          aria-expanded={openJobId === job.id}
                        >{openJobId === job.id ? 'Hide model' : 'View model'}</button>
                      {/if}
                      {#each ['glb', 'usdz', 'fbx', 'obj'] as k (k)}
                        {#if job.modelUrls[k]}
                          <a href={job.modelUrls[k]} download target="_blank" rel="noreferrer">{k.toUpperCase()}</a>
                        {/if}
                      {/each}
                    </div>
                  {/if}
                </div>

                {#if openJobId === job.id && job.modelUrls?.glb}
                  <div class="dash-job-viewer">
                    <ModelViewer
                      src={job.modelUrls.glb}
                      poster={job.thumbnailUrl || null}
                      alt={`3D preview of ${job.name || 'your model'}`}
                    />
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <a class="dash-back dash-back--bottom" href="/">← Return to the site</a>
    </div>
  </div>
{/if}
