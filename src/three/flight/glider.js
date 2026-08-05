// Glider (id 'a') — a monarch riding a thermal: serene, weightless, unhurried.
//
// THE MECHANISM: real intermittent flight. Every other profile keeps the
// wings moving at some rate at all times; this one is the only one that
// genuinely STOPS them. It cycles between a short, confident BURST (working
// the wings hard, climbing) and a long, held GLIDE (wings parked in a fixed
// shallow dihedral, completely still, sinking gently) — the flap-then-soar
// rhythm real Lepidoptera use to ride a thermal.
//
// One scalar, `work` (0 = fully parked, 1 = fully beating), damped in and
// out of that state, is multiplied through every rig field that would
// otherwise keep moving on its own — pronation, sweep, body bob/tilt — so
// the hold reads as a genuine stop, not a slow-down: at work=0 every one of
// those terms is exactly zero, not just small. `kick`, a short one-shot
// decaying straight after a burst starts, layers a bit of extra twist onto
// only the first couple of downstrokes — the strongest one in the burst,
// same as the real thing.
//
// Body attitude and the flight path lean the same way on purpose: the climb
// happens DURING the burst (working the wings buys altitude) and the sink
// happens DURING the hold (a long, graceful glide down) — so Companion's own
// velocity-derived AoA (nose up climbing, nose down diving) reads as a real
// consequence of this profile's own choices, not a separate hand-tuned
// wobble bolted on top. A slow, independent lateral drift (its own clock,
// not scroll) gives the wide, long-radius arcs the brief asks for, and the
// heading/bank gains below are tuned slow-to-commit and slow-to-release —
// once it banks into a turn it holds the bank through the arc instead of
// springing back out of it.
//
// Edited ONLY here — this file never needs to touch the registry,
// Companion.js or the model. See Companion.js's header for the full ctx/
// drive contract this update() reads and returns.

// Local damp — the same per-second-rate formula THREE.MathUtils.damp uses,
// reimplemented here so this file needs no import. dt === 0 (Companion's
// reduced-motion static frame) snaps straight to target, same contract
// Companion's own damp() promises.
function damp(cur, target, rate, dt) {
  return dt > 0 ? target + (cur - target) * Math.exp(-rate * dt) : target
}

// Phase durations, seconds. Bursts are short — a handful of beats at 5-6Hz
// is well under a second. Holds run long and vary more, so the rhythm never
// reads as a metronome.
const BURST_MIN = 0.55, BURST_RANGE = 0.5   // 0.55 - 1.05s (~3-5 beats)
const HOLD_MIN = 1.7, HOLD_RANGE = 2.0      // 1.7 - 3.7s

const WORK_RISE = 7.5   // confident onset into a burst
const WORK_FALL = 2.0   // slow, graceful deceleration settling into the hold
const KICK_DECAY = 6.0  // the first-downstroke emphasis fades over ~0.4-0.5s

// Altitude is a bounded oscillator, not an integrator: it always damps
// toward one of these two fixed targets, so it can never drift no matter
// how long the session runs.
const ALT_HIGH = 0.30   // climb ceiling reached under power (world-normalized y)
const ALT_LOW = -0.28   // how far the long glide is allowed to sink
const ALT_RISE = 0.9    // climb rate while bursting
const ALT_SINK = 0.22   // sink rate while holding — slow: a LONG descending glide

const TURN_FREQ = 0.085 // rad/s — one lazy arc takes well over a minute

