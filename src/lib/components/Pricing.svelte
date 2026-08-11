<!--
  PRICING — the floor, stated once, at the top of the SELL band.

  Before this section the page had prices in two places and a floor in
  neither: The Machine quoted 89 JOD/month deep in its own pitch, the
  workshops page computed a live figure behind a route, and the three things
  LOOM is asked for most — a site, an app, a piece of software — carried no
  number anywhere. In Jordan and the Gulf that is not restraint, it is a lost
  inbound: a visitor who cannot find a floor assumes the ceiling.

  REDESIGNED 11 Aug 2026 (second pass) — THE LADDER BOARD. The two previous
  shapes were both a vertical stack of six near-identical full-width bands,
  ~300px each, and no amount of body work fixed the two things wrong with
  that: the section ran three screens, and the six tiers were six repetitions
  of one object, so nothing about the layout told you how they differed. The
  client rejected it twice. Do not put the rows back.

  What this is instead:

    1. TWO FAMILIES, TWO SHAPES. The four one-off builds are a 4-up rank —
       one tile each, cheapest to dearest, left to right. The two ONGOING
       offers (The Machine, per month; workshops, per seat) are two WIDE
       tiles under them. They are not the same kind of number as a build
       floor and they no longer pretend to be: different footprint,
       different rule, their own row. Six tiers, one board, one screen.
    2. THE PRICE IS THE TILE. Nothing in a tile is larger than its figure.
       The name and lede are a caption above it; the ticks are a caption
       below it.
    3. THE STEP RULE IS THE COMPARISON. Each build tile carries an accent
       rule across its top edge whose WIDTH is that floor against the
       dearest one (sqrt-scaled, so 500 is a third of the bar rather than a
       sliver you cannot see). Four tiles side by side therefore draw the
       price ladder as a bar chart you read without reading a digit — which
       is the thing the old rows could not do at any height. The ongoing
       tiles' rules are dashed instead of measured: they are a rate, not a
       rung, and a solid bar there would invite a comparison that is not
       true.

  EVERY NUMBER IS RENDERED "from X" — the word is inside the markup, not left
  to the data, so a copied tile cannot lose it. $data/pricing.js states the
  same rule at the top and imports the two live figures rather than retyping
  them.

  COST: nothing animates at rest. Entry is one reveal per tile, everything
  else is a hover transition. The page already carries two WebGL layers.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { PRICING, PRICING_NOTE } from '$data/pricing.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import { wizard } from '$lib/wizard.svelte.js'
  import './pricing.css'

  const ask = (t) => wizard.open({ note: `Quote — ${t.name} (from ${t.from} ${t.unit} ${t.period})` })

  // THE STEP. Only the one-off floors are on one scale, so only they get a
  // measured rule — the per-month and per-seat figures are a different unit
  // and are drawn dashed instead (see .ptile--on in pricing.css).
  const builds = PRICING.filter((t) => t.period === 'one-off')
  const ceiling = Math.max(...builds.map((t) => t.from))
  // sqrt, not linear: linear puts the 500 floor at 13% of the bar, which
  // reads as "nothing" rather than as "the first rung".
  const step = (t) => `${Math.round(Math.sqrt(t.from / ceiling) * 100)}%`
</script>

<section class="price" id="pricing" aria-label="What things cost">
  <div class="price-head">
    <p class="kicker"><span>—</span> What it costs</p>
    <SplitWords as="h2" class="h2 price-h2" text="Here is the floor. No form required." />
    <p class="lede price-sub" use:reveal={{ delay: 0.12 }}>
      Most agencies in this market make you ask. These are the real starting
      points — what moves them is scope, not how big your company looks.
    </p>
  </div>

  <!-- ONE grid, two shapes. The four builds take one column each; the two
       ongoing offers span two columns each on the second row, which is what
       stops the board reading as six of the same thing. -->
  <div class="price-board">
    {#each PRICING as t, i (t.id)}
      {@const on = t.period !== 'one-off'}
      <article
        class="ptile"
        class:ptile--on={on}
        style="--accent: {t.accent}; --step: {on ? '100%' : step(t)}"
        use:reveal={{ delay: Math.min(i, 5) * 0.05, y: 20 }}
      >
        <!-- the rung: measured for builds, dashed for the two rates -->
        <span class="ptile-rule" aria-hidden="true"></span>

        <div class="ptile-a">
          <p class="ptile-top">
            <span class="ptile-n">{t.n}</span>
            <span class="ptile-per">{t.period}</span>
          </p>

          <h3 class="ptile-name">{t.name}</h3>
          <p class="ptile-lede">{t.lede}</p>

          <p class="ptile-fig">
            <span class="ptile-from">from</span>
            <b class="ptile-val">{t.from.toLocaleString('en-US')}</b>
            <span class="ptile-unit">{t.unit}</span>
          </p>
        </div>

        <div class="ptile-b">
          <ul class="ptile-feats">
            {#each t.includes as line (line)}
              <li class="ptile-feat">{line}</li>
            {/each}
          </ul>

          <!-- the floor is never shown naked: this is what it buys, and it is
               what stops the number reading as bait when the quote comes back
               higher. -->
          <p class="ptile-note">{t.note}</p>

          {#if t.href}
            <a class="ptile-cta" href={t.href}><span>{t.cta}</span><i aria-hidden="true">→</i></a>
          {:else}
            <button type="button" class="ptile-cta" onclick={() => ask(t)}><span>{t.cta}</span><i aria-hidden="true">→</i></button>
          {/if}
        </div>
      </article>
    {/each}
  </div>

  <div class="price-foot" use:reveal={{ delay: 0.1 }}>
    <p class="price-foot-note">{PRICING_NOTE}</p>
    <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
      <WoolButton
        label="Get a fixed quote"
        yarn="magenta"
        onclick={() => wizard.open({ note: 'Fixed quote — from the pricing section' })}
      />
    </div>
  </div>
</section>
