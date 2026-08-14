<!--
  /machine — the content subscription, as its own page.

  WHY THIS IS NOT `<TheMachine />` ANY MORE. The route used to mount the home
  page's section and close with the shuttle band and the contact form. The
  client's objection was that a menu item pointing at a duplicate of a section
  twenty screens up the same site is not a page. The specific casualty here was
  the grid: TheMachine.svelte renders the studio's twenty real posts at 58 CSS
  pixels, because on the home page that block's job is to read as a MONTH's
  SHAPE in one glance beside the pitch. On a page whose entire subject is the
  work, twenty 58px thumbs are the wrong object — the work is the argument, so
  it is a gallery here.

  THE ORDER IS THE PURCHASE DECISION, not the section's order:

    1. WHAT IT IS            headline, lede, and the month's two figures
    2. WHAT ARRIVES          the four claims, each in both languages, with the
                             two countable ones given their real size
    3. HOW A MONTH RUNS      the four verbs the lede already names — writes,
                             designs, schedules, and a human checks — plus the
                             two commercial facts the FAQ already states
    4. THE WORK              all twenty posts, at a size you can actually see
    5. THE PRICE             89 JOD, its hedge, and what you are not signing
    6. IN ARABIC             the native passage, unchanged

  NOTHING IS INVENTED. Every deliverable on this page is one of the four
  strings in THE_MACHINE.bullets or one of the two counts in
  THE_MACHINE.monthGrid; the two commercial facts are quoted from FAQ.payment
  and FAQ.timeline; the gallery is data/loomPosts.json, whose length is
  counted, never typed. No client is named or implied — as TheMachine.svelte's
  own note insists, these are the studio's own posts, and this page says so in
  the same words.

  THE ARABIC IS NOT A TRANSLATION. `bullets[].ar` and `arabicPitch` are
  originals written in Arabic (see $data/machine.js's standing rule); they are
  rendered as-is, and only the passage — a full paragraph — carries dir="rtl".
  The short bullet labels deliberately do not, for the reason machine-offer.css
  documents on `.mo-bullet-ar`.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { THE_MACHINE } from '$data/offers.js'
  import LOOM_POSTS from '$data/loomPosts.json'
  import { FAQ } from '$data/faq.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from '$components/SplitWords.svelte'
  import WoolButton from '$components/WoolButton.svelte'
  import CountUp from '$components/CountUp.svelte'
  import Pic from '$components/Pic.svelte'
  import Bolt from '$components/Bolt.svelte'
  import Contact from '$components/Contact.svelte'
  import '../route-page.css'
  import './machine-page.css'

  const m = THE_MACHINE
  const faqBy = Object.fromEntries(FAQ.map((f) => [f.id, f]))

  const open = (note) => wizard.open({ note })

  /* ——— 2. WHAT ARRIVES ———
     The four claims are `m.bullets`, in order, untouched. The first two are
     COUNTABLE, so they are rendered with their figure pulled out of
     `m.monthGrid` — the same two numbers the bullet text states, not a second
     copy of them typed here. The second two are qualities and get no number,
     because inventing one is exactly what this page must not do. */
  const counted = [
    { n: m.monthGrid.posts, bullet: m.bullets[0], accent: 'var(--yarn-pink)' },
    { n: m.monthGrid.reels, bullet: m.bullets[1], accent: 'var(--yarn-violet)' },
  ]
  const qualities = [
    { bullet: m.bullets[2], accent: 'var(--yarn-blue)' },
    { bullet: m.bullets[3], accent: 'var(--yarn-gold)' },
  ]

  /* ——— 3. HOW A MONTH RUNS ———
     Four beats, and every one of them is a VERB ALREADY IN `m.ledeEn`:
     "…writes, designs and schedules a month of content — in Arabic and English
     — while one editor checks every piece before it ships." Nothing about the
     process is asserted here that the lede does not already assert; the
     sentences below only say which part of that sentence each beat is. */
  const MONTH = [
    {
      n: '01',
      title: 'It writes',
      body: 'A month of copy comes out of the brief — every piece in Arabic and in English, not one written and the other run through a translator.',
    },
    {
      n: '02',
      title: 'It designs',
      body: 'Each piece is laid out and rendered as a finished frame, in your brand’s art direction, ready to post rather than ready to brief.',
    },
    {
      n: '03',
      title: 'It schedules',
      body: 'The month lands as a filled calendar, not a folder — the slots are planned, so nothing depends on somebody remembering to post on a Thursday.',
    },
    {
      n: '04',
      title: 'A human checks it',
      body: 'One editor reads and signs off every piece before it ships. That is the step the price is really buying, and it is the one nobody automates here.',
    },
  ]

  // ——— 4. THE WORK ———
  // Counted, never typed. The caption's honesty is TheMachine.svelte's, kept
  // word for word: these are LOOM's own posts, no client is credited, and the
  // set contains no video.
  const total = LOOM_POSTS.length

  const DESC = `The Machine is LOOM's monthly content subscription: ${m.monthGrid.posts} photos and ${m.monthGrid.reels} videos a month, written, designed and scheduled in Arabic and English, checked by a human editor before anything ships. From ${m.priceFromJod} JOD a month, no retainer and no minimum term.`

  /* Product schema off the same constants the page renders. `price` is the
     floor and the description says so — offers.js's rule is that this figure
     is never presented as a quote, and a crawler is not an exception to it. */
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `LOOM — ${m.nameEn}`,
    alternateName: m.nameAr,
    serviceType: 'Monthly content production subscription',
    description: m.ledeEn,
    // A REFERENCE, not a duplicate: `@id` alone points at the Organization
    // node the home page defines in full (src/routes/+page.svelte) instead
    // of re-typing name/url a third time across the site.
    provider: { '@id': 'https://www.loomstudio-jo.com/#organization' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'JOD',
      price: m.priceFromJod,
      description: `From ${m.priceFromJod} JOD per month. ${m.priceNote}`,
    },
  })
