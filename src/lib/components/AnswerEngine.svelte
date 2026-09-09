<!--
  ANSWER ENGINE OPTIMISATION — getting a client named by ChatGPT, Gemini,
  Perplexity and Google's AI answers, instead of buried on page two.

  REDESIGNED 11 Aug 2026 (second pass). The 10 Aug rebuild had the right IDEA
  — the section is an answer engine rather than a description of one — but it
  was drawn against the old dark ground and never re-drawn when the site went
  pink. The result was one pale, flat, low-contrast panel on a pale ground:
  every surface inside it was `rgba(255,255,255,0.0x)` over `--bg-2`, which on
  a #ffdfec ground is a no-op. Nothing had depth, nothing had focus, and the
  single most valuable thing on the page — a model naming the client — was
  static grey text. Three faults fixed here:

    1. THE CONSOLE IS A REAL OBJECT NOW. White paper, a plum drop shadow and
       a tinted masthead/footer band, so the answer sits in the lit middle of
       something rather than floating in fog. Same light-surface idiom as the
       Solutions console (`background:#fff` + `0 26px 60px rgba(96,30,70,.18)`).

    2. THE ANSWER ARRIVES, AND THE NAME LANDS LAST. The sentence assembles
       around a RESERVED, EMPTY SLOT where the name goes; only when the whole
       sentence has settled does the name drop into the gap and the highlight
       sweep under it. The copy is unchanged — what changed is the order the
       reader receives it in, so the last thing they see is the point.

    3. THE ENGINE TABS ARE GONE, AND THE INTERACTION MOVED TO THE SOURCES.
       See below.

  THE ENGINE TABS WERE A DEAD AFFORDANCE, SO THEY STOPPED BEING BUTTONS.
  They looked interactive and did nothing you could see, because they must not:
  writing four different answers — one per engine — would be claiming to know
  what each model says, which is the exact promise `.ae-caveat` refuses to make
  two lines below. Rather than keep a control whose only honest behaviour is
  "nothing", the four engines are now what they always were — a plain list of
  the four places the question gets asked, marked "Asked in", with no button
  chrome. The interaction budget moved to the SOURCES, where clicking genuinely
  reveals something that was previously buried in a `title` tooltip.

  THE FOUR DELIVERABLES ARE A LEDGER, NOT FOUR BOXES. They were four identical
  bordered rectangles of paragraph text — the most templated element on the
  page. They are now a rail of four hairline-separated rows and ONE detail
  panel: the rows summarise (`short`), the selected one hands off to the panel,
  which carries the full honest explanation (`body`) that used to be reachable
  only by hovering for a tooltip. The active row collapses its summary so the
  two variants of the same copy are never on screen at once.

  HONESTY — NON-NEGOTIABLE, AND THE REASON SEVERAL OBVIOUS MOVES WERE REFUSED:
  this is an illustrative example, not a screenshot. No engine logos, no
  reproduction of anyone's interface chrome, no avatar bubbles, no "sources"
  favicons — plain text labels only, which is fair naming, not imitation. The
  console carries a permanent `.ae-flag` reading "Illustrative example" in the
  masthead, on screen at all times including before, during and after the
  stream, precisely BECAUSE the new version is more convincing than the old
  one. Nothing here claims a ranking, a placement or a result.

  THE PROOF IS REAL: `llms.txt` is the emerging convention for a plain-language
  summary of a site written for models rather than crawlers, and LOOM ships one
  for itself at /llms.txt (static/llms.txt, served as a real file). The source
  panel links straight to it — the studio is not selling a deliverable it has
  not applied to its own site. If that file is ever removed, remove this.

  MOTION COST: two @keyframes, both mounted only for the phase they belong to
  and removed from the DOM the moment it ends — the thinking dots (~420ms once)
  and the caret (only while mid-stream). Nothing animates on an idle page. The
  stream runs ONCE on scroll into view; after that it is user-initiated only,
  via the one control under the answer, which reads "Skip" mid-stream and "Ask
  again" once settled — so the animation is always interruptible by the person
  watching it. `prefers-reduced-motion` skips the whole machine: no thinking
  beat, no timer, no caret, the sentence and the name are simply there, and the
  replay control is not rendered at all because it would be a no-op.
