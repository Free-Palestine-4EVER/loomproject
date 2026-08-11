<!--
  DashGenerate — the workspace's generate panel: one photo in, one job out.

  WHAT THIS PANEL CAN DO IS EXACTLY WHAT THE BACKEND CAN DO. `startJob(image,
  name)` is the entire generation surface the forge Cloud Function exposes —
  there is no texture pass, no retopology, no remesh, no rig, no refine stage
  behind it — so there is no control for any of those here. A button that
  silently does nothing is worse than an absent one; the missing half is
  written up as a backend contract in the handoff, not stubbed on screen.

  ENTITLEMENT IS DISPLAY, NEVER PERMISSION. Every number and every word about
  free/paid models below is read off `profile`, which is verbatim the /me
  response. Nothing is hardcoded and nothing is computed here except the
  arithmetic on a top-up estimate, which is labelled as an estimate until the
  server's own `order.amountJod` replaces it. The forge function re-checks the
  entitlement inside a transaction on every generate; a 402 coming back is the
  real answer, and it is handled (onneedcredits) rather than prevented.
-->
<script>
  import { fileToDataUrl, startJob, ForgeError } from '$lib/forge.js'
  import { reducedMotion } from '$lib/motion.svelte.js'
  import { clock, dataUrlBytes, formatBytes, nameFromFile, toMs } from './dashutil.js'
  import WoolButton from './WoolButton.svelte'

  let {
    /** The /me profile — { freeUsed, credits, canGenerate, nextIsFree, modelsMade, priceJod } */
    profile,
    /** The job this panel started, kept live by the page's poller. null when idle. */
    activeJob = null,
    /** { name, token } — bumping `token` re-seeds the name field and focuses the picker. */
    prefill = null,
    /** (job, profile) => void — a generate that the server accepted. */
    onstarted,
    /** () => void — the server said PAYMENT_REQUIRED. */
    onneedcredits,
  } = $props()

  const MAX_EDGE = 1024

  let fileInput = $state(null)
  let dropZone = $state(null)

  let preview = $state(null) // the downscaled data URL that will be posted
  let shot = $state(null) // { w, h, bytes, fromBytes, type }
  let name = $state('')
  let prepping = $state(false)
  let submitting = $state(false)
  let error = $state(null)
  let over = $state(false)

  const running = $derived(
    activeJob?.status === 'PENDING' || activeJob?.status === 'IN_PROGRESS'
  )
  const pct = $derived(
    typeof activeJob?.progress === 'number'
      ? Math.max(0, Math.min(100, Math.round(activeJob.progress)))
      : null
  )

  // ── elapsed clock on the running job ───────────────────────────────────────
  // Real seconds since this browser posted the job, not a fake progress curve.
  let startedAt = $state(0)
  let now = $state(Date.now())
  /** Prefer the moment THIS browser posted the job; fall back to the server's
   *  own createdAt for a job that was already running when the page loaded, and
   *  show no clock at all if neither exists. */
  const since = $derived(startedAt || toMs(activeJob?.createdAt))
  $effect(() => {
    if (!running) return
    now = Date.now()
    const id = setInterval(() => { now = Date.now() }, 1000)
    return () => clearInterval(id)
  })

  // ── retry prefill from a failed card ──────────────────────────────────────
  // The API cannot re-run a past job: `startJob` takes an image, and a finished
  // job carries a render of the MODEL, not the photograph it was made from. So
  // "Try again" means "same name, pick the photo again" — it seeds the field
  // and opens the file dialog, and it is labelled as that.
  let lastToken = 0
  $effect(() => {
    const t = prefill?.token || 0
    if (!t || t === lastToken) return
    lastToken = t
    name = (prefill.name || '').slice(0, 60)
    error = null
    dropZone?.scrollIntoView({ block: 'center', behavior: reducedMotion.current ? 'auto' : 'smooth' })
    setTimeout(() => fileInput?.click(), 260)
  })

  // ── the photo ─────────────────────────────────────────────────────────────

  async function takeFile(file) {
    if (!file) return
    error = null
    if (!/^image\//.test(file.type)) {
      error = 'That is not an image — send a JPEG, PNG or HEIC photo.'
      return
    }
    prepping = true
    try {
      // fileToDataUrl is the client-side downscale: <=1024px on the long edge,
      // re-encoded JPEG, EXIF orientation applied. It is what makes this work
      // on Jordanian mobile data — a 12MP phone shot posted raw is 4-8MB.
      const dataUrl = await fileToDataUrl(file, MAX_EDGE)
      const dims = await measure(dataUrl)
      preview = dataUrl
      shot = { ...dims, bytes: dataUrlBytes(dataUrl), fromBytes: file.size || 0 }
      if (!name.trim()) name = nameFromFile(file)
    } catch (err) {
      error = err?.message || 'That image could not be read.'
      preview = null
      shot = null
    } finally {
      prepping = false
    }
  }

  function measure(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => resolve({ w: 0, h: 0 })
      img.src = dataUrl
    })
  }

  function onInput(e) {
    const f = e.currentTarget.files?.[0]
    // Reset the input so picking the SAME file twice still fires a change.
    e.currentTarget.value = ''
    takeFile(f)
  }

  function onDrop(e) {
    e.preventDefault()
    over = false
    takeFile(e.dataTransfer?.files?.[0])
  }
  function onDragOver(e) { e.preventDefault(); over = true }
  function onDragLeave() { over = false }

  // Paste a screenshot straight in. Bound to the panel, not the window, so it
  // never steals a paste meant for the name field's own text.
  function onPaste(e) {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'))
    if (!item) return
    const f = item.getAsFile()
    if (f) { e.preventDefault(); takeFile(f) }
  }

  function clearShot() {
    preview = null
    shot = null
    error = null
  }

  // ── generate ──────────────────────────────────────────────────────────────

  async function submit(e) {
    e?.preventDefault?.()
    if (!preview || submitting) return
    submitting = true
    error = null
    try {
      const r = await startJob(preview, name.trim() ? name.trim().slice(0, 60) : null)
      startedAt = Date.now()
      now = Date.now()
      onstarted?.(r.job, r.profile)
      preview = null
      shot = null
      name = ''
    } catch (err) {
      if (err instanceof ForgeError && err.code === 'PAYMENT_REQUIRED') {
        onneedcredits?.()
      } else {
        error = err?.message || 'That did not go through. Try again in a moment.'
      }
    } finally {
      submitting = false
    }
  }

  /** Built in JS, not in markup: Svelte trims the whitespace around a `{#if}`
   *  inside a text run, which turned "33 KB → 84 KB" into "33 KB →84 KB". */
  const sizeLine = $derived(
    !shot
      ? ''
      : [
          shot.fromBytes ? `${formatBytes(shot.fromBytes)} → ${formatBytes(shot.bytes)}` : formatBytes(shot.bytes),
          shot.w ? `${shot.w} × ${shot.h}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
  )

  // ── the entitlement line, read straight off /me ────────────────────────────
  const price = $derived(profile?.priceJod)
  const credits = $derived(Number(profile?.credits) || 0)
</script>

<section
  class="dg"
  aria-labelledby="dg-title"
  onpaste={onPaste}
>
  <header class="dg-head">
    <h2 class="dg-title" id="dg-title">New model</h2>
    {#if profile}
      <p class="dg-ent" class:is-free={profile.nextIsFree} class:is-out={!profile.canGenerate}>
        {#if profile.nextIsFree}
          Your first model is free
        {:else if credits > 0}
          {credits} credit{credits === 1 ? '' : 's'} left
        {:else if price != null}
          {price} JOD each
        {:else}
          No models left
        {/if}
      </p>
    {/if}
  </header>

  {#if running}
    <!-- ── a job this browser started, still on the loom ───────────────────── -->
    <div class="dg-live" aria-live="polite">
      <div class="dg-live-art" aria-hidden="true">
        <span class="dg-live-box"></span>
      </div>
      <p class="dg-live-name">{activeJob.name || 'Untitled model'}</p>
      <p class="dg-live-state">
        {activeJob.status === 'PENDING' ? 'Queued' : 'Rebuilding the shape'}
        {#if since}<span class="dg-live-clock">· {clock(now - since)}</span>{/if}
      </p>
      <div
        class="dg-bar"
        class:is-indeterminate={pct === null}
        role="progressbar"
        aria-label="Generation progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={pct ?? undefined}
      >
        <span class="dg-bar-fill" style={pct === null ? undefined : `width:${pct}%`}></span>
      </div>
      <p class="dg-hint">
        Usually 40–90 seconds. You can leave this page — it keeps going, and it will be
        in your library when you come back.
      </p>
    </div>
  {:else}
    <form class="dg-form" onsubmit={submit}>
      <!-- ── dropzone ──────────────────────────────────────────────────────── -->
      <div
        class="dg-drop"
        role="group"
        aria-label="Photo for this model — drop, paste or choose one"
        class:is-over={over}
        class:has-shot={Boolean(preview)}
        bind:this={dropZone}
        ondrop={onDrop}
        ondragover={onDragOver}
        ondragleave={onDragLeave}
      >
        {#if preview}
          <img class="dg-shot" src={preview} alt="What you picked, resized and ready to send" />
          <button type="button" class="dg-shot-x" onclick={clearShot} aria-label="Remove this photo">
            <span aria-hidden="true">×</span>
          </button>
        {:else}
          <div class="dg-drop-inner">
            <span class="dg-drop-mark" aria-hidden="true"></span>
            <p class="dg-drop-lead">Drop a photo here</p>
            <p class="dg-drop-sub">or paste it — one clear shot, whole object, plain background</p>
            <button type="button" class="dg-pick" onclick={() => fileInput?.click()} disabled={prepping}>
              {prepping ? 'Reading photo…' : 'Choose a photo'}
            </button>
          </div>
        {/if}
        <input
          class="dg-file"
          bind:this={fileInput}
          type="file"
          accept="image/*"
          onchange={onInput}
          tabindex="-1"
          aria-hidden="true"
        />
      </div>

      {#if shot}
        <p class="dg-meta">Resized here before upload — {sizeLine}</p>
      {/if}

      <label class="dg-field">
        <span>Name</span>
        <input
          type="text"
          maxlength="60"
          placeholder="Walnut side chair"
          value={name}
          oninput={(e) => (name = e.target.value)}
        />
      </label>

      {#if error}
        <p class="dg-error" role="alert">{error}</p>
      {/if}

      <WoolButton
        label={profile?.nextIsFree ? 'Make one free' : 'Generate'}
        type="submit"
        size="small"
        disabled={!preview || submitting || prepping}
        class={`dg-go${submitting || prepping ? ' is-busy' : !preview ? ' is-idle' : ''}`}
      />

      {#if profile && !profile.canGenerate}
        <p class="dg-hint dg-hint--warn">
          You have used your free model and have no credits left. Add models below and we
          will credit the account as soon as the transfer lands.
        </p>
      {/if}
    </form>
  {/if}
</section>
