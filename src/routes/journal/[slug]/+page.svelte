<!--
  /journal/[slug] — a single journal post.

  BODY IS DATA, RENDERED BY TYPE. Each post's `body` array holds typed blocks
  ({ type: 'p' | 'h2' | 'h3' | 'ul' }) — see $data/posts/index.js's header
  comment for why this is plain JS rather than markdown. The {#each} below is
  the one place those types are interpreted; a post file itself contains no
  markup, only strings.

  SCHEMA: two blocks, both derived from the post object rather than typed a
  second time — a BlogPosting (headline, dates, author, publisher, image,
  mainEntityOfPage) and a BreadcrumbList (Home → Journal → this post). The
  publisher is LOOM's Organization, stated inline rather than imported,
  because no Organization schema exists anywhere else in this repo yet to
  share — see the note beside `PUBLISHER` below if that changes.
-->
<script>
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import { BRAND } from '$data/site.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import SplitWords from '$components/SplitWords.svelte'
  import WoolButton from '$components/WoolButton.svelte'
  import Pic from '$components/Pic.svelte'
  import Bolt from '$components/Bolt.svelte'
  import '../../route-page.css'
  import './post-page.css'

  let { data } = $props()
  const post = $derived(data.post)
  const prev = $derived(data.prev)
  const next = $derived(data.next)

  const SITE = 'https://www.loomstudio-jo.com'
  const url = $derived(`${SITE}/journal/${post.slug}`)

  const fmt = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  /* No Organization schema exists anywhere else in this repo to import — if
     one is ever added (e.g. to +layout.svelte, site-wide), this object should
     become a reference to it instead of restating the same four facts. Every
     value here is BRAND's own — name, url, logo path already shipped as the
     nav/footer wordmark. */
  const PUBLISHER = {
    '@type': 'Organization',
    name: BRAND.name,
    url: SITE,
    logo: { '@type': 'ImageObject', url: `${SITE}/img/logo/loom-woven-sm.webp` },
  }

  const schema = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: { '@type': 'Organization', name: post.author.name, url: SITE },
      publisher: PUBLISHER,
      image: `${SITE}${post.image.src}`,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      keywords: post.tags.join(', '),
    })
  )

  const breadcrumbSchema = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Journal', item: `${SITE}/journal` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    })
  )
</script>

<svelte:head>
  <title>{post.title} | LOOM Journal</title>
  <meta name="description" content={post.description} />
  <link rel="canonical" href={url} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={url} />
  <meta property="og:title" content={post.title} />
  <meta property="og:description" content={post.description} />
  <meta property="og:image" content="{SITE}{post.image.src}" />
  <meta property="article:published_time" content={post.publishedAt} />
  <meta property="article:modified_time" content={post.updatedAt} />
  {#each post.tags as t (t)}<meta property="article:tag" content={t} />{/each}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={post.title} />
  <meta name="twitter:description" content={post.description} />
  {@html `<script type="application/ld+json">${schema}</script>`}
  {@html `<script type="application/ld+json">${breadcrumbSchema}</script>`}
</svelte:head>

<div class="route-page">
  <!-- ═══ 1. HEADER ═══════════════════════════════════════════════════ -->
  <header class="pg-hero">
    <div class="pg-hero-in">
      <nav class="pg-crumb" aria-label="Breadcrumb">
        <a href="/journal">Journal</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{post.title}</span>
      </nav>
      <p class="kicker"><span>—</span> {post.tags[0]}</p>
      <SplitWords as="h1" class="h2 pg-h1" text={post.title} />
      <p class="lede pg-hero-lede" use:reveal={{ delay: 0.1 }}>{post.description}</p>
      <p class="pg-meta">
        <span>{post.author.name}</span>
        <i aria-hidden="true">·</i>
        <time datetime={post.publishedAt}>{fmt(post.publishedAt)}</time>
        {#if post.updatedAt !== post.publishedAt}
          <i aria-hidden="true">·</i>
          <span>Updated {fmt(post.updatedAt)}</span>
        {/if}
        <i aria-hidden="true">·</i>
        <span>{post.readMinutes} min read</span>
      </p>
    </div>
  </header>

  <div class="pg-media">
    <Pic
      src={post.image.src}
      alt={post.image.alt}
      width={post.image.width}
      height={post.image.height}
      sizes="(max-width: 900px) 100vw, 900px"
      loading="eager"
      decoding="async"
    />
  </div>

  <!-- ═══ 2. BODY ═════════════════════════════════════════════════════ -->
  <main class="pg-body">
    <div class="pg-prose">
      {#each post.body as block, i (i)}
        {#if block.type === 'h2'}
          <h2>{block.text}</h2>
        {:else if block.type === 'h3'}
          <h3>{block.text}</h3>
        {:else if block.type === 'ul'}
          <ul>
            {#each block.items as item (item)}<li>{item}</li>{/each}
          </ul>
        {:else if block.spans}
          <!-- A paragraph that contains links. `spans` is the same string a
               plain `text` block would hold, split into pieces: a raw string
               is text, an object is an <a>. Still no markup inside a post
               file — a link is data ({ text, href }), the way every other
               structured field on this site is. Only internal hrefs are used
               today; an external one would need rel/target added here. -->
          <p lang={block.lang} dir={block.dir}>{#each block.spans as s, j (j)}{#if typeof s === 'string'}{s}{:else}<a href={s.href}>{s.text}</a>{/if}{/each}</p>
        {:else}
          <!-- `lang`/`dir` are optional and undefined on almost every block —
               Svelte omits an attribute whose value is undefined, so an
               ordinary English paragraph still renders as a bare <p>. They
               exist for Arabic passages inside an otherwise-English post,
               which need :lang(ar) to reach an Arabic-capable font stack
               (see post-page.css). A full Arabic post still needs the
               per-post dir/lang work tracked as task 19d — this covers a
               passage, not a page. -->
          <p lang={block.lang} dir={block.dir}>{block.text}</p>
        {/if}
      {/each}
    </div>

    <ul class="pg-tags">
      {#each post.tags as t (t)}<li>{t}</li>{/each}
    </ul>
  </main>

  <!-- ═══ 3. CTA ══════════════════════════════════════════════════════ -->
  <section class="pg-cta" aria-labelledby="pg-cta-h">
    <div class="pg-cta-in" use:reveal>
      <h2 class="h2 pg-cta-h" id="pg-cta-h">Want this handled for you</h2>
      <p class="pg-cta-lede">
        No pressure and no upsell — describe what you actually need and get a
        straight answer back.
      </p>
      <div class="pg-cta-row">
        <div class="magnetic" use:magnetic={{ strength: 0.35 }}>
          <WoolButton
            label="Start a project"
            onclick={() => wizard.open({ note: `From the Journal — ${post.title}` })}
          />
        </div>
        <a class="pg-cta-alt" href="/contact">Or see every way to reach the studio →</a>
      </div>
    </div>
  </section>

  <!-- ═══ 4. MORE ═════════════════════════════════════════════════════ -->
  <nav class="pg-more" aria-label="More from the journal">
    <a class="pg-more-a" href="/journal/{prev.slug}">
      <span>Previous</span>
      <b>{prev.title}</b>
    </a>
    <a class="pg-more-a pg-more-a--next" href="/journal/{next.slug}">
      <span>Next</span>
      <b>{next.title}</b>
    </a>
  </nav>

  <Bolt />
</div>
