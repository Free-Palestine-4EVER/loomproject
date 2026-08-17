<!--
  /ai-search — answer engine optimisation, as its own page.

  WHY THIS IS NOT `<AnswerEngine />` ANY MORE. The route used to mount the home
  page's section and close with the shuttle band and the contact form. Two
  things were wrong with that beyond it being a duplicate: the four
  deliverables — the actual product — were a DISCLOSURE, three of the four
  explanations hidden behind a click at any moment, which is the correct
  economy inside a home-page band and exactly wrong on the page a person
  arrived at to read them; and the proof (LOOM's own llms.txt) was one small
  link inside the open panel.

  So on this page the four mechanics are four full blocks, all open, all read
  in order — and the proof is the file itself, quoted from static/llms.txt at
  build time rather than described.

  ───────────────────────────────────────────────────────────────────────────
  HONESTY. This is the section of the site with the most room to lie in, so
  the rules AnswerEngine.svelte set for itself are kept here, tightened:

    · THE DEMONSTRATION IS SIMULATED AND SAYS SO. `.as-flag` reads
      "Illustrative example", it is inside the demo's own masthead, it is on
      screen at all times, and it is not a hover, a footnote or a tooltip.
      The demo is deliberately STATIC here — the section's typing animation is
      persuasive, and persuasion is the wrong ingredient in a thing that is
      not real. There is nothing to skip and nothing to replay: it is a worked
      example printed on the page.
    · NO INTERFACE IMITATION. No engine logos, no marks, no chat bubbles, no
      avatars, no favicons, no reproduction of anyone's product chrome. The
      four engines are named in plain text because naming is fair; drawing
      their UI is not.
    · NO RANKINGS, NO STATISTICS, NO PLACEMENTS. Nothing on this page claims a
      position, a percentage, a client count or a result. The one thing it
      claims is what LOOM builds, and the four blocks are each a description
      of a deliverable, not of an outcome.
    · THE CAVEAT IS THE SAME SENTENCE THE SECTION USES, and it is above the
      call to action rather than under it.

  THE FOUR BLOCKS' `short` AND `body` STRINGS ARE THE SECTION'S OWN, verbatim.
  They are re-declared here because AnswerEngine.svelte holds them in a local
  const rather than exporting them and that component is not this page's to
  edit — if it ever exports them, this array becomes the import.
  ───────────────────────────────────────────────────────────────────────────
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from '$components/SplitWords.svelte'
  import WoolButton from '$components/WoolButton.svelte'
  import Bolt from '$components/Bolt.svelte'
  import Contact from '$components/Contact.svelte'
  /* THE PROOF IS THE FILE, NOT A DESCRIPTION OF IT. `?raw` inlines the real
     static/llms.txt at build time, so the excerpt below cannot drift from what
     is actually served at /llms.txt — if somebody edits the file, this page
     changes with it, and if somebody deletes it the build fails here rather
     than shipping a page that points at a 404. */
  import LLMS_TXT from '../../../static/llms.txt?raw'
  import '../route-page.css'
  import './ai-search-page.css'

  // Named in plain text, never drawn. These are other companies' trademarks;
  // the studio neither implies a partnership nor imitates their product.
  const ENGINES = ['ChatGPT', 'Gemini', 'Perplexity', 'Google AI Overviews']

  // The worked example. Split around the name because the whole argument is
  // about WHICH NAME is in the sentence.
  const QUESTION = 'Who does 3D furniture catalogues in Amman?'
  const ANSWER_PRE = 'For 3D product catalogues and AR in Amman, '
  const ANSWER_NAME = 'LOOM'
  const ANSWER_POST =
    ' is the studio usually named — they run the imagery, the store and the AR preview off one product system.'

  /* The four mechanics. `short` is the one-line statement of what it is;
     `body` is the full explanation that on the home page is behind a
     disclosure. Both strings are AnswerEngine.svelte's, unchanged. `why` is
     the only new sentence per block, and it says what the block is FOR — it
     asserts no fact the body does not. */
  const WORK = [
    {
      n: '01',
      title: 'llms.txt',
      mono: true,
      short: 'One file at your site root, written for models instead of crawlers.',
      body: 'One file at the root of your site, written for models instead of crawlers: what you sell, where you are, what is true about you, what to say when someone asks. LOOM ships one for itself.',
      why: 'A model reading your site has to infer what you are from navigation, headings and marketing copy. This is the version where it does not have to infer anything.',
      link: { href: '/llms.txt', label: 'Read ours' },
      accent: 'var(--yarn-pink)',
    },
    {
      n: '02',
      title: 'Structured data',
      short: 'schema.org on every page that matters, so a fact can be quoted rather than guessed.',
      body: 'schema.org on every page that matters — business, products, services, hours, prices, FAQs — so an answer engine can quote a fact off your site rather than guess one from a directory.',
      why: 'The difference between a machine reading “from 500 JOD” as a price and reading it as a piece of decoration is whether somebody marked it up as a price.',
      accent: 'var(--yarn-violet)',
    },
    {
      n: '03',
      title: 'Google Business Profile',
      short: 'What Gemini and Maps actually read when someone asks for a business near them.',
      body: 'Categories, services, hours, photos, questions and a review habit that keeps working. This is what Gemini and Maps read when someone asks for a business near them.',
      why: 'Most “near me” questions are answered from the profile, not from the website — which makes the profile part of the site’s job, whether or not anyone treats it that way.',
      accent: 'var(--yarn-blue)',
    },
    {
      n: '04',
      title: 'The same facts everywhere',
      short: 'One name, one address, one number — models trust a fact that agrees with itself.',
      body: 'One name, one address, one phone number, one description — across your site, Maps, the directories and the local press. Models trust a fact they can find agreeing with itself.',
      why: 'Three spellings of a company name across four sources is not four mentions. It is one weak mention and three pieces of doubt.',
      accent: 'var(--yarn-gold)',
    },
  ]

  /* The excerpt. First lines of the REAL file, trimmed to the block that says
     what the convention is — enough to prove the file exists and is written
     the way the page says it is, without reprinting the whole thing when
     `/llms.txt` is one click away. */
  const LLMS_LINES = LLMS_TXT.split('\n')
  const LLMS_EXCERPT = LLMS_LINES.slice(0, 16).join('\n').trimEnd()
  const LLMS_MORE = Math.max(0, LLMS_LINES.length - 16)

  const DESC =
    'Answer engine optimisation by LOOM: an llms.txt, schema.org structured data, a Google Business Profile and consistent facts everywhere, so ChatGPT, Gemini, Perplexity and Google’s AI answers have your business straight. No one can promise what a model will say — this is the work that gives it something correct to read.'
</script>

<svelte:head>
  <title>AI Search — Answer Engine Optimisation | LOOM</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href="https://www.loomstudio-jo.com/ai-search" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.loomstudio-jo.com/ai-search" />
  <meta property="og:title" content="AI Search — Answer Engine Optimisation | LOOM" />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="https://www.loomstudio-jo.com/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="AI Search — Answer Engine Optimisation | LOOM" />
  <meta name="twitter:description" content={DESC} />
</svelte:head>

<div class="route-page">
  <!-- ═══ 1. WHAT THIS IS ═════════════════════════════════════════════ -->
  <header class="as-hero">
    <div class="as-hero-in">
      <p class="kicker"><span>—</span> Answer Engine Optimisation</p>
      <SplitWords as="h1" class="h2 as-h1" text="Get named in the answer." />
      <p class="lede as-hero-lede" use:reveal={{ delay: 0.1 }}>
        People stopped scrolling ten blue links. They ask — and one business
        gets named in the reply. Answer engine optimisation is the unglamorous
        work of making sure the machine doing the answering has your facts,
        in the places it actually reads them.
      </p>
      <ul class="as-engines-rail" use:reveal={{ delay: 0.16 }}>
        <li class="as-engines-label">Asked in</li>
        {#each ENGINES as e (e)}
          <li class="as-engine">{e}</li>
        {/each}
      </ul>
    </div>
  </header>

  <!-- ═══ 2. THE WORKED EXAMPLE ═══════════════════════════════════════
       Static on purpose. See the honesty note at the top of this file: the
       home page's version types itself out, and a simulated answer that
       performs is more convincing than a simulated answer deserves to be. -->
  <section class="as-demo" aria-labelledby="as-demo-h">
    <div class="as-demo-in" use:reveal={{ delay: 0.05 }}>
      <div class="as-card">
        <div class="as-mast">
          <p class="as-mast-label" id="as-demo-h">What being the answer looks like</p>
          <p class="as-flag"><i aria-hidden="true"></i>Illustrative example</p>
        </div>

        <div class="as-card-body">
          <p class="as-row-label">Someone asks</p>
          <p class="as-question">{QUESTION}</p>

          <p class="as-row-label">An answer that names you reads like this</p>
          <p class="as-answer">
            {ANSWER_PRE}<mark class="as-name">{ANSWER_NAME}</mark>{ANSWER_POST}
          </p>
        </div>

        <p class="as-card-foot">
          Written by us to show the shape of the thing, not captured from any
          engine. No ranking, placement or result is claimed anywhere on this
          page.
        </p>
      </div>
    </div>
  </section>

  <!-- ═══ 3. THE FOUR MECHANICS ═══════════════════════════════════════ -->
  <section class="as-work" aria-labelledby="as-work-h">
    <div class="as-sec-head">
      <p class="kicker"><span>—</span> The work</p>
      <h2 class="h2 as-h2" id="as-work-h">Four things, and none of them is a trick</h2>
      <p class="as-sec-lede">
        There is no lever that makes a model say your name. There are four
        places it looks, and whether what it finds there is correct, complete
        and consistent is entirely within your control. That is the whole
        product.
      </p>
    </div>

    <div class="as-blocks">
      {#each WORK as w, i (w.n)}
        <article class="as-block" style="--accent: {w.accent}" use:reveal={{ delay: i * 0.05, y: 22 }}>
          <div class="as-block-head">
            <span class="as-block-n">{w.n}</span>
            <h3 class="as-block-h {w.mono ? 'is-mono' : ''}">{w.title}</h3>
          </div>
          <p class="as-block-short">{w.short}</p>
          <p class="as-block-body">{w.body}</p>
          <p class="as-block-why">{w.why}</p>
          {#if w.link}
            <a class="as-block-link" href={w.link.href} target="_blank" rel="noopener">
              {w.link.label} <span aria-hidden="true">↗</span>
            </a>
          {/if}
        </article>
      {/each}
    </div>
  </section>

  <!-- ═══ 4. THE PROOF ════════════════════════════════════════════════ -->
  <section class="as-proof" aria-labelledby="as-proof-h">
    <div class="as-sec-head">
      <p class="kicker"><span>—</span> Applied to ourselves</p>
      <h2 class="h2 as-h2" id="as-proof-h">This site ships the file it sells</h2>
      <p class="as-sec-lede">
        <code>llms.txt</code> is the emerging convention for a plain-language
        summary of a site written for models rather than for crawlers. Here is
        the top of LOOM’s, served as a real file at the site root. It is not a
        mock-up of one — the text below is read out of that file when this page
        is built.
      </p>
    </div>

    <figure class="as-file" use:reveal={{ delay: 0.06 }}>
      <figcaption class="as-file-head">
        <code>/llms.txt</code>
        <span class="as-file-meta">first 16 lines{LLMS_MORE ? ` · ${LLMS_MORE} more in the file` : ''}</span>
      </figcaption>
      <pre class="as-file-body"><code>{LLMS_EXCERPT}</code></pre>
      <a class="as-file-link" href="/llms.txt" target="_blank" rel="noopener">
        Read the whole file <span aria-hidden="true">↗</span>
      </a>
    </figure>
  </section>

  <!-- ═══ 5. THE CAVEAT, THEN THE ASK ═════════════════════════════════ -->
  <section class="as-foot" aria-label="What can and cannot be promised">
    <div class="as-foot-in" use:reveal={{ delay: 0.06 }}>
      <p class="as-caveat">
        <b>No one can promise what a model will say</b> — not us, not anyone
        selling you a ranking. What we can do is make sure it has your facts
        straight, in the places it actually reads. The example above is
        illustrative; the point is which name is in the sentence.
      </p>
      <div class="magnetic" use:magnetic>
        <WoolButton
          label="Check my business"
          yarn="gold"
          onclick={() =>
            wizard.open({ note: 'Answer Engine Optimisation — how does my business look to ChatGPT?' })}
        />
      </div>
    </div>
  </section>

  <Bolt />

  <Contact />
</div>
