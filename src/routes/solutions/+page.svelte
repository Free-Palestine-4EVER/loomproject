<!--
  /solutions — the qualifier page.

  WHY THIS IS NOT `<Counter><Solutions merged /></Counter>` ANY MORE. The
  route used to mount the home page's qualifier band and close with the
  shuttle and the form. The client's objection was that a menu item pointing
  at a duplicate of a section twenty screens up the same site is not a page.

  The specific casualty was the industry index. Solutions.svelte renders the
  thirty niches as a PINNED SCROLL TOUR: the section sticks, and scrolling
  advances a single card through all thirty, one at a time. On the home page
  that is exactly right — the reader is travelling down a narrative and the
  tour is a paragraph that happens to move. On a page whose whole job is to
  let somebody FIND THEIR OWN TRADE, a mechanism that shows one of thirty and
  makes you scroll past twenty-nine to reach yours is the wrong object. You
  cannot scan it, you cannot search it, and on a phone you cannot skip it.

  So here the thirty are an INDEX: grouped by the seven categories, filtered
  live by a search field, and every one openable in place to read its hook,
  its agent and its three deliverables without leaving the row.

  THE ORDER IS THE QUALIFYING QUESTION ORDER:

    1. WHICH ARE YOU         hero, the two ways in, the real counts
    2. BY NEED               the eight needs in full — hook, body, what
                             arrives, timeline, proof, and the cross-links
    3. BY INDUSTRY           all thirty, grouped, searchable, expandable
    4. WHAT EVERYONE GETS    the four core deliverables, as page content
    5. NEITHER               the close, for the visitor in no box above

  NOTHING IS INVENTED. The eight panels are $data/needs.js verbatim — hook,
  body, every deliverable line, `timeline`, `proof` and `pairs`. The thirty
  rows are `NICHES` in $data/site.js verbatim — name, group, hook, agent,
  moon and the three deliverables. The four universal ones are CORE_SERVICES,
  which exists precisely so they are stated ONCE and never repeated inside a
  trade. Every count on the page is `.length` of the array it counts; not one
  figure is typed. No price appears: needs.js's rule is that this direction of
  the conversation asks the client for their budget rather than quoting one.

  NOT MOUNTED, DELIBERATELY: `<Solutions />` itself. Its tour and this index
  are two renderings of the same thirty records, and putting both on one page
  would be the duplication the rebuild exists to remove.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { NEEDS } from '$data/needs.js'
  import { NICHES, NICHE_GROUPS, CORE_SERVICES } from '$data/site.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from '$components/SplitWords.svelte'
  import WoolButton from '$components/WoolButton.svelte'
  import CountUp from '$components/CountUp.svelte'
  import Bolt from '$components/Bolt.svelte'
  import Contact from '$components/Contact.svelte'
  import '../route-page.css'
  import './solutions-page.css'

  /* ——— 2. THE EIGHT NEEDS ———
     Object.entries, not a hand-written list: the order is needs.js's order,
     and a ninth need added to that file appears here with no edit. The yarn
     each need already declares becomes the card's accent, so the colour a
     need wears here is the colour it wears in the Counter. */
  const NEED_LIST = Object.entries(NEEDS).map(([name, n]) => ({ name, ...n }))

  const YARN = {
    magenta: 'var(--yarn-pink)',
    violet: 'var(--yarn-violet)',
    blue: 'var(--yarn-blue)',
    crimson: 'var(--magenta)',
    grey: 'var(--ink-faint)',
    gold: 'var(--yarn-gold)',
    // `felt` in needs.js names a TEXTURE, not a colour, and --yarn-cream
    // (#efe7da) is invisible as a 7px dot on a white card — the "Not sure yet"
    // panel lost its whole bullet list to it. It resolves to ink here for the
    // same reason `grey` does: a neutral need gets a neutral accent that can
    // still be seen.
    felt: 'var(--ink-faint)',
  }
  const accentOf = (yarn) => YARN[yarn] ?? 'var(--magenta)'

  // Which card a `pairs` entry points at. The cross-link scrolls to the
  // paired need's own card on this page rather than opening a form — on the
  // home page the panel swapped its contents, and the page equivalent of
  // swapping contents is moving to the other card.
  const anchorOf = (name) => `need-${NEEDS[name]?.key ?? ''}`

  /* ——— 3. THE THIRTY ———
     NICHE_GROUPS carries an 'all' pseudo-group for the home page's filter
     bar; an index that renders sections cannot render a section containing
     everything as well as the seven real ones, so it is dropped here. The
     seven that remain are checked against the data: every niche's `group`
     must land in one of them, and any that does not is collected into a
     final "Elsewhere" section rather than vanishing. */
  const REAL_GROUPS = NICHE_GROUPS.filter((g) => g.id !== 'all')
  const GROUP_ACCENT = {
    food: 'var(--yarn-pink)',
    health: 'var(--yarn-blue)',
    beauty: 'var(--magenta)',
    retail: 'var(--yarn-violet)',
    property: 'var(--yarn-gold)',
    services: 'var(--ink-faint)',
    creative: 'var(--violet)',
  }
  const known = new Set(REAL_GROUPS.map((g) => g.id))
  const strays = NICHES.filter((n) => !known.has(n.group))
  const SECTIONS = [
    ...REAL_GROUPS.map((g) => ({
      ...g,
      accent: GROUP_ACCENT[g.id] ?? 'var(--magenta)',
      items: NICHES.filter((n) => n.group === g.id),
    })),
    ...(strays.length ? [{ id: 'other', label: 'Elsewhere', accent: 'var(--yarn-cream)', items: strays }] : []),
  ].filter((s) => s.items.length)

  /* Each `deliverables` string is written "Title — Body" (site.js's own
     format, reviewed industry by industry). Splitting on the em dash lets the
     index set the title and the sentence differently; a string without one
     falls through as a single sentence rather than losing its second half. */
  const splitDeliverable = (s) => {
    const i = s.indexOf('—')
    return i === -1
      ? { title: '', body: s }
      : { title: s.slice(0, i).trim(), body: s.slice(i + 1).trim() }
  }

  /* The filter. Matches the trade's NAME, its hook, its agent and all three
     deliverables — a plumber searching "leak" or a clinic searching "booking"
     is typing a word that lives in the body, not the label. Diacritic-free
     lower-casing so "Cafés" is found by "cafes". */
  const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  let q = $state('')
  const needle = $derived(fold(q.trim()))
  const hay = new Map(
    NICHES.map((n) => [n.key, fold([n.name, n.hook, n.agent, n.moon, ...n.deliverables].join(' '))])
  )
  const hits = $derived(
    needle ? new Set(NICHES.filter((n) => hay.get(n.key).includes(needle)).map((n) => n.key)) : null
  )
  const shownIn = (s) => s.items.filter((n) => !hits || hits.has(n.key))
  const hitCount = $derived(hits ? hits.size : NICHES.length)

  const open = (note, niche) => wizard.open({ note, niche })

  const DESC = `Two ways to find what LOOM would build for you: ${NEED_LIST.length} needs — brand, site, app, content, AI, 3D, campaign — each with what arrives and how long it takes, and an index of ${NICHES.length} industries with three specific ideas for each.`

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'LOOM Solutions — by need and by industry',
    description: DESC,
    url: 'https://www.loomstudio-jo.com/solutions',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: NEED_LIST.length,
      itemListElement: NEED_LIST.map((n, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: { '@type': 'Service', name: n.name, description: n.hook, category: n.group },
      })),
    },
  })
