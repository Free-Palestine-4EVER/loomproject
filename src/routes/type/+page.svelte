<!--
  /type — the specimen and download page for LOOM Bloom, the studio's own
  display face. The fonts are self-hosted in static/fonts/loom-bloom/ (copied
  from public/ in the React build) and the @font-face rules live in
  styles.css, so every sample on this page is set in the real font, not a
  picture of it. Ported from src/components/Typeface.jsx.
-->
<script>
  import { onMount } from 'svelte'
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import SpecWord from './SpecWord.svelte'
  import PosterMachine from './PosterMachine.svelte'
  import '$components/typeface.css'

  const DIR = '/fonts/loom-bloom'
  // Hardcoded, not measured — see CLAUDE.md's "the typeface" section and the
  // comment on FILES below. Carried across from Typeface.jsx exactly as they
  // are; do not recompute or "correct" them here.
  const ZIP_SIZE = '7.0 MB'

  // One plain cut and seven planted ones, in two families: Rose/Daisy/Tulip/Ivy
  // each carry a different SPECIES, and Wild/Hollow/Meadow each carry a
  // different TREATMENT of the letter. Every cut shares the Regular's metrics
  // exactly, so a line of text lines up character for character across all
  // eight.
  const CUTS = [
    { id: 'regular', label: 'Regular', family: 'LOOM Bloom', ps: 'LOOMBloom', species: 'no ornament — the face itself' },
    { id: 'rose', label: 'Rose', family: 'LOOM Bloom Rose', ps: 'LOOMBloomRose', species: 'a millefleur of spiral roses, leaves and five-dot blossoms' },
    { id: 'daisy', label: 'Daisy', family: 'LOOM Bloom Daisy', ps: 'LOOMBloomDaisy', species: 'packed open daisies, big enough to overhang the letter' },
    { id: 'tulip', label: 'Tulip', family: 'LOOM Bloom Tulip', ps: 'LOOMBloomTulip', species: 'three-lobed tulip cups on a stub of stem, leaves between' },
    { id: 'ivy', label: 'Ivy', family: 'LOOM Bloom Ivy', ps: 'LOOMBloomIvy', species: 'a Morris vine — scrolling stems, leaves, no bloom' },
    // The second family. These three carry the same six species as each other
    // — sakura, poppy, sunflower, forget-me-not, anemone, hibiscus — and differ
    // in how the cut treats the LETTER, not in how busy it is. See type/font.md.
    { id: 'wild', label: 'Wild', family: 'LOOM Bloom Wild', ps: 'LOOMBloomWild', species: 'six species, full size, blooms overhanging the letter' },
    { id: 'hollow', label: 'Hollow', family: 'LOOM Bloom Hollow', ps: 'LOOMBloomHollow', species: 'the letter as an outline, the garden filling the inside' },
    { id: 'meadow', label: 'Meadow', family: 'LOOM Bloom Meadow', ps: 'LOOMBloomMeadow', species: 'flowers rising from the baseline to a wavy line' },
  ]

  const SIZES = {
    LOOMBloom: ['13 KB', '15 KB', '6 KB'],
    LOOMBloomRose: ['831 KB', '808 KB', '256 KB'],
    LOOMBloomDaisy: ['365 KB', '347 KB', '108 KB'],
    LOOMBloomTulip: ['375 KB', '359 KB', '117 KB'],
    LOOMBloomIvy: ['765 KB', '745 KB', '246 KB'],
    LOOMBloomWild: ['871 KB', '832 KB', '213 KB'],
    LOOMBloomHollow: ['1.11 MB', '1.05 MB', '280 KB'],
    LOOMBloomMeadow: ['1.17 MB', '1.11 MB', '337 KB'],
  }

  const FORMATS = [
    { fmt: 'OTF', ext: 'otf', use: 'Desktop — macOS, Windows, Linux' },
    { fmt: 'TTF', ext: 'ttf', use: 'Desktop — older apps' },
    { fmt: 'WOFF2', ext: 'woff2', use: 'Web' },
  ]

  const FILES = CUTS.flatMap((c) =>
    FORMATS.map((f, i) => ({
      cut: c.label, fmt: f.fmt, use: f.use,
      file: `${c.ps}-Regular.${f.ext}`, size: SIZES[c.ps][i],
    }))
  )

  const GLYPHS = [
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    ...'0123456789',
    // [ and ] are drawn from the same two glyphs as ( and ), so they are not
    // listed twice here — they still type.
    ...'.,:;!?\'"()/\\-–—_&@%#+=*~°•',
    ...'ČĆŽŠĐ',
    ...'ÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇÝ',
    '❀', '✿', '❦',
  ]

  const WATERFALL = [
    { px: 128, text: 'BRUTAL' },
    { px: 92, text: 'CONDENSED' },
    { px: 64, text: 'FLAT TERMINALS' },
    { px: 44, text: 'MITRED JOINS, NO SOFT EDGES' },
    { px: 30, text: 'ONE STEM WEIGHT — 178 UNITS AT A 700 CAP' },
    { px: 20, text: 'AMMAN × SARAJEVO · WOVEN ON A LOOM · 2026 ❀' },
  ]

  const FACTS = [
    ['8', 'cuts — one plain, seven planted'],
    ['98', 'glyphs per cut'],
    ['161', 'characters mapped'],
    ['31', 'accented letters — Č Ć Ž Š Đ included'],
    ['178', 'stem, at a 700 cap'],
    ['168', 'one corner radius'],
  ]

  const SNIPPET = `@font-face {
  font-family: 'LOOM Bloom';
  src: url('/fonts/loom-bloom/LOOMBloom-Regular.woff2') format('woff2');
  font-display: swap;
}

h1 { font-family: 'LOOM Bloom', sans-serif; }`

  let cut = $state('regular')
  let size = $state(120)
  let text = $state('Brutal bloom')
  let copied = $state(false)

  const family = $derived(CUTS.find((c) => c.id === cut).family)
  const cutLabel = $derived(CUTS.find((c) => c.id === cut).label)

  let copiedTimer
  async function copy() {
    try {
      await navigator.clipboard.writeText(SNIPPET)
      copied = true
      clearTimeout(copiedTimer)
      copiedTimer = setTimeout(() => { copied = false }, 1800)
    } catch { /* clipboard blocked — the snippet is selectable on the page */ }
  }

  // ─── hero scroll parallax ───────────────────────────────────────────────
  // Framer's useScroll/useTransform drove y:[0,140] and opacity:[1,0] across
  // the hero's own scroll progress in React. Here it is one passive scroll
  // listener, rAF-throttled, writing plain style properties straight to the
  // DOM — same approach Hero.svelte uses, never a spring on the main thread.
  let heroEl = $state(null)
  let heroInnerEl = $state(null)

  onMount(() => {
    let raf = null
    const update = () => {
      raf = null
      if (!heroEl || !heroInnerEl) return
      const rect = heroEl.getBoundingClientRect()
      const progress = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)))
      heroInnerEl.style.transform = `translateY(${(progress * 140).toFixed(2)}px)`
      const fade = progress >= 0.9 ? 0 : 1 - progress / 0.9
      heroInnerEl.style.opacity = String(fade)
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  })

  // ─── charset grid stagger ───────────────────────────────────────────────
  // 93 cells; React gave each its own whileInView trigger. Same pattern as
  // TheMachine.svelte's month grid: one IntersectionObserver on the
  // container flips a single `is-in` class, and the per-cell delay lives in
  // a `--d` custom property (see typeface.css's .tf-grid.is-in rule).
  let gridEl = $state(null)
  let gridIn = $state(false)
  $effect(() => {
    if (!gridEl || gridIn) return
    if (typeof IntersectionObserver === 'undefined') { gridIn = true; return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { gridIn = true; io.disconnect() }
    }, { rootMargin: '-8% 0px' })
    io.observe(gridEl)
    return () => io.disconnect()
  })
