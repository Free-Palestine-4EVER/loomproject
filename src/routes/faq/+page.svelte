<!--
  /faq — the answers page.

  WHY THIS IS NOT `<Faq />` ANY MORE. The route used to mount the home page's
  objection band and close with the shuttle and the contact form — a menu item
  pointing at a duplicate of a section twenty screens up the same site. The
  home page's band is an ACCORDION, and that is right there: it sits between
  the pricing table and the form, and its job is to let a reader who has one
  specific worry find that worry and clear it without losing the thread of the
  page. On a page whose entire subject IS the answers, a stack of eight closed
  rows is the wrong object — nothing is readable until you click, and nothing
  can be scanned, searched or skimmed at all.

  So here every answer is OPEN and laid out for reading, the eight are grouped
  by theme, and a filter narrows them live.

  NOTHING IS INVENTED. Every question and every answer is a string from
  $data/faq.js, rendered verbatim — no question is added, none is reworded,
  and no answer is trimmed. `FAQ` order is preserved inside each theme, and
  the numbering is the entry's real index in that file, so `01` is always the
  same question here as it is on the home page.

  THE GROUPING IS THE ONLY EDITORIAL ACT, and it is a grouping of the eight
  ids that already exist, not a set of new categories with new content. If an
  id is ever added to faq.js and not listed in a theme below, it lands in the
  final "Everything else" theme rather than disappearing — a fallback, so the
  page can never silently drop an answer.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { FAQ } from '$data/faq.js'
  import { BRAND } from '$data/site.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from '$components/SplitWords.svelte'
  import WoolButton from '$components/WoolButton.svelte'
  import CountUp from '$components/CountUp.svelte'
  import Bolt from '$components/Bolt.svelte'
  import '../route-page.css'
  import './faq-page.css'

  /* ——— THE THEMES ———
     Four buckets over the eight ids in faq.js. This is a table of CONTENTS,
     not of content: it holds ids and a heading, never a question or an
     answer, so the day a wording changes in faq.js this file needs no edit.
     `blurb` says what the theme is for in the page's own voice — connective
     copy, asserting nothing the answers below it do not already assert. */
  const THEMES = [
    {
      id: 'scope',
      label: 'Time & scope',
      accent: 'var(--yarn-pink)',
      ids: ['timeline', 'small', 'existing'],
      blurb: 'How long it takes, how small is too small, and what happens to the work you already have.',
    },
    {
      id: 'ownership',
      label: 'Ownership & standard',
      accent: 'var(--yarn-violet)',
      ids: ['ownership', 'ai-quality'],
      blurb: 'What you walk away owning, and what “AI-native” does and does not mean about the quality of it.',
    },
    {
      id: 'money',
      label: 'Money',
      accent: 'var(--yarn-gold)',
      ids: ['payment'],
      blurb: 'How a project is priced and billed, and what is month to month rather than committed.',
    },
    {
      id: 'place',
      label: 'Language & place',
      accent: 'var(--yarn-blue)',
      ids: ['languages', 'where'],
      blurb: 'Which languages the work is written in, where the studios are, and whether that matters to you.',
    },
  ]

  // The real index in faq.js, so a number here always names the same answer
  // as the number on the home page's band.
  const numOf = (id) => String(FAQ.findIndex((f) => f.id === id) + 1).padStart(2, '0')
  const byId = Object.fromEntries(FAQ.map((f) => [f.id, f]))

  // The fallback theme: any id in faq.js that no theme above claims. Renders
  // only when it is non-empty, so today it renders nothing at all.
  const claimed = new Set(THEMES.flatMap((t) => t.ids))
  const orphans = FAQ.filter((f) => !claimed.has(f.id)).map((f) => f.id)

  const GROUPS = [
    ...THEMES,
    ...(orphans.length
      ? [{ id: 'other', label: 'Everything else', accent: 'var(--yarn-cream)', ids: orphans, blurb: '' }]
      : []),
  ]

  /* ——— THE FILTER ———
     Eight answers is few enough to read end to end and too many to scan for
     one word, so the field narrows rather than jumps: it hides what does not
     match instead of scrolling to what does. Matching runs over the question
     AND the answer, because the word a worried reader types ("Talabat",
     "retainer", "Arabic") is usually in the answer, not the heading. */
  let q = $state('')
  const needle = $derived(q.trim().toLowerCase())
  const matches = $derived(
    needle
      ? new Set(
          FAQ.filter((f) => (f.q + ' ' + f.a).toLowerCase().includes(needle)).map((f) => f.id)
        )
      : null
  )
  const shownIn = (t) => t.ids.filter((id) => !matches || matches.has(id))
  const hitCount = $derived(matches ? matches.size : FAQ.length)

  const DESC = `The ${FAQ.length} questions LOOM is asked before a project starts — timelines, who owns the AI-generated work, Arabic and English, pricing and payment — each answered in full on one page.`

  // FAQPage schema off the same array the page renders. Answers are the
  // file's strings, so the markup a crawler reads and the text a human reads
  // can never drift apart.
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
  <title>FAQ — Timelines, Ownership, Language and Payment | LOOM</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href="https://www.loomstudio-jo.com/faq" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.loomstudio-jo.com/faq" />
  <meta property="og:title" content="FAQ — Timelines, Ownership, Language and Payment | LOOM" />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="https://www.loomstudio-jo.com/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="FAQ — Timelines, Ownership, Language and Payment | LOOM" />
  <meta name="twitter:description" content={DESC} />
  {@html `<script type="application/ld+json">${schema}</script>`}
