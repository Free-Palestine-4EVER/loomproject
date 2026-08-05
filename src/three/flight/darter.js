// Darter (id 'c') — evasive: flies fast and straight, then breaks hard off
// its line without warning, as if something is behind it. The defining
// mechanic the brief asks for is ASYMMETRIC STROKE STEERING (roll/yaw
// literally caused by beating one wing harder than the other) — see the
// honest note below on why that exact mechanism is NOT reachable from this
// file, and what is built instead to get as close to its READ as the
// contract allows.
//
// Edited ONLY here — this file never needs to touch the registry,
// Companion.js or the model. See Companion.js's header for the full ctx/
// drive contract this update() reads and returns.
//
// ── why this isn't literal per-wing asymmetric drive, and what stands in ──
// WING_RIG_DEFAULTS (butterfly-model.js) has exactly one value per field —
// strokeAmp, pronationAmp, sweepAmp, etc. — applied identically to both
// sides; `sx` only flips the SIGN for mirroring, never the magnitude
// (butterfly-model.js's update(): `hinge.rotation.y = sx * (...)` runs the
// same `angle` for every hinge sharing a wing, left or right). There is no
// leftStrokeAmp/rightStrokeAmp (or similar per-side multiplier) in the
// `drive.rig` surface this profile can write to, so a real "right wing
// beats harder than left, and THAT throws the body into a roll" cannot be
// authored from a flight profile as this contract stands — it would need a
// new per-side field on WING_RIG_DEFAULTS plus a change to the hinges.forEach
// loop in butterfly-model.js, which this task explicitly forbids editing.
//
// What IS built instead, entirely legitimately through the existing
// pipeline (see Companion.js:490-545): a signed 2D impulse is injected into
// pathXOffset/pathYOffset on an unpredictable schedule. Companion turns the
// resulting position change into real velocity (this._move / dt), smooths
// it, and DERIVES bank/heading/AoA from that velocity — so the roll and yaw
// you see are a genuine downstream CONSEQUENCE of a body-motion event this
// profile caused, not a bank value written directly. At the exact same
// instant, a "punch" envelope (below) spikes flapWeight to a single hard
// stroke and snaps pronationAmp/sweepAmp/downstrokeFrac/membraneLagFrac
// toward their most aggressive settings — both wings together, not one
// side, but tightly time-locked to the same instant the body breaks, so the
// wingbeat and the turn read as one event rather than two systems running
// past each other. That correlation is the best available stand-in for
// "the wing visibly bit into the turn" without a per-side rig field.
export default {
  id: 'c',
  label: 'Darter',

  init(ctx) {
    return {
      // A per-axis critically-underdamped mass-spring-damper, kicked by
      // random VELOCITY impulses (never a direct position jump). This is
      // what actually produces "sharp snap, brief overshoot, ring, settle"
      // — not a hand-authored decay curve: an underdamped spring released
      // from a velocity kick genuinely overshoots zero and rings before
      // settling, and because Companion derives bank/heading straight from
      // the resulting motion, that ring shows up as a real body whip.
      jinkX: 0, jinkVX: 0,
      jinkY: 0, jinkVY: 0,
      jinkZ: 0, jinkVZ: 0, // occasional shallow forward/back jut
      // 0..1, fast-decaying "we just threw a hard power stroke" envelope —
      // drives the flap/rig spike at the same instant as the break, then
      // gets out of the way so the shallow cruising beat reads as the norm.
      punch: 0,
      // First break lands almost immediately so the personality reads on
      // first sight instead of after a settling-in period.
      nextBreakAt: ctx.t + 0.35 + ctx.rng() * 0.7,
    }
  },

  update(ctx, state) {
    const dt = ctx.dt

    // ── the break ──
    // A fresh, randomly-aimed velocity kick on the creature's OWN schedule
    // — never tied to scroll — which is what makes it read as the animal
    // startling itself rather than the reader's scrolling doing it. Seeded
    // off ctx.rng so it never differs between reloads of the same session.
    if (ctx.t >= state.nextBreakAt) {
      const angle = ctx.rng() * Math.PI * 2
      const mag = 3.2 + ctx.rng() * 3.4
      state.jinkVX += Math.cos(angle) * mag
      state.jinkVY += Math.sin(angle) * mag * 0.55
      // roughly one break in three also juts forward/back, so it is never
      // ALWAYS a flat, screen-plane dodge
      if (ctx.rng() < 0.34) state.jinkVZ += (ctx.rng() - 0.5) * 2.6
      state.punch = 1
      // 0.55-1.55s of hard, fast running before the next break — long
      // enough to read as a real dash, short enough to never settle into a
      // cruise.
      state.nextBreakAt = ctx.t + 0.55 + ctx.rng() * 1.0
    }

    // ── spring integration ──
    // Semi-implicit Euler; ctx.dt is already host-clamped to <=0.05s so
    // this stays stable at any real frame rate. zeta ~0.3 at these
    // constants (stiffness 196, damping 8.4) -> ~2.2Hz natural frequency,
    // a couple of visible overshoot rings, fully settled within ~1.1s.
    // dt === 0 (reduced-motion static frame) leaves every term unchanged,
    // so the static frame is genuinely static, not a frozen mid-ring pose.
    const K = 196
    const C = 8.4
    if (dt > 0) {
      state.jinkVX += (-K * state.jinkX - C * state.jinkVX) * dt
      state.jinkX += state.jinkVX * dt
      state.jinkVY += (-K * state.jinkY - C * state.jinkVY) * dt
      state.jinkY += state.jinkVY * dt
      state.jinkVZ += (-K * state.jinkZ - C * state.jinkVZ) * dt
      state.jinkZ += state.jinkVZ * dt
      // Defensive clamp only — normal operation never approaches this; it
      // exists purely so a pathological run of same-phase kicks can never
      // accumulate into an unbounded drift.
      state.jinkX = clampAbs(state.jinkX, 0.6)
      state.jinkY = clampAbs(state.jinkY, 0.55)
      state.jinkZ = clampAbs(state.jinkZ, 0.5)
      // Punch: a short, sharp decay (~90ms time constant) — one crisp
      // stroke, not a sustained burst. Independent of the spring above so
      // the wing snap and the body's (longer) recovery can run at their
      // own honest durations instead of being forced to match.
      state.punch *= Math.exp(-dt / 0.09)
    }

    const punch = state.punch

    return {
      // Straight, purposeful dashes between breaks — not a random walk —
      // so idle wander stays modest; buffet runs a touch hot so a fast
      // scroll still reads as urgency rather than drift.
      idleWanderAmp: 0.55,
      buffetAmp: 1.15,

      pathXOffset: state.jinkX,
      pathYOffset: state.jinkY,
      pathDepthOffset: state.jinkZ,

      // Never coasts, never holds a glide — always working.
      glideiness: 0,
      burstiness: 1.25,

      // Shallow baseline amplitude, punched to one full hard stroke at
      // every break; the fastest baseline beat of the three profiles.
      flapWeight: 0.4 + 0.6 * punch,
      flapRate: 5.4 + 1.0 * punch,

      // Heading commits fast (snaps into the new line rather than easing
      // into it); bank and AoA gains flex up briefly during the punch so
      // the attitude response is sharpest at the exact instant the wing
      // spikes, then relax — the spring above is what actually produces
      // the overshoot-and-ring, this just makes the chase track it tightly
      // instead of smoothing it away.
      // Still the fastest-committing of the three (that is this profile's
      // character) but well under one-beat, so a jink reads as a decision
      // rather than as the body spinning inside its own wingbeat.
      headingDampRate: 6.5,
      bankGain: 0.5 + 0.22 * punch,
      bankMax: 0.85,
      bankDampRate: 7.5,
      aoaGain: 0.58 + 0.24 * punch,
      aoaMax: 0.42,
      aoaDampRate: 6.5,
      cruiseAoA: 0.02,

      rig: {
        // SMOOTHNESS FIRST — see glider.js's rig block. This profile's
        // character is the JINK (a sharp change of direction) and the
        // punch envelope on amplitude, NOT a deformed wing: a stroke that
        // snaps down in 30% of the cycle and twists 34 degrees reads as
        // broken, not as fast.
        downstrokeFrac: 0.47 - 0.02 * punch,
        pronationAmp: 0.16 + 0.05 * punch,
        sweepAmp: 0.06 + 0.03 * punch,
        hindPhase: 0.02, // fore and hind effectively coupled — they must not scissor
        membraneLagFrac: 0.1 - 0.02 * punch,
        membraneCamber: 0.95 + 0.25 * punch,
      },
    }
  },

  dispose() {},
}

// Local clamp — this module never receives a THREE reference (only ctx.rng
// et al.), so a two-line manual clamp instead of pulling in THREE.MathUtils.
function clampAbs(v, lim) {
  return v < -lim ? -lim : v > lim ? lim : v
}
