// Solutions Explorer — 30 industries, one filterable grid, inline expanding detail panels.
import { forwardRef, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { NICHES, NICHE_GROUPS } from '../data/site.js'
import { EASE, SplitWords, Reveal } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton } from './Wool.jsx'

import './solutions.css'

// One yarn per category, so the wool tells you which shelf you're on.
const GROUP_YARN = {
  food: 'gold', health: 'blue', beauty: 'magenta', retail: 'violet',
  property: 'crimson', services: 'blue', creative: 'magenta',
}

const NicheCard = forwardRef(function NicheCard({ n, isOpen, onToggle }, ref) {
  const { open } = useWizard()
  const panelId = `sol-panel-${n.key}`

  return (
    <motion.div
      ref={ref}
      layout="position"
      className="sol-cell"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <article className={`sol-card ${isOpen ? 'is-open' : ''}`} data-cursor>
        <button
          className="sol-hit"
          onClick={() => onToggle(n.key)}
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          <span className="sol-hit-top">
            <span className="sol-name">{n.name}</span>
            <span className="sol-plus" aria-hidden="true" />
          </span>
          <span className="sol-hook">{n.hook}</span>
          <i className="sol-thread" aria-hidden="true" />
        </button>

        <div className="sol-body" id={panelId} role="region" aria-hidden={!isOpen}>
          <div className="sol-body-inner">
            <h3 className="sol-panel-hook">{n.hook}</h3>

            <ul className="sol-deliverables">
              {n.deliverables.map((d) => (
                <li key={d}>
                  <i className="sol-check" aria-hidden="true" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>

            <div className="sol-agent">
              <p className="sol-agent-kicker">AI agent</p>
              <p className="sol-agent-copy">{n.agent}</p>
            </div>

            <p className="sol-moon">
              <i className="sol-moon-mark" aria-hidden="true" />
              {n.moon}
            </p>

            {/* label is per-niche, so this one is always the CSS knit pill —
                and each category is spun from its own yarn */}
            <WoolButton
              label={`Build my ${n.name} system`}
              yarn={GROUP_YARN[n.group] ?? 'magenta'}
              className="sol-cta"
              onClick={() => open({ niche: n.name })}
            />
          </div>
        </div>
      </article>
    </motion.div>
  )
})

export function Solutions() {
  const [group, setGroup] = useState('all')
  const [openKey, setOpenKey] = useState(null)

  const list = useMemo(
    () => (group === 'all' ? NICHES : NICHES.filter((n) => n.group === group)),
    [group]
  )

  const setGroupFilter = (id) => {
    setGroup(id)
    setOpenKey(null)
  }

  const toggle = (key) => setOpenKey((cur) => (cur === key ? null : key))

  return (
    <section className="solutions" id="solutions">
      <div className="section-head">
        <p className="kicker"><span>08</span> Solutions</p>
        <SplitWords as="h2" className="h2" text="Thirty industries. One loom." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Pick your industry and watch the loom set itself up for it — the agent that
            answers at 3am, the content engine that never runs dry, the launch that lands.
          </p>
        </Reveal>
      </div>

      <div className="sol-filters" role="tablist" aria-label="Filter industries by group">
        {NICHE_GROUPS.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={group === g.id}
            className={`filter ${group === g.id ? 'is-active' : ''}`}
            onClick={() => setGroupFilter(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <motion.div className="sol-grid" layout>
        <AnimatePresence mode="popLayout">
          {list.map((n) => (
            <NicheCard key={n.key} n={n} isOpen={openKey === n.key} onToggle={toggle} />
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}
