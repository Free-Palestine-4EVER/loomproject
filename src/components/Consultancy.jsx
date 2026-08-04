// ————————————————————————————————————————————————————————
// LOOM — consultancy.
//
// The only offer on this site that is not a deliverable. Every other section
// sells a thing we hand over; this one sells the fortnight before anyone knows
// what to build. This pass is a full interaction redesign, not a repaint:
//
//   · the three questions (scale → costs → automate) were a static 3-up row of
//     cards — read once, then scrolled past. They are now a segmented explorer:
//     one question selected at a time, same role="tablist" contract Solutions
//     already uses for its industry rack, so the whole site agrees on how a
//     "pick one, read one" interaction behaves.
//   · the ROI calculator is real interactivity that was fighting for space
//     against everything else on the page. It is now a native <details>
//     disclosure — collapsed to one line by default on the inline section,
//     open by default on /consultancy — so the section pays for its height
//     only when a visitor actually asks for the sliders.
//   · the fortnight timeline was four full-width columns holding one sentence
//     each. It is now a 4-step tab strip over a single panel — click (or
//     arrow-key) through open the books → sit in the workflow → model the
//     options → hand over the plan without paying for four columns of white
//     space the other three steps don't need at once.
//   · the FAQ (page-only) is now a native <details name="…"> accordion group —
//     one question's answer visible at a time instead of eight paragraphs
//     stacked, and it costs no JS: opening/closing survives reduced-motion
//     and works with the keyboard for free.
//   · the companion photo is decorative (alt=""), not a fact — it now only
//     renders on the /consultancy page, where the section can afford to be
//     richer; the inline section is copy-only and a fraction of the height.
//
// Renders in two places from one source:
//   <Consultancy />          the #consultancy section on the long page
//   <Consultancy page />     the standalone /consultancy route (App.jsx)
// `page` changes the heading level, shows the photo + FAQ, and defaults the
// calculator open — never the underlying content, so the two can't drift.
// ————————————————————————————————————————————————————————
import { useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { CONSULTANCY } from '../data/site.js'
import { EASE, SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
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

/** Moves a roving-tabindex horizontal tablist with the arrow keys — shared by
 *  the pillar explorer and the fortnight stepper below, same contract
 *  Solutions.jsx uses for its (vertical) industry rack. */
function onTabsKeyDown(e, onSelect) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
  const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]'))
  if (!tabs.length) return
  const i = tabs.indexOf(document.activeElement)
  let next
  if (e.key === 'ArrowRight') next = tabs[(i + 1 + tabs.length) % tabs.length]
  else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length]
  else if (e.key === 'Home') next = tabs[0]
  else next = tabs[tabs.length - 1]
  e.preventDefault()
  next.focus()
  onSelect(next.dataset.key)
}

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

/** The sliders + readout only — the disclosure around this owns the heading,
 *  so opening it is the only thing that costs the section any height. */
function CalcBody({ copy, start }) {
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
    <div className="calc-inner">
      <p className="calc-sub">{copy.sub}</p>

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
    </div>
  )
}

/** The wow layer, kept — an ROI calculator instead of another paragraph
 *  telling the owner to trust us — but now a disclosure: closed, it is one
 *  line; opened, it is exactly what it always was. `defaultOpen` lets the
 *  standalone /consultancy page start richer while the inline section stays
 *  small until asked. */
function CostCalculator({ copy, start, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Reveal delay={0.05}>
      <details
        className="calc"
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary className="calc-summary">
          <span className="calc-summary-copy">
            <span className="kicker calc-kicker"><span>—</span> {copy.kicker}</span>
            <span className="h3 calc-summary-title">{copy.title}</span>
          </span>
          <span className="calc-chevron" aria-hidden="true" />
        </summary>
        <CalcBody copy={copy} start={start} />
      </details>
    </Reveal>
  )
}

/** The three questions, now a segmented explorer instead of a static 3-up
 *  row — one question read at a time, same tablist contract as Solutions'
 *  industry rack (Solutions.jsx). */
function PillarExplorer({ pillars, reduced }) {
  const [active, setActive] = useState(pillars[0].id)
  const current = pillars.find((p) => p.id === active) ?? pillars[0]

  return (
    <Reveal className="consult-explorer" delay={0.05}>
      <div
        className="consult-tabs"
        role="tablist"
        aria-label="What the fortnight finds"
        onKeyDown={(e) => onTabsKeyDown(e, setActive)}
      >
        {pillars.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`cst-tab-${p.id}`}
            aria-selected={active === p.id}
            aria-controls={`cst-panel-${p.id}`}
            tabIndex={active === p.id ? 0 : -1}
            data-key={p.id}
            className={`filter consult-tab${active === p.id ? ' is-active' : ''}`}
            onClick={() => setActive(p.id)}
          >
            <WoolIcon name={p.wool} size="sm" className="consult-tab-icon" />
            {p.title}
          </button>
        ))}
      </div>

      <div className="consult-panel-frame">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            id={`cst-panel-${current.id}`}
            role="tabpanel"
            aria-labelledby={`cst-tab-${current.id}`}
            tabIndex={-1}
            className="consult-panel"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduced ? 0.01 : 0.38, ease: EASE }}
          >
            <div className="consult-panel-head">
              <WoolIcon name={current.wool} className="consult-panel-icon" />
              <h3 className="consult-panel-title">{current.title}</h3>
            </div>
            <p className="consult-panel-copy">{current.copy}</p>
            <ul className="consult-points">
              {current.points.map((pt) => <li key={pt}>{pt}</li>)}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </Reveal>
  )
}

/** The fortnight timeline, now a 4-step tab strip over one panel instead of
 *  four full-width columns each holding a sentence — same interaction shape
 *  as the pillar explorer above, scaled down to fit inside the outcomes card. */