-->
<script>
  import { reducedMotion, prefersReduced, reveal, magnetic } from '$lib/motion.svelte.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import './answerengine.css'

  // The four models a Jordanian business is actually answered by. Labels only
  // — no logos, no marks, no interface: these are other companies' trademarks
  // and the studio neither implies a partnership nor imitates their product.
  const ENGINES = ['ChatGPT', 'Gemini', 'Perplexity', 'Google AI Overviews']

  /* The four deliverables, as the answer's citations. `short` is the row
     summary in the rail; `body` is the full honest explanation, which the
     detail panel now SHOWS rather than hiding in a tooltip. Nothing in `short`
     claims anything `body` did not already, and the active row hides its
     `short` so the two are never read as a stutter. */
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
  /* Split around the name on purpose, and now streamed around it too. The
     whole section is about WHICH NAME is in the sentence, so the sentence
     assembles with a reserved gap where the name belongs and the name arrives
     last, into the finished sentence. The three parts are re-joined for the
     screen-reader copy so it is never read as three fragments. */
  const ANSWER_PRE = 'For 3D product catalogues and AR in Amman, '
  const ANSWER_NAME = 'LOOM'
  const ANSWER_POST = ' is the studio usually named — they run the imagery, the store and the AR preview off one product system.'
  const ANSWER = ANSWER_PRE + ANSWER_NAME + ANSWER_POST

  const preLen = ANSWER_PRE.length
  const postLen = ANSWER_POST.length
  // The name is NOT part of the character stream — it is the payload that
  // lands into the gap afterwards. So the stream only has to cross pre + post.
  const STREAM_LEN = preLen + postLen

  let stageEl = $state(null)
  // `run` is the stream's key: bumped once on scroll-in and once per explicit
  // replay click, so every stream is a discrete, user-visible event and never
  // a loop.
  let run = $state(0)

  /* THE SENTENCE STARTS FINISHED, AND THE CLIENT DECIDES TO UNDO IT.
     motion.svelte.js's banner rule: nothing may start invisible, because the
     server ships complete HTML and a section that opens empty is a blank hole
     held blank until hydration — for a crawler or a scripting-off visitor,
     held blank forever. So the initial state here IS the settled answer, and
     the only thing that can wind it back to zero is the arming effect below,
     on the client, after hydration, and only for a console still off screen.
     A console already in view when we hydrate keeps its finished sentence:
     re-typing it at that point is a flash, not a reveal. */
  let n = $state(STREAM_LEN)
  // 'idle' → 'thinking' → 'streaming' → 'landing' → 'done'
  let phase = $state('done')
  let nameIn = $state(true)
  // plain `let`, deliberately NOT $state: the arming effect reads it as a
  // one-shot guard, and a rune here would make that effect depend on its own
  // write and re-run forever.
  let didArm = false
  let thinkTimer = null
  let landTimer = null
  let raf = 0

  /* The sentence takes this long to arrive, no matter what the machine is
     doing. It used to be a `setInterval(…, 16)` stepping two characters a
     tick, which is a promise the browser cannot keep: on a loaded machine the
     interval is throttled to whatever the main thread can spare and the
     "1.3-second" answer measurably took twenty. Driving `n` off ELAPSED TIME
     in a rAF loop instead means a dropped frame skips characters rather than
     stretching the animation, so the beat is the same on a cold laptop as on
     a hot one — and rAF stops entirely in a background tab, which an interval
     does not. */
  const STREAM_MS = 1150
  const LAND_MS = 170
  const THINK_MS = 420

  function clearAll() {
    clearTimeout(thinkTimer)
    clearTimeout(landTimer)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  /** Jump to the settled state immediately. Used by reduced motion, by the
   *  "Skip" control, and by the natural end of the stream. */
  function settle() {
    clearAll()
    n = STREAM_LEN
    nameIn = true
    phase = 'done'
  }

  /* Arms the stream, once, on the client. Same shape as `armReveal()` in
     motion.svelte.js and for the same reasons: it winds the answer back to
     nothing ONLY if motion is allowed, IntersectionObserver exists, and the
     console is still below the fold — then watches for it to arrive.
     Must live at the top level of <script>, not inside onMount, or it never
     runs (see PORTING.md rule 3). `prefersReduced()` rather than the shared
     rune because this gate fires before the layout's onMount has set it. */
  $effect(() => {
    if (!stageEl || didArm) return
    didArm = true
    if (prefersReduced()) return
    if (typeof IntersectionObserver === 'undefined') return
    if (stageEl.getBoundingClientRect().top < window.innerHeight * 0.85) return

    n = 0
    nameIn = false
    phase = 'idle'
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      run += 1
    }, { threshold: 0.3 })
    io.observe(stageEl)
    return () => io.disconnect()
  })

  /* Runs the answer once per `run`. Every timer it starts is cleared when the
     effect re-runs, when the component unmounts, and when the viewer skips —
     which is what makes the animation interruptible rather than something you
     have to sit through. Reduced motion never starts a timer at all.
     `reducedMotion.current` is read LIVE, not once: Chrome's Battery Saver
     forces the query on mid-session, and a viewer who flips it while the
     sentence is mid-flight must get the settled answer immediately.
     This effect READS `run` / `reducedMotion.current` and WRITES
     `n` / `phase` / `nameIn`; it must never read what it writes, or it loops. */
  $effect(() => {
    clearAll()
    // run === 0 means either "server state, never armed" (leave the finished
    // sentence alone) or "armed and waiting for the scroll" (already wound
    // back to zero by the effect above). Either way there is nothing to run.
    if (run === 0) return
    if (reducedMotion.current) { settle(); return }

    n = 0
    nameIn = false
    phase = 'thinking'

    // a short beat before the first character, so the answer reads as
    // something being composed rather than something already written
    thinkTimer = setTimeout(() => {
      phase = 'streaming'
      const t0 = performance.now()
      const step = (t) => {
        const p = Math.min(1, (t - t0) / STREAM_MS)
        n = Math.round(p * STREAM_LEN)
        if (p < 1) { raf = requestAnimationFrame(step); return }
        raf = 0
        // the sentence is finished and re-flowed; NOW the name drops in
        phase = 'landing'
        landTimer = setTimeout(() => { nameIn = true; phase = 'done' }, LAND_MS)
      }
      raf = requestAnimationFrame(step)
    }, THINK_MS)

    return clearAll
  })

  function replay() {
    if (phase === 'thinking' || phase === 'streaming' || phase === 'landing') settle()
    else run += 1
  }

  const streaming = $derived(phase === 'thinking' || phase === 'streaming' || phase === 'landing')

  // How much of each side of the gap has arrived so far.
  const pre = $derived(ANSWER_PRE.slice(0, Math.min(n, preLen)))
  const post = $derived(n > preLen ? ANSWER_POST.slice(0, n - preLen) : '')
  // The slot appears the instant the sentence reaches it, so the gap is opened
  // in reading order rather than sitting there ahead of the text.
  const slot = $derived(phase !== 'idle' && phase !== 'thinking' && n >= preLen)

  /* ——— the citations ——— a disclosure set, not a tab set. The four rows now
     live in a narrow column beside the answer, and the open one expands in
     place: a plain <button aria-expanded> owning the block under it, which is
     the pattern that column actually needs. A tablist would promise arrow-key
     navigation across a list that reads top to bottom. */
  let src = $state(0)
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

  <!-- ——— THE CONSOLE. This is the section. ——— -->
  <div class="ae-stage-wrap" use:reveal={{ delay: 0.08 }}>
    <div class="ae-stage" bind:this={stageEl}>

      <!-- masthead: WHO is being asked, and the standing honesty flag. The
           engines are a list, not a control — see the header note. -->
      <div class="ae-mast">
        <p class="ae-mast-label">Asked in</p>
        <ul class="ae-engines">
          {#each ENGINES as e (e)}
            <li class="ae-engine">{e}</li>
          {/each}
        </ul>
        <p class="ae-flag"><i aria-hidden="true"></i>Illustrative example</p>
      </div>

      <!-- ——— answer left, its four citations right: one composition ——— -->
      <div class="ae-grid">
      <div class="ae-main {phase === 'done' ? 'is-done' : ''}">
        <!-- the prompt, as a real prompt field -->
        <div class="ae-prompt">
          <span class="ae-prompt-glyph" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
            </svg>
          </span>
          <p class="ae-ask">{QUESTION}</p>
          <span class="ae-prompt-send" aria-hidden="true">↵</span>
        </div>

        <!-- the answer. aria-hidden while it assembles; the full sentence is
             always in the DOM once, below, for a screen reader. A live region
             here would announce the sentence eighty times. -->
        <div class="ae-answer-wrap {streaming ? 'is-live' : ''}">
          <p class="ae-answer-tag" aria-hidden="true">Answer</p>

          <div class="ae-answer-col">
            {#if phase === 'thinking'}
              <p class="ae-dots" aria-hidden="true"><i></i><i></i><i></i></p>
            {/if}

            <p class="ae-answer" aria-hidden="true">{pre}{#if slot}<mark
                class="ae-name {nameIn ? 'is-in' : ''}"
              >{ANSWER_NAME}</mark>{/if}{post}{#if phase === 'streaming'}<span class="ae-caret"></span>{/if}</p>

            <p class="ae-answer-sr">{ANSWER}</p>

            {#if !reducedMotion.current}
              <div class="ae-answer-foot">
                <button type="button" class="ae-replay" onclick={replay}>
                  {#if streaming}
                    <span class="ae-replay-g" aria-hidden="true">›</span> Skip
                  {:else}
                    <span class="ae-replay-g" aria-hidden="true">↻</span> Ask again
                  {/if}
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- ——— the deliverables, as the answer's citations ———
           Four things LOOM does, presented as the four places the sentence
           beside them came from. The whole list is on screen at once; the open
           one carries the full explanation that used to be a tooltip. -->
      <aside class="ae-sources">
        <p class="ae-sources-label">
          <span>Sources</span>
          <i aria-hidden="true"></i>
          <b>{WORK.length}</b>
        </p>

        <ul class="ae-src">
          {#each WORK as w, i (w.n)}
            <li class="ae-src-item {i === src ? 'is-on' : ''}" style="--accent: {w.accent}">
              <button
                type="button"
                class="ae-src-btn"
                aria-expanded={i === src}
                aria-controls="ae-src-panel-{w.n}"
                onclick={() => (src = i)}
              >
                <span class="ae-src-n">{w.n}</span>
                <span class="ae-src-t {w.mono ? 'is-mono' : ''}">{w.title}</span>
                <span class="ae-src-x" aria-hidden="true"></span>
              </button>

              <!-- BOTH variants stay in the markup, so every word of the four
                   explanations ships in the HTML rather than only the open
                   one's. CSS shows exactly one of them per row, so the pair is
                   never on screen together reading as a stutter. -->
              <div class="ae-src-p" id="ae-src-panel-{w.n}" hidden={i !== src}>
                <p class="ae-src-b">{w.body}</p>
                {#if w.link}
                  <a class="ae-src-link" href={w.link.href} target="_blank" rel="noopener">
                    {w.link.label} <span aria-hidden="true">↗</span>
                  </a>
                {/if}
              </div>
              <p class="ae-src-s">{w.short}</p>
            </li>
          {/each}
        </ul>
      </aside>
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
