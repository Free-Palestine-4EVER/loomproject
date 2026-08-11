<!--
  /type — the specimen and download page for LOOM Patterns, the studio's own
  display family. The fonts are self-hosted in static/fonts/loom-patterns/ and
  the @font-face rules live in styles.css, so every sample on this page is set
  in the real font, not a picture of it.

  11 Aug 2026 — this page used to be the LOOM Bloom specimen (seven planted
  flower cuts). It now carries the pattern family: four caps-only cuts, each
  drawn twice. Bloom is still hosted and still downloadable — the link at the
  bottom of this page is the one thing that keeps that giveaway reachable, so
  do not drop it. This is the giveaway page, so unlike the home act it is
  allowed to set the whole family; the heavy faces (Flora is 244 KB) are still
  claimed only as their section comes up the page, via `nearViewport`.

  CAPS ONLY — 98 glyphs per face, A–Z, 0–9, punctuation, accented caps and
  three ornaments. There is no lowercase drawn: lowercase codepoints are
  mapped to the capitals, so a minuscule still types, it just sets as a
  capital. Every specimen string in this file is written in caps anyway, and
  the tester upper-cases what a visitor types — a specimen that quietly
  changed your input's case without saying so would be a lie about the font.
-->
<script>
  import { onMount } from 'svelte'
  import { reveal, magnetic } from '$lib/motion.svelte.js'
  import SpecWord from './SpecWord.svelte'
  import PosterMachine from './PosterMachine.svelte'
  import '$components/typeface.css'

  const DIR = '/fonts/loom-patterns'
  const BLOOM_DIR = '/fonts/loom-bloom'
  // Measured off static/fonts/loom-patterns/LOOM-Patterns.zip — 24 font files
  // plus LICENCE.txt and README.txt. If the zip is rebuilt, re-measure.
  const ZIP_SIZE = '4.3 MB'

  // Four cuts, eight faces. Every cut is the same heavy grotesk silhouette
  // with a different pattern worked through it, and every cut is drawn twice:
  // FILL (the pattern inside a solid letter) and OUTLINE (the same pattern
  // inside a hollow one). All eight share metrics exactly, so a line sets
  // identically across the family and a fill can be swapped for its outline
  // without the line moving.
  const CUTS = [
    {
      id: 'organic', label: 'Organic',
      fill: { family: 'LOOM Organic', ps: 'LOOMOrganic' },
      outline: { family: 'LOOM Organic Outline', ps: 'LOOMOrganicOutline' },
      note: 'a bold rounded slab filled with thick zebra ribbons — the loudest cut in the family',
    },
    {
      id: 'retro', label: 'Retro',
      fill: { family: 'LOOM Retro', ps: 'LOOMRetro' },
      outline: { family: 'LOOM Retro Outline', ps: 'LOOMRetroOutline' },
      note: 'a wide grotesk filled with a fine crackle and pebble mesh',
    },
    {
      id: 'linear', label: 'Linear',
      fill: { family: 'LOOM Linear', ps: 'LOOMLinear' },
      outline: { family: 'LOOM Linear Outline', ps: 'LOOMLinearOutline' },
      note: 'a clean wide grotesk over a very fine scribble hairline — the quietest, and the one that survives smallest',
    },
    {
      id: 'flora', label: 'Flora',
      fill: { family: 'LOOM Flora', ps: 'LOOMFlora' },
      outline: { family: 'LOOM Flora Outline', ps: 'LOOMFloraOutline' },
      note: 'a solid grotesk with a light speckle; the outline scatters flowers and dots through the hollow',
    },
  ]

  const STYLES = [
    { id: 'fill', label: 'Fill' },
    { id: 'outline', label: 'Outline' },
  ]

  // Measured off the files in static/fonts/loom-patterns, in the FORMATS order
  // below (otf, ttf, woff2). Not guesses — re-measure if the fonts are
  // rebuilt, and do not "round" them.
  const SIZES = {
    LOOMOrganic: ['48 KB', '55 KB', '29 KB'],
    LOOMOrganicOutline: ['59 KB', '63 KB', '31 KB'],
    LOOMRetro: ['671 KB', '639 KB', '109 KB'],
    LOOMRetroOutline: ['529 KB', '505 KB', '103 KB'],
    LOOMLinear: ['318 KB', '311 KB', '83 KB'],
    LOOMLinearOutline: ['262 KB', '256 KB', '78 KB'],
    LOOMFlora: ['1.27 MB', '1.21 MB', '244 KB'],
    LOOMFloraOutline: ['983 KB', '941 KB', '216 KB'],
  }

  const FORMATS = [
    { fmt: 'OTF', ext: 'otf', use: 'Desktop — macOS, Windows, Linux' },
    { fmt: 'TTF', ext: 'ttf', use: 'Desktop — older apps' },
    { fmt: 'WOFF2', ext: 'woff2', use: 'Web' },
  ]

  const FACES = CUTS.flatMap((c) => [
    { cut: c.label, style: 'Fill', ...c.fill },
    { cut: c.label, style: 'Outline', ...c.outline },
  ])

  const FILES = FACES.flatMap((f) =>
    FORMATS.map((fo, i) => ({
      face: `${f.cut} ${f.style}`, fmt: fo.fmt, use: fo.use,
      file: `${f.ps}-Regular.${fo.ext}`, size: SIZES[f.ps][i],
    }))
  )

  // The displayed character set: the 161 mapped codepoints minus the
  // lowercase aliases, which are the SAME 98 drawn glyphs as the capitals and
  // would only pad the grid with duplicates. Read off the fonts' own cmap.
  const GLYPHS = [
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    ...'0123456789',
    ...'.,:;!?\'"()[]/\\-–—_&@%#+=*~°•',
    ...'ČĆŽŠĐ',
    ...'ÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇÝ',
    '❀', '✿', '❦',
  ]

  // Nothing under 40px: below that the pattern stops resolving and the cut
  // reads as a smudge. A waterfall that ran down to 20px would be showing the
  // face failing, not showing the face.
  const WATERFALL = [
    { px: 148, text: 'PATTERN' },
    { px: 104, text: 'THE FILL IS SOLID' },
    { px: 76, text: 'THE OUTLINE IS HOLLOW' },
    { px: 56, text: 'CAPS ONLY — 98 GLYPHS' },
    { px: 42, text: 'AMMAN × SARAJEVO · WOVEN ON A LOOM · 2026 ❀' },
  ]

  const FACTS = [
    ['4', 'cuts — Organic, Retro, Linear, Flora'],
    ['8', 'faces — every cut drawn fill and outline'],
    ['98', 'glyphs per face'],
    ['161', 'codepoints mapped'],
    ['31', 'accented letters — Č Ć Ž Š Đ included'],
    ['40', 'px — the size below which nothing resolves'],
  ]

  const SNIPPET = `@font-face {
  font-family: 'LOOM Organic';
  src: url('/fonts/loom-patterns/LOOMOrganic-Regular.woff2') format('woff2');
  font-display: swap;
}

h1 { font-family: 'LOOM Organic', sans-serif; }`

  let cut = $state('organic')
  let style = $state('fill')
  let size = $state(120)
  let text = $state('PATTERN')
  let copied = $state(false)

  const activeCut = $derived(CUTS.find((c) => c.id === cut))
  const family = $derived(activeCut[style].family)
  const faceLabel = $derived(`${activeCut.label} ${style === 'fill' ? 'Fill' : 'Outline'}`)

  // The tester is set in a face with no lowercase, so what a visitor types is
  // upper-cased here, in the value itself, rather than with `text-transform`.
  // The two look identical; only one of them is honest about what a copied
  // string will be.
  function onText(e) {
    const el = e.target
    const at = el.selectionStart
    text = el.value.toUpperCase()
    queueMicrotask(() => { try { el.setSelectionRange(at, at) } catch { /* not focusable */ } })
  }

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
  // One IntersectionObserver on the container flips a single `is-in` class,
  // and the per-cell delay lives in a `--d` custom property (see typeface.css's
  // .tf-grid.is-in rule) — same pattern as TheMachine.svelte's month grid.
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
  <title>LOOM Patterns — a free display typeface by LOOM</title>
  <meta
    name="description"
    content="LOOM Patterns: a free caps-only display typeface in four cuts — Organic, Retro, Linear and Flora — each drawn twice, fill and outline. Eight faces, 98 glyphs each, drawn from scratch by LOOM. Free for personal and commercial use."
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
          <span class="tf-hero-line tf-hero-line--pattern">PATTERNS</span>
        </span>
      </h1>
      <div class="tf-hero-foot">
        <p class="tf-hero-sub">
          Four caps-only display cuts, drawn from scratch in our own type
          pipeline and not licensed from anyone. Each one is the same heavy
          grotesk silhouette with a different pattern worked through it —
          Organic's zebra ribbons, Retro's crackle mesh, Linear's hairline
          scribble, Flora's speckle and flowers — and each one is drawn twice:
          the pattern inside a solid letter, and the same pattern inside a
          hollow one. Eight faces, identical metrics, 98 glyphs apiece.
        </p>
        <div class="tf-hero-cta">
          <div class="magnetic" use:magnetic={{ strength: 0.2 }}>
            <a class="tf-btn tf-btn--fill" href="{DIR}/LOOM-Patterns.zip" download>
              Download the family<span>{ZIP_SIZE}</span>
            </a>
          </div>
          <a class="tf-btn" href="#tf-files">All formats</a>
        </div>
      </div>
    </div>
  </section>

  <div class="tf-band" aria-hidden="true">
    <div class="tf-band-track" style:font-family="LOOM Linear">
      <span>ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 </span><span>ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 </span>
    </div>
  </div>
  <div class="tf-band tf-band--dim tf-band--rev" aria-hidden="true">
    <div class="tf-band-track" style:font-family="LOOM Organic Outline">
      <span>ORGANIC ❀ RETRO ✿ LINEAR ❦ FLORA ❀ </span><span>ORGANIC ❀ RETRO ✿ LINEAR ❦ FLORA ❀ </span>
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
        <!-- the pair, as its own control: the cut is WHICH pattern, this is
             which way it is drawn. Two rails say that; one rail of eight
             names would not. -->
        <div class="tf-switch tf-switch--pair" role="group" aria-label="Fill or outline">
          {#each STYLES as s (s.id)}
            <button
              type="button"
              class="tf-switch-btn {style === s.id ? 'is-on' : ''}"
              onclick={() => (style = s.id)}
              aria-pressed={style === s.id}
            >{s.label}</button>
          {/each}
        </div>
        <label class="tf-slider">
          <input
            type="range" min="40" max="240" value={size}
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
        oninput={onText}
        spellcheck="false"
        autocapitalize="characters"
        aria-label="Preview text"
        style:font-family={family}
        style:font-size="{size}px"
      />
    </div>
    <p class="tf-note">
      Caps only, by design — there is no lowercase drawn, so what you type is
      set as capitals. The slider stops at 40px: below that the pattern stops
      resolving and the letter goes with it.
    </p>
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
    <p class="tf-note">Showing {faceLabel} — pick another cut above.</p>
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
            <defs>
              <pattern id="tf-ribbon" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
                <rect width="14" height="14" fill="currentColor" />
                <rect width="6" height="14" fill="var(--magenta)" />
              </pattern>
            </defs>
            <path d="M18 78 L44 12 L70 78 M27 60 h34" stroke="url(#tf-ribbon)" stroke-width="18" fill="none" stroke-linejoin="miter" />
            <rect x="84" y="12" width="20" height="66" fill="url(#tf-ribbon)" />
          </svg>
        </div>
        <h3>The pattern is the letter</h3>
        <p>There is no plain cut. Every glyph is a heavy grotesk silhouette with the pattern worked all the way through it, so the texture is not decoration laid on top — take it away and there is no letter left.</p>
      </article>
      <article class="tf-anat" use:reveal={{ delay: 0.06 }}>
        <div class="tf-anat-fig">
          <svg viewBox="0 0 120 90" aria-hidden="true">
            <rect x="14" y="14" width="38" height="62" fill="currentColor" />
            <path d="M22 22h22M22 34h22M22 46h22M22 58h22M22 68h22" stroke="var(--bg)" stroke-width="4" />
            <rect x="68" y="14" width="38" height="62" fill="none" stroke="currentColor" stroke-width="5" />
            <path d="M76 26h22M76 40h22M76 54h22M76 66h22" stroke="var(--magenta)" stroke-width="4" />
          </svg>
        </div>
        <h3>Drawn twice</h3>
        <p>Every cut ships as a pair: the fill, where the pattern sits inside a solid letter, and the outline, where the same pattern sits inside a hollow one. Identical metrics — swap one for the other and nothing on the line moves.</p>
      </article>
      <article class="tf-anat" use:reveal={{ delay: 0.12 }}>
        <div class="tf-anat-fig">
          <svg viewBox="0 0 120 90" aria-hidden="true">
            <rect x="14" y="16" width="46" height="58" fill="currentColor" />
            <path d="M20 24h34M20 36h34M20 48h34M20 62h34" stroke="var(--bg)" stroke-width="3.5" />
            <rect x="74" y="44" width="16" height="20" fill="currentColor" opacity="0.55" />
            <rect x="96" y="52" width="8" height="10" fill="currentColor" opacity="0.3" />
            <path d="M74 74h30" stroke="var(--magenta)" stroke-width="2.5" />
          </svg>
        </div>
        <h3>Display only</h3>
        <p>Below roughly 40px the pattern stops resolving and the cut reads as a smudge. These are headline, poster and title faces — never body copy, never a caption, never a button.</p>
      </article>
    </div>
  </section>

  <!-- ——————————————————————————— the four cuts, as pairs -->
  <section class="tf-poster">
    <div class="tf-poster-inner">
      <p class="tf-tag tf-tag--light" use:reveal>Four cuts, eight faces</p>
      <p class="tf-poster-copy tf-poster-copy--lead" use:reveal={{ delay: 0.05 }}>
        The family is one silhouette and four patterns, and each pattern is
        drawn <em>twice</em> — filled and hollow. The two lines in each card
        below are the same cut turned over, not two different fonts: the same
        widths, the same 98 glyphs, the same line length. What changes between
        the cards is how fine the pattern is cut — Organic's ribbons, Retro's
        mesh, Linear's hairline — and Flora, which scatters instead of
        weaving.
      </p>
      <div class="tf-species">
        {#each CUTS as c, i (c.id)}
          <SpecWord cut={c} delay={0.03 + i * 0.03} />
        {/each}
      </div>
      <p class="tf-poster-orn" style:font-family={family} use:reveal={{ delay: 0.2 }}>❀ ✿ ❦</p>
    </div>
  </section>

  <!-- ——————————————————————————— charset -->
  <section class="tf-section">
    <header class="tf-head">
      <h2 class="tf-h2">The character set</h2>
      <p class="tf-note tf-note--inline">98 glyphs · 161 codepoints · showing {faceLabel}</p>
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
    <p class="tf-note">
      Lowercase is mapped to these same capitals, which is the other 63
      codepoints — it is not drawn separately, so it is not shown twice here.
    </p>
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
        <a class="tf-btn tf-btn--fill" href="{DIR}/LOOM-Patterns.zip" download>
          Everything, zipped<span>{ZIP_SIZE}</span>
        </a>
      </div>
    </header>
    <div class="tf-files">
      {#each FILES as f, i (f.file)}
        <a class="tf-file" href="{DIR}/{f.file}" download use:reveal={{ delay: 0.02 * i, y: 18 }}>
          <span class="tf-file-cut">{f.face}</span>
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
        <p class="tf-note">
          The web files run 29 KB (Organic) to 244 KB (Flora). Load the faces a
          page actually sets, not the family.
        </p>
      </div>
      <div class="tf-licence">
        <h2 class="tf-h2">Licence</h2>
        <p>
          Free to use, embed and modify for personal and commercial work, print
          and screen. Don't resell the font files themselves or claim authorship
          of the typeface. Every outline in these files was drawn in LOOM's own
          type pipeline — no third-party font data is included. Full terms ship
          inside the zip.
        </p>
        <p class="tf-licence-meta">
          LOOM Patterns v1.200<br />© {new Date().getFullYear()} LOOM · Amman × Sarajevo
        </p>
        <p class="tf-licence-meta">
          Looking for the flowers? <a href="{BLOOM_DIR}/LOOM-Bloom.zip" download>LOOM Bloom</a>,
          our earlier eight-cut planted family, is still here — same terms.
        </p>
      </div>
    </div>
  </section>
</div>