function FortnightStepper({ steps, reduced }) {
  const [active, setActive] = useState(0)
  const current = steps[active]

  return (
    <div className="consult-stepper">
      <div
        className="consult-step-tabs"
        role="tablist"
        aria-label="Steps in the fortnight"
        onKeyDown={(e) => onTabsKeyDown(e, (k) => setActive(Number(k)))}
      >
        {steps.map((s, i) => (
          <button
            key={s.n}
            type="button"
            role="tab"
            id={`cst-step-${s.n}`}
            aria-selected={active === i}
            aria-controls="cst-step-panel"
            tabIndex={active === i ? 0 : -1}
            data-key={i}
            className={`consult-step-btn${active === i ? ' is-active' : ''}`}
            onClick={() => setActive(i)}
          >
            <span className="consult-step-n">{s.n}</span>
            <span className="consult-step-label">{s.title}</span>
          </button>
        ))}
      </div>

      <div className="consult-step-panel-frame">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={current.n}
            id="cst-step-panel"
            role="tabpanel"
            aria-labelledby={`cst-step-${current.n}`}
            tabIndex={-1}
            className="consult-step-copy"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduced ? 0.01 : 0.34, ease: EASE }}
          >
            {current.copy}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

/** The fortnight timeline + outcomes, as a second disclosure alongside the
 *  calculator — same "closed is one line, open is the full card" contract,
 *  because the steps ARE how you get the outcomes, so they stay one card
 *  with two beats rather than a hard section break. Closed by default
 *  inline, open by default on /consultancy — this is the second (and
 *  larger) half of the redesign's height budget. */
function FortnightCard({ steps, outcomes, reduced, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Reveal>
      <details
        className="consult-band"
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary className="consult-band-summary">
          <span className="consult-band-summary-copy">
            <h3 className="h3">How the fortnight runs</h3>
            <p className="consult-band-sub">About three hours of your time, total.</p>
          </span>
          <span className="calc-chevron" aria-hidden="true" />
        </summary>

        <div className="consult-band-inner">
          <FortnightStepper steps={steps} reduced={reduced} />

          <div className="consult-band-divider" aria-hidden="true" />

          <h3 className="h3">What you walk away with</h3>
          <ul className="consult-out-list">
            {outcomes.map((o, i) => (
              <li key={o} className="consult-out-item">
                <Reveal delay={i * 0.05} y={16} className="consult-out-row">
                  <i className="consult-tick" aria-hidden="true" />
                  <span>{o}</span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </Reveal>
  )
}

/** The page-only FAQ, as a real accordion group (one answer open at a time)
 *  built from native <details name="…">. State is lifted and controlled here
 *  — not left as a bare `open={i===0}` prop — because Consultancy can
 *  re-render for reasons that have nothing to do with the FAQ (the wizard
 *  modal opening shares context with this tree); an uncontrolled `open` prop
 *  would silently snap back to its initial value on any such re-render and
 *  undo whatever the visitor had toggled. */
function FaqAccordion({ items }) {
  const [openIdx, setOpenIdx] = useState(0)
  return (
    <div className="consult-faq-list">
      {items.map((f, i) => (
        <Reveal key={f.q} delay={i * 0.05} y={16}>
          <details
            className="consult-faq-item"
            name="consult-faq"
            open={openIdx === i}
            onToggle={(e) => { if (e.currentTarget.open) setOpenIdx(i) }}
          >
            <summary className="consult-faq-q">{f.q}</summary>
            <p className="consult-faq-a">{f.a}</p>
          </details>
        </Reveal>
      ))}
    </div>
  )
}

export function Consultancy({ page = false }) {
  const { open } = useWizard()
  const reduced = useReducedMotion()
  const C = CONSULTANCY
  // One entry point for every CTA in the section. Pre-selecting the need means
  // the wizard opens on step 2 already answered — the same contract Counter
  // tiles use (Banners.jsx:69).
  const start = () => open({ note: 'Consultancy' })

  return (
    <section className={`consult ${page ? 'consult--page' : ''}`} id="consultancy">
      <div className="section-head consult-head">
        <div className="consult-head-copy">
          <p className="kicker"><span>—</span> {C.kicker}</p>
          <SplitWords as={page ? 'h1' : 'h2'} className="h2" text={C.title} />
          <Reveal delay={0.15}>
            <p className="lede" style={{ marginTop: 22 }}>{C.lede}</p>
          </Reveal>
        </div>
        {/* the companion still is decorative (alt=""), not a fact — it only
            earns its place on the standalone page, where the section can
            afford the extra row; the inline section stays copy-only. */}
        {page && (
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
        )}
      </div>

      {/* the three questions — scale → costs → automate — as a segmented
          explorer instead of three stacked cards. */}
      <PillarExplorer pillars={C.pillars} reduced={reduced} />

      {/* the wow layer — collapsed by default inline, open by default on the
          dedicated page. See CostCalculator above for why it is a <details>. */}
      {C.calculator && <CostCalculator copy={C.calculator} start={start} defaultOpen={page} />}

      {/* the fortnight timeline (now a stepper) and the outcomes list still
          share one felted-cream card, and — like the calculator above — that
          card is a disclosure: closed to one line inline, open by default
          on the page. The steps ARE how you get the outcomes, so reading
          them as one continuous band is truer to the engagement than a
          hard section break would be. */}
      <FortnightCard steps={C.steps} outcomes={C.outcomes} reduced={reduced} defaultOpen={page} />

      {/* FAQ only on the dedicated page — a native accordion group, one
          answer open at a time, so eight paragraphs never stack at once. */}
      {page && (
        <div className="consult-faq">
          <Reveal><h3 className="h3">Straight answers</h3></Reveal>
          <FaqAccordion items={C.faq} />
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