</script>

<svelte:head>
  <title>The Machine — A Month of Content, Every Month | LOOM</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href="https://www.loomstudio-jo.com/machine" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.loomstudio-jo.com/machine" />
  <meta property="og:title" content="The Machine — A Month of Content, Every Month | LOOM" />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="The Machine — A Month of Content, Every Month | LOOM" />
  <meta name="twitter:description" content={DESC} />
  {@html `<script type="application/ld+json">${schema}</script>`}
</svelte:head>

<div class="route-page">
  <!-- ═══ 1. WHAT IT IS ═══════════════════════════════════════════════ -->
  <header class="mn-hero">
    <div class="mn-hero-in">
      <p class="kicker">
        <span>—</span> {m.nameEn}
        <span class="mn-ar-tag" lang="ar">{m.nameAr}</span>
      </p>
      <SplitWords as="h1" class="h2 mn-h1" text={m.h2} />
      <p class="lede mn-hero-lede" use:reveal={{ delay: 0.1 }}>{m.ledeEn}</p>

      <div class="mn-hero-figs" use:reveal={{ delay: 0.16 }}>
        <p class="mn-fig">
          <b><CountUp value={m.monthGrid.posts} /></b>
          <span>photos a month</span>
        </p>
        <p class="mn-fig">
          <b><CountUp value={m.monthGrid.reels} /></b>
          <span>videos a month</span>
        </p>
        <p class="mn-fig mn-fig--price">
          <i>from</i>
          <b><CountUp value={m.priceFromJod} /></b>
          <span>JOD a month</span>
        </p>
      </div>

      <div class="mn-hero-cta" use:reveal={{ delay: 0.2 }}>
        <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
          <WoolButton
            label={m.ctaLabel}
            onclick={() => open(`${m.nameEn} (${m.nameAr}) — content subscription`)}
          />
        </div>
        <p class="mn-hero-cta-note">{m.priceNote}</p>
      </div>
    </div>
  </header>

  <!-- ═══ 2. WHAT ARRIVES ═════════════════════════════════════════════ -->
  <section class="mn-arrives" aria-labelledby="mn-arrives-h">
    <div class="mn-sec-head">
      <p class="kicker"><span>—</span> What arrives</p>
      <h2 class="h2 mn-h2" id="mn-arrives-h">Four things, every month, in two languages</h2>
      <p class="mn-sec-lede">
        This is the whole list. There is no tier above it holding something
        back, and nothing on it depends on how big your account is.
      </p>
    </div>

    <div class="mn-arrive-grid">
      {#each counted as c, i (c.bullet.en)}
        <article class="mn-card mn-card--count" style="--accent: {c.accent}" use:reveal={{ delay: i * 0.05, y: 20 }}>
          <p class="mn-card-n">{c.n}</p>
          <h3 class="mn-card-h">{c.bullet.en}</h3>
          <!-- no dir="rtl" on a short label — see machine-offer.css's note on
               .mo-bullet-ar; the paragraph at the foot of the page does carry
               it, because a full passage genuinely needs it -->
          <p class="mn-card-ar" lang="ar">{c.bullet.ar}</p>
        </article>
      {/each}

      {#each qualities as q, i (q.bullet.en)}
        <article class="mn-card" style="--accent: {q.accent}" use:reveal={{ delay: (i + 2) * 0.05, y: 20 }}>
          <span class="mn-card-tick" aria-hidden="true"></span>
          <h3 class="mn-card-h">{q.bullet.en}</h3>
          <p class="mn-card-ar" lang="ar">{q.bullet.ar}</p>
        </article>
      {/each}
    </div>
  </section>

  <!-- ═══ 3. HOW A MONTH RUNS ═════════════════════════════════════════ -->
  <section class="mn-month" aria-labelledby="mn-month-h">
    <div class="mn-sec-head">
      <p class="kicker"><span>—</span> How a month runs</p>
      <h2 class="h2 mn-h2" id="mn-month-h">Written, designed, scheduled — then read by a person</h2>
      <p class="mn-sec-lede">
        What an agency staffs a team to do, the machine does alone. The last
        step is the one that is still human, and it is not optional.
      </p>
    </div>

    <ol class="mn-flow">
      {#each MONTH as s, i (s.n)}
        <li class="mn-flow-step" use:reveal={{ delay: i * 0.05, y: 18 }}>
          <p class="mn-flow-n">{s.n}</p>
          <h3 class="mn-flow-h">{s.title}</h3>
          <p class="mn-flow-b">{s.body}</p>
        </li>
      {/each}
    </ol>

    <!-- The two commercial facts, quoted rather than paraphrased. Both already
         exist in the site's FAQ; neither is stated here for the first time. -->
    <div class="mn-terms" use:reveal={{ delay: 0.08 }}>
      <div class="mn-term">
        <p class="mn-term-h">Starting</p>
        <p class="mn-term-b">Content through The Machine starts inside a week.</p>
        <p class="mn-term-src">From the FAQ: “How long does a project take?”</p>
      </div>
      <div class="mn-term">
        <p class="mn-term-h">Committing</p>
        <p class="mn-term-b">
          The Machine is month to month with no minimum term and no retainer,
          cancellable whenever it stops earning its keep.
        </p>
        <p class="mn-term-src">From the FAQ: “How does payment work?”</p>
      </div>
    </div>
  </section>

  <!-- ═══ 4. THE WORK ═════════════════════════════════════════════════ -->
  <section class="mn-work" aria-labelledby="mn-work-h">
    <div class="mn-sec-head">
      <p class="kicker"><span>—</span> The output</p>
      <h2 class="h2 mn-h2" id="mn-work-h">{total} pieces, at the size you would actually see them</h2>
      <p class="mn-sec-lede">
        These are LOOM’s own posts — the studio running the machine on itself.
        No client is named or credited, because none of these were made for
        one; that is the honest version of the same argument. All stills: no
        video asset exists in this set.
      </p>
    </div>

    <ul class="mn-gallery">
      {#each LOOM_POSTS as p, i (p.id)}
        <li class="mn-shot" use:reveal={{ delay: Math.min(i, 8) * 0.03, y: 18 }}>
          <figure>
            <!-- `sizes` is not optional here: without it a srcset defaults to
                 100vw and the browser fetches the 640px original for every one
                 of these tiles. The ladder in loomPosts.json tops out at 640,
                 and the tile is ~280px at 1440 / ~330px at 390. -->
            <Pic
              class="mn-shot-img"
              src={p.src}
              sizes="(max-width: 560px) 46vw, (max-width: 900px) 30vw, 300px"
              alt={p.alt}
              width={p.width}
              height={p.height}
              loading={i < 4 ? 'eager' : 'lazy'}
              decoding="async"
            />
            <!-- aria-hidden: this is the image's own alt text shown as a
                 visible caption, so a screen reader that has already read the
                 alt must not be handed the same sentence a second time. -->
            <figcaption aria-hidden="true">{p.alt}</figcaption>
          </figure>
        </li>
      {/each}
    </ul>
  </section>

  <!-- ═══ 5. THE PRICE ════════════════════════════════════════════════ -->
  <section class="mn-price" aria-labelledby="mn-price-h">
    <div class="mn-price-in">
      <div class="mn-price-plate" use:reveal>
        <p class="mn-price-tag">From</p>
        <p class="mn-price-val">
          <CountUp value={m.priceFromJod} />
          <span class="mn-price-cur">JOD</span>
          <span class="mn-price-unit">/month</span>
        </p>
        <p class="mn-price-note">{m.priceNote}</p>
        <span class="mn-price-ar" lang="ar" aria-hidden="true">{m.nameAr}</span>
      </div>

      <div class="mn-price-side" use:reveal={{ delay: 0.08 }}>
        <h2 class="h2 mn-h2" id="mn-price-h">What you are not signing</h2>
        <ul class="mn-not">
          <li>No retainer.</li>
          <li>No minimum term.</li>
          <li>No per-hour billing — LOOM does not bill by the hour.</li>
        </ul>
        <p class="mn-price-fine">{faqBy.payment.a}</p>
        <div class="magnetic mn-price-cta" use:magnetic={{ strength: 0.35 }}>
          <WoolButton
            label={m.ctaLabel}
            yarn="magenta"
            onclick={() => open(`${m.nameEn} — from ${m.priceFromJod} JOD/month`)}
          />
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ 6. IN ARABIC ════════════════════════════════════════════════ -->
  <section class="mn-arabic" aria-label="The Machine, in Arabic">
    <div class="mn-arabic-in" use:reveal={{ delay: 0.08 }}>
      <p class="mn-arabic-tag" lang="ar">{m.nameAr}</p>
      <p class="mn-arabic-body" lang="ar" dir="rtl">{m.arabicPitch}</p>
    </div>
  </section>

  <Bolt />

  <Contact />
</div>
