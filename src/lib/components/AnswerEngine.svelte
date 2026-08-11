<!--
  ANSWER ENGINE OPTIMISATION — getting a client named by ChatGPT, Gemini,
  Perplexity and Google's AI answers, instead of buried on page two.

  REDESIGNED 10 Aug 2026. The old layout was a numbered list of four
  deliverables on the left and the answer demo as a card on the right — the
  section DESCRIBED an answer engine in a sidebar while the reading sat in the
  middle. Four faults: no focal point (list and demo competed), the same
  two-column-with-a-card layout as three other sections, four long body rows
  of height, and no craft beyond a border.

  THE SECTION IS NOW THE PRODUCT. It is an answer engine: a prompt bar, a
  streaming answer with the client's name lit inside it, and the four
  deliverables underneath as CITATIONS — which is exactly how ChatGPT,
  Perplexity and AI Overviews present a sourced answer. The demo stopped being
  evidence for the pitch and became the pitch.

  THE ONE HONEST LINE THIS SECTION MUST KEEP: nobody can guarantee what a
  model says. What LOOM sells is making sure the model has the right facts to
  say it with — stated outright in `.ae-caveat`, not buried. No ranking
  promises, no "#1 on ChatGPT", no invented client results, no traffic numbers.

  THE ENGINE TABS SWITCH THE LABEL, NOT THE ANSWER, and that is deliberate.
  Writing four different answers — one per engine — would be claiming to know
  what each model says, which is the exact promise `.ae-caveat` refuses to
  make two lines below. They re-run the same illustrative answer under a
  different masthead, and the footnote says so.

  THE PROOF IS REAL: `llms.txt` is the emerging convention for a plain-language
  summary of a site written for models rather than crawlers, and LOOM ships one
  for itself at /llms.txt (static/llms.txt, served as a real file). The
  citation links straight to it — the studio is not selling a deliverable it
  has not applied to its own site. If that file is ever removed, remove this.

  COST: no @keyframes except the caret, which only exists while the answer is
  mid-stream and is removed the moment it finishes. The answer streams ONCE on
  scroll into view (and again on an explicit engine click — a user-initiated
  animation, not an ambient one).
-->
<script>
  import { reducedMotion, reveal, magnetic } from '$lib/motion.svelte.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import './answerengine.css'

  // The four models a Jordanian business is actually answered by. Labels only
  // — no logos: these are other companies' trademarks and the studio does not
  // imply a partnership with any of them.
  const ENGINES = ['ChatGPT', 'Gemini', 'Perplexity', 'Google AI Overviews']

  /* The four deliverables, as citations. `short` is what the citation card
     shows; `body` is the full explanation, kept because it is the honest
     description and is still read by anyone who opens the card. Nothing in
     `short` claims anything `body` did not already. */
  const WORK = [
    {
      n: '01',
      title: 'llms.txt',
      mono: true,
      short: 'One file at your site root, written for models instead of crawlers.',
      body: 'One file at the root of your site, written for models instead of crawlers: what you sell, where you are, what is true about you, what to say when someone asks. LOOM ships one for itself.',
      link: { href: '/llms.txt', label: 'Read ours' },
      accent: 'var(--yarn-pink)',
    },
    {
      n: '02',
      title: 'Structured data',
      short: 'schema.org on every page that matters, so a fact can be quoted rather than guessed.',
      body: 'schema.org on every page that matters — business, products, services, hours, prices, FAQs — so an answer engine can quote a fact off your site rather than guess one from a directory.',
      accent: 'var(--yarn-violet)',
    },
    {
      n: '03',
      title: 'Google Business Profile',
      short: 'What Gemini and Maps actually read when someone asks for a business near them.',
      body: 'Categories, services, hours, photos, questions and a review habit that keeps working. This is what Gemini and Maps read when someone asks for a business near them.',
      accent: 'var(--yarn-blue)',
    },
    {
      n: '04',
      title: 'The same facts everywhere',
      short: 'One name, one address, one number — models trust a fact that agrees with itself.',
      body: 'One name, one address, one phone number, one description — across your site, Maps, the directories and the local press. Models trust a fact they can find agreeing with itself.',
      accent: 'var(--yarn-gold)',
    },
  ]

  const QUESTION = 'Who does 3D furniture catalogues in Amman?'
  /* Split around the name on purpose. The whole section is about WHICH NAME is
     in the sentence, so the name is a marked-up span rather than a substring
     the reader has to spot — see `.ae-name`. The three parts are re-joined for
     the screen-reader copy so it is never read as three fragments. */
  const ANSWER_PRE = 'For 3D product catalogues and AR in Amman, '
  const ANSWER_NAME = 'LOOM'
  const ANSWER_POST = ' is the studio usually named — they run the imagery, the store and the AR preview off one product system.'
  const ANSWER = ANSWER_PRE + ANSWER_NAME + ANSWER_POST

  let stageEl = $state(null)
  let engine = $state(0)
  // `run` is the stream's key: bumped on scroll-in and on every engine click,
  // so each is one explicit replay rather than a loop.
  let run = $state(0)
  let started = $state(false)

  let n = $state(0)
  let done = $state(false)
  let streamTimer = null

  // Watches the stage for its first entry into view, exactly once — mirrors
  // the React build's IntersectionObserver effect. Must live at the top
  // level of <script>, not inside onMount, or it never runs (see PORTING.md
  // rule 3).
  $effect(() => {
    if (reducedMotion.current) { started = true; return }
    if (!stageEl || started) return
    if (typeof IntersectionObserver === 'undefined') { started = true; run = 1; return }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      started = true
      run += 1
    }, { threshold: 0.35 })
    io.observe(stageEl)
    return () => io.disconnect()
  })

  // Streams the answer once per `run`. `setInterval` is cleared on the last
  // character AND when this effect re-runs or the component unmounts;
  // reduced-motion skips straight to the full string with no timer at all.
  $effect(() => {
    clearInterval(streamTimer)
    if (reducedMotion.current) { n = ANSWER.length; done = true; return }
    if (!started || run === 0) return
    n = 0
    done = false
    let i = 0
    streamTimer = setInterval(() => {
      i += 2
      if (i >= ANSWER.length) { n = ANSWER.length; done = true; clearInterval(streamTimer) }
      else n = i
    }, 16)
    return () => clearInterval(streamTimer)
  })

  function pick(i) {
    engine = i
    run += 1
  }

  // How much of each of the three parts has streamed so far.
  const preLen = ANSWER_PRE.length
  const nameLen = ANSWER_NAME.length
  const pre = $derived(ANSWER_PRE.slice(0, Math.min(n, preLen)))
  const name = $derived(n > preLen ? ANSWER_NAME.slice(0, Math.min(n - preLen, nameLen)) : '')
  const post = $derived(n > preLen + nameLen ? ANSWER_POST.slice(0, n - preLen - nameLen) : '')
