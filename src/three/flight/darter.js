// Darter (id 'c') — high-energy and twitchy: never coasts, snaps into sharp
// banked turns, and periodically jinks sideways off the path on its own (an
// impulse that decays back out) the way a real darting insect keeps changing
// its mind mid-flight. The opposite end of the personality range from Glider.
//
// Edited ONLY here — this file never needs to touch the registry,
// Companion.js or the model. See Companion.js's header for the full ctx/
// drive contract this update() reads and returns.
export default {
  id: 'c',
  label: 'Darter',

  init(ctx) {
    return {
      jinkX: 0,
      jinkY: 0,
      // First jink lands within the first couple of seconds so the
      // personality reads immediately, not just after a while.
      nextJinkAt: ctx.t + 0.4 + ctx.rng() * 1.0,
    }
  },

  update(ctx, state) {
    // A fresh, randomly-aimed impulse on its own schedule — not tied to
    // scroll at all, which is what makes it read as the CREATURE darting
    // rather than the reader's scrolling doing it.
    if (ctx.t >= state.nextJinkAt) {
      const angle = ctx.rng() * Math.PI * 2
      const mag = 0.10 + ctx.rng() * 0.16
      state.jinkX = Math.cos(angle) * mag
      state.jinkY = Math.sin(angle) * mag * 0.6
      state.nextJinkAt = ctx.t + 0.5 + ctx.rng() * 1.1
    }
    // Frame-rate-independent decay (a per-second constant, not a per-frame
    // fraction) back toward zero between jinks.
    const decay = ctx.dt > 0 ? Math.exp(-ctx.dt * 3.2) : 1
    state.jinkX *= decay
    state.jinkY *= decay

    return {
      idleWanderAmp: 1.2,
      buffetAmp: 1.3,

      pathXOffset: state.jinkX,
      pathYOffset: state.jinkY,

      burstiness: 1.3,
      glideiness: 0, // never coasts to a held glide
      flapRate: 7.6, // beats/second — steady high-energy wingbeat

      // Snappy, aggressive attitude: quick to commit to a new heading, banks
      // hard into every turn.
      headingDampRate: 16,
      bankGain: 0.5,
      bankMax: 0.85,
      bankDampRate: 6.5,
      aoaGain: 0.7,
      aoaMax: 0.4,
      aoaDampRate: 7,
      cruiseAoA: 0.03,

      rig: {
        downstrokeFrac: 0.3,
        pronationAmp: 0.42,
        sweepAmp: 0.19,
        membraneLagFrac: 0.06,
        membraneCamber: 1.3,
      },
    }
  },

  dispose() {},
}