</script>

<svelte:head>
  <title>LOOM Bloom — a free display typeface by LOOM</title>
  <meta
    name="description"
    content="LOOM Bloom: a free condensed brutal display typeface in five cuts — Regular plus four planted ones (Rose, Daisy, Tulip, Ivy) — drawn from scratch by LOOM. Free for personal and commercial use."
  />
</svelte:head>

<div class="tf">
  <!-- ——————————————————————————— hero -->
  <section class="tf-hero" bind:this={heroEl}>
    <div class="tf-hero-inner" bind:this={heroInnerEl}>
      <div class="tf-hero-meta">
        <span class="tf-tag">The LOOM typeface</span>
        <span>v1.200</span>
        <span>Free — personal &amp; commercial</span>
      </div>
      <h1 class="tf-hero-word">
        <span class="tf-hero-mask">
          <span class="tf-hero-line">LOOM</span>
        </span>
        <span class="tf-hero-mask">
          <span class="tf-hero-line tf-hero-line--floral">BLOOM</span>
        </span>
      </h1>
      <div class="tf-hero-foot">
        <p class="tf-hero-sub">
          A condensed brutal display face. Flat terminals, mitred joins, one
          corner radius — drawn from scratch in our own type pipeline, not
          licensed from anyone. Five cuts: the plain face, and four planted
          ones — Rose, Daisy, Tulip and Ivy — each with a different flower
          cut out of the letterforms. The ornament is real Art Nouveau and
          Victorian vector work, all public domain, and every piece is placed
          by measuring the letter itself — one flower per part thick enough
          to hold one, sized to the room it has.
        </p>
        <div class="tf-hero-cta">
          <div class="magnetic" use:magnetic={{ strength: 0.2 }}>
            <a class="tf-btn tf-btn--fill" href="{DIR}/LOOM-Bloom.zip" download>
              Download the family<span>{ZIP_SIZE}</span>
            </a>
          </div>
          <a class="tf-btn" href="#tf-files">All formats</a>
        </div>
      </div>
    </div>
  </section>

  <div class="tf-band" aria-hidden="true">
    <div class="tf-band-track" style:font-family="LOOM Bloom">
      <span>ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 </span><span>ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 </span>
    </div>
  </div>
  <div class="tf-band tf-band--dim tf-band--rev" aria-hidden="true">
    <div class="tf-band-track" style:font-family="LOOM Bloom Daisy">
      <span>ROSE ❀ DAISY ✿ TULIP ❦ IVY ❀ </span><span>ROSE ❀ DAISY ✿ TULIP ❦ IVY ❀ </span>
    </div>
  </div>

  <!-- ——————————————————————————— tester -->
  <section class="tf-section">
    <header class="tf-head">
      <h2 class="tf-h2">Type in it</h2>
      <div class="tf-controls">
        <div class="tf-switch" role="group" aria-label="Choose a cut">
          {#each CUTS as c (c.id)}
            <button
              type="button"
              class="tf-switch-btn {cut === c.id ? 'is-on' : ''}"
              onclick={() => (cut = c.id)}
              aria-pressed={cut === c.id}
            >{c.label}</button>
          {/each}
        </div>
        <label class="tf-slider">
          <input
            type="range" min="28" max="240" value={size}
            oninput={(e) => (size = +e.target.value)}
            aria-label="Preview size"
          />
          <span>{size}px</span>
        </label>
      </div>
    </header>
    <div class="tf-canvas">
      <input
        class="tf-input"
        value={text}
        oninput={(e) => (text = e.target.value)}
        spellcheck="false"
        aria-label="Preview text"
        style:font-family={family}
        style:font-size="{size}px"
      />
    </div>
    <p class="tf-note">Caps only, by design — lowercase types as capitals.</p>
  </section>

  <!-- ——————————————————————————— waterfall -->
  <section class="tf-section">
    <h2 class="tf-h2">Waterfall</h2>
    <div class="tf-fall">
      {#each WATERFALL as w (w.px)}
        <div class="tf-fall-row" use:reveal={{ y: 24 }}>
          <span class="tf-fall-px">{w.px}</span>
          <span class="tf-fall-line" style:font-family={family} style:font-size="{w.px}px">
            {w.text}
          </span>
        </div>
      {/each}
    </div>
  </section>

  <!-- ——————————————————————————— the poster machine -->
  <PosterMachine />

  <!-- ——————————————————————————— anatomy -->
  <section class="tf-section">
    <h2 class="tf-h2">How it is drawn</h2>
    <div class="tf-anatomy">
      <article class="tf-anat" use:reveal={{ delay: 0 }}>
        <div class="tf-anat-fig">
          <svg viewBox="0 0 120 90" aria-hidden="true">
            <rect x="18" y="14" width="26" height="62" fill="currentColor" />
            <rect x="60" y="14" width="42" height="20" fill="currentColor" />
            <path d="M16 14h30M16 76h30" stroke="var(--magenta)" stroke-width="2.5" fill="none" />
          </svg>
        </div>
        <h3>Flat terminals</h3>
        <p>Every stroke is cut square. No round caps anywhere in the face — a stroke stops dead where the glyph box does.</p>
      </article>
      <article class="tf-anat" use:reveal={{ delay: 0.06 }}>
        <div class="tf-anat-fig">
          <svg viewBox="0 0 120 90" aria-hidden="true">
            <path d="M22 78 L60 14 L98 78" stroke="currentColor" stroke-width="22" fill="none" stroke-linejoin="miter" stroke-miterlimit="9" />
            <circle cx="60" cy="14" r="5" fill="var(--magenta)" />
          </svg>
        </div>
        <h3>Mitred joins</h3>
        <p>A, M, W, K and Z are stroked along a polyline with mitred corners, so an apex comes to a point instead of two bars overlapping.</p>
      </article>
      <article class="tf-anat" use:reveal={{ delay: 0.12 }}>
        <div class="tf-anat-fig">
          <svg viewBox="0 0 120 90" aria-hidden="true">
            <path d="M26 14h40a22 22 0 0 1 22 22v18a22 22 0 0 1-22 22H26z" fill="currentColor" />
            <path d="M44 32h20a10 10 0 0 1 10 10v6a10 10 0 0 1-10 10H44z" fill="var(--bg)" />
            <path d="M66 14a22 22 0 0 1 22 22" stroke="var(--magenta)" stroke-width="2.5" fill="none" />
          </svg>
        </div>
        <h3>One radius</h3>
        <p>B, D, O, C, G, S and every figure sit on the same rounded-rectangle skeleton: straight sides, one corner radius, rectangular counters.</p>
      </article>
    </div>
  </section>

  <!-- ——————————————————————————— the seven planted cuts -->
  <section class="tf-poster">
    <div class="tf-poster-inner">
      <p class="tf-tag tf-tag--light" use:reveal>Seven gardens, one skeleton</p>
      <p class="tf-poster-copy tf-poster-copy--lead" use:reveal={{ delay: 0.05 }}>
        What gets subtracted from the letter is the flower's <em>outline</em>,
        not its body — so the field can run edge to edge and the letter still
        keeps most of its ink. A band of solid ink round the silhouette is
        left uncut, which is what holds the shape together at any size. Every
        planted cut keeps the Regular's metrics exactly, so the same line sets
        identically in all eight — and the last three change how the letter
        itself is treated, not just how busy it is.
      </p>
      <div class="tf-species">
        {#each CUTS.filter((c) => c.id !== 'regular') as c, i (c.id)}
          <SpecWord cut={c} delay={0.05 + i * 0.06} />
        {/each}
      </div>
      <p class="tf-poster-orn" style:font-family={family} use:reveal={{ delay: 0.2 }}>❀ ✿ ❦</p>
    </div>
  </section>

  <!-- ——————————————————————————— charset -->
  <section class="tf-section">
    <header class="tf-head">
      <h2 class="tf-h2">The character set</h2>
      <p class="tf-note tf-note--inline">93 glyphs · 156 codepoints · showing {cutLabel}</p>
    </header>
    <div class="tf-grid {gridIn ? 'is-in' : ''}" bind:this={gridEl} style:font-family={family}>
      {#each GLYPHS as g, i (`${g}-${i}`)}
        <span
          class="tf-cell"
          style:--d="{Math.min(i * 0.006, 0.35)}s"
          title="U+{g.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}"
        >{g}</span>
      {/each}
    </div>
  </section>

  <!-- ——————————————————————————— facts -->
  <section class="tf-section">
    <div class="tf-facts">
      {#each FACTS as [n, label], i (label)}
        <div class="tf-fact" use:reveal={{ delay: 0.04 * i }}>
          <span class="tf-fact-n">{n}</span>
          <span class="tf-fact-l">{label}</span>
        </div>
      {/each}
    </div>
  </section>

  <!-- ——————————————————————————— downloads -->
  <section class="tf-section" id="tf-files">
    <header class="tf-head">
      <h2 class="tf-h2">Download</h2>
      <div class="magnetic" use:magnetic={{ strength: 0.2 }}>
        <a class="tf-btn tf-btn--fill" href="{DIR}/LOOM-Bloom.zip" download>
          Everything, zipped<span>{ZIP_SIZE}</span>
        </a>
      </div>
    </header>
    <div class="tf-files">
      {#each FILES as f, i (f.file)}
        <a class="tf-file" href="{DIR}/{f.file}" download use:reveal={{ delay: 0.03 * i, y: 18 }}>
          <span class="tf-file-cut">{f.cut}</span>
          <span class="tf-file-fmt">{f.fmt}</span>
          <span class="tf-file-use">{f.use}</span>
          <span class="tf-file-size">{f.size}</span>
          <span class="tf-file-arrow" aria-hidden="true">↓</span>
        </a>
      {/each}
    </div>
  </section>

  <!-- ——————————————————————————— use + licence -->
  <section class="tf-section">
    <div class="tf-use-grid">
      <div>
        <h2 class="tf-h2">Use it on the web</h2>
        <div class="tf-code">
          <pre><code>{SNIPPET}</code></pre>
          <button class="tf-copy" type="button" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
      </div>
      <div class="tf-licence">
        <h2 class="tf-h2">Licence</h2>
        <p>
          Free to use, embed and modify for personal and commercial work, print
          and screen. Don't resell the font files themselves or claim authorship
          of the typeface. The ornament inside the planted cuts is redrawn
          from public-domain and CC0 vector artwork (1899–1913 Art Nouveau
          and Victorian ornament, plus CC0 ornament sets); every source is
          recorded in the project. Full terms ship inside the zip.
        </p>
        <p class="tf-licence-meta">
          LOOM Bloom v1.100<br />© {new Date().getFullYear()} LOOM · Amman × Sarajevo
        </p>
      </div>
    </div>
  </section>
</div>
