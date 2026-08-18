<!--
  /pricing — a real page about what things cost, not the home page's band
  wearing a URL.

  WHY THIS IS NOT `<Pricing />` ANY MORE. The first version of this route
  mounted the home page's PRICING section and closed with the shuttle band and
  the contact form. The client's note on that was exact: "you think making the
  other pages for the menu items is just put the section and that's it." They
  were right. A route that renders the same six tiles as the section twenty
  screens up the home page is a duplicate with its own canonical tag, and a
  visitor who lands here from a search for "website price Amman" gets a board
  designed to be skimmed on the way past — not a page that answers the
  question they typed.

  So this page is built around the ONE question it exists for, in the order a
  buyer actually asks it:

    1. WHAT IS THE FLOOR          the six figures, immediately, in a rail
    2. WHAT DOES EACH FLOOR BUY   the ladder, one tier per row, given room —
                                  every `includes` line and every `note`
                                  visible at once, no hover, no disclosure
    3. WHAT CHANGES BETWEEN THEM  the three steps up the build ladder, with
                                  the delta and the multiple COMPUTED from
                                  the data, and the reason each step exists
    4. WHAT MOVES THE PRICE UP    the three factors PRICING_NOTE names, plus
                                  the two things the tier notes say are NOT
                                  in the floor
    5. HOW PAYING WORKS           FAQ.payment, verbatim, plus the four
                                  process steps from site.js
    6. THE COST OBJECTIONS        the three FAQ entries that are about money

  EVERY NUMBER ON THIS PAGE IS DERIVED. Nothing is typed: the six floors come
  from $data/pricing.js, the deltas and multiples are arithmetic on them at
  build time, and the "months of The Machine" figure is one floor divided by
  another. There is no literal JOD amount in this file — grep it. That is the
  rule pricing.js states about itself ("a second hardcoded copy is how two
  numbers for one product ship") applied one level up.

  EVERY WORD IS SOURCED. Headlines, ledes and the connective sentences between
  blocks are written here; every CLAIM is quoted from data. The step reasons
  in section 3 are pricing.js's own justification for the ladder ("a store is
  the site plus a database, a checkout and an admin; an app is the store plus
  two native targets and a review process; software is the app plus a spec and
  a support window"), which is the argument the price list was set by.

  MOTION: `use:reveal` on entry, one hover transition per interactive thing,
  nothing animating at rest, all of it cut under prefers-reduced-motion at the
  foot of pricing-page.css.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { PRICING, PRICING_NOTE } from '$data/pricing.js'
  import { FAQ } from '$data/faq.js'
  import { PROCESS } from '$data/site.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from '$components/SplitWords.svelte'
  import WoolButton from '$components/WoolButton.svelte'
  import Bolt from '$components/Bolt.svelte'
  import Contact from '$components/Contact.svelte'
  import '../route-page.css'
  import './pricing-page.css'

  const ask = (t) =>
    wizard.open({ note: `Quote — ${t.name} (from ${t.from} ${t.unit} ${t.period})` })

  // ——— the two families ———————————————————————————————————————————————
  // Same split the section makes, for the same reason: a per-month rate and a
  // one-off floor are not the same kind of number and must never be ranked
  // against each other.
  const builds = PRICING.filter((t) => t.period === 'one-off')
  const ongoing = PRICING.filter((t) => t.period !== 'one-off')

  const fmt = (n) => n.toLocaleString('en-US')

  // The bar in the ladder: each build floor against the dearest one. sqrt for
  // the same reason Pricing.svelte uses it — linear puts the cheapest rung at
  // 13% of the track, which reads as "nothing" rather than "the first rung".
  const ceiling = Math.max(...builds.map((t) => t.from))
  const bar = (t) => `${Math.round(Math.sqrt(t.from / ceiling) * 100)}%`

  /* ——— section 3: WHAT CHANGES BETWEEN TIERS ———
     Three steps, computed pairwise off `builds` rather than listed, so the
     table cannot survive a repricing while still claiming the old delta. The
     `why` line for each step is pricing.js's own stated justification for
     setting the ladder where it is — the file argues each rung is "defensible
     against the one under it" and then says how; this is that sentence, split
     into the three steps it describes. */
  const STEP_WHY = {
    store: 'A store is the site plus a database, a checkout and an admin — the parts a catalogue needs before anyone can buy from it.',
    app: 'An app is the store plus two native targets and a review process: one codebase, two stores, and the submission each of them runs you through.',
    software: 'Software is the app plus a spec and a support window — the scope is agreed in writing before anyone writes code, and the handover is followed by a period where it is still being looked after.',
  }
  const steps = builds.slice(1).map((t, i) => {
    const prev = builds[i]
    return {
      id: t.id,
      from: prev,
      to: t,
      delta: t.from - prev.from,
      times: (t.from / prev.from).toFixed(1).replace(/\.0$/, ''),
      why: STEP_WHY[t.id],
      // what this rung adds that the one under it does not say
      adds: t.includes,
    }
  })

  /* ——— section 4: WHAT MOVES THE PRICE UP ———
     PRICING_NOTE names exactly three things ("how many languages, how much of
     the content already exists, and how deep the thing has to go"). Those
     three are the cards; nothing is added to the list. Each card's second
     line is the site's own existing answer to that factor, quoted from where
     it already lives, so this section introduces no fact of its own. */
  const faqBy = Object.fromEntries(FAQ.map((f) => [f.id, f]))
  const MOVERS = [
    {
      n: '01',
      title: 'How many languages',
      body: 'Arabic is written, not translated — copy read in Arabic is written in Arabic first and the English follows it, and layouts are built right-to-left properly rather than mirrored. That is two pieces of writing and two layouts, not one of each.',
      source: 'From the FAQ: “Do you actually work in Arabic, or just translate?”',
      accent: 'var(--yarn-blue)',
    },
    {
      n: '02',
      title: 'How much already exists',
      body: 'An existing identity is a constraint LOOM works inside, not a reason to start over — and it usually makes a project cheaper rather than more expensive. Starting from a brand book, a product feed or a photo library is a shorter build than starting from a name.',
      source: 'From the FAQ: “We already have an agency / a site / a brand book.”',
      accent: 'var(--yarn-violet)',
    },
    {
      n: '03',
      title: 'How deep it has to go',
      body: 'Depth is the number of things behind the screen: a database, a checkout, an admin, two native targets, a spec, a support window. Each of those is a rung on the ladder above, which is why the floors step the way they do.',
      source: 'From the ladder: every rung is the one under it plus something that had to be built.',
      accent: 'var(--yarn-gold)',
    },
  ]

  /* THE HONEST EXCLUSIONS. Two of the six tier notes name something the floor
     does NOT cover. They are pulled out here rather than left buried at the
     bottom of a tile, because a caveat a buyer finds after the quote is the
     one that costs the relationship. Both strings are the tiers' own `note`
     text — the source is `PRICING`, not this file. */
  const exclusions = PRICING.filter((t) => t.note.includes('are yours'))

  // ——— section 6: the money questions ———
  // An explicit id list, not a keyword match: these three are the FAQ entries
  // whose answer is about what it costs. The full set stays on /faq.
  const MONEY_FAQ = ['payment', 'small', 'existing']
  const faqs = MONEY_FAQ.map((id) => faqBy[id]).filter(Boolean)

  const faqSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  })

  /* The offer schema is generated from the same array the page renders, for
     the same reason Faq.svelte generates its own: a hand-typed second copy of
     these prices is how a crawler ends up quoting a figure the page no longer
     shows. `lowPrice` only — every figure here is a floor, and
     schema.org/AggregateOffer's `highPrice` would be a ceiling LOOM has not
     stated. */
  const offerSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'LOOM — starting prices',
    itemListElement: PRICING.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Service',
        name: t.name,
        description: t.lede,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'JOD',
          price: t.from,
          description: `From ${t.from} JOD ${t.period}. ${t.note}`,
        },
      },
    })),
  })

  const DESC =
    'What a website, a store, an app, custom software, the content subscription and an AI workshop start at with LOOM — every floor in JOD, what each one buys, what moves it up, and how payment works.'
