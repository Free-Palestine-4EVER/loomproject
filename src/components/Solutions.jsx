// Solutions — a one-line search that resolves straight to the answer, plus a
// compact typographic index carrying all 30 industries as plain text.
//
// This replaces the "rack" build: a two-pane master/detail with a 30-row
// scrolling list on the left, every row wearing the exact same yellow yarn
// pill as its "icon" (an icon that told you nothing, 30 times over). The
// user's verdict was blunt — too long, too much, too retarded — and it was
// right: the section was more machinery than the point it exists to make.
//
// The point is one sentence: whatever industry you're in, the loom already
// knows it. So the section now IS that sentence, demonstrated in place —
// type your trade (or tap it in the index below) and one tailored answer
// resolves right under the search field, no list to scroll to get there.
// The index stays because the breadth is the claim, but it's set as plain
// grouped type in newspaper-index columns — honest, dense, and a fraction
// of the height a row-per-industry list demanded. No per-row image at all:
// the only per-industry mark left is a single hairline in that group's own
// yarn colour under the active name, which is both truthful (each of the
// seven groups really does have its own colour everywhere else on the site)
// and impossible to confuse with a placeholder.
import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { NICHES, NICHE_GROUPS } from '../data/site.js'
import { EASE, SplitWords, Reveal } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton } from './Wool.jsx'

import './solutions.css'

// Same seven-groups-seven-yarns map the old build used — kept, because the
// colour coding is the one piece of the previous design that was actually
// doing real work (it just had a redundant, identical icon riding along
// with it). One yarn per group, nothing shared between two unrelated trades.
const GROUP_YARN = {
  food: 'gold', health: 'blue', beauty: 'magenta', retail: 'violet',
  property: 'crimson', services: 'grey', creative: 'cream',
}
const YARN_HEX = {
  gold: 'var(--yarn-gold)', blue: 'var(--yarn-blue)', magenta: 'var(--yarn-pink)',
  violet: 'var(--yarn-violet)', crimson: '#e0244a', grey: '#a9a8b6', cream: 'var(--yarn-cream)',
}

const GROUPS = NICHE_GROUPS.filter((g) => g.id !== 'all')
const GROUP_LABEL = Object.fromEntries(GROUPS.map((g) => [g.id, g.label]))
const yarnOf = (n) => GROUP_YARN[n.group] ?? 'magenta'

// Strip accents so "cafe" reaches "Cafés & Coffee" — nobody visiting types
// the é, and a false "not on the list" on the site's own example query would
// undercut the entire pitch of this section on the very first thing a
// visitor tries.
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

// Cheapest possible "does the loom know this trade" resolver: exact name,
// then starts-with, then a loose includes — in that priority order so typing
// "cafe" resolves to Cafés & Coffee before it ever risks matching something
// that merely contains those letters deeper in another name.
function resolveNiche(raw) {
  const q = fold(raw.trim().toLowerCase())
  if (!q) return null
  return (
    NICHES.find((n) => fold(n.name.toLowerCase()) === q) ||
    NICHES.find((n) => fold(n.name.toLowerCase()).startsWith(q)) ||
    NICHES.find((n) => fold(n.name.toLowerCase()).includes(q)) ||
    null
  )
}

function AnswerCard({ n, reduced, onOpen }) {
  const yarn = yarnOf(n)
  return (
    <motion.article
      key={n.key}
      className="sol-card sol-answer"
      style={{ '--panel-yarn': YARN_HEX[yarn] }}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: reduced ? 0.01 : 0.4, ease: EASE }}
    >
      <motion.i
        className="sol-answer-thread"
        aria-hidden="true"
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: reduced ? 0.01 : 0.6, ease: EASE }}
      />
      <div className="sol-answer-left">
        <div className="sol-answer-head">
          <p className="sol-answer-kicker">{GROUP_LABEL[n.group]}</p>
          <h3 className="sol-answer-name">{n.name}</h3>
        </div>
        <p className="sol-answer-hook">{n.hook}</p>
        <WoolButton
          label={`Build my ${n.name} system`}
          yarn={yarn}
          className="sol-cta"
          onClick={() => onOpen(n)}
        />
      </div>
      <div className="sol-answer-right">
        <p className="sol-answer-label sol-sr-only">What resolves for {n.name}</p>
        <ul className="sol-deliverables">
          {n.deliverables.map((d) => (
            <li key={d}>
              <i className="sol-stitch" aria-hidden="true" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <p className="sol-agent">
          <span className="sol-agent-kicker">AI agent</span>
          <span className="sol-agent-copy">{n.agent}</span>
        </p>
      </div>
    </motion.article>
  )
}

function NoMatchCard({ query, reduced, onOpen }) {
  return (
    <motion.article
      key="no-match"
      className="sol-card sol-answer sol-answer--empty"
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: reduced ? 0.01 : 0.4, ease: EASE }}
    >
      <motion.i
        className="sol-answer-thread"
        aria-hidden="true"
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: reduced ? 0.01 : 0.6, ease: EASE }}
      />
      <div className="sol-answer-left">
        <p className="sol-answer-kicker">Not on the list — yet</p>
        <h3 className="sol-answer-name">&ldquo;{query}&rdquo;</h3>
        <p className="sol-answer-hook">
          Tell us what you actually do and the loom sets itself up for it — same agents,
          same content engine, tuned to your trade instead of these thirty.
        </p>
        <WoolButton
          label={`Ask about "${query}"`}
          yarn="magenta"
          className="sol-cta"
          onClick={() => onOpen(query)}
        />
      </div>
    </motion.article>
  )
}

