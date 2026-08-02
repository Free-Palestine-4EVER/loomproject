// Solutions Explorer — 30 industries as spools on a rack, threaded to one
// persistent swatch panel. Replaces the old flat 4-column grid of 30
// identical bordered cards (a spreadsheet, not a showcase) with a rack you
// scan and a panel that gets to actually make the case for one industry
// at a time — the one a visitor is there for.
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { NICHES, NICHE_GROUPS } from '../data/site.js'
import { EASE, SplitWords, Reveal } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton } from './Wool.jsx'

import './solutions.css'

// Every group now gets its OWN photographed yarn. The old map put two pairs
// of groups on the same colour (health & services both blue, beauty &
// creative both magenta) which was invisible filler when nothing colour-coded
// off it — now that the rack, the panel accent and the filter pills all read
// this map, a shared colour would make two unrelated industries look related.
// Seven groups, seven yarns on disk: one each, nothing left over.
const GROUP_YARN = {
  food: 'gold', health: 'blue', beauty: 'magenta', retail: 'violet',
  property: 'crimson', services: 'grey', creative: 'cream',
}

// Hex read straight off the site's own yarn tokens where one exists — crimson
// and grey never got a --yarn-* custom property, only the rgba glows in
// wool.css, so those two stay literal.
const YARN_HEX = {
  gold: 'var(--yarn-gold)', blue: 'var(--yarn-blue)', magenta: 'var(--yarn-pink)',
  violet: 'var(--yarn-violet)', crimson: '#e0244a', grey: '#a9a8b6', cream: 'var(--yarn-cream)',
}
// same pale-yarn exception wool.css already makes for its knit buttons
const PALE_YARN = new Set(['grey', 'cream'])

const GROUP_LABEL = Object.fromEntries(
  NICHE_GROUPS.filter((g) => g.id !== 'all').map((g) => [g.id, g.label])
)

const yarnOf = (n) => GROUP_YARN[n.group] ?? 'magenta'

// forwardRef is load-bearing: AnimatePresence mode="popLayout" clones each row
// with a ref to measure it before it exits, and that ref silently does nothing
// on a plain function component — no measurement, no exit animation.
const RackRow = forwardRef(function RackRow({ n, isActive, tabIndex, onSelect, reduced }, ref) {
  const yarn = yarnOf(n)
  return (
    <motion.button
      ref={ref}
      type="button"
      role="tab"
      id={`sol-tab-${n.key}`}
      aria-selected={isActive}
      aria-controls="sol-panel"
      tabIndex={tabIndex}
      className={`rack-row${isActive ? ' is-active' : ''}`}
      style={{ '--row-yarn': YARN_HEX[yarn] }}
      onClick={() => onSelect(n.key)}
      layout="position"
      initial={reduced ? false : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduced ? undefined : { opacity: 0, x: 8 }}
      transition={{ duration: reduced ? 0.15 : 0.36, ease: EASE }}
    >
      <span className={`rack-spool rack-spool--${yarn}`} aria-hidden="true" />
      <span className="rack-copy">
        <span className="rack-name">{n.name}</span>
        <span className="rack-hook">{n.hook}</span>
      </span>
      <span className="rack-arrow" aria-hidden="true" />
    </motion.button>
  )
})

const DetailPanel = forwardRef(function DetailPanel({ n, reduced, onOpen }, ref) {
  const yarn = yarnOf(n)

  return (
    <article
      ref={ref}
      className="sol-card sol-panel"
      id="sol-panel"
      role="tabpanel"
      aria-labelledby={`sol-tab-${n.key}`}
      tabIndex={-1}
      data-cursor
      style={{ '--panel-yarn': YARN_HEX[yarn] }}
    >
      {/* the first thing that happens on a switch: one thread drawn corner
          to corner, THEN the swatch's content lands — the weave, not the growth */}
      <motion.i
        key={`thread-${n.key}`}
        className="sol-panel-thread"
        aria-hidden="true"
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: reduced ? 0.01 : 0.65, ease: EASE }}
      />

      <div className="sol-panel-body" key={n.key}>
        <div className="sol-panel-head">
          <span className={`rack-spool rack-spool--${yarn} is-lg`} aria-hidden="true" />
          <div className="sol-panel-head-copy">
            <p className="sol-panel-kicker">{GROUP_LABEL[n.group]}</p>
            <h3 className="sol-panel-name">{n.name}</h3>
          </div>
        </div>

        <p className="sol-panel-hook">{n.hook}</p>

        <ul className="sol-deliverables">
          {n.deliverables.map((d, i) => (
            <motion.li
              key={d}
              initial={reduced ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reduced ? 0.01 : 0.42, ease: EASE, delay: reduced ? 0 : 0.1 + i * 0.05 }}
            >
              <i className="sol-stitch" aria-hidden="true" />
              <span>{d}</span>
            </motion.li>
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

        <WoolButton
          label={`Build my ${n.name} system`}
          yarn={yarn}
          className="sol-cta"
          onClick={() => onOpen(n)}
        />
      </div>
    </article>
  )
})

