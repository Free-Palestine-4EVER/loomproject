<!--
  PRICING — the floor, stated once, at the top of the SELL band.

  Before this section the page had prices in two places and a floor in
  neither: The Machine quoted 89 JOD/month deep in its own pitch, the
  workshops page computed a live figure behind a route, and the three things
  LOOM is asked for most — a site, an app, a piece of software — carried no
  number anywhere. In Jordan and the Gulf that is not restraint, it is a lost
  inbound: a visitor who cannot find a floor assumes the ceiling.

  REDESIGNED 10 Aug 2026, from a six-card grid to a RATE CARD.

  The grid was the problem, not the styling. Six rounded boxes three across is
  the same shape as Studios, the Lab, Apps and the old Process — and worse, it
  is the wrong shape for this content: a price list exists to be SCANNED DOWN
  its price column, and a grid puts the six numbers at six different x
  positions so the eye has to hunt for each one. As rows, every figure lands
  in the same column and the cheapest-to-dearest read is free. (Note for a
  future session: an earlier project note describes this section as a
  two-level `subgrid` card grid — that was the PREVIOUS shape, superseded by
  this row layout on the same day. pricing.css's `.price-row` grid, five named
  areas with a fixed price column, is the current and only structure — do not
  reintroduce the card grid to "match" a stale description.)

  It is also how the thing is actually consumed. Nobody reads a rate card
  left-to-right; they run a finger down the right-hand edge until a number
  stops them, then read left into what it buys. The layout now matches that.

  EVERY NUMBER IS RENDERED "from X" — the word is inside the markup, not left
  to the data, so a copied row cannot lose it. $data/pricing.js states the
  same rule at the top and imports the two live figures rather than retyping
  them.

  COST: nothing animates at rest. Entry is one reveal per row, everything else
  is a hover transition. The page already carries two WebGL layers.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { PRICING, PRICING_NOTE } from '$data/pricing.js'
  import SplitWords from './SplitWords.svelte'
  import WoolButton from './WoolButton.svelte'
  import { wizard } from '$lib/wizard.svelte.js'
  import './pricing.css'

  const ask = (t) => wizard.open({ note: `Quote — ${t.name} (from ${t.from} ${t.unit} ${t.period})` })
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

  <div class="price-card">
    {#each PRICING as t, i (t.id)}
      <div class="price-row-wrap" use:reveal={{ delay: Math.min(i, 5) * 0.05, y: 18 }}>
        <div class="price-row" style="--accent: {t.accent}">
          <span class="price-n">{t.n}</span>

          <div class="price-what">
            <h3 class="price-name">{t.name}</h3>
            <p class="price-lede">{t.lede}</p>
            <!-- the includes, inline and separated by dots rather than as a
                 bulleted block — four bullets per row, six rows, would be
                 twenty-four bullets and the tallest section on the page -->
            <p class="price-list">
              {#each t.includes as line, k (line)}
                <span>
                  {#if k > 0}<i aria-hidden="true">·</i>{/if}
                  {line}
                </span>
              {/each}
            </p>
          </div>

          <!-- THE PRICE COLUMN. Every figure in this section lands at the
               same x so the six can be read down as one list — that is the
               entire argument for rows over the grid this replaced. -->
          <p class="price-fig">
            <span class="price-from">from</span>
            <b class="price-val">{t.from.toLocaleString('en-US')}</b>
            <span class="price-unit">{t.unit}</span>
            <span class="price-period">{t.period}</span>
          </p>

          <div class="price-cta">
            {#if t.href}
              <a class="price-link" href={t.href}>{t.cta}<i aria-hidden="true">→</i></a>
            {:else}
              <button type="button" class="price-link" onclick={() => ask(t)}>{t.cta}<i aria-hidden="true">→</i></button>
            {/if}
          </div>

          <!-- the floor is never shown naked: this is what it buys, and it is
               what stops the number reading as bait when the quote comes
               back higher -->
          <p class="price-note">{t.note}</p>
        </div>
      </div>
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
