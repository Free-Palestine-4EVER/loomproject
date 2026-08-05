// Flutter (id 'b', the shipping default) — a swallowtail working a flower
// bed. Two mechanisms make this profile a genuinely different MACHINE from
// Glider and Darter, not a retuned copy of the same one-axis hinge:
//
//   1. THE WINGS NEVER STOP. glideiness stays 0 forever — Companion's own
//      "hold wings open and coast" glide is never allowed through — and the
//      beat rate is driven directly (flapRate), not left to the burst
//      envelope, so the flutter is a constant, higher-frequency hum the
//      whole time, hovering included. The Lissajous loop the wing rig
//      already traces at the tip (pronation + sweep, phase-offset off the
//      SAME stroke wave — see butterfly-model.js's wingCycle) is tuned wide
//      and snappy: crisp reversals (a fast, asymmetric downstrokeFrac while
//      travelling), a pronation phase quartered against the stroke so the
//      wing visibly flips right at each reversal, and a tight membrane lag
//      so the membrane never trails far behind. That combination is what
//      reads as a figure-eight at the tip when you freeze a frame, not a fan.
//
//   2. A SELF-DIRECTED TRAVEL/HOVER STATE MACHINE, running on its own clock
//      (ctx.t), independent of scroll. It alternates two legs — a "travel"
//      leg (a fine lateral zig-zag path offset, a more vertical-reading
//      stroke plane, normal buffet response) and a "hover" leg (a slow,
//      literal figure-eight loiter path offset — a 2:1 Lissajous, distinct
//      from the wing's own tip-loop — a wider/flatter-reading stroke plane,
//      buffet RESISTANCE so it visibly holds its ground against a scroll
//      flick, and a steeper nose-up body). The two legs cross-fade through
//      one damped `hoverMix` scalar — never a hard cut — so nothing in the
//      wing rig, the attitude gains or the path offsets can pop at a
//      transition, no matter how the two signals' own frequencies compare.
//
// Body attitude: a constant nose-up cruiseAoA bias (steeper while hovering)
// stands in for "hangs under its own wings"; bank stays low baseline
// ("almost no roll") and only opens up as a CONSEQUENCE of the zig-zag's own
// lateral velocity, exactly the way Companion's roll system already works —
// this profile never touches roll directly, only the gains that shape it.
//
// Edited ONLY here — this file never needs to touch the registry,
// Companion.js or the model. See Companion.js's header for the full ctx/
// drive contract this update() reads and returns.