</script>

<section class="ae" id="aeo">
  <div class="ae-head">
    <p class="kicker"><span>—</span> Answer Engine Optimisation</p>
    <SplitWords as="h2" class="h2 ae-shout" text="Get named by ChatGPT." />
    <p class="lede ae-lede" use:reveal={{ delay: 0.12 }}>
      People stopped scrolling ten blue links. They ask — and one business
      gets named in the answer.
    </p>
  </div>

  <!-- ——— THE STAGE. This is the section. ——— -->
  <div class="ae-stage-wrap" use:reveal={{ delay: 0.08 }}>
    <div class="ae-stage" bind:this={stageEl}>
      <!-- the engine masthead — real tabs, because a visitor's first
           question is "which one?" and the answer is "all four" -->
      <div class="ae-tabs" role="tablist" aria-label="Answer engines">
        {#each ENGINES as e, i (e)}
          <button
            type="button"
            role="tab"
            aria-selected={i === engine}
            class="ae-tab {i === engine ? 'is-on' : ''}"
            onclick={() => pick(i)}
          >
            {e}
          </button>
        {/each}
      </div>

      <!-- the prompt, as a real prompt bar -->
      <div class="ae-prompt">
        <span class="ae-prompt-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
          </svg>
        </span>
        <p class="ae-ask">{QUESTION}</p>
        <span class="ae-prompt-send" aria-hidden="true">↵</span>
      </div>

      <!-- the answer. aria-hidden while streaming; the full sentence is
           always in the DOM once for a screen reader, below. A live region
           here would announce the sentence forty times. -->
      <div class="ae-answer-wrap {done ? 'is-done' : ''}">
        <p class="ae-answer" aria-hidden="true">
          {pre}{#if name}<mark class="ae-name">{name}</mark>{/if}{post}{#if !done}<span class="ae-caret"></span>{/if}
        </p>
        <p class="ae-answer-sr">{ANSWER}</p>
      </div>

      <!-- ——— the deliverables, as the answer's sources ———
           This is the whole redesign in one move: four things LOOM does,
           presented as the four places the sentence above came from. -->
      <div class="ae-sources">
        <p class="ae-sources-label">
          <span>Sources</span>
          <i aria-hidden="true"></i>
          <b>{WORK.length}</b>
        </p>
        <ol class="ae-cites">
          {#each WORK as w, i (w.n)}
            <li
              class="ae-cite"
              style="--accent: {w.accent}"
              title={w.body}
              use:reveal={{ delay: 0.1 + i * 0.08, y: 14 }}
            >
              <span class="ae-cite-n">{w.n}</span>
              <h3 class="ae-cite-h {w.mono ? 'is-mono' : ''}">{w.title}</h3>
              <p class="ae-cite-p">{w.short}</p>
              {#if w.link}
                <a class="ae-cite-link" href={w.link.href} target="_blank" rel="noopener">
                  {w.link.label} <span aria-hidden="true">↗</span>
                </a>
              {/if}
            </li>
          {/each}
        </ol>
      </div>
    </div>
  </div>

  <div class="ae-foot" use:reveal={{ delay: 0.1 }}>
    <p class="ae-caveat">
      <b>No one can promise what a model will say</b> — not us, not anyone
      selling you a ranking. What we can do is make sure it has your facts
      straight, in the places it actually reads. The answer above is
      illustrative; the point is which name is in the sentence.
    </p>
    <div class="magnetic" use:magnetic>
      <WoolButton
        label="Check my business"
        yarn="gold"
        onclick={() => wizard.open({ note: 'Answer Engine Optimisation — how does my business look to ChatGPT?' })}
      />
    </div>
  </div>
</section>