export default {
  id: 'a',
  label: 'Glider',

  init(ctx) {
    return {
      phase: 'burst',
      phaseT: 0,
      // The first burst is short and arrives almost immediately, so the
      // signature reads right away rather than after a long wait.
      phaseDur: 0.45 + ctx.rng() * 0.3,
      work: 0,
      kick: 1,
      altitude: 0,
      burstRate: 3.3 + ctx.rng() * 0.7, // Hz — re-rolled every burst so it never repeats identically
      turnPhase: ctx.rng() * Math.PI * 2,
      depthPhase: ctx.rng() * Math.PI * 2,
    }
  },

  update(ctx, state) {
    // ── the intermittent-flight state machine ──
    state.phaseT += ctx.dt
    if (state.phaseT >= state.phaseDur) {
      state.phaseT = 0
      if (state.phase === 'burst') {
        state.phase = 'hold'
        state.phaseDur = HOLD_MIN + ctx.rng() * HOLD_RANGE
      } else {
        state.phase = 'burst'
        state.phaseDur = BURST_MIN + ctx.rng() * BURST_RANGE
        state.burstRate = 3.3 + ctx.rng() * 0.7
        state.kick = 1 // the downstroke about to happen is the strongest one in the burst
      }
    }

    const working = state.phase === 'burst'
    state.work = damp(state.work, working ? 1 : 0, working ? WORK_RISE : WORK_FALL, ctx.dt)
    state.kick = damp(state.kick, 0, KICK_DECAY, ctx.dt)

    // ── altitude: climb under power, sink on the glide ──
    state.altitude = damp(state.altitude, working ? ALT_HIGH : ALT_LOW, working ? ALT_RISE : ALT_SINK, ctx.dt)

    // ── wide, slow, independent lateral wander — its own clock, not scroll ──
    const turn = Math.sin(ctx.t * TURN_FREQ + state.turnPhase)
    const depthDrift = Math.sin(ctx.t * TURN_FREQ * 0.6 + state.depthPhase)

    const w = state.work
    const k = state.kick

    return {
      // Weightless, unhurried: barely reacts to the reader's own scroll
      // jitter — the big, slow motion above is this creature's own idea,
      // not a response to being scrolled at.
      idleWanderAmp: 0.55,
      buffetAmp: 0.35,

      pathXOffset: turn * 0.24,
      pathYOffset: state.altitude,
      pathDepthOffset: depthDrift * 0.35,

      // This profile owns amplitude and rate outright via work/kick — the
      // host's own burst-envelope/auto-glide system never gets a say.
      flapWeight: w,
      flapRate: 1.2 + (state.burstRate - 1.2) * w,

      // Sailplane attitude: slow to commit to a new heading, holds a bank
      // through the whole arc instead of snapping back out of it, gentle
      // angle of attack so it reads close to horizontal at all times.
      headingDampRate: 3.2,
      bankGain: 0.36,
      bankMax: 0.55,
      bankDampRate: 1.25,
      aoaGain: 0.4,
      aoaMax: 0.2,
      aoaDampRate: 1.6,
      cruiseAoA: 0.015,

      rig: {
        // SMOOTHNESS FIRST. The wings read as one surface opening and
        // closing, so the three terms that can break that read are kept
        // small on every profile:
        //   downstrokeFrac 0.5 = a symmetric stroke. Anything much under
        //     that snaps the wing down and crawls it back up, which is the
        //     jerk you see before anything else.
        //   sweepAmp/hindPhase near zero = fore and hind stay coupled. A
        //     real fore/hind offset makes the two wings scissor past each
        //     other and the whole animal looks broken.
        // What makes THIS profile itself is the burst/hold rhythm and the
        // slow deep beat above — not a mangled wing.
        downstrokeFrac: 0.5,
        // Gated by `work` so it vanishes exactly at a hold rather than
        // merely fading; `kick` puts a touch more twist on the first
        // downstroke of a fresh burst.
        pronationAmp: w * (0.15 + 0.05 * k),
        sweepAmp: w * (0.045 + 0.02 * k),
        hindPhase: 0.02,       // fore and hind effectively coupled
        membraneLagFrac: 0.13, // soft trailing edge — reads as smooth, not floppy
        membraneCamber: 0.9 + 0.25 * k,
        bobAmp: 0.9 * w,
        tiltAmp: 1.0 * w,
      },
    }
  },

  dispose() {},
}
