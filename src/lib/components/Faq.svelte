<!--
  FAQ — the objection band, immediately above Contact.

  Last thing before the ask, on purpose. Everything above this point argues
  for LOOM; this is the only section whose job is to remove reasons to leave.
  Nothing new is introduced — see $data/faq.js, which forbids new facts
  outright, because an FAQ is the last place a stray invented figure gets
  caught.

  BUILT ON <details>, NOT ON A STATE RUNE. The native disclosure element gives
  keyboard operation, the correct expanded/collapsed semantics, and — the part
  that matters on this site — find-in-page. Chrome and Safari now open a
  closed <details> when its text matches a Cmd-F search; a div with a $state
  toggle does not, so a hand-rolled accordion silently hides the answer from
  the visitor who went looking for it. It also renders open and readable if JS
  never boots — which under SSR is simply the server-rendered state, no
  different from any other element here.

  The height transition uses `interpolate-size: allow-keywords` +
  `transition-behavior: allow-discrete` (faq.css) rather than measuring
  scrollHeight in an effect. That is a progressive enhancement: where it is
  unsupported the panel simply snaps open, which is what a <details> does
  anyway, and no JS runs either way.

  THE SCHEMA IS NOT DECORATION. #aeo on this same page sells schema.org markup
  so an answer engine can quote a fact off your site rather than guess one
  from a directory. Shipping an FAQ section with no FAQPage schema under it
  would be the studio failing its own pitch on its own home page. The JSON-LD
  is generated from the same FAQ array the section renders, so the two can
  never drift — and it lives in <svelte:head> rather than inline in the
  section, since that is the correct place for a <script type="application/
  ld+json"> under SSR (App.jsx had no such distinction; SvelteKit does).
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { FAQ } from '$data/faq.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import { wizard } from '$lib/wizard.svelte.js'
  import './faq.css'

  // Built once, from the same array the markup below renders — never a second
  // hand-maintained copy of these answers, which is how a page ends up
  // telling a crawler something it no longer tells a reader.
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  })
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${schema}</script>`}
</svelte:head>

<section class="faq" id="faq" aria-label="Frequently asked questions">
  <div class="faq-head">
    <p class="kicker"><span>—</span> Before you ask</p>
    <SplitWords as="h2" class="h2 faq-h2" text="The questions that come up every time." />
    <p class="lede faq-sub" use:reveal={{ delay: 0.12 }}>
      Answered here rather than on a call, because the answer does not change
      depending on who is asking.
    </p>
  </div>

  <div class="faq-list">
    {#each FAQ as f, i (f.id)}
      <div class="faq-row" use:reveal={{ delay: Math.min(i, 5) * 0.05 }}>
        <details class="faq-item" name="loom-faq">
          <summary class="faq-q">
            <span class="faq-q-text">{f.q}</span>
            <!-- one glyph that rotates — not a swapped +/− pair, which
                 cannot be transitioned and pops -->
            <i class="faq-sign" aria-hidden="true"></i>
          </summary>
          <div class="faq-a"><p>{f.a}</p></div>
        </details>
      </div>
    {/each}
  </div>

  <div class="faq-foot" use:reveal={{ delay: 0.1 }}>
    <div class="faq-foot-copy">
      <h3 class="faq-foot-h">Still something unanswered?</h3>
      <p class="faq-foot-p">Ask it in the form — you get a person, not a bot.</p>
    </div>
    <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
      <WoolButton
        label="Ask us anything"
        yarn="violet"
        onclick={() => wizard.open({ note: 'Question — from the FAQ' })}
      />
    </div>
  </div>
</section>
