<!--
  /journal — the index.

  A short-run archive on purpose: three posts today, newest first, no
  pagination and no category filter because a filter over three items is a
  control with nothing to control. `POSTS` is the ordered array from
  $data/posts — this page adds no editorial reordering of its own, unlike
  /faq's themed grouping, because there is no theme structure here worth
  imposing yet.

  CARD CONTENT IS QUOTED, NOT SUMMARISED. Title, description, tags and date
  come straight off each post object; nothing here writes a second, shorter
  version of a post's own description.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { POSTS } from '$data/posts/index.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from '$components/SplitWords.svelte'
  import WoolButton from '$components/WoolButton.svelte'
  import Pic from '$components/Pic.svelte'
  import Bolt from '$components/Bolt.svelte'
  import '../route-page.css'
  import './journal-page.css'

  const DESC =
    'Practical guides from LOOM on websites, AI-assisted search, Google Business Profile, 3D product experiences and digital projects in Jordan.'

  const fmt = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Blog schema off the same array the cards render, so the markup a crawler
  // reads and the cards a reader sees can never drift apart.
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'LOOM Journal',
    url: 'https://www.loomstudio-jo.com/journal',
    blogPost: POSTS.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      datePublished: p.publishedAt,
      dateModified: p.updatedAt,
      url: `https://www.loomstudio-jo.com/journal/${p.slug}`,
    })),
  })
</script>

<svelte:head>
  <title>Journal — Practical Writing on Web, AI Search and Growth in Jordan | LOOM</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href="https://www.loomstudio-jo.com/journal" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.loomstudio-jo.com/journal" />
  <meta property="og:title" content="Journal — Practical Writing on Web, AI Search and Growth in Jordan | LOOM" />
  <meta property="og:description" content={DESC} />
  <meta property="og:image" content="https://www.loomstudio-jo.com/img/og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Journal — Practical Writing on Web, AI Search and Growth in Jordan | LOOM" />
  <meta name="twitter:description" content={DESC} />
  <meta name="twitter:image" content="https://www.loomstudio-jo.com/img/og.jpg" />
  {@html `<script type="application/ld+json">${schema}</script>`}
</svelte:head>

<div class="route-page">
  <!-- ═══ 1. THE ASK ══════════════════════════════════════════════════ -->
  <header class="jr-hero">
    <div class="jr-hero-in">
      <p class="kicker"><span>—</span> Journal</p>
      <SplitWords as="h1" class="h2 jr-h1" text="Notes from the studio, written to be useful" />
      <p class="lede jr-hero-lede" use:reveal={{ delay: 0.1 }}>
        No filler, no invented numbers, no case studies that didn't happen.
        Real pricing, a real answer-engine playbook, and a real Google
        Business Profile walkthrough — the kind of writing LOOM wishes existed
        before it started building things for clients in Amman.
      </p>
    </div>
  </header>

  <section class="jr-radar" aria-labelledby="jr-radar-h">
    <div class="jr-radar-in" use:reveal={{ y: 22 }}>
      <div class="jr-radar-head">
        <p class="kicker"><span>—</span> Start here</p>
        <h2 class="jr-radar-title" id="jr-radar-h">Three practical questions before the next brief</h2>
      </div>
      <div class="jr-radar-grid">
        <a class="jr-radar-card jr-radar-card--lead" href="/journal/website-design-agency-amman">
          <span class="jr-radar-no">01</span>
          <span class="jr-radar-eyebrow">Hiring a web partner</span>
          <strong>What should a website proposal actually include?</strong>
          <span class="jr-radar-copy">Scope, Arabic content, ownership, testing and launch support — before you compare two prices.</span>
          <span class="jr-radar-go">Read the checklist <i aria-hidden="true">↗</i></span>
        </a>
        <a class="jr-radar-card" href="/journal/3d-product-visualisation-jordan">
          <span class="jr-radar-no">02</span>
          <span class="jr-radar-eyebrow">3D &amp; AR products</span>
          <strong>What does a product experience need to solve?</strong>
          <span class="jr-radar-go">See the buyer’s checklist <i aria-hidden="true">↗</i></span>
        </a>
        <a class="jr-radar-card jr-radar-card--dark" href="/ai-search">
          <span class="jr-radar-no">03</span>
          <span class="jr-radar-eyebrow">AI-assisted discovery</span>
          <strong>Can a buyer find and verify your business?</strong>
          <span class="jr-radar-go">Explore AI search <i aria-hidden="true">↗</i></span>
        </a>
      </div>
    </div>
  </section>

  <!-- ═══ 2. THE POSTS ════════════════════════════════════════════════ -->
  <main class="jr-body">
    <div class="jr-grid">
      {#each POSTS as p, i (p.slug)}
        <article class="jr-card" use:reveal={{ delay: Math.min(i, 4) * 0.06, y: 20 }}>
          <a class="jr-card-link" href="/journal/{p.slug}" aria-label={p.title}>
            <div class="jr-card-media">
              <Pic
                src={p.image.src}
                alt={p.image.alt}
                width={p.image.width}
                height={p.image.height}
                sizes="(max-width: 720px) 92vw, (max-width: 1180px) 44vw, 360px"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </div>
            <div class="jr-card-body">
              <p class="jr-card-meta">
                <time datetime={p.publishedAt}>{fmt(p.publishedAt)}</time>
                <i aria-hidden="true">·</i>
                <span>{p.readMinutes} min read</span>
              </p>
              <h2 class="jr-card-title">{p.title}</h2>
              <p class="jr-card-desc">{p.description}</p>
              <ul class="jr-card-tags">
                {#each p.tags as t (t)}<li>{t}</li>{/each}
              </ul>
            </div>
          </a>
        </article>
      {/each}
    </div>
  </main>

  <!-- ═══ 3. CTA ══════════════════════════════════════════════════════ -->
  <section class="jr-stuck" aria-labelledby="jr-stuck-h">
    <div class="jr-stuck-in" use:reveal>
      <p class="kicker"><span>—</span> Have a project</p>
      <h2 class="h2 jr-stuck-h" id="jr-stuck-h">Want something like this built for you</h2>
      <p class="jr-stuck-lede">
        A website, an AI-search setup, a Google Business Profile fixed
        properly — describe what you have and what you need, and get a real
        answer back.
      </p>
      <div class="jr-stuck-cta">
        <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
          <WoolButton
            label="Start a project"
            onclick={() => wizard.open({ note: 'From the Journal' })}
          />
        </div>
        <a class="jr-stuck-alt" href="/contact">Or see every way to reach the studio →</a>
      </div>
    </div>
  </section>

  <Bolt />
</div>
