<!--
  Multi-step contact wizard: intent -> needs -> details -> WhatsApp / email handoff.
  Fully static — composes a structured brief and opens wa.me / mailto prefilled.
-->
<script>
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { BRAND, WIZARD } from '$data/site.js'
  import { EASE, magnetic } from '$lib/motion.svelte.js'
  import { t } from '$lib/i18n.svelte.js'
  import { WIZARD_UI } from '$data/chrome.js'
  import WoolButton from './WoolButton.svelte'
  import WoolIcon from './WoolIcon.svelte'

  let { seed = null, onState = null } = $props()

  // Step-rail labels only — the form FIELD labels/placeholders inside each
  // pane (name, company, budget, timeline, message) are still English-only
  // this wave; see $lib/data/chrome.js's header for the scope line.
  const STEPS = $derived(WIZARD_UI.steps.map((s) => t(s)))
  // Which beat of the machine's script each step corresponds to. Kept here
  // rather than in the machine so the wizard stays the single source of truth
  // for where you are.
  const STEP_STATE = ['greet', 'needs', 'details', 'review']

  // A seeded open (from a Solutions card, the Moon CTA, a nav button) skips
  // straight past the intent step and carries the industry into the brief.
  let step = $state(seed?.intent ? 1 : 0)
  let dir = $state(1)
  let intent = $state(seed?.intent ?? null)
  let needs = $state([])
  let form = $state({ name: '', company: '', budget: '', timeline: '', message: '' })
  let touched = $state(false)

  function go(n) {
    dir = n > step ? 1 : -1
    step = n
    onState?.(STEP_STATE[n])
  }
  function toggleNeed(n) {
    needs = needs.includes(n) ? needs.filter((x) => x !== n) : [...needs, n]
  }

  // Greet on mount — a seeded open lands on step 1, so read the step, not a
  // constant. Runs once, at component init (the `$effect` must be called at
  // the top level, per the runes rule — an onMount-wrapped one is an orphan).
  $effect(() => { onState?.(STEP_STATE[step]) })

  const intentObj = $derived(WIZARD.intents.find((i) => i.id === intent))
  const brief = $derived(
    [
      `Hi LOOM! ${intentObj ? intentObj.title : ''}`.trim(),
      seed?.niche ? `Industry: ${seed.niche}` : null,
      seed?.note ? `About: ${seed.note}` : null,
      needs.length ? `What I need: ${needs.join(', ')}` : null,
      form.name ? `Name: ${form.name}` : null,
      form.company ? `Company: ${form.company}` : null,
      form.budget ? `Budget: ${form.budget}` : null,
      form.timeline ? `Timeline: ${form.timeline}` : null,
      form.message ? `Details: ${form.message}` : null,
    ].filter(Boolean).join('\n')
  )

  const waHref = $derived(`${BRAND.whatsapp}?text=${encodeURIComponent(brief)}`)
  const mailHref = $derived(
    `mailto:${BRAND.email}?subject=${encodeURIComponent(`Project inquiry — ${intentObj ? intentObj.title : 'LOOM'}`)}&body=${encodeURIComponent(brief)}`
  )
  const detailsValid = $derived(form.name.trim().length > 1)

  // Mirrors AnimatePresence's `initial={false}`: the very first pane the
  // wizard shows on mount must not slide/fade in — the modal shell around it
  // is already playing its own entrance, and animating this too read as two
  // entrances stacked. Every pane after that (an actual step change) still
  // gets the slide. A plain closure flag rather than state — flipping it must
  // never trigger a re-render.
  let firstPane = true
  function paneIn(node, params) {
    if (firstPane) { firstPane = false; return { duration: 0 } }
    return fly(node, params)
  }
</script>

