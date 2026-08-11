<!--
  ————————————————————————————————————————————————————————
  PROOF — slot 3, and the section that has to survive a sceptic.

  REDESIGNED 11 Aug 2026. What stood here was a wrapped paragraph of client
  names separated by asterisks, sitting in a two-column split next to a rail
  of numbers. The client's verdict on it was "unnecessary and stupid looking",
  and he was right about the mechanism: a wall of names set as running text is
  read as *copy*, and copy is the one form a reader argues with. A logo strip
  is read as *evidence* — nobody argues with a row of marks, they scan it.

  NOW: kicker + headline, then one full-bleed logo marquee, then the four
  numbers as a horizontal row beneath it.

    · Two tracks sliding in opposite directions. Counter-motion is what stops
      a marquee reading as a broken carousel — with one row the eye tries to
      follow it, with two opposed rows it gives up and just takes the mass in,
      which is the whole point of the section.
    · Each track renders its set of cells TWICE and animates to exactly -50%,
      so the seam lands on an identical copy and there is no jump. Same idiom
      as typeface.css's .tf-band-track — PORTING.md is explicit that a
      continuous linear loop belongs in CSS, never in a per-frame JS transform.
    · 54s / 46s. Slow enough that it never competes with the headline; the two
      durations are deliberately coprime-ish so the rows do not fall into a
      visible lockstep.
    · Hover pauses BOTH rows, not just the hovered one — pausing one while the
      other keeps sliding looks like a bug.

  THE MARKS. Nobody has these companies' actual logo artwork cleared for use,
  and reproducing trademarked lockups would be worse than useless. What ships
  is a set of plain typographic WORDMARKS, drawn in this repo, monochrome in
  --ink, one per name — see static/img/logos/.

  ONE TYPEFACE, 11 Aug (third pass). The nineteen marks used to be drawn in
  three different treatments — a Georgia serif, a Helvetica bold, an Avenir
  wide-tracked light — on the theory that the variety gave the strip texture.
  It did not. Nineteen names in three unrelated families at three apparent
  weights does not read as a client wall, it reads as a ransom note: the eye
  spends its attention sorting the FONTS instead of reading the NAMES, which is
  the only thing the band exists to make it do. The client's verdict was
  "trash" and the client was right.

  Every mark is now set in SATOSHI — the site's own grotesk, the same file the
  body copy loads — instanced at wght 700, uppercase, at one tracking value,
  and converted to OUTLINES. Outlines rather than <text> because an SVG used as
  an <img> cannot fetch a webfont: the old files named system stacks and so
  rendered in whatever the viewer's machine happened to own, which meant the
  careful width normalisation below was true on this Mac and nowhere else. A
  path is a path everywhere.

  One family also makes the normalisation nearly free: cap height is now a
  font constant (740/1000 em), so scaling every mark to the same cap gives
  every mark the same optical mass by construction — the previous pass had to
  rasterise each file and measure its real ink box precisely because the three
  families disagreed about it. A mild width damping is still applied on top, so
  a twenty-four-character name loses a little height rather than out-shouting
  "MAC". Anything NEW dropped into static/img/logos/ has to arrive the same way
  or it will sit wrong in the row, so here is the recipe in full: Satoshi
  instanced at wght 700, uppercase, +0.038em tracking with GPOS pair kerning
  applied, glyphs converted to one <path>, the box cropped tight to the real
  outline bounds (not to the advance widths — a bold N paints past its own
  advance and an advance-cut box shears its right stem off), 32 units tall with
  the cap centred in it, and the whole thing scaled so the cap lands on ~23.5
  units before a 0.16-exponent width damping. Write the scale factor at full
  precision: rounding it to three decimals is a 1.6% error, and over a 16000-
  unit glyph run that is enough to push the outer letters out of the viewBox.

  NOTHING HERE IS A NEW CLAIM — every value still comes from STATS and
  CLIENT_WALL in $data/site.js, so the "verify every number" rule has exactly
  one place to check, as before. The logo slug is DERIVED from the name rather
  than stored beside it: adding a name to CLIENT_WALL and dropping the matching
  SVG in is the whole change, and there is no second list to fall out of sync.
  ————————————————————————————————————————————————————————
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { CLIENT_WALL, STATS } from '$data/site.js'
  import { reducedMotion, reveal } from '$lib/motion.svelte.js'
  import SplitWords from './SplitWords.svelte'
  import CountUp from './CountUp.svelte'
  import './proof.css'

  // The clause each number was missing. STATS carries the value and the
  // label; this carries the "so what". Keyed by label so a reordered STATS
  // cannot silently pair a number with the wrong sentence — an index would.
  //
  // Cut to one line each on 11 Aug: four numbers each carrying a heading, a
  // label AND a two-line sentence was more furniture than four numbers can
  // hold up, and the second line of each was most of what made this row as
  // tall as the logo wall it is supposed to be the coda to.
  const STAT_CLAUSE = {
    'Brands woven': 'Identity, content, product.',
    'Countries shipped to': 'Jordan to Bosnia to the Gulf.',
    'Apps & tools in the lab': 'Ours first, then our clients’.',
    'Studios — Amman × Sarajevo': 'One sleeps, one keeps sewing.',
  }

  const STAT_YARN = ['var(--magenta)', 'var(--yarn-blue)', 'var(--yarn-violet)', 'var(--yarn-gold)']

  // "United Colors of Benetton" -> "united-colors-of-benetton". Kept in step
  // with scripts that write static/img/logos/*.svg; a name with no file shows
  // nothing rather than a broken-image glyph (see the `on:error` below).
  const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const logo = (n) => ({ name: n, src: `/img/logos/${slug(n)}.svg` })

  // Alternating rather than first-half / second-half: the three names a
  // stranger already knows (Benetton, UNICEF, Vodafone) would otherwise all
  // sit in the top row and leave the bottom one reading as the B-list.
  const rowA = CLIENT_WALL.filter((_, i) => i % 2 === 0).map(logo)
  const rowB = CLIENT_WALL.filter((_, i) => i % 2 === 1).map(logo)

  let sectionEl = $state(null)
  let bgEl = $state(null)

  // A slow counter-drift on the backdrop only — the weave photograph the old
  // Stats section already carried, kept because it is the one texture on the
  // page that reads as actual cloth. One passive rAF-throttled scroll
  // listener writing a transform straight to the DOM, same idiom as Hero's
  // and Manifesto's own scroll reactions — never a spring, never routed
  // through a second scroll-linked value system.
  onMount(() => {
    if (!browser || reducedMotion.current || !sectionEl) return
    let raf = null
    const update = () => {
      raf = null
      if (!bgEl) return
      const rect = sectionEl.getBoundingClientRect()
      const vh = window.innerHeight || 1
      // offset ['start end', 'end start']
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)))
      bgEl.style.transform = `translateY(${(-8 + progress * 16).toFixed(2)}%)`
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  })

  // A missing SVG must not print the browser's broken-image icon in the middle
  // of a client strip. Hide the cell instead — the marquee closes over the gap.
  const hideBroken = (e) => { e.currentTarget.closest('.pl-cell')?.style.setProperty('display', 'none') }
