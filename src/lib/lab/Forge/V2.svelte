<!--
  FORGE — LAB CONCEPT 2 OF 3 — "THE ENGINE ROOM"

  THE BRIEF THIS EXISTS TO ANSWER. Four rejected passes in a row all made the
  same mistake: they photographed a sofa. Split slider, three stills, a
  turntable, a diptych — every one of them was "here is a picture of the
  furniture" dressed up a different way, and the client is done looking at
  furniture photography here. The fix is not a fifth way to show a result. It
  is to stop showing the RESULT and show the MACHINE that makes it — a dark
  instrument panel where a job visibly runs in front of the visitor, on a
  loop, forever. Nothing in this file is a photograph. Nothing is beige.
  Nothing is a sofa. Every pixel is type, CSS or inline SVG.

  ═══ THE HONESTY RULE — READ THIS BEFORE YOU TOUCH A NUMBER ═══════════════
  This panel is a DECORATIVE SIMULATION of the pipeline, not a readout of a
  real job. It must never print anything a visitor could mistake for a real
  statistic or a real customer's work: no invented customer name, no invented
  filename, no "12,481 models made this week", no fake queue depth, no fake
  server ID. The only figures allowed to look like FACTS are the ones already
  approved elsewhere on the site — the four format names, "About a minute per
  model", "2 JOD", "your first one is free." Everything else that moves (the
  triangle count, the percentage, the timer, the log lines) is deliberately
  GENERIC — it counts, it does not report. If a future pass is tempted to
  "improve" this into a real live dashboard wired to the actual Meshy job
  queue: don't. The moment it prints a real customer's filename it becomes a
  privacy leak dressed as a design flourish. Keep it a diagram that performs.

  ═══ WHERE THE COPY CAME FROM ═══════════════════════════════════════════
  The seven approved sentences are frozen and reproduced verbatim as the
  kicker, headline, lede paragraph and offer plate — see the markup below,
  they are not paraphrased anywhere. The console's OWN labels (stage names,
  the object being traced, "GEOMETRY", "BAKE", the four format keys) are not
  new copy: they are the nouns and phrases already sitting inside those seven
  sentences, pulled out and set in caps — "a chair, a bottle, a shoe, a part"
  becomes the four things the tracer cycles through, "real geometry" becomes
  the geometry stage's name. No fact, number or claim is invented anywhere on
  this console — where a real dashboard would print a name or a metric, this
  one prints a numeral, a percentage or a glyph instead, per the brief.

  ═══ THE LOOP, MECHANICALLY ═══════════════════════════════════════════════
  One `setInterval` tick (250ms) drives a single `phase` (ms elapsed within
  one ~11s cycle) and a single `job` index (which of the four traced objects
  is currently "in the machine"). Every visible value — the triangle counter,
  the ring sweep, the lit format keys, the timer, the log lines — is a PURE
  DERIVATION of `phase`, computed with `$derived`, never its own state and
  never its own timer. That is the whole discipline: one clock, everything
  else reads it. Torn down in `onDestroy`; started/stopped by an
  IntersectionObserver exactly like TheMachine's own pattern elsewhere in the
  lab, so a visitor who never scrolls this far never pays for it, and a tab
  scrolled past does not keep animating in the background for the rest of the
  session (see src/lib/viewportBudget.js's whole argument for why that
  matters at this site's animation count).

  `prefers-reduced-motion` does not get a slower version of the loop — it
  gets NO loop. The panel is pinned to phase = END, every stage marked done,
  all four format keys lit, ring fully closed. That single frame has to tell
  the whole story standing still, because for that visitor it is the only
  frame there is; see the CSS at the bottom for how the DOM is asked to just
  sit at its final state rather than re-implementing the animation as a
  no-motion variant of itself.
-->
<script>
  import { onMount, onDestroy } from 'svelte'
  import { reducedMotion } from '$lib/motion.svelte.js'
  import WoolButton from '$lib/components/WoolButton.svelte'

  const PRICE_JOD = 2
  const FORMATS = ['GLB', 'FBX', 'OBJ', 'USDZ']

  /** The four things the approved lede already names — "a chair, a bottle, a
   *  shoe, a part" — cycled through as the object currently in the machine.
   *  Each gets a small drawn glyph (inline SVG path, no image file) rather
   *  than a word repeated four times in a row, which would read as a list,
   *  not as a machine doing different jobs. */
  const JOBS = [
    { label: 'a chair', glyph: 'chair' },
    { label: 'a bottle', glyph: 'bottle' },
    { label: 'a shoe', glyph: 'shoe' },
    { label: 'a part', glyph: 'part' },
  ]

  /** The five stations of one run. Names are pulled from the approved
   *  sentences ("real geometry", "spin it, light it") rather than invented —
   *  see the file header. Each owns a slice of the ~11s cycle, in ms. */
  const STAGE_MS = 2000
  const STAGES = [
    { key: 'trace', label: 'TRACE' },
    { key: 'geometry', label: 'GEOMETRY' },
    { key: 'light', label: 'LIGHT' },
    { key: 'bake', label: 'BAKE' },
    { key: 'write', label: 'WRITE' },
  ]
  const CYCLE_MS = STAGE_MS * STAGES.length // 10000
  const TICK_MS = 100

  // ------------------------------------------------------------------
  // the one clock
  // ------------------------------------------------------------------
  let phase = $state(0) // 0..CYCLE_MS, wraps
  let jobIx = $state(0) // which JOBS entry is "in the machine" this cycle
  let running = $state(false)
  let hostEl = $state(null)
  let timer = null
  let io = null

  const stageIx = $derived(Math.min(STAGES.length - 1, Math.floor(phase / STAGE_MS)))
  const stageT = $derived((phase % STAGE_MS) / STAGE_MS) // 0..1 within the live stage
  const stageFrac = $derived(phase / CYCLE_MS) // 0..1 across the whole run

  /** THE REDUCED-MOTION PIVOT. Every readout below reads `effIx`/`effFrac`,
   *  never `stageIx`/`stageFrac` directly — that is the one rule that keeps
   *  the frozen frame honest. `stop()` under reduced motion never starts the
   *  clock, so `phase` sits at 0 forever; a naive reading of `stageIx` would
   *  therefore show the panel PERMANENTLY STUCK mid-TRACE (an early build of
   *  this file did exactly that — ring and format keys read "done" while the
   *  stage rail and the log still showed the very first step, which is a
   *  worse failure than no animation at all: it looks like a broken loader).
   *  `effIx` is pinned one past the last stage under reduced motion, so
   *  every "is this stage done" check that compares `i < effIx` is true for
   *  all five, and the run reads as a single completed pass. */
  const effIx = $derived(reducedMotion.current ? STAGES.length : stageIx)
  const effFrac = $derived(reducedMotion.current ? 1 : stageFrac)
  const wireT = $derived(reducedMotion.current ? 1 : Math.min(1, (phase - STAGE_MS) / STAGE_MS))

  /** A generic count that races up early in GEOMETRY and settles — a number
   *  with no unit printed as a customer stat could be mistaken for, because
   *  it is directly beside the word "TRIANGLES" and nothing else. */
  const triCount = $derived.by(() => {
    if (effIx > 1) return 48210
    if (effIx < 1) return 0
    const eased = 1 - Math.pow(1 - stageT, 3)
    return Math.round(eased * 48210)
  })

  /** The ring: 0 at the run's start, closed at the run's end. One value, one
   *  meaning — "how much of this pass is done" — never relabelled as a fake
   *  percent-complete-of-a-real-job. */
  const ringPct = $derived(Math.round(effFrac * 100))

  /** Which format keys have "landed" — WRITE is the last stage, and the four
   *  keys light one by one across it. */
  const litFormats = $derived.by(() => {
    if (effIx >= STAGES.length) return FORMATS.length
    if (STAGES[stageIx].key !== 'write') return 0
    return Math.min(FORMATS.length, Math.ceil(stageT * (FORMATS.length + 0.001)))
  })

  /** The timer counts toward "about a minute" — genuinely generic: it is
   *  seconds-into-a-loop, scaled so the loop's own 10s reads as ~50s, landing
   *  the displayed number in the neighbourhood the approved copy names
   *  without ever being wired to anything real. */
  const timerLabel = $derived.by(() => {
    const s = Math.min(58, Math.round(effFrac * 58))
    return `0:${String(s).padStart(2, '0')}`
  })

  /** Log lines — one per stage, appended as the run passes that stage, never
   *  more than 5 on screen. Every line is a VERB + the generic glyph name,
   *  never a filename, never a job id. Reads `effIx` (see above) so the
   *  frozen reduced-motion frame prints all five lines, all checked off,
   *  instead of stopping after "tracing silhouette". */
  const LOG_TEXT = {
    trace: 'tracing silhouette',
    geometry: 'building real geometry',
    light: 'placing lights',
    bake: 'baking textures',
    write: 'writing formats',
  }
  const logLines = $derived.by(() => {
    const top = Math.min(STAGES.length - 1, effIx)
    const lines = []
    for (let i = 0; i <= top; i++) {
      const done = i < effIx
      lines.push({ key: i, text: LOG_TEXT[STAGES[i].key], done })
    }
    return lines.slice(-5)
  })

  function tick() {
    phase += TICK_MS
    if (phase >= CYCLE_MS) {
      phase = 0
      jobIx = (jobIx + 1) % JOBS.length
    }
  }

  function start() {
    if (running || reducedMotion.current) return
    running = true
    timer = setInterval(tick, TICK_MS)
  }
  function stop() {
    running = false
    if (timer) clearInterval(timer)
    timer = null
  }

  onMount(() => {
    if (reducedMotion.current) return
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) start()
          else stop()
        }
      },
      { rootMargin: '120px', threshold: 0.1 }
    )
    if (hostEl) io.observe(hostEl)
  })

  onDestroy(() => {
    stop()
    io?.disconnect()
  })
