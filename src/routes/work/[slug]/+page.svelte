<!--
  /work/[slug] — one case, one page.

  The shape is the one the client asked for (doc.ba/pomoziba): a full-bleed
  photograph under a brand duotone, the client's name set large in white over
  it, a row of figures, then the case itself in alternating image/text bands.

  WHAT IS DIFFERENT, AND WHY. The reference page's figure row reads "12 MONTHS
  OF WORK / 10K+ LINES OF CODE / 1K+ COFFEE CUPS DRANK / 2020 YEAR LAUNCHED".
  Three of those four are unverifiable and one is a joke. site.js opens with
  "NOTHING IN THIS FILE IS A CLAIM — if a fact isn't in $data/site.js, it
  doesn't exist on this page", and these are real clients. So every figure
  below is DERIVED from the case record rather than written: the year it ran,
  the market it ran in, how many disciplines it took, and how many finished
  assets the archive actually holds for it. If a case gains a board tomorrow
  the count moves on its own.

  The same rule governs the prose. The reference carries six paragraphs of
  narrative per project; site.js carries one `copy` per case, so this page
  shows that one and then gets out of the way and lets the work itself run.
  Inventing engagement detail about a named client is not a layout decision.
-->
<script>
  import { CASES } from '$data/site.js'
  import { webpSrcset } from '$lib/components/Pic.svelte'
  import { reveal } from '$lib/motion.svelte.js'
  import WoolButton from '$lib/components/WoolButton.svelte'
  import './case-page.css'

  let { data } = $props()
  const c = $derived(data.kase)

  /* Every finished frame the archive holds for this case, cover first. `stars`
     are the single key visuals and `boards` the multi-image sets; both are
     already absolute paths built by site.js, so nothing is guessed here. */
  const shots = $derived([c.cover, ...(c.feature || []), ...(c.boards || []).flat()].filter(Boolean))

  /* The figure row. Four derived facts, no adjectives. */
  const figures = $derived([
    { v: c.year, l: c.year.includes('–') ? 'Years active' : 'Year delivered' },
    { v: c.country, l: c.country.includes('×') ? 'Markets' : 'Market' },
    { v: String(c.scope.length), l: c.scope.length === 1 ? 'Discipline' : 'Disciplines' },
    { v: String(shots.length), l: shots.length === 1 ? 'Frame in the archive' : 'Frames in the archive' },
  ])

  /* The bands alternate side and the first one leads with the picture, so the
     photograph is what a reader meets first on the way down — same rhythm as
     the reference. One band per remaining frame, capped: past six the page
     stops being a case and starts being a contact sheet, and the grid at the
     foot already serves that purpose. */
  const bands = $derived(shots.slice(1, 7))
  const rest = $derived(shots.slice(7))

  const TITLE = $derived(`${c.client} — ${c.title} | LOOM`)
  const CANONICAL = $derived(`https://www.loomstudio-jo.com/work/${c.slug}`)
  // The cover is a root-relative site path (site.js's `img()` helper returns
  // `/img/cases/...`, not a full URL) — og:image needs a protocol+host to
  // resolve on Facebook/LinkedIn/WhatsApp/Slack, so it is prefixed with the
  // origin here. Found and fixed 17 Aug 2026: the comment this replaces
  // called the path "already absolute", which was wrong and meant this tag
  // never resolved for any unfurler. This is still the one og:image on the
  // site that is not the shared /img/og.jpg — a case page's own cover
  // photograph is a truer preview of that case than the studio's generic
  // share card would be.
  const OG_IMAGE = $derived(`https://www.loomstudio-jo.com${c.cover}`)
</script>

<svelte:head>
  <title>{TITLE}</title>
  <meta name="description" content={c.copy} />
  <link rel="canonical" href={CANONICAL} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={CANONICAL} />
  <meta property="og:title" content={TITLE} />
  <meta property="og:description" content={c.copy} />
  <meta property="og:image" content={OG_IMAGE} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={TITLE} />
  <meta name="twitter:description" content={c.copy} />
  <meta name="twitter:image" content={OG_IMAGE} />
</svelte:head>

<!-- ═══ 1. THE HERO ══════════════════════════════════════════════════════
     The cover photograph, a brand duotone over it, and the client's name in
     white. The reference sets a real logo here; these clients' marks are not
     ours to redraw, so the name is TYPESET rather than faked — which is what
     half the reference's own tiles turn out to be on close inspection. -->
