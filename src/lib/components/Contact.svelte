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

  The layout described above (a 0.85/1.15 `.contact-machine` grid, then a
  `.contact-console`) has since been rebuilt twice; see the comment on the
  `<section>` below for what is on screen now. The STATE contract is the part
  that has never moved: the wizard reports its step through `onState`, and
  LoomHead + MachineChat both read that one value back down.
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
  import './contact.css'

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

<!--
  REBUILD (Aug 2026). What was here: a centred 4.4rem two-line headline whose
  second line was a 1.5px magenta OUTLINE (`.contact-accent`, styles.css:2585)
  that on the pale rose ground read as a rendering fault rather than a word;
  a lede; then a pale console on a pale page — 1.07:1 of separation between
  the panel and the ground, so the one surface a client actually uses had no
  edges at all; and the wizard buried under a header bar carrying a machine
  avatar and a Sound-off toggle.

  What it is now: ONE machine. A dark felt chassis holds the talking half on
  the left — the ask, the machine's face, its transcript, and the direct
  routes for anyone who would rather not fill anything in — and the wizard
  sits in it as a lit paper SCREEN. The wizard is the brightest object in the
  band, which is the whole point: it is the hero, everything else is chassis.

  ContactWizard is untouched (the site-wide modal mounts the same component
  through `display: contents` and depends on its exact DOM); every restyle
  lives in contact.css behind a `.contact` scope, so the modal renders exactly
  as it did. All copy, all four steps, every option, every field, the
  validation and both submit paths are unchanged.
-->
<section class="contact" id="contact">
  <div class="contact-shell" use:reveal>
    <span class="contact-rail-yarn" aria-hidden="true"></span>

    <div class="contact-aside">
      <p class="kicker"><span>—</span> Contact</p>
      <h2 class="contact-h2">
        <SplitWords text="Ready to push" />
        <span class="contact-accent"><SplitWords text="boundaries?" delay={0.15} /></span>
      </h2>
      <p class="contact-sub" use:reveal={{ delay: 0.2 }}>
        Tell the machine what you are making. A human answers — fast, and in your language.
      </p>

      <!-- The machine's face and its transcript, still reading `mstate` off
           the wizard — which was always the only real reason to keep them on
           screen. They now sit beside the form they are narrating instead of
           on top of it. -->
      <div class="contact-mach">
        <div class="contact-face">
          <LoomHead state={mstate} reduced={reducedMotion.current} />
        </div>
        <div class="contact-say">
          <MachineChat state={mstate} lang={lang} onLang={setLang} reduced={reducedMotion.current} />
        </div>
      </div>

      <div class="contact-direct">
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
    </div>

    <!-- THE SCREEN. Paper, lit, inside the chassis — the wizard keeps the
         light-theme ink it was designed against, so nothing inside it moves. -->
    <div class="contact-screen">
      <ContactWizard onState={(s) => { mstate = s }} />
    </div>
  </div>
</section>
