<!--
  The talking half of the contact experience: transcript, sound toggle, AR/EN switch.
  Pairs with <LoomHead /> (the visual) and <ContactWizard /> (the actual form).

  Scope note: this is the only bilingual surface on the site. The rest of the page is
  English, so the switch is labelled and scoped to the machine rather than dressed up
  as a site-wide language toggle it is not.
-->
<script>
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { browser } from '$app/environment'
  import { MACHINE_LINES, MACHINE_UI } from '$data/machine.js'
  import { createVoice } from '$lib/machineVoice.js'

  // `reduced` is passed in rather than read here — the section already reads
  // reducedMotion.current and a second subscription to the same query is one
  // too many.
  //
  // NOTE: aliased to `chatState` locally — a local identifier literally named
  // `state` collides with the `$state` rune (Svelte parses `$state(...)` as
  // legacy store auto-subscription of an in-scope variable named `state`),
  // which silently breaks every `$state(...)` call below. `state` stays the
  // external prop name so the caller (Contact.svelte) is unaffected.
  let { state: chatState, lang, onLang, reduced } = $props()

  let sound = $state(false)
  let log = $state([])
  let railEl = $state(null)
  const voice = createVoice()

  const ui = $derived(MACHINE_UI[lang])

  // Append on state change. The transcript is the record of the conversation, so a
  // repeated state (revisiting a step) does not duplicate the line.
  $effect(() => {
    const line = MACHINE_LINES[chatState]
    if (!line) return
    if (log[log.length - 1]?.key !== chatState) log = [...log, { key: chatState }]
    if (sound) voice.say(chatState, lang, line[lang])
  })

  $effect(() => {
    if (!browser) return
    if (sound) voice.preload(lang)
    else voice.stop()
  })

  // Cleanup only — no reactive dependency, so this reads once at init and its
  // returned function fires on destroy, same as React's `useEffect(() => () =>
  // voice.current?.stop(), [])`.
  $effect(() => () => voice.stop())

  // Follow the conversation without yanking the whole page — scroll the rail only.
  $effect(() => {
    log
    const el = railEl
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' })
  })

  function toggleLang() {
    voice.stop()
    onLang?.(lang === 'en' ? 'ar' : 'en')
  }
</script>

<div class="machine" dir={ui.dir} lang={lang}>
  <div class="machine-bar">
    <span class="machine-label">{ui.label}</span>
    <div class="machine-actions">
      <button
        type="button"
        class="machine-btn {sound ? 'is-on' : ''}"
        aria-pressed={sound}
        onclick={() => { sound = !sound }}
      >
        <i aria-hidden="true" class="machine-dot"></i>
        {sound ? ui.sound_on : ui.sound_off}
      </button>
      <button
        type="button"
        class="machine-btn"
        aria-label={ui.lang_switch_label}
        onclick={toggleLang}
      >{ui.lang_switch}</button>
    </div>
  </div>

  <!-- polite, not assertive: the machine narrates alongside the form, it does not
       interrupt what a screen reader is already saying about the current field. -->
  <div class="machine-rail" bind:this={railEl} role="log" aria-live="polite" aria-label={ui.transcript}>
    {#each log as entry, i (entry.key + '-' + i)}
      <p
        class="machine-line"
        in:fly={reduced ? { duration: 0 } : { y: 10, duration: 400, easing: cubicOut }}
      >{MACHINE_LINES[entry.key][lang]}</p>
    {/each}
  </div>

  {#if reduced}<p class="machine-note">{ui.reduced}</p>{/if}
</div>
