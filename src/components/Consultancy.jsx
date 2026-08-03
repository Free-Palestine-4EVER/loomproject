// ————————————————————————————————————————————————————————
// LOOM — consultancy.
//
// The only offer on this site that is not a deliverable. Every other section
// sells a thing we hand over; this one sells the fortnight before anyone knows
// what to build. That difference drives the whole layout:
//
//   · no tile grid — a grid says "pick one of these products". This is one
//     engagement with three questions inside it, so it is three wide rows.
//   · the photo sits on ITS OWN pastel sweep (same shoot as the eight needs),
//     so the section reads as part of the set without being a ninth tile.
//   · the numbers-first copy in site.js is deliberate. Owners distrust the word
//     "consultancy" because it is usually sold in adjectives.
//
// Renders in two places from one source:
//   <Consultancy />          the #consultancy section on the long page
//   <Consultancy page />     the standalone /consultancy route (App.jsx)
// `page` only changes the heading level and adds the closing CTA — never the
// content, so the two can never drift.
// ————————————————————————————————————————————————————————
import { CONSULTANCY } from '../data/site.js'
import { SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton, WoolIcon } from './Wool.jsx'

import './consultancy.css'

export function Consultancy({ page = false }) {
  const { open } = useWizard()
  const C = CONSULTANCY
  // One entry point for every CTA in the section. Pre-selecting the need means
  // the wizard opens on step 2 already answered — the same contract Counter
  // tiles use (Banners.jsx:69).
  const start = () => open({ note: 'Consultancy' })

  return (
    <section className={`consult ${page ? 'consult--page' : ''}`} id="consultancy">
      <div className="section-head">
        <p className="kicker"><span>—</span> {C.kicker}</p>
        <SplitWords as={page ? 'h1' : 'h2'} className="h2" text={C.title} />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>{C.lede}</p>
        </Reveal>
      </div>

      {/* the still, full-bleed on its own sweep. Same graceful-degradation
          contract as .cnt-photo: if the webp is missing the figure collapses
          rather than leaving a white hole. */}
      <Reveal delay={0.1} className="consult-shot">
        <img
          src="/img/needs/consultancy.webp"
          alt=""
          width={1200}
          height={800}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.closest('.consult-shot')?.remove() }}
        />
      </Reveal>

      {/* three questions, three rows — never a grid. See header note. */}
      <div className="consult-pillars">
        {C.pillars.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.08} y={24} className="consult-pillar">
            <div className="consult-pillar-head">
              <WoolIcon name={p.wool} className="consult-medal" />
              <h3 className="consult-pillar-title">{p.title}</h3>
            </div>
            <p className="consult-pillar-copy">{p.copy}</p>
            <ul className="consult-points">
              {p.points.map((pt) => <li key={pt}>{pt}</li>)}
            </ul>
          </Reveal>
        ))}
      </div>

      <div className="consult-band">
        <Reveal className="consult-band-head">
          <h3 className="h3">How the fortnight runs</h3>
          <p className="consult-band-sub">About three hours of your time, total.</p>
        </Reveal>
        {/* Reveal renders a div (motion.jsx:42), so it goes INSIDE the li —
            a div is not a valid child of ol. */}
        <ol className="consult-steps">
          {C.steps.map((s, i) => (
            <li key={s.n} className="consult-step">
              <Reveal delay={(i % 4) * 0.06} y={18}>
                <span className="consult-step-n">{s.n}</span>
                <h4 className="consult-step-title">{s.title}</h4>
                <p className="consult-step-copy">{s.copy}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>

      <div className="consult-out">
        <Reveal>
          <h3 className="h3">What you walk away with</h3>
        </Reveal>
        <ul className="consult-out-list">
          {C.outcomes.map((o, i) => (
            <li key={o} className="consult-out-item">
              <Reveal delay={i * 0.05} y={16} className="consult-out-row">
                <i className="consult-tick" aria-hidden="true" />
                <span>{o}</span>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>

      {/* FAQ only on the dedicated page. On the long page it would out-weigh the
          sections either side of it; a visitor with these questions is already
          on /consultancy. */}
      {page && (
        <div className="consult-faq">
          <Reveal><h3 className="h3">Straight answers</h3></Reveal>
          <div className="consult-faq-list">
            {C.faq.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05} y={16} className="consult-faq-item">
                <h4 className="consult-faq-q">{f.q}</h4>
                <p className="consult-faq-a">{f.a}</p>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      <Reveal delay={0.1} className="consult-foot">
        <Magnetic>
          <WoolButton label="Book an assessment" size="big" onClick={start} />
        </Magnetic>
        {page
          ? <a className="consult-foot-link" href="/">← back to LOOM</a>
          : <a className="consult-foot-link" href="/consultancy">the full breakdown →</a>}
      </Reveal>
    </section>
  )
}
