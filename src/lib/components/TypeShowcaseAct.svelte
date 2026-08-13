<!--
  The pinned scroll sequence for #typeface — three screens pinned to one
  viewport: the word is set, centred and large from the first frame, then
  cycles through the pattern cuts while a field of loose glyphs drifts behind
  it, then hands over the copy and the CTAs.

  IT IS A SPECIMEN, SO EVERY BEAT IS A WORD. Not a set of letters that happen
  to spell one — one text node, one baseline, normal sequence, horizontally
  centred, at the largest size that fits the measure. Nothing in this file may
  position a glyph individually; see the beat-zero comment for the scatter
  that used to and what it cost.

  11 Aug 2026 — the section changed families. It used to show LOOM Bloom's
  seven planted flower cuts; it now shows LOOM Patterns: four caps-only display
  cuts (Organic, Retro, Linear, Flora), each drawn TWICE — the pattern inside a
  solid letter (the fill) and the same pattern inside a hollow one (the
  outline). The pairing is the point, so the word here alternates fill/outline
  of one cut before moving to the next, and the rail below groups the faces two
  by two instead of listing eight unrelated names.

  WEIGHT — ALL FOUR CUTS ARE SET HERE NOW (client, 11 Aug 2026: "this section
  skips showing retro and flora fonts"), and the reason they could not be
  before is solved rather than ignored. The full faces are 30/31 KB (Organic),
  84/80 KB (Linear), 111/106 KB (Retro) and 249/221 KB (Flora) — ~913 KB for
  the family, because in these faces the pattern IS the letter, so the file
  scales with the ornament and not with the alphabet.

  But this section sets ONE WORD in them. BLOOM is four distinct glyphs, so
  Linear, Retro and Flora point at BLOOM-only subsets built by
  scripts/subset-patterns-specimen.mjs — the same drawings at the same metrics,
  7.6/6.5, 12.8/11.7 and 23.2/18.7 KB, 80.4 KB for six faces instead of 832.
  Organic is deliberately NOT subset: the ghost field's two Organic rows set
  the whole alphabet and the cut names in it and the canvas field draws
  ornaments from it, so the
  full face is fetched by this section regardless.

  And none of it is fetched up front. Every layer claims its family only once
  the scroll is within ARM_LEAD (~1.5 beats) of its own slice — see
  `near`/`onScreen` and `armed[]` below — so a reader who never reaches
  #typeface pays for none of them, and one who stops half way pays only for
  what they saw. /type is still the giveaway page and carries the full family.

  CAPS ONLY — there is no lowercase in any of these faces (98 glyphs: A–Z,
  0–9, punctuation, accented caps, three ornaments). Every string set in a
  'LOOM …' family in this file is uppercase, and must stay that way.

  Ported from TypeShowcase.jsx's internal `Act` component. Framer's
  useScroll/useTransform (a MotionValue graph that keeps its own subscriber
  list) has no faithful one-line Svelte equivalent, so this rewrites the whole
  graph as ONE reactive scroll progress `p` (a plain $state number, updated by
  a scroll listener throttled to one rAF write per frame — never a spring on
  the main thread, per PORTING.md rule 2) plus a small `interp()` helper that
  does what `useTransform(p, inputRange, outputRange)` did: piecewise-linear
  interpolation, clamped at both ends, unit-aware so it can return `"12.4vw"`
  as easily as a bare number.

  TypeShowcase.svelte wraps an instance of this in `{#key layout+breakpoint}`
  — see its own comment for why: with `p` and the render below both freshly
  re-derived from `layout`/`narrow` on every change already, the port does not
  actually NEED the remount for correctness the way framer's useTransform did
  (a MotionValue handed new ranges mid-life keeps the old ones; a plain
  reactive expression here just recomputes). It is kept anyway because it is
  also what resets this component's own local state — `p`, the per-face
  `armed` flags, the `live` rail index, the glyph field — to a clean slate on
  a breakpoint change, exactly like a fresh mount.
-->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { reducedMotion, nearViewport, magnetic } from '$lib/motion.svelte.js'
  import { wizard } from '$lib/wizard.svelte.js'
  import { LAYOUT_MOTION } from './bloomLayouts.js'

  let { layout, narrow } = $props()

  // THE SPECIMEN WORD — one word, every cut, every beat (client, 11 Aug 2026).
  // A comparative specimen only compares if the variable under test is the
  // ONLY thing that moves: the same five letterforms, redrawn by each cut, in
  // the same place at the same size, is what makes the difference between
  // Organic and Linear visible at a glance. Cycling LOOM / PATTERN / ORGANIC /
  // LINEAR through the beats — what this used to do — changed two things at
  // once and compared nothing.
  //
  // Uppercase in the SOURCE, not via text-transform: a stylesheet is the wrong
  // place to keep a hard requirement of the font (there is no lowercase in any
  // of these faces — one minuscule here falls back to the OS sans, silently).
  const WORD = 'BLOOM'

  // The family, as pairs — all four of them, all four SET. There is no longer
  // a `home` flag: subsetting to the specimen word (see the file header)
  // brought Retro and Flora inside the budget, so nothing here is named
  // without being shown.
  //
  // `label` is the CUT name only. Everything user-visible pairs it with the
  // family — "LOOM Retro" — never a bare "Retro"; see the caption comment.
  const PAIRS = [
    { id: 'organic', label: 'Organic', note: 'zebra ribbons' },
    { id: 'linear', label: 'Linear', note: 'hairline scribble' },
    { id: 'retro', label: 'Retro', note: 'crackle mesh' },
    { id: 'flora', label: 'Flora', note: 'speckle & flowers' },
  ]
  const LABEL_OF = Object.fromEntries(PAIRS.map((pr) => [pr.id, pr.label]))

  // ── the beats ─────────────────────────────────────────────────────────────
  // What the scroll actually cycles through. Every beat sets WORD; the only
  // thing a beat carries is which FACE draws it. BEATS[0] is what the section
  // opens on; the rest dissolve over it, one slice of scroll each. Adding a
  // beat re-times the whole sequence — nothing below hard-codes how many there
  // are.
  //
  // EIGHT BEATS — four cuts, fill then outline, in the rail's own order, so
  // the sequence and the list underneath it read the same way down. The client
  // owns four typefaces and the section showed two; this is the whole of it.
  //
  // `family` is the family the layer CLAIMS. Organic names the full faces
  // (this section sets the whole alphabet in them elsewhere anyway); the other
  // three name the BLOOM-only subsets declared in typeshowcase.css. A subset
  // family is not a different drawing and not different metrics — the word is
  // identical, it is the same font file with 94 unused glyphs removed.
  //
  // NOT `{#key}`: every beat is a layer that mounts once and then only ever
  // has its inline style patched. Remounting a layer per beat would restart
  // its enter animation on every frame the scroll crosses a boundary, which is
  // the "section shakes" bug diagnosed elsewhere in this codebase today.
  const BEATS = [
    { key: 'b0', pair: 'organic', style: 'fill', family: 'LOOM Organic' },
    { key: 'b1', pair: 'organic', style: 'outline', family: 'LOOM Organic Outline' },
    { key: 'b2', pair: 'linear', style: 'fill', family: 'LOOM Linear Specimen' },
    { key: 'b3', pair: 'linear', style: 'outline', family: 'LOOM Linear Outline Specimen' },
    { key: 'b4', pair: 'retro', style: 'fill', family: 'LOOM Retro Specimen' },
    { key: 'b5', pair: 'retro', style: 'outline', family: 'LOOM Retro Outline Specimen' },
    { key: 'b6', pair: 'flora', style: 'fill', family: 'LOOM Flora Specimen' },
    { key: 'b7', pair: 'flora', style: 'outline', family: 'LOOM Flora Outline Specimen' },
  ]

  const CYCLED = BEATS.length - 1
  // The whole sequence must FINISH before act three starts (the earliest
  // layout beat is 0.72) — otherwise the last beats arrive while the word has
  // already shrunk in behind the copy, and they are never really seen as the
  // word.
  const BLOOM_FROM = 0.18
  const BLOOM_TO = 0.66
  const BLOOM_STEP = (BLOOM_TO - BLOOM_FROM) / Math.max(1, CYCLED)
  // Each layer claims its own font only once the scroll is within ARM_LEAD of
  // its slice: one face's worth arrives just ahead of the beat that needs it,
  // and a reader who never reaches #typeface pays for none of them.
  // `armed[n]` never flips back — scrolling up must not drop a face that is
  // already painted.
  const ARM_LEAD = BLOOM_STEP * 1.5

  // All three read straight off the files in static/fonts/loom-patterns and
  // the fonts' own name tables — four cuts, eight woff2/otf/ttf sets, 98
  // glyphs in every one of them.
  const STATS = [['4', 'cuts'], ['8', 'faces'], ['98', 'glyphs each']]

  // ── the scroll-progress graph ─────────────────────────────────────────────
  // num()/unit() split a range endpoint like '29vw' into 29 and 'vw'; interp()
  // is the piecewise-linear, clamped-at-the-ends stand-in for
  // useTransform(p, inputRange, outputRange) — inputRange/outputRange can
  // have more than two points (the kicker and each bloom fade through four),
  // and an outputRange element can be a plain number or a unit-suffixed
  // string; the unit rides along on the interpolated result either way.
  function num(x) { return typeof x === 'number' ? x : parseFloat(x) }
  function unitOf(x) { const m = typeof x === 'string' ? x.match(/[a-z%]+$/i) : null; return m ? m[0] : '' }
  function interp(v, inR, outR) {
    const n = inR.length
    let i
    if (v <= inR[0]) i = 0
    else if (v >= inR[n - 1]) i = n - 2
    else { i = 0; for (let k = 0; k < n - 1; k++) { if (v >= inR[k] && v <= inR[k + 1]) { i = k; break } } }
    const span = inR[i + 1] - inR[i]
    const t = span ? Math.min(1, Math.max(0, (v - inR[i]) / span)) : (v >= inR[i + 1] ? 1 : 0)
    const a = outR[i], b = outR[i + 1]
    const u = unitOf(a) || unitOf(b)
    const val = num(a) + (num(b) - num(a)) * t
    return u ? `${val}${u}` : val
  }

  let wrapEl = $state(null)
  let p = $state(0)

  $effect(() => {
    if (!browser || !wrapEl) return
    let raf = null
    const compute = () => {
      raf = null
      const rect = wrapEl.getBoundingClientRect()
      const total = wrapEl.offsetHeight - window.innerHeight
      p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(compute) }
    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf != null) cancelAnimationFrame(raf)
    }
  })

  // ── the two font-loading gates ────────────────────────────────────────────
  // `near` pre-warms at an 800px lead and is allowed to claim ORGANIC only —
  // 30 KB fill, 31 KB outline, the two cheapest files in the family, and the
  // ones act one needs before the reader can possibly have scrolled to them.
  // On a 390px phone the whole page stacks and #typeface lands ~1000px down —
  // inside 800px + a 664px viewport — so `near` fires at scrollY 0, which is
  // exactly why nothing dearer is allowed to ride on it. Linear (84/80 KB)
  // waits for `onScreen` AND for its own slice's `armed[]` flag.
  let near = $state(false)
  let onScreen = $state(false)
  function armNear(node) { return nearViewport(node, { margin: '800px', onNear: () => { near = true } }) }
  function armOnScreen(node) { return nearViewport(node, { margin: '0px', onNear: () => { onScreen = true } }) }

  const M = $derived(LAYOUT_MOTION[layout][narrow ? 'm' : 'd'])

  // act one — the word is ALREADY SET. The kicker is lit from the very first
  // frame: p = 0 is not a "before" state you scroll past, it is the state an
  // anchor link (`/#typeface`, the nav item) drops a reader straight into, so
  // it has to be the finished specimen and not the run-up to one.
  const kickerO = $derived(interp(p, [0, 0.72, 0.8], [1, 1, 0]))
  const plainO = $derived(interp(p, [BLOOM_FROM + 0.02, BLOOM_FROM + 0.1], [1, 0]))

  // act three — the word steps back, the copy arrives. Every range comes from
  // the active layout's numbers; the shape of the graph never changes, only
  // the destinations, which is what keeps the layout switchable live.
  const b0 = $derived(M.beat[0])
  const b1 = $derived(M.beat[1])
  const wordScale = $derived(interp(p, [b0, b1], M.wordScale))
  const wordY = $derived(interp(p, [b0, b1], M.wordY))
  const wordX = $derived(interp(p, [b0, b1], M.wordX))
  const wordO = $derived(interp(p, [b0, b1], M.wordFade))
  const wordBlurPx = $derived(interp(p, [b0, b1], M.wordBlur))
  const wordFilter = $derived(M.wordBlur[1] ? `blur(${wordBlurPx}px)` : null)
  const copyO = $derived(interp(p, [b0 + 0.06, b1 - 0.04], [0, 1]))
  const copyY = $derived(interp(p, [b0 + 0.06, b1], [M.copyFrom.y, 0]))
  const copyX = $derived(interp(p, [b0 + 0.06, b1], [M.copyFrom.x, 0]))
  const wordShiftStyle = $derived(
    `transform: translate(${wordX}, ${wordY}); opacity: ${wordO};` + (wordFilter ? ` filter: ${wordFilter};` : '')
  )

  // ── the ghost field — eight marquee rows, one per face ───────────────────
  // 13 Aug 2026 — the section used to carry exactly two of these (an alphabet
  // band drifting one way, a row of cut names drifting the other), both tied
  // to the scroll progress `p` via `interp()` like everything else in this
  // file, and both set in Organic only. The client asked for the same ghost
  // treatment down the WHOLE section, in EVERY cut, which is a different
  // animation, not more of the old one:
  //
  // - Scroll-tied drift (`translateX(interp(p, ...))`) covers exactly the
  //   pin's own travel — 0 to 1 of `p` — so a row only ever crosses its lane
  //   ONCE per visit, however far `p` is scrubbed. A texture that is meant to
  //   read as a field of type has to keep moving independently of the pin,
  //   which means it cannot be driven by `p` at all: it needs its own clock.
  //   CSS `animation: … infinite` is that clock, and it is also the only one
  //   of the two that keeps running on the main thread doing nothing (no
  //   scroll listener, no rAF, no reactive write) — eight of these do not
  //   cost what two scroll-linked `interp()` reads did.
  // - A single long string sliding under `translateX` was never seamless in
  //   the first place — it runs out and snaps. It read as fine at two rows
  //   because both strings were long enough that the snap sat off-screen for
  //   the ~600vh of scroll a reader actually covers. Eight rows down the full
  //   height, moving on their own clock instead of a bounded scroll range,
  //   will run long enough that the snap becomes visible — so each row's
  //   track is TWO adjacent copies of the same text, animated from 0 to -50%
  //   (or the reverse), which is exactly one copy's width: the frame the loop
  //   restarts on is pixel-identical to the frame before it.
  //
  // GLYPH BUDGET: Linear, Retro and Flora are fetched here as the SAME
  // BLOOM-only subsets the specimen layers use (see the file header and
  // typeshowcase.css) — B, L, O, M and nothing else. A row set in one of
  // those three families is therefore built out of "BLOOM" and cannot say
  // anything else: the alphabet and the cut-name text stay on Organic, the
  // one face fetched whole. Reusing the subsets rather than widening them (or
  // shipping a ninth font file) is the only reason six of these eight rows
  // are free — see GHOST_TEXT_BLOOM below.
  //
  // GATING: the organic rows ride on `near` like the rest of the cheap face;
  // the other six ride on `onScreen` only, NOT the beats' `armed[]` schedule.
  // `armed[]` exists to spread ~913 KB of full faces across ~600vh of scroll
  // so a reader who stops halfway never fetches the back half of the family.
  // Subset to BLOOM the six of them together are 80 KB — the trade that
  // justifies staggering a beat by beat does not exist at that size, so the
  // simpler gate (arrive with the section, not with a particular scroll
  // position inside it) is the honest one.
  const GHOST_TEXT_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789   '.repeat(4)
  const GHOST_TEXT_NAMES = 'ORGANIC ✿ RETRO ❀ LINEAR ❦ FLORA ✿ '.repeat(4)
  // Every letter here is a glyph the BLOOM subsets actually contain — B, L,
  // O, M — so this is the only string that may be set in Linear, Retro or
  // Flora. Do not add another word to it without rerunning
  // scripts/subset-patterns-specimen.mjs first (see that script's header).
  const GHOST_TEXT_BLOOM = 'BLOOM   '.repeat(10)

  // Eight rows, one per face, alternating direction so no two neighbours
  // drift the same way — `dir` also picks the keyframe in CSS (`ghost-drift-
  // left` / `ghost-drift-right`). `size` alternates lg/sm on top of that so
  // the field reads as layered depth rather than a stack of identical rules.
  // `dur` is deliberately irregular (none of the eight share a period with
  // another) so the rows drift in and out of phase with each other instead
  // of ever lining up into a single visible wall of type.
  const GHOST_ROWS = [
    { dir: 'left', size: 'lg', tone: 'fill', gate: 'near', family: "'LOOM Organic'", text: GHOST_TEXT_ALPHA, dur: 46 },
    { dir: 'right', size: 'sm', tone: 'fill', gate: 'onScreen', family: "'LOOM Linear Specimen'", text: GHOST_TEXT_BLOOM, dur: 58 },
    { dir: 'left', size: 'lg', tone: 'fill', gate: 'onScreen', family: "'LOOM Retro Specimen'", text: GHOST_TEXT_BLOOM, dur: 39 },
    { dir: 'right', size: 'sm', tone: 'fill', gate: 'onScreen', family: "'LOOM Flora Specimen'", text: GHOST_TEXT_BLOOM, dur: 63 },
    { dir: 'left', size: 'lg', tone: 'outline', gate: 'onScreen', family: "'LOOM Organic Outline'", text: GHOST_TEXT_NAMES, dur: 51 },
    { dir: 'right', size: 'sm', tone: 'outline', gate: 'onScreen', family: "'LOOM Linear Outline Specimen'", text: GHOST_TEXT_BLOOM, dur: 55 },
    { dir: 'left', size: 'lg', tone: 'outline', gate: 'onScreen', family: "'LOOM Retro Outline Specimen'", text: GHOST_TEXT_BLOOM, dur: 44 },
    { dir: 'right', size: 'sm', tone: 'outline', gate: 'onScreen', family: "'LOOM Flora Outline Specimen'", text: GHOST_TEXT_BLOOM, dur: 67 },
  ]
  // Two separate style strings per row, because the two things they set live
  // on two different elements: `trackStyle` carries `--ghost-dur` for the
  // TRACK's own `animation-duration: var(--ghost-dur, …)`, and `segStyle`
  // carries the gated `font-family` for the two text SPANS inside it. They
  // cannot be merged onto one element — `.ts-ghost-row__seg` below declares
  // its own `font-family` fallback directly on the span (it has to, that is
  // where the text actually sits), and a plain CSS declaration on an element
  // always wins over one it merely inherited from an ancestor's inline
  // style, however specific that ancestor's rule looks. Setting the family
  // on `.ts-ghost-row__track` here first and learning that the inherited
  // value never actually reached the span — every row kept rendering in the
  // Clash Display fallback no matter how long the gate had been open — is
  // why this is two strings and not one.
  const ghostRows = $derived(GHOST_ROWS.map((r) => ({
    ...r,
    trackStyle: `--ghost-dur: ${r.dur}s;`,
    segStyle: (r.gate === 'near' ? near : onScreen) ? `font-family: ${r.family};` : '',
  })))

  // ── which beat is on top right now ───────────────────────────────────────
  // Drives the rail's lit pip and the face label under the word, so it has to
  // agree with what is actually PAINTED. Slicing the scroll arithmetically
  // (`1 + floor((p - FROM) / STEP)`) does not: the layers cross-fade, so for
  // most of a slice the named beat is still ramping up while the previous one
  // is still the one you can see — measured in WebKit at 1440, the label read
  // "LINEAR FILL" over a word that was 99% Organic Outline. Reading the
  // opacities the layers are actually given cannot drift, whatever the ramps
  // are later retuned to.
  // ONE KIND OF HANDOFF: a wide-open dissolve, on every boundary.
  //
  // This used to need two. Beats that shared a word could cross-fade with the
  // layers wide open on top of each other — identical letters in identical
  // places, one word turning from solid to hollow — but beats that CHANGED the
  // word could not: measured in WebKit at 1440, "PATTERN" fading in over
  // "ORGANIC" at 50/50 rendered as "PATCHERN", two strings superimposed, which
  // reads as a rendering fault. Those had to hand over almost sequentially,
  // with a lift, so the cut read as deliberate.
  //
  // With one word for the whole section there is no such boundary left. Every
  // pair of adjacent layers now sets the same five letters at the same size in
  // the same place, so every transition can be the good one: both layers open
  // for most of a slice and what you watch is BLOOM being redrawn — solid to
  // hollow, Organic to Linear — without a single letter moving. Nothing
  // translates and nothing scales during a dissolve, on purpose: a 1px
  // mismatch between two superimposed copies of the same word is a ghost.
  function ramp(i) {
    const n = i - 1
    const a = BLOOM_FROM + n * BLOOM_STEP
    const inA = a
    const inB = a + BLOOM_STEP * 0.64
    if (i === CYCLED) return { inA, inB, last: true }
    return { inA, inB, outA: a + BLOOM_STEP, outB: a + BLOOM_STEP * 1.64, last: false }
  }
  const RAMPS = BEATS.slice(1).map((_, n) => ramp(n + 1))

  const opacities = $derived(RAMPS.map((r) => (
    r.last
      ? interp(p, [r.inA, r.inB], [0, 1])
      : interp(p, [r.inA, r.inB, r.outA, r.outB], [0, 1, 1, 0])
  )))
  const liveIndex = $derived.by(() => {
    let best = 0
    let bestO = plainO
    opacities.forEach((o, n) => { if (o > bestO) { bestO = o; best = n + 1 } })
    return best
  })
  const liveBeat = $derived(BEATS[liveIndex])

  // ── beat zero: the word, set ──────────────────────────────────────────────
  // 11 Aug 2026 — THE SCATTER IS GONE, and this is the fix the client's
  // "this section got downgraded" was about. Beat zero used to split WORD into
  // four <span>s and give each one its own deterministic offset out of a
  // SCATTER table (±46px across, ±170px down, ±14deg), interpolated back to
  // zero over p 0 → ~0.11. Everything after p = 0.11 was a properly set word;
  // everything before it was four loose glyphs at four different heights with
  // the face caption stranded in the hole between them, at 0.55 opacity so the
  // ink read as a washed mid-grey and the pattern inside the letterforms — the
  // only reason this section exists — did not resolve at all.
  //
  // That state is not an edge case. `#typeface` is a nav item; an anchor jump
  // lands at exactly p = 0, so the scatter WAS the section for anyone who
  // arrived by link, and it is the first screen of the pin for everyone else.
  // A type specimen has one job: the letterforms, together, big.
  //
  // What replaces it is one text node on one baseline, in normal sequence at
  // full ink from the first frame, with the only motion a specimen is allowed:
  // the tracking closes. `letter-spacing` cannot move a letter off the
  // baseline or out of order however far the scroll is scrubbed, so there is
  // no value of `p` at which this can read as debris. Same node, patched
  // inline — no `{#key}`, same rule as the cycled layers below.
  const plainTrack = $derived(
    reducedMotion.current ? '0.004em' : interp(p, [0, 0.13], ['0.055em', '0.004em'])
  )
  const plainStyle = $derived(
    `opacity: ${plainO}; letter-spacing: ${plainTrack};` +
      (near ? ` font-family: 'LOOM Organic';` : '')
  )

  // the cycled layers, each arriving over its own slice
  let armed = $state(Array(CYCLED).fill(false))
  $effect(() => {
    if (!browser) return
    const v = p
    for (let n = 0; n < CYCLED; n++) {
      const a = BLOOM_FROM + n * BLOOM_STEP
      if (!armed[n] && v >= a - ARM_LEAD) armed[n] = true
    }
  })
  // The cycled layers. OPACITY IS THE ONLY THING THAT MOVES — no scale settle,
  // no lift. Every layer sets the same word at the same size on the same
  // baseline, so the dissolve is a genuine redraw of one object; a settle or a
  // lift would put two slightly-offset copies of BLOOM on screen at once and
  // that ghosts. See the ramp() comment above.
  const blooms = $derived(BEATS.slice(1).map((f, n) => {
    const opacity = opacities[n]
    // Organic's outline is the cheap one and rides on `near` with its fill;
    // anything else additionally waits for the section to be genuinely on
    // screen, so a reader who never gets here never fetches it.
    const cheap = f.pair === 'organic'
    const isArmed = armed[n] && (cheap ? near : onScreen)
    return {
      key: f.key,
      style: `opacity: ${opacity};` + (isArmed ? ` font-family: '${f.family}';` : ''),
      klass: f.style === 'outline' ? 'ts-layer--outline' : 'ts-layer--fill',
    }
  }))

  // ── the drifting glyph field — canvas, not DOM ────────────────────────────
  // Loose caps and ornaments out of the family itself, at 5-17% alpha. CAPS
  // AND ORNAMENTS ONLY: 'LOOM Organic' has no lowercase, so a stray minuscule
  // here would silently paint in the OS sans.
  let canvasEl = $state(null)
  $effect(() => {
    if (!browser) return
    const active = near
    const reduced = reducedMotion.current
    const cv = canvasEl
    if (!cv || reduced) return
    const ctx = cv.getContext('2d')
    let raf, w = 0, h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const glyphs = ['B', 'L', 'O', 'M', 'A', '✿', '❀', '❦']
    // seeded so the field is identical every mount — no layout lottery
    let seed = 7
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const bits = Array.from({ length: 42 }, () => ({
      x: rnd(), y: rnd(), s: 22 + rnd() * 58, v: 0.12 + rnd() * 0.5,
      g: glyphs[Math.floor(rnd() * glyphs.length)], a: 0.05 + rnd() * 0.12, rot: rnd() * Math.PI * 2,
      spin: (rnd() - 0.5) * 0.004,
    }))
    const size = () => {
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = w * dpr; cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    window.addEventListener('resize', size)
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const b of bits) {
        b.y -= b.v / h
        b.rot += b.spin
        if (b.y < -0.12) { b.y = 1.12; b.x = rnd() }
        ctx.save()
        ctx.translate(b.x * w, b.y * h)
        ctx.rotate(b.rot)
        ctx.globalAlpha = b.a
        ctx.fillStyle = '#f21c8c'
        ctx.font = `${b.s}px "LOOM Organic", sans-serif`
        ctx.fillText(b.g, 0, 0)
        ctx.restore()
      }
      raf = requestAnimationFrame(draw)
    }
    if (active) raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  })

  function commissionType() {
    wizard.open({ intent: 'brand', note: 'I want a custom typeface / lettering system.' })
  }
