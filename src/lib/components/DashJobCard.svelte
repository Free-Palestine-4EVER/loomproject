<!--
  DashJobCard — one past generation in the library grid.

  Everything on this card is a field the forge function actually returned:
  `thumbnailUrl`, `name`, `createdAt`, `status`, `progress` (when Meshy sends
  one), `error`, and whichever keys `modelUrls` happens to carry. A format pill
  appears only if THAT job has that URL — the four-format list is an order, not
  a promise, and a job that produced only a GLB shows only GLB.

  NO WEBGL HERE. The grid can hold dozens of finished models and a browser caps
  live WebGL contexts at roughly 16, so cards are flat thumbnails; the single
  live viewer lives in the inspect dialog, one at a time.

  There is no rename control and no one-click re-run, because the API has
  neither: the surface is me / jobs / startJob / jobStatus / createOrder, full
  stop. "Try again" on a failed job is honest about what it does — it re-seeds
  the name in the generate panel and asks for the photo again, since a finished
  job stores a render of the MODEL, not the photograph it came from.
-->
<script>
  import { FORMATS, statusKey, statusLabel, whenExact, whenLabel } from './dashutil.js'

  let { job, oninspect, onretry } = $props()

  const done = $derived(job.status === 'SUCCEEDED')
  const failed = $derived(job.status === 'FAILED')
  const running = $derived(job.status === 'PENDING' || job.status === 'IN_PROGRESS')
  const files = $derived(FORMATS.filter((k) => job.modelUrls?.[k]))
  const pct = $derived(
    typeof job.progress === 'number' ? Math.max(0, Math.min(100, Math.round(job.progress))) : null,
  )
  const when = $derived(whenLabel(job.createdAt))
  const exact = $derived(whenExact(job.createdAt))

  let thumbBroken = $state(false)
</script>

<article class="dc dc--{statusKey(job.status)}">
  <div class="dc-art">
    {#if job.thumbnailUrl && !thumbBroken}
      <img
        src={job.thumbnailUrl}
        alt={`Preview of ${job.name || 'your model'}`}
        loading="lazy"
        decoding="async"
        onerror={() => (thumbBroken = true)}
      />
    {:else}
      <span class="dc-art-ph" aria-hidden="true"></span>
    {/if}

    <span class="dc-badge dc-badge--{statusKey(job.status)}">
      {#if running}<span class="dc-dot" aria-hidden="true"></span>{/if}
      {statusLabel(job.status)}
    </span>

    {#if done && job.modelUrls?.glb}
      <!-- The whole picture is the affordance, and it is a real button. -->
      <button type="button" class="dc-open" onclick={() => oninspect?.(job)}>
        <span>Inspect in 3D</span>
      </button>
    {/if}

    {#if running}
      <div
        class="dc-bar"
        class:is-indeterminate={pct === null}
        role="progressbar"
        aria-label={`Progress for ${job.name || 'your model'}`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={pct ?? undefined}
      >
        <span class="dc-bar-fill" style={pct === null ? undefined : `width:${pct}%`}></span>
      </div>
    {/if}
  </div>

  <div class="dc-body">
    <h3 class="dc-name" title={job.name || 'Untitled model'}>{job.name || 'Untitled model'}</h3>
    {#if when}
      <p class="dc-when" title={exact ?? undefined}>{when}</p>
    {/if}

    {#if failed && job.error}
      <p class="dc-fail">{job.error}</p>
    {/if}

    {#if done && files.length}
      <div class="dc-files">
        {#each files as k (k)}
          <a
            class="dc-file"
            href={job.modelUrls[k]}
            download
            target="_blank"
            rel="noreferrer"
          >{k.toUpperCase()}</a>
        {/each}
      </div>
    {:else if failed}
      <button type="button" class="dc-retry" onclick={() => onretry?.(job)}>
        Try again with another photo
      </button>
    {/if}
  </div>
</article>
