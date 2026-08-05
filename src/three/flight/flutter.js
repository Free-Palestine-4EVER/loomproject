// Flutter (id 'b', the shipping default) — the baseline burst-then-coast
// wingbeat this rig already tunes for on its own: works the wings in short,
// energetic bursts that ride scroll airspeed, coasts lightly between them,
// banks with moderate conviction into every turn. Deliberately close to
// Companion.js's own FLIGHT_DEFAULTS — this profile exists to prove the
// registry/switcher pipeline with a real, working personality, not to
// reinvent the baseline feel.
//
// Edited ONLY here — this file never needs to touch the registry,
// Companion.js or the model. See Companion.js's header for the full ctx/
// drive contract this update() reads and returns.
export default {
  id: 'b',
  label: 'Flutter',

  init(ctx) {
    return { seed: ctx.rng() * 100 }
  },

  update(ctx, state) {
    // A slow, small modulation on how sharply the burst envelope swings —
    // never fully flat, so two Flutter butterflies (or the same one across a
    // long scroll session) never lock into an identical rhythm.
    const burstiness = 0.95 + 0.2 * Math.sin(ctx.t * 0.09 + state.seed)

    return {
      // Left at FLIGHT_DEFAULTS: idleWanderAmp, buffetAmp, glideiness (never
      // auto-glides — a burst-and-coast flutter, not a soar), all the
      // attitude gains. Only burstiness gets a small living wobble, and the
      // rig gets a slightly livelier wingbeat than the bare model default.
      burstiness,

      rig: {
        pronationAmp: 0.37,
        sweepAmp: 0.14,
        hindPhase: 0.07,
      },
    }
  },

  dispose() {},
}