</script>

<section class="ts ts--{layout}" id="typeface" bind:this={wrapEl} use:armNear use:armOnScreen>
  <div class="ts-sticky">
    <canvas bind:this={canvasEl} class="ts-petals" aria-hidden="true"></canvas>

    <!-- the ghost field — eight marquee rows stacked down the full height of
         the section, alternating direction, one per face of the family. See
         the GHOST_ROWS comment in the script block for why this is a CSS
         clock and not a scroll-tied transform, and for the BLOOM-only text
         budget on the three subset cuts. Each row's track is its text TWICE,
         back to back — the loop point is where copy 2 replaces copy 1 with
         an identical frame, which is what makes it seamless without JS
         measuring anything. -->
    <div class="ts-ghost-field" aria-hidden="true">
      {#each ghostRows as row, i (i)}
        <div class="ts-ghost-row ts-ghost-row--{row.dir} ts-ghost-row--{row.size} ts-ghost-row--{row.tone}">
          <div class="ts-ghost-row__track" style={row.trackStyle}>
            <span class="ts-ghost-row__seg" style={row.segStyle}>{row.text}</span>
            <span class="ts-ghost-row__seg" style={row.segStyle}>{row.text}</span>
          </div>
        </div>
      {/each}
    </div>

    <p class="ts-kicker" style:opacity={kickerO}>
      <span>◆</span> Our own typeface — four cuts, eight faces, free
    </p>

    <!-- the word: six stacked layers, every one of them a WORD — one text node
         each, set on one baseline in normal sequence, centred by CSS. They
         cross-fade; none of them is ever taken apart into loose glyphs.
         Three nested boxes, one job each: the anchor CENTRES the word (pure
         CSS, so no scroll value has to spend itself on centring), the shift
         TRAVELS it in viewport units, the word SCALES. Splitting travel from
         scale is what lets a layout say "30vh down" and mean it — a single
         element would have to express that as a percentage of its own
         clamp()ed line box, which changes with the width. -->
    <div class="ts-word-anchor">
      <div class="ts-word-shift" style={wordShiftStyle}>
        <div class="ts-word" style="transform: scale({wordScale});">
          <div class="ts-layer ts-layer--fill ts-layer--plain" style={plainStyle}>{WORD}</div>
          {#each blooms as b (b.key)}
            <div class="ts-layer ts-layer--cut {b.klass}" style={b.style}>{WORD}</div>
          {/each}
        </div>
        <!-- The specimen caption. It belongs TO the word — same centred column,
             directly under the baseline, carried by the same shift transform —
             which is why it is inside .ts-word-shift and not floating in the
             composition. (It read as "marooned in the dead centre" only
             because the word above it used to be scattered around it; with the
             word set, this is the line under it.)
             One node, text patched. Set in the BODY font on purpose: a caption
             set in a caps-only display face is a caption you cannot read.

             IT NAMES THE FAMILY, not just the cut — "LOOM Organic", never a
             bare "Organic". The specimen word is now BLOOM, which is also the
             name of the studio's OTHER (older) typeface family, so a lone cut
             name sitting under it could be read as though BLOOM were the thing
             being named. "LOOM Organic — Fill" cannot be. -->
        <p class="ts-face-label" aria-hidden="true">
          <i class="ts-face-rule"></i>
          <span class="ts-face-cut">LOOM {LABEL_OF[liveBeat.pair]}</span>
          <span class="ts-face-style">{liveBeat.style === 'fill' ? 'Fill' : 'Outline'}</span>
          <i class="ts-face-rule"></i>
        </p>
      </div>
    </div>

    <!-- the rail — one row per CUT, two pips per row, so the eight faces read
         as four pairs and not as eight names. All four are lit: every one of
         them gets a beat now, and the pips are the progress bar of the
         sequence you are scrubbing. -->
    <div class="ts-rail" aria-hidden="true">
      {#each PAIRS as pr (pr.id)}
        <span class="ts-rail-item {liveBeat.pair === pr.id ? 'is-live' : ''}">
          <span class="ts-rail-pips">
            <i class="{liveBeat.pair === pr.id && liveBeat.style === 'fill' ? 'is-lit' : ''}"></i>
            <i class="ts-pip--outline {liveBeat.pair === pr.id && liveBeat.style === 'outline' ? 'is-lit' : ''}"></i>
          </span>
          {pr.label}
        </span>
      {/each}
    </div>

    <!-- the slot PLACES (it is what each layout repositions), the block
         inside MOVES — so a layout can park the copy anywhere with plain CSS
         without fighting the scroll transform. -->
    <div class="ts-copy-slot">
      <div class="ts-copy" style="opacity: {copyO}; transform: translate({copyX}px, {copyY}px);">
        <h2 class="ts-h2">We didn't license a font. We drew four.</h2>
        <p class="ts-lede">
          Four caps-only display cuts — Organic, Retro, Linear, Flora — each
          drawn twice: the pattern inside a solid letter, and the same pattern
          inside a hollow one.
          <span class="ts-lede-more">
            Eight faces, 98 glyphs each, no foundry and no licence fee.
          </span>
          Free to download, and the shortest answer we have to <em>“can you make…?”</em>
        </p>
        <div class="ts-stats">
          {#each STATS as [n, l] (l)}
            <!-- The figures are NOT set in the family, and that is the family
                 being taken seriously rather than ignored: this box is
                 clamp(28px, 3.4vw, 46px) and drops to 30px on a phone, which
                 is under the ~40px floor where the pattern stops resolving.
                 Set in Organic they rendered as three smudges — a specimen
                 arguing against itself. The 300px word above is where the
                 face gets shown. -->
            <div class="ts-stat">
              <span class="ts-stat-n">{n}</span>
              <span class="ts-stat-l">{l}</span>
            </div>
          {/each}
        </div>
        <div class="ts-cta">
          <div class="magnetic" use:magnetic={{ strength: 0.2 }}>
            <a class="ts-btn ts-btn--fill" href="/type">
              Open the specimen<span aria-hidden="true">→</span>
            </a>
          </div>
          <button type="button" class="ts-btn" onclick={commissionType}>Commission your own</button>
        </div>
      </div>
    </div>
  </div>
</section>