<div class="wizard">
  {#if seed?.niche}
    <div class="wizard-seed">
      Building for <strong>{seed.niche}</strong>
    </div>
  {/if}

  <!-- A progress rail, not a tablist — the steps own no tabpanels and only
       the already-completed ones are reachable. aria-current marks where you
       are; the disabled state already says where you cannot go yet. -->
  <div class="wizard-steps" role="group" aria-label={t(WIZARD_UI.stepsAriaLabel)}>
    {#each STEPS as s, i (i)}
      <button
        type="button"
        aria-current={step === i ? 'step' : undefined}
        class="wstep {i === step ? 'is-now' : ''} {i < step ? 'is-done' : ''}"
        onclick={() => { if (i < step) go(i) }}
        disabled={i > step}
      ><i>{i + 1}</i>{s}</button>
    {/each}
    <div class="wizard-bar" aria-hidden="true">
      <i style="transform: scaleX({(step + 1) / STEPS.length}); transition: transform 0.5s {EASE};"></i>
    </div>
  </div>

  <div class="wizard-stage">
    {#key step}
      {#if step === 0}
        <div class="wpane" in:paneIn={{ x: dir * 60, opacity: 0, duration: 450, easing: cubicOut }}
             out:fly={{ x: dir * -60, opacity: 0, duration: 450, easing: cubicOut }}>
          <h3 class="wq">{t(WIZARD_UI.q0)}</h3>
          <div class="wintents">
            {#each WIZARD.intents as it (it.id)}
              <button
                type="button"
                class="wintent {intent === it.id ? 'is-picked' : ''}"
                onclick={() => { intent = it.id; go(1) }}
              >
                <span class="wintent-icon" aria-hidden="true">
                  <WoolIcon name={it.wool} size="lg" />
                </span>
                <span class="wintent-title">{it.title}</span>
                <span class="wintent-sub">{it.sub}</span>
              </button>
            {/each}
          </div>
        </div>
      {:else if step === 1}
        <div class="wpane" in:paneIn={{ x: dir * 60, opacity: 0, duration: 450, easing: cubicOut }}
             out:fly={{ x: dir * -60, opacity: 0, duration: 450, easing: cubicOut }}>
          <h3 class="wq">{t(WIZARD_UI.q1)}</h3>
          <p class="wsub">{t(WIZARD_UI.q1sub)}</p>
          <div class="wchips">
            {#each WIZARD.needs as n (n)}
              <button
                type="button"
                class="wchip {needs.includes(n) ? 'is-on' : ''}"
                aria-pressed={needs.includes(n)}
                onclick={() => toggleNeed(n)}
              >{n}</button>
            {/each}
          </div>
          <!-- generic wizard chrome — the photographed Back / Next knits are the right cut here -->
          <div class="wnav">
            <WoolButton label={t(WIZARD_UI.back)} size="small" onclick={() => go(0)} />
            <WoolButton
              label={t(WIZARD_UI.next)}
              size="small"
              disabled={!needs.length}
              style={needs.length ? undefined : 'opacity: 0.4; pointer-events: none;'}
              onclick={() => go(2)}
            />
          </div>
        </div>
      {:else if step === 2}
        <div class="wpane" in:paneIn={{ x: dir * 60, opacity: 0, duration: 450, easing: cubicOut }}
             out:fly={{ x: dir * -60, opacity: 0, duration: 450, easing: cubicOut }}>
          <h3 class="wq">{t(WIZARD_UI.q2)}</h3>
          <div class="wform">
            <label>
              <span>Your name *</span>
              <input
                value={form.name}
                oninput={(e) => { form = { ...form, name: e.target.value } }}
                onblur={() => {
                  touched = true
                  onState?.(detailsValid ? 'details' : 'error')
                }}
                placeholder="e.g. Rania Haddad"
                aria-invalid={touched && !detailsValid}
              />
            </label>
            <label>
              <span>Company / project</span>
              <input
                value={form.company}
                oninput={(e) => { form = { ...form, company: e.target.value } }}
                placeholder="optional"
              />
            </label>
            <label>
              <span>Budget</span>
              <select value={form.budget} onchange={(e) => { form = { ...form, budget: e.target.value } }}>
                <option value="">Prefer not to say</option>
                {#each WIZARD.budgets as b (b)}<option value={b}>{b}</option>{/each}
              </select>
            </label>
            <label>
              <span>Timeline</span>
              <select value={form.timeline} onchange={(e) => { form = { ...form, timeline: e.target.value } }}>
                <option value="">Not sure yet</option>
                {#each WIZARD.timelines as t (t)}<option value={t}>{t}</option>{/each}
              </select>
            </label>
            <label class="wfull">
              <span>Tell us more</span>
              <textarea
                rows="4"
                value={form.message}
                oninput={(e) => { form = { ...form, message: e.target.value } }}
                placeholder="The idea, the market, the deadline — anything that helps us think."
              ></textarea>
            </label>
          </div>
          <div class="wnav">
            <button type="button" class="wback" onclick={() => go(1)}>{t(WIZARD_UI.backArrow)}</button>
            <WoolButton
              label={t(WIZARD_UI.review)}
              size="small"
              disabled={!detailsValid}
              style={detailsValid ? undefined : 'opacity: 0.4; pointer-events: none;'}
              onclick={() => { touched = true; if (detailsValid) go(3) }}
            />
          </div>
        </div>
      {:else if step === 3}
        <div class="wpane" in:paneIn={{ x: dir * 60, opacity: 0, duration: 450, easing: cubicOut }}
             out:fly={{ x: dir * -60, opacity: 0, duration: 450, easing: cubicOut }}>
          <h3 class="wq">{t(WIZARD_UI.q3)}</h3>
          <pre class="wbrief" aria-label={t(WIZARD_UI.briefAriaLabel)}>{brief}</pre>
          <div class="wsend">
            <!-- two yarns, so the choice reads as two threads rather than a
                 primary and a leftover. Both hand off to another app, so
                 'sent' is the honest word for what we know: the brief left
                 here. -->
            <div use:magnetic>
              <WoolButton label={t(WIZARD_UI.sendWhatsapp)} size="big" href={waHref} target="_blank" rel="noreferrer"
                onclick={() => onState?.('sent')} />
            </div>
            <div use:magnetic>
              <WoolButton label={t(WIZARD_UI.sendEmail)} size="big" yarn="blue" href={mailHref}
                onclick={() => onState?.('sent')} />
            </div>
          </div>
          <div class="wnav wnav--end">
            <button type="button" class="wback" onclick={() => go(2)}>{t(WIZARD_UI.editDetailsArrow)}</button>
          </div>
        </div>
      {/if}
    {/key}
  </div>
</div>