export function Solutions() {
  const reduced = useReducedMotion()
  const { open } = useWizard()
  const [group, setGroup] = useState('all')
  const [activeKey, setActiveKey] = useState(NICHES[0].key)
  const panelRef = useRef(null)

  const list = useMemo(
    () => (group === 'all' ? NICHES : NICHES.filter((n) => n.group === group)),
    [group]
  )
  const active = useMemo(
    () => list.find((n) => n.key === activeKey) ?? list[0],
    [list, activeKey]
  )

  // filtering re-centres the rack on that group's first spool — mirrors the
  // old grid's "collapse the open card" reset, just aimed at a panel that's
  // never allowed to go empty
  const selectGroup = useCallback((id) => {
    setGroup(id)
    const next = id === 'all' ? NICHES : NICHES.filter((n) => n.group === id)
    if (next.length) setActiveKey(next[0].key)
  }, [])

  // below ~880px the panel sits ABOVE the rack (see solutions.css), so tapping
  // a row further down the list changes a panel the visitor has already
  // scrolled past — carry them back up to see it land
  // `scroll` is false when the selection came from arrow-key navigation: the
  // rack keeps focus while scrubbing, and yanking the page to the panel on
  // every keystroke scrolls the row you are actually on out of sight.
  const selectNiche = useCallback((key, { scroll = true } = {}) => {
    setActiveKey(key)
    if (scroll && window.matchMedia('(max-width: 880px)').matches) {
      panelRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    }
  }, [reduced])

  // roving tabindex over a role="tab" rack: arrow keys move AND select — the
  // rack is cheap to re-render, so scrubbing through spools can be immediate
  // rather than a separate "confirm" step
  const onRackKeyDown = useCallback((e) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]'))
    if (!tabs.length) return
    const i = tabs.indexOf(document.activeElement)
    let next
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1 + tabs.length) % tabs.length]
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length]
    else if (e.key === 'Home') next = tabs[0]
    else next = tabs[tabs.length - 1]
    e.preventDefault()
    next.focus()
    selectNiche(next.id.replace('sol-tab-', ''), { scroll: false })
  }, [selectNiche])

  const sectionAccent = group === 'all' ? 'var(--magenta)' : YARN_HEX[GROUP_YARN[group]]

  return (
    <section className="solutions" id="solutions" style={{ '--sol-tint': sectionAccent }}>
      <div className="section-head">
        <p className="kicker"><span>06</span> Solutions</p>
        <SplitWords as="h2" className="h2" text="Thirty industries. One loom." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>
            Pick your industry and watch the loom set itself up for it — the agent that
            answers at 3am, the content engine that never runs dry, the launch that lands.
          </p>
        </Reveal>
      </div>

      {/* toggle buttons, not tabs — the rack below is the real tablist */}
      <div className="sol-filters" role="group" aria-label="Filter industries by group">
        {NICHE_GROUPS.map((g) => (
          <button
            key={g.id}
            aria-pressed={group === g.id}
            className={`filter ${group === g.id ? 'is-active' : ''}${PALE_YARN.has(GROUP_YARN[g.id]) ? ' is-pale' : ''}`}
            style={g.id !== 'all' ? { '--pill-tint': YARN_HEX[GROUP_YARN[g.id]] } : undefined}
            onClick={() => selectGroup(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="sol-layout">
        <div
          className="sol-rack"
          role="tablist"
          aria-orientation="vertical"
          aria-label="Industries"
          onKeyDown={onRackKeyDown}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((n) => (
              <RackRow
                key={n.key}
                n={n}
                isActive={n.key === active.key}
                tabIndex={n.key === active.key ? 0 : -1}
                onSelect={selectNiche}
                reduced={reduced}
              />
            ))}
          </AnimatePresence>
        </div>

        <DetailPanel ref={panelRef} n={active} reduced={reduced} onOpen={(n) => open({ niche: n.name })} />
      </div>
    </section>
  )
}
