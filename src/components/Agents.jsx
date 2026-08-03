// LOOM — Agents for rent.
//
// The Crew (Crew.jsx) are the studio wearing faces: hire LOOM, Spooly shows up
// to think about your brand. These are a different product — a small AI that
// runs on YOUR accounts, does one job, and keeps doing it after the invoice.
// agents.js documents the rules (capabilities not outcomes, no prices, a
// `ready` gate on the art). This file is presentation only.
//
// The art is an alpha cut-out with no white sweep to crop into a card — same
// deal as .offer-photo in banners.css. So the interaction is a stage, not a
// grid: one agent stands full-height in a dye-and-aura frame while the rest
// wait as a knitted rail of tabs. Selecting a tab is a real <button>, arrow
// keys rove between tabs (Crew.jsx's cards never needed this — those were all
// visible at once; a roster that swaps its detail panel does), and the panel
// itself lists what the agent DOES / NEEDS / RUNS ON before the one CTA.
import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { AGENTS_READY as AGENTS } from '../data/agents.js'
import { SplitWords, Reveal } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton } from './Wool.jsx'
import './agents.css'

export function Agents() {
  // AGENTS_READY can be empty while art is still rendering — the section
  // simply does not exist yet rather than shipping broken images, the same
  // gate CREW_READY enforces on the crew roster.
  if (!AGENTS.length) return null

  const [activeIdx, setActiveIdx] = useState(0)
  const tabRefs = useRef([])
  const reduced = useReducedMotion()
  const { open } = useWizard()
  const agent = AGENTS[activeIdx]

  // Roving tabindex: only the active tab sits in the natural tab order, arrow
  // keys move between the rest. Home/End jump to the ends — a roster of six
  // is short, but the pattern costs nothing extra to make complete.
  const onTabKeyDown = (e) => {
    const last = AGENTS.length - 1
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = activeIdx === last ? 0 : activeIdx + 1
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = activeIdx === 0 ? last : activeIdx - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    setActiveIdx(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section className="agt" id="agents" aria-label="Agents for rent">
      <div className="section-head">
        <p className="kicker"><span>—</span> Agents for rent</p>
        <SplitWords as="h2" className="h2" text="Not a subscription to software. A hire that already knows the job." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Each one below is rented by the month, runs on accounts you already
            own — your WhatsApp, your Instagram, your inbox — and does exactly
            one job well. No dashboard to learn, no seat licence: it just shows
            up to work.
          </p>
        </Reveal>
      </div>

      {/* the rail — a roving-tabindex tablist, one felted pill per agent */}
      <Reveal delay={0.1} className="agt-rail" y={20}>
        <div className="agt-tabs" role="tablist" aria-label="Choose an agent" onKeyDown={onTabKeyDown}>
          {AGENTS.map((a, i) => (
            <button
              key={a.id}
              ref={(el) => (tabRefs.current[i] = el)}
              type="button"
              role="tab"
              id={`agt-tab-${a.id}`}
              aria-selected={i === activeIdx}
              aria-controls={`agt-panel-${a.id}`}
              tabIndex={i === activeIdx ? 0 : -1}
              className={`agt-tab ${i === activeIdx ? 'is-on' : ''}`}
              style={{ '--accent': a.accent }}
              onClick={() => setActiveIdx(i)}
            >
              <i className="agt-tab-dot" aria-hidden="true" />
              <span className="agt-tab-name">{a.name}</span>
              <span className="agt-tab-role">{a.role}</span>
            </button>
          ))}
        </div>
      </Reveal>

      {/* the stage — the active agent, standing on the panel */}
      <div
        className="agt-stage"
        role="tabpanel"
        id={`agt-panel-${agent.id}`}
        aria-labelledby={`agt-tab-${agent.id}`}
        style={{ '--accent': agent.accent }}
      >
        <i className="agt-aura" aria-hidden="true" />
        <i className="agt-scrim" aria-hidden="true" />

        <div className="agt-figure">
          <motion.img
            key={agent.id}
            className="agt-photo"
            src={agent.img}
            alt={`${agent.name} — ${agent.role}, an AI agent LOOM rents for ${agent.owns.toLowerCase()}`}
            width={640}
            height={640}
            loading="lazy"
            decoding="async"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <motion.div
          key={`${agent.id}-copy`}
          className="agt-face"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
        >
          <p className="agt-eyebrow">{agent.owns}</p>
          <h3 className="agt-name">{agent.name}</h3>
          <p className="agt-line">{agent.line}</p>
          <p className="agt-quote">“{agent.quote}”</p>

          <div className="agt-cols">
            <div className="agt-col">
              <p className="agt-col-h">What it does</p>
              <ul className="agt-list">
                {agent.does.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
            <div className="agt-col">
              <p className="agt-col-h">What it needs from you</p>
              <ul className="agt-list agt-list--needs">
                {agent.needs.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          </div>

          <div className="agt-meta">
            <span className="agt-meta-item"><i className="agt-meta-dot" aria-hidden="true" />{agent.runsOn}</span>
            <span className="agt-meta-item">{agent.cadence}</span>
          </div>

          <div className="agt-cta">
            <WoolButton
              label={`Rent ${agent.name}`}
              onClick={() => open({ note: `Rent — ${agent.name}` })}
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