</script>

<svelte:head>
  <title>Pricing — What Things Cost at LOOM</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href="https://www.loomstudio-jo.com/pricing" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.loomstudio-jo.com/pricing" />
  <meta property="og:title" content="Pricing — What Things Cost at LOOM" />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="https://www.loomstudio-jo.com/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Pricing — What Things Cost at LOOM" />
  <meta name="twitter:description" content={DESC} />
  <meta name="twitter:image" content="https://www.loomstudio-jo.com/img/og.jpg" />
  {@html `<script type="application/ld+json">${offerSchema}</script>`}
  {@html `<script type="application/ld+json">${faqSchema}</script>`}
</svelte:head>

<div class="route-page">
  <!-- ═══ 1. THE FLOOR, IMMEDIATELY ═══════════════════════════════════ -->
  <header class="pr-hero">
    <div class="pr-hero-in">
      <p class="kicker"><span>—</span> Pricing</p>
      <SplitWords as="h1" class="h2 pr-h1" text="Here is the floor. No form required." />
      <p class="lede pr-hero-lede" use:reveal={{ delay: 0.1 }}>
        Six things LOOM sells, six starting points, published. Every figure
        below is where a project begins — not a quote, and not the number you
        get after an hour on a call finding out how big your company is.
      </p>

      <!-- The whole price list in one line of sight, before a single
           paragraph. Each chip is a link to its own row further down. -->
      <ul class="pr-rail" use:reveal={{ delay: 0.16 }}>
        {#each PRICING as t (t.id)}
          <li class="pr-chip" style="--accent: {t.accent}">
            <a href="#tier-{t.id}">
              <span class="pr-chip-name">{t.name}</span>
              <span class="pr-chip-fig">
                <i>from</i> <b>{fmt(t.from)}</b> {t.unit}
              </span>
              <span class="pr-chip-per">{t.period}</span>
            </a>
          </li>
        {/each}
      </ul>

      <p class="pr-hero-note" use:reveal={{ delay: 0.2 }}>
        {builds.length} one-off builds · {ongoing.length} ongoing rates · every
        figure quoted in Jordanian dinar, fixed in writing before anything
        starts.
      </p>
    </div>
  </header>

  <!-- ═══ 2. THE LADDER, ONE TIER PER ROW ═════════════════════════════ -->
  <section class="pr-ladder" aria-labelledby="pr-ladder-h">
    <div class="pr-sec-head">
      <p class="kicker"><span>—</span> The ladder</p>
      <h2 class="h2 pr-h2" id="pr-ladder-h">What each floor actually buys</h2>
      <p class="pr-sec-lede">
        One row per tier, everything visible at once. The bar under the four
        one-off builds is that floor measured against the dearest one — the
        price ladder, drawn. The two ongoing rates sit below them, because a
        rate is not a rung.
      </p>
    </div>

    <div class="pr-tiers">
      {#each PRICING as t, i (t.id)}
        {@const on = t.period !== 'one-off'}
        <article
          class="pr-tier"
          class:pr-tier--on={on}
          id="tier-{t.id}"
          style="--accent: {t.accent}"
          use:reveal={{ delay: Math.min(i, 4) * 0.04, y: 22 }}
        >
          <div class="pr-tier-fig">
            <p class="pr-tier-n">{t.n}</p>
            <h3 class="pr-tier-name">{t.name}</h3>
            <p class="pr-tier-price">
              <span class="pr-from">from</span>
              <b class="pr-val">{fmt(t.from)}</b>
              <span class="pr-unit">{t.unit}</span>
            </p>
            <p class="pr-tier-per">{t.period}</p>

            {#if !on}
              <!-- the rung, measured; the ongoing rows get no bar at all
                   rather than a bar that invites a false comparison -->
              <span class="pr-bar" style="--w: {bar(t)}" aria-hidden="true"></span>
            {/if}
          </div>

          <div class="pr-tier-body">
            <p class="pr-tier-lede">{t.lede}</p>

            <ul class="pr-includes">
              {#each t.includes as line (line)}
                <li><i aria-hidden="true"></i>{line}</li>
              {/each}
            </ul>

            <!-- The floor is never shown naked. This is what stops the number
                 reading as bait when the real quote comes back higher. -->
            <p class="pr-buys">
              <span class="pr-buys-tag">The floor buys</span>
              {t.note}
            </p>

            {#if t.href}
              <a class="pr-tier-cta" href={t.href}>
                <span>{t.cta}</span><i aria-hidden="true">→</i>
              </a>
            {:else}
              <button type="button" class="pr-tier-cta" onclick={() => ask(t)}>
                <span>{t.cta}</span><i aria-hidden="true">→</i>
              </button>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  </section>

  <!-- ═══ 3. WHAT CHANGES BETWEEN TIERS ═══════════════════════════════ -->
  <section class="pr-steps" aria-labelledby="pr-steps-h">
    <div class="pr-sec-head">
      <p class="kicker"><span>—</span> The steps</p>
      <h2 class="h2 pr-h2" id="pr-steps-h">What changes when you go up a rung</h2>
      <p class="pr-sec-lede">
        The gaps in the build ladder are not rounded-up guesses — each floor is
        the one under it plus a specific amount of work. Here is what that work
        is, and what it costs.
      </p>
    </div>

    <ol class="pr-step-list">
      {#each steps as s, i (s.id)}
        <li class="pr-step" style="--accent: {s.to.accent}" use:reveal={{ delay: i * 0.05, y: 20 }}>
          <p class="pr-step-pair">
            <span class="pr-step-a">{s.from.name}</span>
            <i aria-hidden="true">→</i>
            <span class="pr-step-b">{s.to.name}</span>
          </p>

          <p class="pr-step-math">
            <span class="pr-step-delta">+{fmt(s.delta)} <em>{s.to.unit}</em></span>
            <span class="pr-step-x">{s.times}× the floor under it</span>
          </p>

          <p class="pr-step-why">{s.why}</p>

          <ul class="pr-step-adds">
            {#each s.adds as line (line)}
              <li>{line}</li>
            {/each}
          </ul>
        </li>
      {/each}
    </ol>

    <!-- The other comparison a buyer makes: a build against the subscription.
         Both numbers come from the same file; the ratio is arithmetic. -->
    <p class="pr-anchor-note" use:reveal={{ delay: 0.1 }}>
      For scale, in the other direction: the cheapest one-off floor here
      ({fmt(builds[0].from)} {builds[0].unit}) is about
      {(builds[0].from / ongoing[0].from).toFixed(1)} months of
      {ongoing[0].name} at {fmt(ongoing[0].from)} {ongoing[0].unit} a month —
      the same order of magnitude, which is deliberate. A build you own and a
      rate you can stop are different decisions, not different planets.
    </p>
  </section>

  <!-- ═══ 4. WHAT MOVES THE PRICE UP ══════════════════════════════════ -->
  <section class="pr-movers" aria-labelledby="pr-movers-h">
    <div class="pr-sec-head">
      <p class="kicker"><span>—</span> The variables</p>
      <h2 class="h2 pr-h2" id="pr-movers-h">What moves a figure off its floor</h2>
      <p class="pr-sec-lede">
        Three things, and they are the same three on every project. None of
        them is how big your company looks.
      </p>
    </div>

    <div class="pr-mover-grid">
      {#each MOVERS as m, i (m.n)}
        <article class="pr-mover" style="--accent: {m.accent}" use:reveal={{ delay: i * 0.05, y: 20 }}>
          <p class="pr-mover-n">{m.n}</p>
          <h3 class="pr-mover-h">{m.title}</h3>
          <p class="pr-mover-b">{m.body}</p>
          <p class="pr-mover-src">{m.source}</p>
        </article>
      {/each}
    </div>

    <div class="pr-rule-wrap" use:reveal={{ delay: 0.08 }}>
      <p class="pr-rule-tag">The standing rule</p>
      <p class="pr-rule">{PRICING_NOTE}</p>
    </div>

    {#if exclusions.length}
      <div class="pr-excl" use:reveal={{ delay: 0.1 }}>
        <p class="pr-excl-h">And what a floor does not cover</p>
        <ul>
          {#each exclusions as t (t.id)}
            <li><b>{t.name}</b> — {t.note}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>

  <!-- ═══ 5. HOW PAYING WORKS, AND WHAT HAPPENS NEXT ══════════════════ -->
  <section class="pr-pay" aria-labelledby="pr-pay-h">
    <div class="pr-sec-head">
      <p class="kicker"><span>—</span> Paying, and what happens next</p>
      <h2 class="h2 pr-h2" id="pr-pay-h">Fixed in writing, split across milestones</h2>
    </div>

    <div class="pr-pay-grid">
      <div class="pr-pay-note" use:reveal>
        <p class="pr-pay-body">{faqBy.payment.a}</p>
        <p class="pr-pay-body pr-pay-body--dim">{faqBy.timeline.a}</p>
      </div>

      <ol class="pr-flow" use:reveal={{ delay: 0.08 }}>
        {#each PROCESS as p, i (p.n)}
          <li class="pr-flow-step" style="--i: {i}">
            <span class="pr-flow-n">{p.n}</span>
            <div>
              <h3 class="pr-flow-h">{p.title}</h3>
              <p class="pr-flow-b">{p.body}</p>
            </div>
          </li>
        {/each}
      </ol>
    </div>

    <div class="pr-pay-cta" use:reveal={{ delay: 0.1 }}>
      <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
        <WoolButton
          label="Get a fixed quote"
          yarn="magenta"
          onclick={() => wizard.open({ note: 'Fixed quote — from the pricing page' })}
        />
      </div>
      <p class="pr-pay-cta-note">
        Tell us what you need and you get a number, in writing, before anything
        starts.
      </p>
    </div>
  </section>

  <!-- ═══ 6. THE MONEY QUESTIONS ══════════════════════════════════════ -->
  <section class="pr-faq" aria-labelledby="pr-faq-h">
    <div class="pr-sec-head">
      <p class="kicker"><span>—</span> Straight answers</p>
      <h2 class="h2 pr-h2" id="pr-faq-h">The three questions that are really about money</h2>
    </div>

    <div class="pr-faq-list">
      {#each faqs as f, i (f.id)}
        <!-- <details>, like the site's FAQ band, so find-in-page opens the
             answer and the whole thing works with no JS at all -->
        <details class="pr-q" open={i === 0} use:reveal={{ delay: i * 0.04, y: 16 }}>
          <summary>
            <span>{f.q}</span>
            <i aria-hidden="true"></i>
          </summary>
          <div class="pr-q-in"><p>{f.a}</p></div>
        </details>
      {/each}
    </div>

    <p class="pr-faq-more">
      Everything else — ownership, languages, where we are —
      <a href="/faq">is on the FAQ</a>.
    </p>
  </section>

  <Bolt />

  <Contact />
</div>