</script>

<section class="proof" id="proof" aria-label="Clients and studio in numbers" bind:this={sectionEl}>
  <div class="proof-bg" bind:this={bgEl} aria-hidden="true">
    <picture style="display: contents">
      <source media="(max-width: 767px)" type="image/avif" srcset="/img/weave-alt-sm.avif" />
      <source media="(max-width: 767px)" type="image/webp" srcset="/img/weave-alt-sm.webp" />
      <source type="image/avif" srcset="/img/weave-alt.avif" />
      <img src="/img/weave-alt.webp" alt="" width="1400" height="782" loading="lazy" decoding="async" />
    </picture>
  </div>

  <div class="proof-head">
    <p class="kicker"><span>—</span> Proof</p>
    <SplitWords as="h2" class="h2 proof-h2" text="These names already said yes." />
  </div>

  <!-- ——— THE STRIP ———
      Full-bleed, two opposed tracks, each rendering its set twice. The second
      copy is aria-hidden so a screen reader hears the nineteen names once. -->
  <div class="proof-strip" role="group" aria-label="Selected clients">
    {#each [rowA, rowB] as row, r (r)}
      <div class="pl-row{r === 1 ? ' pl-row--rev' : ''}">
        <div class="pl-track">
          {#each [0, 1] as copy (copy)}
            <div class="pl-set" aria-hidden={copy === 1 ? 'true' : undefined}>
              {#each row as c (c.src)}
                <span class="pl-cell">
                  <img
                    class="pl-logo"
                    src={c.src}
                    alt={copy === 0 ? c.name : ''}
                    height="32"
                    loading="lazy"
                    decoding="async"
                    onerror={hideBroken}
                  />
                </span>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- ——— THE NUMBERS ———
      Four across, under the strip, each keeping the clause that turns it from
      a fact into a claim and its own yarn stub — the whole chrome budget. -->
  <div class="proof-stats">
    {#each STATS as s, i (s.label)}
      <div class="proof-stat" style="--yarn: {STAT_YARN[i % 4]}" use:reveal={{ delay: i * 0.05, y: 16 }}>
        <div class="proof-value"><CountUp value={s.value} suffix={s.suffix} /></div>
        <p class="proof-label">{s.label}</p>
        {#if STAT_CLAUSE[s.label]}<p class="proof-clause">{STAT_CLAUSE[s.label]}</p>{/if}
      </div>
    {/each}
  </div>
</section>
