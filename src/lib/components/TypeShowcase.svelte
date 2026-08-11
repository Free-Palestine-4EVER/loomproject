<!--
  #typeface — the home page's own-typeface act. Three screens of scroll
  pinned to one viewport: the word is set large and centred from the first
  frame, then cycles through the pattern cuts — fill, outline, fill, outline —
  while a field of loose glyphs drifts behind it, then hands over the copy and
  the CTAs. The pinned sequence itself lives in
  TypeShowcaseAct.svelte (the equivalent of TypeShowcase.jsx's internal `Act`
  component) — this file owns only the CHOICE of layout/breakpoint and the
  dev HUD, same split PORTING.md's table already uses for lib/motion.jsx ->
  motion.svelte.js + SplitWords.svelte/CountUp.svelte.

  LOOM drew a whole typeface from nothing, so "we can make anything" is not a
  claim in this section — it is the thing you are reading.

  `#typeface`'s act three used to carry three interchangeable compositions
  (Split/Stage/Specimen); the client picked Split and asked for the rest
  gone (11 Aug 2026), so bloomLayouts.js — copied over unchanged — now
  registers exactly one. Its shift+1/2/3 hotkey binder is consequently a
  no-op (see that file); it is still called below so a layout ever being
  reopened does not require touching this file again.

  THE HUD RULE — same as the flight HUD in Companion.js and the original
  TypeShowcase.jsx: dev, or after an explicit `?bloom=`/sessionStorage pick.
  `hud` therefore starts `false` (the safe SSR default — a production visitor
  who has picked nothing must never get it painted over the page, and the
  server has no DEV flag or URL to read anyway) and is only ever raised to
  `true` inside `onMount`, client-side, after checking
  `import.meta.env.DEV || isExplicitLayoutSelection()`.
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import {
    DEFAULT_LAYOUT_ID, resolveInitialLayoutId, isExplicitLayoutSelection,
    bindLayoutHotkeys, formatLayoutHud,
  } from './bloomLayouts.js'
  import TypeShowcaseAct from './TypeShowcaseAct.svelte'

  import './typeshowcase.css'

  // SSR-safe default: resolveInitialLayoutId() reads the URL and
  // sessionStorage, both client-only. The server (and the very first client
  // paint, pre-hydration) renders the shipping default; onMount corrects it
  // if the visitor's URL/session says otherwise.
  let layout = $state(DEFAULT_LAYOUT_ID)
  let narrow = $state(false)
  let hud = $state(false)

  onMount(() => {
    layout = resolveInitialLayoutId()
    hud = import.meta.env.DEV || isExplicitLayoutSelection()

    const mq = window.matchMedia('(max-width: 900px)')
    narrow = mq.matches
    const onMq = () => { narrow = mq.matches }
    mq.addEventListener('change', onMq)

    const unbindHotkeys = bindLayoutHotkeys((id) => { layout = id; hud = true })

    return () => {
      mq.removeEventListener('change', onMq)
      unbindHotkeys()
    }
  })
</script>

{#key `${layout}-${narrow ? 'm' : 'd'}`}
  <TypeShowcaseAct {layout} {narrow} />
{/key}

{#if hud}
  <div class="ts-hud" aria-hidden="true">{formatLayoutHud(layout)}</div>
{/if}
