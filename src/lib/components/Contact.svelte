<!--
  Contact — the last band before the footer.

  Sections.jsx's `Contact()` renders a two-column `.contact-machine`: the
  LoomHead figure + MachineChat transcript on the left (`LoomHead.jsx`,
  `MachineChat.jsx`), the multi-step `ContactWizard` form inline on the right
  (`ContactWizard.jsx`), with the wizard's own state lifted HERE so the head
  and the transcript can react to which step the visitor is on — the wizard
  reports where the visitor is via `onState`, LoomHead and MachineChat both
  read that one value back down.

  `lang` is the second piece of state Contact owns (the React version reads
  it via MachineChat.jsx's `useMachineLang()` hook) — persisted to
  localStorage under the same key, reproduced inline below since Svelte has
  no hook-import equivalent for a two-line stateful helper.

  An earlier pass of this file swapped this whole block for a single CTA
  calling `wizard.open({})` — the site-wide modal every other CTA opens. That
  was a regression: this section's real conversion surface is the inline
  machine+wizard, not a modal trigger. Restored to match Sections.jsx.
-->
<script>
  import { browser } from '$app/environment'
  import { BRAND } from '$data/site.js'
  import { reveal, magnetic, reducedMotion } from '$lib/motion.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import LoomHead from './LoomHead.svelte'
  import MachineChat from './MachineChat.svelte'
  import ContactWizard from './ContactWizard.svelte'

  const LANG_KEY = 'loom.machine.lang'

  // The machine's state is owned here, not in the wizard: the wizard reports
  // where the visitor is, and the head and the transcript both read from
  // that one value.
  let mstate = $state('idle')
  let lang = $state('en')

  // Runs once at init (no reactive read in the body) — the same [] deps as
  // the React hook's mount effect.
  $effect(() => {
    if (!browser) return
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'ar' || saved === 'en') lang = saved
  })

  function setLang(next) {
    lang = next
    if (browser) localStorage.setItem(LANG_KEY, next)
  }
</script>

<section class="contact" id="contact">
  <p class="kicker kicker--center"><span>—</span> Contact</p>
  <h2 class="contact-h2">
    <SplitWords text="Ready to push" />
    <br />
    <span class="contact-accent"><SplitWords text="boundaries?" delay={0.15} /></span>
  </h2>
  <p class="contact-sub" use:reveal={{ delay: 0.2 }}>
    Tell the machine what you are making. A human answers — fast, and in your language.
  </p>

  <div class="contact-machine" use:reveal={{ delay: 0.3 }}>
    <div class="contact-machine-figure">
      <LoomHead state={mstate} reduced={reducedMotion.current} />
      <MachineChat state={mstate} lang={lang} onLang={setLang} reduced={reducedMotion.current} />
    </div>
    <div class="contact-machine-form">
      <ContactWizard onState={(s) => { mstate = s }} />
    </div>
  </div>

  <div class="contact-direct" use:reveal={{ delay: 0.35 }}>
    <span>Prefer it direct?</span>
    <!-- the number stays readable as text next to it — the knit carries the
         action, not the digits -->
    <div class="magnetic" use:magnetic={{ strength: 0.25 }}>
      <WoolButton label="WhatsApp" size="small" href={BRAND.whatsapp} target="_blank" rel="noreferrer" />
    </div>
    <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">{BRAND.phoneJO}</a>
    <i aria-hidden="true">·</i>
    <a href="mailto:{BRAND.email}">{BRAND.email}</a>
  </div>
</section>