</script>

<svelte:head>
  <title>Solutions — {NEED_LIST.length} Needs, {NICHES.length} Industries | LOOM</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href="https://www.loomstudio-jo.com/solutions" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.loomstudio-jo.com/solutions" />
  <meta property="og:title" content="Solutions — {NEED_LIST.length} Needs, {NICHES.length} Industries | LOOM" />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Solutions — {NEED_LIST.length} Needs, {NICHES.length} Industries | LOOM" />
  <meta name="twitter:description" content={DESC} />
  {@html `<script type="application/ld+json">${schema}</script>`}
</svelte:head>

<div class="route-page">
  <!-- ═══ 1. WHICH ARE YOU ════════════════════════════════════════════ -->
  <header class="sl-hero">
    <div class="sl-hero-in">
      <p class="kicker"><span>—</span> Solutions</p>
      <SplitWords as="h1" class="h2 sl-h1" text="Start from what you need, or from what you sell" />
      <p class="lede sl-hero-lede" use:reveal={{ delay: 0.1 }}>
        Two doors into the same studio. One is the thing you already know you
        want built. The other is your trade — and for every one of the
        {NICHES.length} below there are three specific ideas waiting, not a
        brochure with the nouns swapped.
      </p>

      <div class="sl-hero-figs" use:reveal={{ delay: 0.16 }}>
        <p class="sl-fig"><b><CountUp value={NEED_LIST.length} /></b><span>needs, in full</span></p>
        <p class="sl-fig"><b><CountUp value={NICHES.length} /></b><span>industries indexed</span></p>
        <p class="sl-fig sl-fig--core"><b><CountUp value={CORE_SERVICES.length} /></b><span>things every client gets</span></p>
      </div>

      <div class="sl-doors" use:reveal={{ delay: 0.2 }}>
        <a class="sl-door" href="#by-need">
          <span class="sl-door-n">01</span>
          <span class="sl-door-h">I know what I need</span>
          <span class="sl-door-b">A brand, a site, an app, content, an agent, 3D, a campaign — or none of the above yet.</span>
          <span class="sl-door-go" aria-hidden="true">↓</span>
        </a>
        <a class="sl-door" href="#by-industry">
          <span class="sl-door-n">02</span>
          <span class="sl-door-h">I know my industry</span>
          <span class="sl-door-b">Find your trade in the index and read the three things LOOM would build for it first.</span>
          <span class="sl-door-go" aria-hidden="true">↓</span>
        </a>
      </div>
    </div>
  </header>

  <!-- ═══ 2. BY NEED ══════════════════════════════════════════════════ -->
  <section class="sl-needs" id="by-need" aria-labelledby="sl-needs-h">
    <div class="sl-sec-head">
      <p class="kicker"><span>—</span> By need</p>
      <h2 class="h2 sl-h2" id="sl-needs-h">{NEED_LIST.length} things brands ask for, and what actually arrives</h2>
      <p class="sl-sec-lede">
        Every panel below lists things that ARRIVE, not capabilities. A
        deliverable you cannot point at after the invoice is not a deliverable,
        and the timelines are typical ranges rather than promises made before
        anyone has seen your brief.
      </p>
    </div>

    <div class="sl-need-grid">
      {#each NEED_LIST as n, i (n.key)}
        <article
          class="sl-need"
          id={`need-${n.key}`}
          style="--accent: {accentOf(n.yarn)}"
          use:reveal={{ delay: Math.min(i, 4) * 0.05, y: 20 }}
        >
          <header class="sl-need-top">
            <p class="sl-need-group">{n.group}</p>
            <h3 class="sl-need-h">{n.name}</h3>
            <p class="sl-need-hook">{n.hook}</p>
          </header>

          <p class="sl-need-body">{n.body}</p>

          <p class="sl-need-label">What arrives</p>
          <ul class="sl-need-list">
            {#each n.deliverables as d (d)}
              <li>{d}</li>
            {/each}
          </ul>

          <p class="sl-need-proof">{n.proof}</p>

          <footer class="sl-need-foot">
            <p class="sl-need-time">{n.timeline}</p>
            <button
              class="sl-need-cta"
              type="button"
              onclick={() => open(`${n.name} — ${n.timeline}`)}
            >Start this <span aria-hidden="true">→</span></button>
          </footer>

          <!-- The cross-sell. `pairs` names other NEED keys and needs.js calls
               it the reason the panel is a panel; here it is the reason the
               card is not a dead end. -->
          <nav class="sl-need-pairs" aria-label="Often paired with">
            <span>Often with</span>
            {#each n.pairs as p (p)}
              <a href="#{anchorOf(p)}">{p}</a>
            {/each}
          </nav>
        </article>
      {/each}
    </div>
  </section>

  <!-- ═══ 3. BY INDUSTRY ══════════════════════════════════════════════ -->
  <section class="sl-index" id="by-industry" aria-labelledby="sl-index-h">
    <div class="sl-sec-head">
      <p class="kicker"><span>—</span> By industry</p>
      <h2 class="h2 sl-h2" id="sl-index-h">All {NICHES.length}, in {SECTIONS.length} categories, open to read</h2>
      <p class="sl-sec-lede">
        Not a list of logos — a list of trades LOOM has already thought about.
        Open any row for the one-line ambition, the agent that would run on
        WhatsApp for it, and the three things built first. Type below to narrow
        the whole index at once.
      </p>
    </div>

    <form class="sl-find" role="search" onsubmit={(e) => e.preventDefault()}>
      <label class="sl-find-label" for="sl-q">Find your industry</label>
      <div class="sl-find-row">
        <span class="sl-find-icon" aria-hidden="true"></span>
        <input
          id="sl-q"
          class="sl-find-input"
          type="search"
          bind:value={q}
          placeholder="clinic, gym, cafe, contractor, booking…"
          autocomplete="off"
          list="sl-names"
        />
        {#if q.trim()}
          <button class="sl-find-clear" type="button" onclick={() => (q = '')}>Clear</button>
        {/if}
      </div>
      <datalist id="sl-names">
        {#each NICHES as n (n.key)}<option value={n.name}></option>{/each}
      </datalist>
      <p class="sl-find-count" aria-live="polite">
        {#if q.trim()}
          {hitCount} of {NICHES.length} {hitCount === 1 ? 'industry matches' : 'industries match'} “{q.trim()}”
        {:else}
          Showing all {NICHES.length}
        {/if}
      </p>
    </form>

    <div class="sl-cats">
      {#each SECTIONS as s (s.id)}
        {@const shown = shownIn(s)}
        <section class="sl-cat" style="--accent: {s.accent}" hidden={shown.length === 0}>
          <header class="sl-cat-head">
            <h3 class="sl-cat-h">{s.label}</h3>
            <span class="sl-cat-n">{shown.length}{#if hits && shown.length !== s.items.length}<i> of {s.items.length}</i>{/if}</span>
            <span class="sl-cat-rule" aria-hidden="true"></span>
          </header>

          <ul class="sl-rows">
            {#each shown as n (n.key)}
              <li class="sl-row">
                <!-- <details>, not a JS accordion: it opens with scripting off,
                     it is findable by the browser's own in-page search when
                     open, and it needs no state to stay correct. -->
                <details class="sl-det" id={`niche-${n.key}`}>
                  <summary class="sl-sum">
                    <span class="sl-sum-name">{n.name}</span>
                    <span class="sl-sum-hook">{n.hook}</span>
                    <span class="sl-sum-mark" aria-hidden="true"></span>
                  </summary>

                  <div class="sl-det-body">
                    <p class="sl-moon"><i>The ambition</i>{n.moon}</p>
                    <p class="sl-agent"><i>The agent</i>{n.agent}</p>

                    <p class="sl-det-label">Built first</p>
                    <ul class="sl-det-list">
                      {#each n.deliverables as d (d)}
                        {@const p = splitDeliverable(d)}
                        <li>
                          {#if p.title}<b>{p.title}</b>{/if}
                          <span>{p.body}</span>
                        </li>
                      {/each}
                    </ul>

                    <button
                      class="sl-det-cta"
                      type="button"
                      onclick={() => open(`Industry page — ${n.name}`, n.name)}
                    >Build this for {n.name.toLowerCase()} <span aria-hidden="true">→</span></button>
                  </div>
                </details>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>

    {#if hits && hitCount === 0}
      <p class="sl-empty">
        Nothing in the index matches “{q.trim()}” — which is not the same as
        nothing being possible. The {NICHES.length} above are the trades LOOM
        has already worked through, not a list of who it will take.
        <button type="button" onclick={() => open(`Industry not in the index — searched “${q.trim()}”`)}>Tell us yours →</button>
      </p>
    {/if}
  </section>

  <!-- ═══ 4. WHAT EVERYONE GETS ═══════════════════════════════════════ -->
  <section class="sl-core" aria-labelledby="sl-core-h">
    <div class="sl-sec-head">
      <p class="kicker"><span>—</span> Whichever door</p>
      <h2 class="h2 sl-h2" id="sl-core-h">{CORE_SERVICES.length} things underneath every one of them</h2>
      <p class="sl-sec-lede">
        These are stated once, here, and never repeated inside a trade — an
        earlier version of the index listed “Google Maps domination” under
        seventeen of the thirty industries, which made thirty different
        businesses read as one product with the nouns swapped. Anything
        universal belongs in this row.
      </p>
    </div>

    <div class="sl-core-grid">
      {#each CORE_SERVICES as c, i (c.title)}
        <article class="sl-core-card" use:reveal={{ delay: i * 0.05, y: 20 }}>
          <p class="sl-core-n">{String(i + 1).padStart(2, '0')}</p>
          <h3 class="sl-core-h">{c.title}</h3>
          <p class="sl-core-b">{c.blurb}</p>
          <ul class="sl-core-list">
            {#each c.points as p (p)}
              <li>{p}</li>
            {/each}
          </ul>
        </article>
      {/each}
    </div>
  </section>

  <!-- ═══ 5. NEITHER ══════════════════════════════════════════════════ -->
  <section class="sl-close" aria-labelledby="sl-close-h">
    <div class="sl-close-in" use:reveal>
      <p class="kicker"><span>—</span> In neither list</p>
      <h2 class="h2 sl-close-h" id="sl-close-h">{NEEDS['Not sure yet'].hook}</h2>
      <p class="sl-close-lede">{NEEDS['Not sure yet'].body}</p>
      <ul class="sl-close-list">
        {#each NEEDS['Not sure yet'].deliverables as d (d)}
          <li>{d}</li>
        {/each}
      </ul>
      <div class="sl-close-cta">
        <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
          <WoolButton
            label="Start a project"
            onclick={() => open('Not sure yet — bring the problem, not the brief')}
          />
        </div>
        <p class="sl-close-time">{NEEDS['Not sure yet'].timeline}</p>
      </div>
      <p class="sl-close-links">
        <a href="/pricing">What it costs</a>
        <i aria-hidden="true">·</i>
        <a href="/machine">Content, monthly</a>
        <i aria-hidden="true">·</i>
        <a href="/faq">The awkward questions</a>
      </p>
    </div>
  </section>

  <Bolt />

  <Contact />
</div>
