// ————————————————————————————————————————————————————————
// VOICES — testimonials, placed at the decision point.
//
// It sits between the close ramp and Contact for one reason: a testimonial is
// worth nothing to a visitor who has not yet decided they want the thing, and
// everything to one who has and is looking for a reason not to click away. Put
// it high on the page and it is decoration; put it here and it is the last
// push.
//
// THE ATTRIBUTION IS THE DESIGN PROBLEM. These quotes are drafted, not
// collected (data/voices.js says so at length, in the file the next person
// will open). So the card is built to make role + sector + city read as a
// deliberate editorial choice rather than as a missing logo:
//
//   - no avatar circle, no five gold stars, no company mark. Every one of
//     those is a slot that looks broken when it is empty, and a slot that
//     lies when it is filled with something invented.
//   - the pull-word is set huge in the studio's own face, so the CARD's
//     visual anchor is the claim, not the person. That is what lets an
//     unnamed attribution sit at 0.74rem without the card feeling anonymous.
//   - `name`/`org` render if present. A real quote and a drafted one can sit
//     side by side while they are collected, with no code change.
//
// COST: nothing animates at rest. One Reveal per card on entry; hover is a
// transition.
import { SplitWords, Reveal } from '../lib/motion.jsx'
import { VOICES, VOICES_NOTE } from '../data/voices.js'
import './voices.css'

function Voice({ v, i }) {
  // Whatever attribution exists, in falling order of specificity. A real quote
  // that has cleared permission carries name + org and the composite line
  // steps aside for it.
  const line = [v.name, v.org].filter(Boolean).join(', ')
  const sub = [v.role, v.sector, v.city].filter(Boolean).join(' · ')

  return (
    <Reveal delay={i * 0.06} className="voice-cell">
      <figure className="voice-card" style={{ '--accent': v.accent }}>
        {/* the claim, not the claimant — this is the card's anchor */}
        <span className="voice-shout" aria-hidden="true">{v.shout}</span>
        <span className="voice-mark" aria-hidden="true">”</span>

        <blockquote className="voice-quote">{v.quote}</blockquote>

        <figcaption className="voice-by">
          {line && <b className="voice-name">{line}</b>}
          <span className="voice-role">{sub}</span>
        </figcaption>
      </figure>
    </Reveal>
  )
}

export function Voices() {
  return (
    <section className="voice" id="voices" aria-label="What clients say">
      <span className="voice-rail" aria-hidden="true" />

      <div className="voice-head">
        <p className="kicker"><span>—</span> In their words</p>
        <SplitWords as="h2" className="h2 voice-h2" text="What it is actually like to work with us." />
      </div>

      <div className="voice-grid">
        {VOICES.map((v, i) => <Voice key={v.id} v={v} i={i} />)}
      </div>

      <Reveal delay={0.1}>
        <p className="voice-note">{VOICES_NOTE}</p>
      </Reveal>
    </section>
  )
}
