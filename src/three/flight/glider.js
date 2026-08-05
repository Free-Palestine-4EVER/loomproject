// Glider (id 'a') — long, held glides between short, lazy wingbeats. Reads as
// a butterfly riding the air more than working for it: wide, gentle turns,
// shallow banking, a wing held closer to flat (less pronation twist, a more
// symmetric down/up stroke) than a butterfly that is actually working hard.
//
// Edited ONLY here — this file never needs to touch the registry,
// Companion.js or the model. See Companion.js's header for the full ctx/
// drive contract this update() reads and returns.
export default {
  id: 'a',
  label: 'Glider',

  init(ctx) {
    return {
      // A slow, private phase for the "lean into a long glide" breathing —
      // seeded off ctx.rng so two Glider activations (real page + lab, or a
      // switch-away-and-back) don't glide in lockstep.
      breathPhase: ctx.rng() * Math.PI * 2,
    }
  },

  update(ctx, state) {
    // A slow breathing signal between "gentle beating" and "held glide" —
    // independent of scroll, so it reads as the creature's own choice to
    // soar rather than a direct response to the reader.
    const breath = Math.sin(ctx.t * 0.14 + state.breathPhase)
    const glideiness = 0.55 + 0.45 * Math.max(0, breath)

    return {
      idleWanderAmp: 0.7,
      buffetAmp: 0.65,

      burstiness: 0.55,
      glideiness,

      // Wide, shallow, unhurried turns.
      headingDampRate: 6,
      bankGain: 0.18,
      bankMax: 0.4,
      bankDampRate: 2.2,
      aoaGain: 0.35,
      aoaMax: 0.22,
      aoaDampRate: 2.6,
      cruiseAoA: 0.07,

      rig: {
        // A gentler power stroke — closer to a symmetric beat than a sharp
        // down/up split — and less twist/deviation per beat: this wing is
        // riding the air more than rowing through it.
        downstrokeFrac: 0.48,
        pronationAmp: 0.22,
        sweepAmp: 0.07,
        membraneLagFrac: 0.13,
        bobAmp: 0.75,
        tiltAmp: 0.8,
      },
    }
  },

  dispose() {},
}