// Frame-rate-independent exponential ease, same shape as Companion's own
// damp() helper (THREE.MathUtils.damp) — a per-SECOND rate, not a
// per-frame fraction, and dt===0 snaps straight to target (the
// reduced-motion static frame). This file never imports three, so it is
// reimplemented locally rather than reaching into Companion's module.
function damp(cur, target, rate, dt) {
  return dt > 0 ? target + (cur - target) * Math.exp(-rate * dt) : target
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

// 1/s cross-fade rate between the travel and hover legs — about 0.6-0.8s to
// settle, slow enough to never read as a cut, fast enough to still feel like
// a decision rather than a drift.
const HOVER_MIX_RATE = 5.2

export default {
  id: 'b',
  label: 'Flutter',

  init(ctx) {
    return {
      mode: 'travel',
      hoverMix: 0,
      hoverTarget: 0,
      // First travel leg is short so a hover pause reads within a couple of
      // seconds of the butterfly appearing, not just eventually. Randomized
      // off ctx.rng, fresh every activation — see the header for why.
      tNext: ctx.t + 1.6 + ctx.rng() * 1.6,
      zigPhase: ctx.rng() * Math.PI * 2,
      hoverPhase: ctx.rng() * Math.PI * 2,
    }
  },

  update(ctx, state) {
    if (ctx.t >= state.tNext) {
      if (state.mode === 'travel') {
        state.mode = 'hover'
        state.hoverTarget = 1
        // "a beat or two" — 1.4-2.7s near-stationary before moving on.
        state.tNext = ctx.t + 1.4 + ctx.rng() * 1.3
      } else {
        state.mode = 'travel'
        state.hoverTarget = 0
        // Purposeful travel legs — long enough to actually go somewhere
        // before the next pause.
        state.tNext = ctx.t + 3.0 + ctx.rng() * 2.4
      }
    }
    state.hoverMix = damp(state.hoverMix, state.hoverTarget, HOVER_MIX_RATE, ctx.dt)
    const m = state.hoverMix

    // ── path: a fine lateral zig-zag while travelling, a slow literal
    // figure-eight loiter (a 2:1 Lissajous — a different frequency ratio
    // than the wingtip's own 1:1 loop, so the two never read as the same
    // shape at two scales) while hovering. Cross-faded by `m`, so the sum
    // stays continuous through every transition even though each signal
    // runs its own frequency and phase.
    const zigX = Math.sin(ctx.t * 1.05 + state.zigPhase) * 0.05
      + Math.sin(ctx.t * 0.37 + state.zigPhase * 1.7) * 0.02
    const zigY = Math.sin(ctx.t * 0.6 + state.zigPhase * 0.5) * 0.022
    const zigDepth = Math.sin(ctx.t * 0.5 + state.zigPhase) * 0.16

    const hoverX = Math.sin(ctx.t * 1.6 + state.hoverPhase) * 0.045
    const hoverY = Math.sin(ctx.t * 3.2 + state.hoverPhase) * 0.024
    const hoverDepth = Math.sin(ctx.t * 1.6 + state.hoverPhase + 1.2) * 0.11

    // ── wing rig: the stroke plane reads more vertical (narrow sweep,
    // punchy pronation, fast/asymmetric reversal) while travelling, more
    // horizontal (wide sweep, rounder reversal) while hovering — same
    // hinges, a different shape traced at the tip.
    // SMOOTHNESS FIRST — see glider.js's rig block for why these three
    // stay small on every profile (symmetric stroke, coupled fore/hind).
    // The travel/hover difference now lives in RATE and DEPTH, which reads
    // as a change of intent; it used to live in a deformed stroke shape,
    // which just read as broken.
    const downstrokeFrac = lerp(0.48, 0.5, m)
    const pronationAmp = lerp(0.16, 0.12, m)
    const sweepAmp = lerp(0.05, 0.07, m)
    const sweepPhase = lerp(0.03, -0.02, m)
    const bobAmp = lerp(0.95, 1.15, m)
    const tiltAmp = lerp(1.05, 0.85, m)

    return {
      idleWanderAmp: lerp(0.6, 1.3, m),
      buffetAmp: lerp(1.0, 0.32, m), // holds its ground against a scroll flick while hovering
      burstiness: lerp(1.05, 0.7, m),
      glideiness: 0, // never coasts to a held glide — the wings never stop

      flapRate: lerp(4.0, 4.6, m), // beats/second — visibly beating, but slow enough to READ as an open/close rather than strobe

      pathXOffset: lerp(zigX, hoverX, m),
      pathYOffset: lerp(zigY, hoverY, m),
      pathDepthOffset: lerp(zigDepth, hoverDepth, m),

      // Slow enough that the heading can never swing round inside a single
      // wingbeat. At 11/s the time constant was ~0.09s against a ~0.23s
      // beat, so ordinary path jitter yawed the whole body mid-stroke and
      // the flight read as twitchy no matter how clean the wing was.
      headingDampRate: lerp(4.2, 3.2, m),
      bankGain: lerp(0.30, 0.22, m),
      bankMax: lerp(0.36, 0.22, m),
      bankDampRate: lerp(4.6, 4.0, m),
      aoaGain: lerp(0.45, 0.40, m),
      aoaMax: lerp(0.48, 0.52, m),
      aoaDampRate: lerp(4.6, 4.0, m),
      cruiseAoA: lerp(0.30, 0.40, m), // ~17deg nose-up travelling, ~23deg hanging while hovering

      rig: {
        downstrokeFrac,
        pronationAmp,
        pronationPhase: 0.25, // quarter-cycle: the wing turns over at each reversal
        sweepAmp,
        sweepPhase,
        hindPhase: 0.02, // fore and hind effectively coupled — they must not scissor
        membraneLagFrac: 0.11, // soft trailing edge; too tight reads as a stiff flat plank
        membraneCamber: 0.95,
        bobAmp,
        tiltAmp,
      },
    }
  },

  dispose() {},
}