</script>

<section class="fg2" id="forge" aria-labelledby="fg2-title" bind:this={hostEl}>
  <div class="fg2-inner">
    <div class="fg2-head">
      <p class="fg2-kicker"><span>—</span> New from the 3D Lab</p>
      <h2 class="fg2-h2" id="fg2-title">Send a photo. Get a 3D model back.</h2>
      <p class="fg2-lede">
        One picture of the thing — a chair, a bottle, a shoe, a part. Our pipeline
        rebuilds it as real geometry. Spin it, light it, and drop it into a
        website, a game or an AR view.
      </p>
    </div>

    <!-- ═══ THE CONSOLE ═══
         A dark instrument panel, not a screenshot of one — every readout below
         is real DOM driven by `phase`. It is marked aria-hidden as a whole:
         it is a decorative demonstration of the pipeline, not information a
         screen reader user needs read aloud line by line, and the paragraph
         above already carries the entire claim in prose. -->
    <div class="fg2-console" aria-hidden="true" class:is-still={reducedMotion.current}>
      <div class="fg2-console-bar">
        <span class="fg2-dot" aria-hidden="true"></span>
        <span class="fg2-console-title">PIPELINE</span>
        <span class="fg2-console-timer">{timerLabel}</span>
      </div>

      <div class="fg2-console-body">
        <!-- left: the object being traced -->
        <div class="fg2-scene">
          <svg class="fg2-scene-svg" viewBox="0 0 200 200" role="presentation">
            <defs>
              <linearGradient id="fg2-grid-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="var(--cyan)" stop-opacity="0.14" />
                <stop offset="1" stop-color="var(--cyan)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <!-- floor grid -->
            <rect x="0" y="120" width="200" height="80" fill="url(#fg2-grid-fade)" />
            {#each Array(6) as _, i}
              <line x1="0" y1={130 + i * 12} x2="200" y2={130 + i * 12} class="fg2-grid-line" />
            {/each}

            <!-- the traced object: one of four simple glyphs, chosen by jobIx -->
            <g class="fg2-glyph" class:is-lit={effIx >= 1} transform="translate(100 96)">
              {#if JOBS[jobIx].glyph === 'chair'}
                <path d="M-26,-40 L-26,10 M26,-40 L26,10 M-26,10 L-26,38 M26,10 L26,38 M-30,10 L30,10 M-26,-40 L26,-40" />
              {:else if JOBS[jobIx].glyph === 'bottle'}
                <path d="M-8,-42 L-8,-30 L-16,-16 L-16,36 L16,36 L16,-16 L8,-30 L8,-42 Z" />
              {:else if JOBS[jobIx].glyph === 'shoe'}
                <path d="M-32,20 Q-32,-4 -10,-8 L18,-20 Q34,-24 34,-6 L34,20 Z M-32,20 L34,20" />
              {:else}
                <path d="M-24,-24 L24,-24 L24,0 L8,0 L8,24 L-24,24 Z M8,0 L8,-24" />
              {/if}
            </g>

            <!-- scan sweep, live only during TRACE — and never under reduced
                 motion, where the frame is the finished pass, not a mid-scan
                 one. -->
            {#if !reducedMotion.current && STAGES[stageIx].key === 'trace'}
              <line x1="0" x2="200" class="fg2-sweep" y1={30 + stageT * 130} y2={30 + stageT * 130} />
            {/if}

            <!-- wireframe overlay, live from GEOMETRY on; fully drawn (wireT
                 pinned to 1) in the reduced-motion end state. -->
            {#if effIx >= 1}
              <g class="fg2-wire" style="--wire-t:{wireT}">
                <circle cx="100" cy="96" r="52" />
                <circle cx="100" cy="96" r="36" />
                <circle cx="100" cy="96" r="18" />
                <line x1="48" y1="96" x2="152" y2="96" />
                <line x1="100" y1="44" x2="100" y2="148" />
              </g>
            {/if}
          </svg>

          <div class="fg2-scene-foot">
            <span class="fg2-scene-obj">{JOBS[jobIx].label}</span>
            <span class="fg2-scene-tri"><b>{triCount.toLocaleString('en-US')}</b> triangles</span>
          </div>
        </div>

        <!-- right: stage rail + ring + log + format keys -->
        <div class="fg2-readout">
          <ol class="fg2-stages">
            {#each STAGES as s, i (s.key)}
              <li
                class:is-live={i === effIx}
                class:is-done={i < effIx}
              >
                <span class="fg2-stage-dot" aria-hidden="true"></span>
                <span class="fg2-stage-label">{s.label}</span>
              </li>
            {/each}
          </ol>

          <div class="fg2-ring-wrap">
            <svg class="fg2-ring" viewBox="0 0 64 64">
              <circle class="fg2-ring-track" cx="32" cy="32" r="27" />
              <circle
                class="fg2-ring-fill"
                cx="32" cy="32" r="27"
                style="--ring-pct:{reducedMotion.current ? 100 : ringPct}"
              />
            </svg>
            <span class="fg2-ring-pct">{reducedMotion.current ? 100 : ringPct}%</span>
          </div>

          <div class="fg2-log" role="presentation">
            {#each logLines as l (l.key)}
              <p class="fg2-log-line" class:is-done={l.done}>
                <span class="fg2-log-caret" aria-hidden="true">{l.done ? '✓' : '›'}</span>{l.text}
              </p>
            {/each}
          </div>

          <ul class="fg2-formats">
            {#each FORMATS as f, i (f)}
              <li class:is-lit={reducedMotion.current || i < litFormats}>{f}</li>
            {/each}
          </ul>
        </div>
      </div>

      <p class="fg2-console-note">About a minute per model</p>
    </div>

    <div class="fg2-offer">
      <p class="fg2-price">
        <strong>{PRICE_JOD} JOD</strong> <span class="fg2-price-unit">a model —</span>
        <em>your first one is free.</em>
      </p>
      <div class="fg2-cta">
        <WoolButton label="Make one free" onclick={() => {}} photo={false} size="big" />
        <span class="fg2-formats-inline">{FORMATS.join(' · ')}</span>
      </div>
    </div>
  </div>
</section>

<style>
  /* ------------------------------------------------------------------
     layout shell — tokens only, matches the section rhythm the rest of
     the page uses (see forge.css's own --pad-style paddings)
     ------------------------------------------------------------------ */
  .fg2 {
    background: var(--bg);
    padding: clamp(3.5rem, 8vw, 7rem) 0;
    overflow-x: clip;
  }
  .fg2-inner {
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 clamp(1.25rem, 4vw, 2.5rem);
    display: flex;
    flex-direction: column;
    gap: clamp(2rem, 4vw, 2.75rem);
  }

  .fg2-head { max-width: 62ch; }
  .fg2-kicker {
    display: inline-flex; align-items: center; gap: 0.6rem;
    font: 600 0.78rem/1 var(--display); letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--ink-dim); margin: 0 0 0.9rem;
  }
  .fg2-kicker span { color: var(--magenta); }
  .fg2-h2 {
    font-family: var(--bloom); font-weight: 620;
    font-size: clamp(1.9rem, 4.4vw, 3.1rem); line-height: 1.06;
    color: var(--ink); margin: 0 0 0.9rem;
  }
  .fg2-lede { font-size: clamp(1rem, 1.5vw, 1.15rem); line-height: 1.5; color: var(--ink-dim); margin: 0; }

  /* ------------------------------------------------------------------
     THE CONSOLE — a dark panel dropped into an otherwise light section.
     Deliberate: the site's ground is --bg (pale pink), and every other
     rejected pass kept that ground and just swapped what photo sat on
     it. A genuine instrument panel reads as EQUIPMENT precisely because
     it does not share the room's daylight — so this is the one element
     on the page allowed to invert to --ink as its own background,
     exactly the way a rack-mounted display would sit in a bright studio.
     ------------------------------------------------------------------ */
  .fg2-console {
    background: var(--ink);
    border-radius: 18px;
    padding: clamp(1.1rem, 2.4vw, 1.6rem);
    box-shadow:
      0 40px 80px -40px color-mix(in srgb, var(--ink) 70%, transparent),
      0 1px 0 color-mix(in srgb, #fff 6%, transparent) inset;
    font-family: ui-monospace, monospace;
    color: color-mix(in srgb, var(--bg) 82%, #fff);
    position: relative;
  }

  .fg2-console-bar {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0 0.3rem 1rem;
    border-bottom: 1px solid color-mix(in srgb, #fff 10%, transparent);
    margin-bottom: 1.1rem;
    font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
    color: color-mix(in srgb, var(--bg) 55%, transparent);
  }
  .fg2-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 8px var(--cyan);
  }
  .fg2-console:not(.is-still) .fg2-dot { animation: fg2-blink 1.6s ease-in-out infinite; }
  .fg2-console-title { flex: 1; }
  .fg2-console-timer {
    font-variant-numeric: tabular-nums; color: var(--cyan);
    font-size: 0.78rem;
  }

  .fg2-console-body {
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: clamp(1.25rem, 3vw, 2rem);
  }
  @media (max-width: 760px) {
    .fg2-console-body { grid-template-columns: 1fr; }
  }

  /* ---------------- scene: the traced object ---------------- */
  .fg2-scene {
    background: color-mix(in srgb, var(--ink) 88%, #000);
    border: 1px solid color-mix(in srgb, #fff 8%, transparent);
    border-radius: 12px;
    padding: 0.9rem;
    display: flex; flex-direction: column; gap: 0.6rem;
  }
  .fg2-scene-svg { width: 100%; aspect-ratio: 1 / 1; display: block; }

  .fg2-grid-line { stroke: color-mix(in srgb, var(--cyan) 30%, transparent); stroke-width: 0.5; }

  .fg2-glyph path {
    fill: none;
    stroke: color-mix(in srgb, var(--bg) 70%, transparent);
    stroke-width: 2.2;
    stroke-linejoin: round;
    stroke-linecap: round;
    transition: stroke 0.4s var(--ease, ease);
  }
  .fg2-glyph.is-lit path { stroke: var(--magenta); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--magenta) 60%, transparent)); }

  .fg2-sweep {
    stroke: var(--cyan); stroke-width: 1.4;
    filter: drop-shadow(0 0 5px var(--cyan));
    opacity: 0.85;
  }

  /* Each shape gets its OWN dash length (its own approximate circumference or
     line length) rather than one shared number — an earlier pass used a
     single 340 for every shape, and for the two small circles and the lines
     that number was larger than their whole path, so the offset kept them
     permanently in the "gap" half of the pattern and they never became
     visible at all. Per-shape lengths make the reveal genuinely draw the
     wireframe on, ring by ring, as GEOMETRY runs. */
  .fg2-wire circle, .fg2-wire line {
    fill: none;
    stroke: var(--cyan);
    stroke-width: 0.9;
    opacity: 0.8;
    transition: stroke-dashoffset 0.15s linear;
  }
  .fg2-wire circle:nth-of-type(1) { stroke-dasharray: 327; stroke-dashoffset: calc(327 - 327 * var(--wire-t, 1)); }
  .fg2-wire circle:nth-of-type(2) { stroke-dasharray: 226; stroke-dashoffset: calc(226 - 226 * var(--wire-t, 1)); }
  .fg2-wire circle:nth-of-type(3) { stroke-dasharray: 113; stroke-dashoffset: calc(113 - 113 * var(--wire-t, 1)); }
  .fg2-wire line { stroke-dasharray: 104; stroke-dashoffset: calc(104 - 104 * var(--wire-t, 1)); }

  .fg2-scene-foot {
    display: flex; align-items: baseline; justify-content: space-between;
    font-size: 0.72rem; color: color-mix(in srgb, var(--bg) 55%, transparent);
  }
  .fg2-scene-obj { text-transform: uppercase; letter-spacing: 0.08em; }
  .fg2-scene-tri b { color: var(--cyan); font-variant-numeric: tabular-nums; }

  /* ---------------- readout: stages, ring, log, formats ---------------- */
  .fg2-readout { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }

  .fg2-stages { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }
  .fg2-stages li {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.72rem; letter-spacing: 0.08em;
    color: color-mix(in srgb, var(--bg) 38%, transparent);
  }
  .fg2-stage-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: color-mix(in srgb, var(--bg) 25%, transparent);
    transition: background 0.3s var(--ease, ease), box-shadow 0.3s var(--ease, ease);
  }
  .fg2-stages li.is-done { color: color-mix(in srgb, var(--bg) 68%, transparent); }
  .fg2-stages li.is-done .fg2-stage-dot { background: var(--violet); }
  .fg2-stages li.is-live { color: var(--bg); }
  .fg2-stages li.is-live .fg2-stage-dot {
    background: var(--magenta);
    box-shadow: 0 0 8px color-mix(in srgb, var(--magenta) 70%, transparent);
  }

  .fg2-ring-wrap { position: relative; width: 76px; height: 76px; }
  .fg2-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
  .fg2-ring-track {
    fill: none; stroke: color-mix(in srgb, #fff 10%, transparent); stroke-width: 5;
  }
  .fg2-ring-fill {
    fill: none; stroke: var(--cyan); stroke-width: 5; stroke-linecap: round;
    stroke-dasharray: 169.6;
    stroke-dashoffset: calc(169.6 - (169.6 * var(--ring-pct, 0) / 100));
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--cyan) 55%, transparent));
    transition: stroke-dashoffset 0.12s linear;
  }
  .fg2-ring-pct {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 0.76rem; color: var(--bg); font-variant-numeric: tabular-nums;
  }

  .fg2-log {
    background: color-mix(in srgb, #000 22%, transparent);
    border-radius: 8px; padding: 0.6rem 0.75rem;
    min-height: 6.4em;
    display: flex; flex-direction: column; justify-content: flex-end; gap: 0.28rem;
  }
  .fg2-log-line {
    margin: 0; font-size: 0.72rem; letter-spacing: 0.01em;
    color: color-mix(in srgb, var(--bg) 46%, transparent);
    display: flex; gap: 0.5rem;
  }
  .fg2-log-line.is-done { color: color-mix(in srgb, var(--bg) 72%, transparent); }
  .fg2-log-caret { color: var(--cyan); flex: none; }
  .fg2-log-line.is-done .fg2-log-caret { color: var(--violet); }

  .fg2-formats {
    list-style: none; margin: 0; padding: 0;
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;
  }
  .fg2-formats li {
    text-align: center; border-radius: 7px; padding: 0.45rem 0.3rem;
    font-size: 0.72rem; letter-spacing: 0.06em;
    border: 1px solid color-mix(in srgb, #fff 12%, transparent);
    color: color-mix(in srgb, var(--bg) 34%, transparent);
    transition: border-color 0.3s var(--ease, ease), color 0.3s var(--ease, ease), box-shadow 0.3s var(--ease, ease);
  }
  .fg2-formats li.is-lit {
    color: var(--ink);
    background: var(--cyan);
    border-color: transparent;
    box-shadow: 0 0 10px color-mix(in srgb, var(--cyan) 55%, transparent);
  }

  .fg2-console-note {
    margin: 1.1rem 0 0; text-align: right;
    font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
    color: color-mix(in srgb, var(--bg) 42%, transparent);
  }

  /* ------------------------------------------------------------------
     offer plate — identical contract to the shipped section: price,
     promise, one CTA, format list. Nothing new invented here.
     ------------------------------------------------------------------ */
  .fg2-offer {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
    gap: 1.25rem;
    padding-top: clamp(1.5rem, 3vw, 2rem);
    border-top: 1px solid var(--line);
  }
  .fg2-price { margin: 0; font-size: clamp(1.05rem, 1.6vw, 1.3rem); color: var(--ink); }
  .fg2-price strong { font-family: var(--bloom); font-weight: 650; color: var(--magenta-deep); }
  .fg2-price-unit { color: var(--ink-dim); }
  .fg2-price em { font-style: normal; color: var(--ink); }
  .fg2-cta { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .fg2-formats-inline {
    font-family: ui-monospace, monospace; font-size: 0.78rem; letter-spacing: 0.08em;
    color: var(--ink-faint); text-transform: uppercase;
  }

  @keyframes fg2-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }

  /* ------------------------------------------------------------------
     reduced motion: the panel must tell the whole story frozen at its
     most complete frame — every stage marked done, ring closed, all
     four keys lit — rather than animating a slower version of itself.
     `.is-still` is set in markup from `reducedMotion.current`, and the
     derived values above already resolve to their end-state under it
     (ring/format literals check reducedMotion inline); this block just
     removes the two leftover CSS-only motions (the status dot's blink
     and the transition-timed dash offsets, which would otherwise still
     animate once on mount even with the JS clock stopped).
     ------------------------------------------------------------------ */
  .fg2-console.is-still .fg2-dot { animation: none; opacity: 1; }
  .fg2-console.is-still .fg2-ring-fill,
  .fg2-console.is-still .fg2-wire circle,
  .fg2-console.is-still .fg2-wire line,
  .fg2-console.is-still .fg2-glyph path,
  .fg2-console.is-still .fg2-stage-dot,
  .fg2-console.is-still .fg2-formats li {
    transition: none;
  }
  .fg2-console.is-still .fg2-sweep { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .fg2-dot { animation: none !important; opacity: 1; }
    .fg2-sweep { display: none; }
  }
</style>
