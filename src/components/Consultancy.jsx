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
import { useEffect, useId, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { CONSULTANCY } from '../data/site.js'
import { SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton, WoolIcon } from './Wool.jsx'

import './consultancy.css'

// A work-year, not a marketing round number: 40 hours, 52 weeks. Every other
// figure below is derived from these two plus what the visitor drags in.
const HOURS_PER_WEEK = 40
const WEEKS_PER_YEAR = 52
const WEEKS_PER_MONTH = 4.33

// The recovery bands are the honest part of a savings calculator — most of
// them quietly pick the top of the range and call it a quote. We show both
// ends and say in the copy (site.js: CONSULTANCY.calculator.assumptions)
// that they come from our own engagements, not an invented industry stat.
const AUTOMATION_RECOVERY = [0.4, 0.7]
const SOFTWARE_WASTE = [0.15, 0.3]

const money = (n) => `$${Math.round(Math.max(0, n)).toLocaleString('en-US')}`

/** Ticks a displayed number toward its target instead of snapping — the same
 *  spirit as CountUp (motion.jsx) but re-triggerable on every slider drag,
 *  which CountUp's once-per-scroll IntersectionObserver can't do. */
function useTicker(target, reduced) {
  const [shown, setShown] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef()
  useEffect(() => {
    if (reduced) { setShown(target); fromRef.current = target; return }
    const from = fromRef.current
    const start = performance.now()
    const duration = 420
    cancelAnimationFrame(rafRef.current)
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3) // expo-ish settle, no overshoot — a savings figure should not bounce
      setShown(from + (target - from) * eased)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, reduced])
  return shown
}

/** One real <input type="range">, never a div pretending to be one — arrow
 *  keys, Home/End and screen-reader value announcements come for free. */
function CalcSlider({ label, value, onChange, min, max, step, format }) {
  const id = useId()
  return (
    <div className="calc-field">
      <div className="calc-field-head">
        <label htmlFor={id}>{label}</label>
        <span className="calc-field-val" aria-hidden="true">{format(value)}</span>
      </div>
      <input
        id={id}
        className="calc-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={format(value)}
      />
    </div>
  )
}

/** The wow layer: an ROI calculator instead of another paragraph telling the
 *  owner to trust us. Four sliders, one job of maths, no invented benchmark —
 *  see CONSULTANCY.calculator.assumptions for the exact sentence we show. */
function CostCalculator({ copy, start }) {
  const reduced = useReducedMotion()
  const [headcount, setHeadcount] = useState(6)
  const [hoursLost, setHoursLost] = useState(6)
  const [monthlyCost, setMonthlyCost] = useState(2200)
  const [toolSpend, setToolSpend] = useState(1500)

  const hourlyRate = monthlyCost / (WEEKS_PER_MONTH * HOURS_PER_WEEK)
  const annualHoursLost = headcount * hoursLost * WEEKS_PER_YEAR
  const annualManualCost = annualHoursLost * hourlyRate
  const annualToolSpend = toolSpend * 12
  const saveLow = annualManualCost * AUTOMATION_RECOVERY[0] + annualToolSpend * SOFTWARE_WASTE[0]
  const saveHigh = annualManualCost * AUTOMATION_RECOVERY[1] + annualToolSpend * SOFTWARE_WASTE[1]

  const hoursShown = useTicker(annualHoursLost, reduced)
  const costShown = useTicker(annualManualCost, reduced)
  const lowShown = useTicker(saveLow, reduced)
  const highShown = useTicker(saveHigh, reduced)

  return (
    <Reveal className="calc" delay={0.05}>
      <div className="calc-head">
        <p className="kicker calc-kicker"><span>—</span> {copy.kicker}</p>
        <h3 className="h3">{copy.title}</h3>
        <p className="calc-sub">{copy.sub}</p>
      </div>

      <div className="calc-body">
        <div className="calc-controls">
          <CalcSlider
            label="People doing manual, repeatable work"
            value={headcount} onChange={setHeadcount}
            min={1} max={30} step={1}
            format={(v) => `${v} ${v === 1 ? 'person' : 'people'}`}
          />
          <CalcSlider
            label="Hours each of them loses a week to it"
            value={hoursLost} onChange={setHoursLost}
            min={1} max={20} step={1}
            format={(v) => `${v} hrs / wk`}
          />
          <CalcSlider
            label="Average fully-loaded monthly cost per person"
            value={monthlyCost} onChange={setMonthlyCost}
            min={800} max={6000} step={100}
            format={money}
          />
          <CalcSlider
            label="Monthly spend on software & subscriptions"
            value={toolSpend} onChange={setToolSpend}
            min={200} max={8000} step={100}
            format={money}
          />
        </div>

        {/* aria-live so a screen-reader hears the totals move without hearing
            every intermediate animation frame — the DOM only updates ~15x/s. */}
        <div className="calc-readout" aria-live="polite">
          <div className="calc-stat">
            <span className="calc-stat-n">{Math.round(hoursShown).toLocaleString('en-US')}</span>
            <span className="calc-stat-l">hours lost a year</span>
          </div>
          <div className="calc-stat">
            <span className="calc-stat-n">{money(costShown)}</span>
            <span className="calc-stat-l">what those hours cost in salary this year</span>
          </div>
          <div className="calc-stat calc-stat--range">
            <span className="calc-stat-n">{money(lowShown)}–{money(highShown)}</span>
            <span className="calc-stat-l">what a fortnight like this typically recovers</span>
          </div>
        </div>
      </div>

      <p className="calc-assumptions">{copy.assumptions}</p>

      <Magnetic>
        <WoolButton label={copy.ctaLabel} onClick={start} />
      </Magnetic>
    </Reveal>
  )
}

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

      {/* the wow layer — see CostCalculator above for why this is a
          calculator and not another paragraph. */}
      {C.calculator && <CostCalculator copy={C.calculator} start={start} />}

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
