<!--
  DashInspect — the one live 3D view on the page.

  Opened from a finished card; holds exactly one ModelViewer, which is the
  point: browsers cap concurrent WebGL contexts, so the library grid stays flat
  thumbnails and the context budget is spent on the model somebody is actually
  looking at. Closing this unmounts the viewer, which runs its own teardown
  (geometry/material/texture dispose, then releaseRenderer hands the context
  back) before any other model can be opened.

  Overlay contract, same as Nav.svelte's drawer and the FORGE popup:
  `.overlay-open` on <html>, role="dialog" + aria-modal, Escape to close, a Tab
  focus trap inside the panel, and focus restored to whatever opened it.
-->
<script>
  import { browser } from '$app/environment'
  import { fade } from 'svelte/transition'
  import { reducedMotion } from '$lib/motion.svelte.js'
  import ModelViewer from './ModelViewer.svelte'
  import { FORMATS, statusLabel, whenExact } from './dashutil.js'

  let { job, onclose } = $props()

  let panelEl = $state(null)
  const files = $derived(FORMATS.filter((k) => job?.modelUrls?.[k]))
  const exact = $derived(whenExact(job?.createdAt))
  const dur = $derived(reducedMotion.current ? 0 : 220)

  $effect(() => {
    if (!browser || !job) return
    const opener = document.activeElement

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onclose?.(); return }
      if (e.key !== 'Tab') return
      const f = panelEl?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!f || !f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.documentElement.classList.add('overlay-open')
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => panelEl?.querySelector('.di-x')?.focus(), 60)

    return () => {
      document.documentElement.classList.remove('overlay-open')
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
      if (opener && document.contains(opener)) opener.focus()
    }
  })
</script>

{#if job}
  <div class="di-root">
    <button
      type="button"
      class="di-scrim"
      aria-label="Close the model view"
      onclick={() => onclose?.()}
      transition:fade={{ duration: dur }}
    ></button>

    <div
      class="di-panel"
      bind:this={panelEl}
      role="dialog"
      aria-modal="true"
      aria-labelledby="di-name"
      transition:fade={{ duration: dur }}
    >
      <header class="di-head">
        <div class="di-head-copy">
          <p class="di-kicker">{statusLabel(job.status)}</p>
          <h2 class="di-name" id="di-name">{job.name || 'Untitled model'}</h2>
          {#if exact}<p class="di-when">Made {exact}</p>{/if}
        </div>
        <button type="button" class="di-x" onclick={() => onclose?.()} aria-label="Close">
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div class="di-body">
        <div class="di-stage">
          {#if job.modelUrls?.glb}
            <ModelViewer
              src={job.modelUrls.glb}
              poster={job.thumbnailUrl || null}
              alt={`3D preview of ${job.name || 'your model'}`}
            />
          {:else if job.thumbnailUrl}
            <img class="di-flat" src={job.thumbnailUrl} alt={`Preview of ${job.name || 'your model'}`} />
          {/if}
        </div>

        <div class="di-side">
          <p class="di-lead">Drag to turn it. Scroll or pinch to get closer.</p>

          {#if files.length}
            <p class="di-side-label">Download</p>
            <div class="di-files">
              {#each files as k (k)}
                <a class="di-file" href={job.modelUrls[k]} download target="_blank" rel="noreferrer">
                  <span class="di-file-k">{k.toUpperCase()}</span>
                  <span class="di-file-n">
                    {k === 'glb' ? 'Web, AR, most engines' : ''}
                    {k === 'fbx' ? 'Maya, 3ds Max, Unity' : ''}
                    {k === 'obj' ? 'Universal, no rig' : ''}
                    {k === 'usdz' ? 'iPhone Quick Look' : ''}
                  </span>
                </a>
              {/each}
            </div>
          {:else}
            <p class="di-lead">No files on this one yet.</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