export function Solutions() {
  const reduced = useReducedMotion()
  const { open } = useWizard()
  const [query, setQuery] = useState('')
  const [pinnedKey, setPinnedKey] = useState(NICHES[0].key)

  const typedMatch = useMemo(() => resolveNiche(query), [query])
  const noMatch = query.trim().length > 1 && !typedMatch
  const shown = typedMatch ?? NICHES.find((n) => n.key === pinnedKey) ?? NICHES[0]

  const pick = useCallback((n) => {
    setPinnedKey(n.key)
    setQuery(n.name)
  }, [])

  const sectionAccent = YARN_HEX[GROUP_YARN[shown.group]]

  return (
    <section className="solutions" id="solutions" style={{ '--sol-tint': sectionAccent }}>
      <div className="section-head">
        <p className="kicker"><span>04</span> Solutions</p>
        <SplitWords as="h2" className="h2" text="Thirty industries. One loom." />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 10 }}>
            Type your industry — the loom already knows it.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.05} className="sol-console">
        <div className="sol-search-row">
          <label className="sol-search-label" htmlFor="sol-search">Find your industry</label>
          <div className="sol-search-field">
            <input
              id="sol-search"
              className="sol-search"
              type="text"
              autoComplete="off"
              spellCheck="false"
              placeholder="Try “cafés”, “dental”, “real estate”…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              list="sol-search-list"
              aria-describedby="sol-answer"
            />
            <span className="sol-search-arrow" aria-hidden="true" />
            <datalist id="sol-search-list">
              {NICHES.map((n) => <option key={n.key} value={n.name} />)}
            </datalist>
          </div>
        </div>

        <div id="sol-answer" role="region" aria-live="polite" aria-label="Selected industry" className="sol-answer-slot">
          <AnimatePresence mode="wait" initial={false}>
            {noMatch ? (
              <NoMatchCard query={query} reduced={reduced} onOpen={(niche) => open({ niche })} />
            ) : (
              <AnswerCard n={shown} reduced={reduced} onOpen={(n) => open({ niche: n.name })} />
            )}
          </AnimatePresence>
        </div>
      </Reveal>

      {/* the breadth IS the claim — every one of the thirty stays reachable
          here, set as one continuous run of grouped type instead of thirty
          bordered rows. It's a single flowing paragraph (not 7 separate
          blocks) on purpose: multi-column text balances itself line by line,
          so nothing forces one column to run long while its neighbours sit
          half-empty — the failure mode a "keep each category boxed" layout
          hit immediately. Clicking a name is the same "resolve" the search
          field does above; this is just the other door into it. */}
      <nav className="sol-index" aria-label="All industries, by category">
        <p className="sol-idx-flow">
          {GROUPS.map((g, gi) => {
            const items = NICHES.filter((n) => n.group === g.id)
            return (
              <span className="sol-idx-group" key={g.id} style={{ '--grp-yarn': YARN_HEX[GROUP_YARN[g.id]] }}>
                <span className="sol-idx-label">{g.label}</span>{' '}
                {items.map((n, i) => (
                  <span key={n.key}>
                    <button
                      type="button"
                      className={`sol-idx-btn${n.key === shown.key && !noMatch ? ' is-active' : ''}`}
                      aria-pressed={n.key === shown.key && !noMatch}
                      onClick={() => pick(n)}
                    >
                      {n.name}
                    </button>
                    {i < items.length - 1 && <span className="sol-idx-sep" aria-hidden="true">·</span>}
                  </span>
                ))}
                {gi < GROUPS.length - 1 && <span className="sol-idx-gap" aria-hidden="true"> — </span>}
              </span>
            )
          })}
        </p>
      </nav>
    </section>
  )
}