</svelte:head>

<div class="route-page">
  <!-- ═══ 1. THE ASK ══════════════════════════════════════════════════ -->
  <header class="fq-hero">
    <div class="fq-hero-in">
      <p class="kicker"><span>—</span> Answers</p>
      <SplitWords as="h1" class="h2 fq-h1" text="The questions asked before the first invoice" />
      <p class="lede fq-hero-lede" use:reveal={{ delay: 0.1 }}>
        Not a help centre. These are the {FAQ.length} things that stop a real buyer
        from sending the form — how long, who owns it, which language, what it
        costs to commit — each answered in full, in the first sentence.
      </p>

      <div class="fq-hero-figs" use:reveal={{ delay: 0.16 }}>
        <p class="fq-fig"><b><CountUp value={FAQ.length} /></b><span>answers</span></p>
        <p class="fq-fig"><b><CountUp value={GROUPS.length} /></b><span>themes</span></p>
        <p class="fq-fig fq-fig--open"><b>0</b><span>hidden behind a click</span></p>
      </div>

      <!-- The filter lives in the hero because on a page of open answers it
           is the only navigation there is. `type="search"` so a phone offers
           the right keyboard and a clear affordance. -->
      <form class="fq-find" role="search" onsubmit={(e) => e.preventDefault()} use:reveal={{ delay: 0.2 }}>
        <label class="fq-find-label" for="fq-q">Find an answer</label>
        <div class="fq-find-row">
          <span class="fq-find-icon" aria-hidden="true"></span>
          <input
            id="fq-q"
            class="fq-find-input"
            type="search"
            bind:value={q}
            placeholder="ownership, Arabic, retainer, dates…"
            autocomplete="off"
          />
          {#if needle}
            <button class="fq-find-clear" type="button" onclick={() => (q = '')}>Clear</button>
          {/if}
        </div>
        <p class="fq-find-count" aria-live="polite">
          {#if needle}
            {hitCount} of {FAQ.length} {hitCount === 1 ? 'answer mentions' : 'answers mention'} “{q.trim()}”
          {:else}
            Showing all {FAQ.length}
          {/if}
        </p>
      </form>

      <!-- A jump list, not a second copy of the questions: labels only. -->
      <nav class="fq-jump" aria-label="Themes">
        {#each GROUPS as g (g.id)}
          <a class="fq-jump-a" href="#{g.id}" style="--accent: {g.accent}">
            {g.label}
            <i>{g.ids.length}</i>
          </a>
        {/each}
      </nav>
    </div>
  </header>

  <!-- ═══ 2. THE ANSWERS ══════════════════════════════════════════════ -->
  <main class="fq-body">
    {#each GROUPS as g (g.id)}
      {@const shown = shownIn(g)}
      <section class="fq-group" id={g.id} style="--accent: {g.accent}" hidden={shown.length === 0}>
        <div class="fq-group-head">
          <h2 class="fq-group-h">{g.label}</h2>
          {#if g.blurb}<p class="fq-group-blurb">{g.blurb}</p>{/if}
          <span class="fq-group-rule" aria-hidden="true"></span>
        </div>

        <div class="fq-stack">
          {#each shown as id, i (id)}
            <article class="fq-item" use:reveal={{ delay: Math.min(i, 4) * 0.05, y: 18 }}>
              <p class="fq-n">{numOf(id)}</p>
              <div class="fq-text">
                <h3 class="fq-q">{byId[id].q}</h3>
                <p class="fq-a">{byId[id].a}</p>
              </div>
            </article>
          {/each}
        </div>
      </section>
    {/each}

    {#if needle && hitCount === 0}
      <p class="fq-empty">
        Nothing here mentions “{q.trim()}”. That is a question for a person —
        <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a> or
        <a href="mailto:{BRAND.email}">email</a> gets a straight answer.
      </p>
    {/if}
  </main>

  <!-- ═══ 3. STILL STUCK ══════════════════════════════════════════════ -->
  <section class="fq-stuck" aria-labelledby="fq-stuck-h">
    <div class="fq-stuck-in" use:reveal>
      <p class="kicker"><span>—</span> Still stuck</p>
      <h2 class="h2 fq-stuck-h" id="fq-stuck-h">The ninth question is the one worth asking</h2>
      <p class="fq-stuck-lede">
        These eight are the ones everybody asks. Yours is probably the one
        nobody else has — send it and it gets a straight answer rather than an
        upsell, whether or not it turns into a project.
      </p>
      <div class="fq-stuck-cta">
        <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
          <WoolButton
            label="Start a project"
            onclick={() => wizard.open({ note: 'From the FAQ — I have a question that is not answered there' })}
          />
        </div>
        <a class="fq-stuck-alt" href="/contact">Or see every way to reach the studio →</a>
      </div>
      <p class="fq-stuck-direct">
        <a href={BRAND.whatsapp} target="_blank" rel="noreferrer">{BRAND.phoneJO}</a>
        <i aria-hidden="true">·</i>
        <a href="mailto:{BRAND.email}">{BRAND.email}</a>
      </p>
    </div>
  </section>

  <Bolt />
</div>