<section class="cs-hero" aria-labelledby="cs-title">
  <img
    class="cs-hero-shot" src={c.cover} alt="" aria-hidden="true"
    srcset={webpSrcset(c.cover)} sizes="100vw" fetchpriority="high" decoding="async"
  />
  <span class="cs-hero-wash" aria-hidden="true"></span>

  <div class="cs-hero-in">
    <p class="cs-hero-eyebrow">{c.scope.join(' · ')}</p>
    <h1 class="cs-mark" id="cs-title">{c.client}</h1>
    <span class="cs-rule" aria-hidden="true"></span>
    <p class="cs-hero-sub">{c.title}</p>

    <dl class="cs-figs">
      {#each figures as f (f.l)}
        <div class="cs-fig">
          <dt class="cs-fig-v">{f.v}</dt>
          <dd class="cs-fig-l">{f.l}</dd>
        </div>
      {/each}
    </dl>
  </div>
</section>

<!-- ═══ 2. THE CASE ═════════════════════════════════════════════════════ -->
<section class="cs-lede" aria-label="What the work was">
  <div use:reveal={{ y: 22 }}>
    <p class="kicker"><span>—</span> The case</p>
    <p class="cs-lede-copy">{c.copy}</p>
    <ul class="cs-scope">
      {#each c.scope as s (s)}<li>{s}</li>{/each}
    </ul>
  </div>
</section>

<!-- ═══ 3. THE WORK ═════════════════════════════════════════════════════
     Alternating bands. The picture is the argument, so it gets the larger
     half and the caption stays a caption. -->
{#if bands.length}
  <section class="cs-bands" aria-label="The work">
    {#each bands as src, i (src)}
      <article class="cs-band" class:is-flipped={i % 2 === 1} use:reveal={{ y: 26 }}>
        <div class="cs-band-shot">
          <img
            {src} alt="{c.client} — {c.title}, frame {i + 1}"
            srcset={webpSrcset(src)} sizes="(max-width: 900px) 100vw, 58vw"
            loading={i < 2 ? 'eager' : 'lazy'} decoding="async"
          />
        </div>
        <!-- THE CAPTION IS OPTIONAL AND IT IS NOT WRITTEN HERE.
             The reference puts a heading and a paragraph beside each frame
             ("TECHNOLOGY ASSESSMENT", "APPLICATION ANALYSIS & DESIGN"…). That
             text is an account of what was actually done for a named client,
             so it has to come from the studio, not from this template.

             Add a `sections: [{ h, p }, …]` to a case in $data/site.js and the
             panels fill in order — one per frame, extras ignored, missing ones
             falling back to the number and the discipline. Nothing here
             invents a sentence about a client's engagement. -->
        <div class="cs-band-side" class:has-copy={c.sections?.[i]}>
          <span class="cs-band-n">{String(i + 1).padStart(2, '0')}</span>
          {#if c.sections?.[i]}
            <h2 class="cs-band-h">{c.sections[i].h}</h2>
            <p class="cs-band-p">{c.sections[i].p}</p>
          {:else}
            <p class="cs-band-scope">{c.scope[i % c.scope.length]}</p>
          {/if}
        </div>
      </article>
    {/each}
  </section>
{/if}

{#if rest.length}
  <section class="cs-more" aria-label="More frames">
    <div class="cs-more-grid" use:reveal={{ y: 22 }}>
      {#each rest as src, i (src)}
        <img
          {src} alt="{c.client} — {c.title}, frame {i + bands.length + 1}"
          srcset={webpSrcset(src)} sizes="(max-width: 640px) 46vw, 23vw"
          loading="lazy" decoding="async"
        />
      {/each}
    </div>
  </section>
{/if}

<!-- ═══ 4. NEXT ═════════════════════════════════════════════════════════ -->
<section class="cs-next" aria-label="Keep reading">
  <a class="cs-next-a" href="/work/{data.prev.slug}" data-cursor>
    <span class="cs-next-l">Previous</span>
    <span class="cs-next-c">{data.prev.client}</span>
  </a>
  <a class="cs-next-a cs-next-a--r" href="/work/{data.next.slug}" data-cursor>
    <span class="cs-next-l">Next</span>
    <span class="cs-next-c">{data.next.client}</span>
  </a>
</section>

<section class="cs-cta">
  <p class="cs-cta-h">{CASES.length} cases in the archive.</p>
  <div class="cs-cta-row">
    <WoolButton href="/work" yarn="violet" label="See all work" />
    <WoolButton href="/contact" yarn="magenta" label="Start a project" />
  </div>
</section>
