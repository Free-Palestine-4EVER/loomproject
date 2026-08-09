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
// of the height a row-per-industry list demanded. No per-ROW image: the
// mark that killed the old rack build was one identical icon on all 30
// rows, so nothing here repeats per-niche. What every group DOES get is
// one honest, group-truthful icon (below) — seven, not thirty, and every
// one of them actually draws its own trade.
//
// Second pass (client brief: real search behaviour, a pink stage, icons,
// more design): the console — search field plus the one resolved answer —
// now sits on its own pink ground, the site's second pink surface after
// the footer's bloom-sky, built off the same grammar (a soft radial bloom
// crossing the edge, ink re-pointed to the house's #33243d family, never a
// hard rule). The search field grew an actual glass icon and a cycling,
// typewriter placeholder that stops the instant a visitor focuses or
// types. The answer card grew a group-icon badge next to its name, and the
// index below grew the same seven icons ahead of their group labels.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { NICHES, NICHE_GROUPS } from '../data/site.js'
import { EASE, SplitWords, Reveal } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { WoolButton } from './Wool.jsx'

import './solutions.css'

// WoolIcon's 20 names (arrow-right, plus, list, user, trash, settings, home,
// lock, unlock, eye, search, heart, cart, tag, phone, pin, calendar, upload,
// share-nodes, copy — see WOOL_ICONS in Wool.jsx) are generic UI glyphs, not
// trade marks: nothing in that set reads as "restaurant" or "dental clinic"
// or "barbershop", so borrowing one per group would either lie (a lock icon
// on Property) or repeat (home on both Property AND every group that isn't
// food/health/beauty). They're also photographed medallions shot for a dark
// stage — cream felt on a lavender rope reads fine on white, but at 300+
// repaints (30 index rows) that's 30 network requests for icons that don't
// even name the right trade. Seven small inline SVGs, one per NICHE_GROUPS
// id, colour themselves from the same --panel-yarn/--grp-yarn custom
// properties the section already threads through everything else, cost
// nothing to repeat, and actually draw the group they stand for.
const GROUP_ICON_PATHS = {
  food: (
    <>
      <path d="M6 2.5v6a2 2 0 0 0 4 0v-6" />
      <path d="M8 8.5V21" />
      <path d="M15.4 2.5c-1.5 1-2.3 2.7-2.3 4.5 0 1.9 1 3.4 2.3 4.2V21" />
    </>
  ),
  health: (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <path d="M12 8.2v7.6M8.2 12h7.6" />
    </>
  ),
  beauty: (
    <>
      <circle cx="6.6" cy="6.2" r="2.2" />
      <circle cx="6.6" cy="17.8" r="2.2" />
      <path d="M8.3 7.7L19.5 18M8.3 16.3L19.5 6" />
    </>
  ),
  retail: (
    <>
      <path d="M6.3 8h11.4l-1 12h-9.4l-1-12z" />
      <path d="M9 8V6.6a3 3 0 0 1 6 0V8" />
    </>
  ),
  property: (
    <>
      <path d="M4 11.3L12 4.5l8 6.8" />
      <path d="M6.5 10.3V19.5h11V10.3" />
    </>
  ),
  services: (
    <path d="M15.3 5a4 4 0 0 0-5.5 5.3L4 16l3 3 5.7-5.7A4 4 0 0 0 18 8.5l-2.6 2.6-2-2 2.6-2.6z" />
  ),
  creative: (
    <path d="M12 3.3l1.8 5.2 5.2 1.8-5.2 1.8L12 17.3l-1.8-5.2-5.2-1.8 5.2-1.8L12 3.3z" />
  ),
}
function GroupIcon({ group, className = '' }) {
  const d = GROUP_ICON_PATHS[group]
  if (!d) return null
  return (
    <svg
      viewBox="0 0 24 24" className={`sol-gicon ${className}`.trimEnd()} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    >
      {d}
    </svg>
  )
}

// A short list of real niche names, worded the way someone actually types
// them into a search box (lowercase, sometimes shortened) — the same trades
// NICHES already lists, not invented ones. "car rental" and "dental clinics"
// lead the list because they're the client's own two examples for this
// exact feature.
const SEARCH_EXAMPLES = [
  'car rental', 'dental clinics', 'restaurants', 'real estate',
  'barbershops', 'law firms', 'cafés', 'wedding venues',
]

// Type-on, hold, delete, next — a plain setTimeout chain, not an interval,
// because the four phases (type/hold/delete/gap) each need their own delay
// and a single tick rate can't express that. Frozen at the first word
// whenever `active` is false: the caller flips that off the instant the
// field is focused or carries a real query, so this never fights the
// visitor's own typing, and reduced-motion callers simply never flip it on.
function useTypewriter(words, active) {
  const [text, setText] = useState(words[0])
  const stateRef = useRef({ i: 0, char: 0, deleting: false })

  useEffect(() => {
    if (!active) {
      stateRef.current = { i: 0, char: 0, deleting: false }
      setText(words[0])
      return
    }
    let timer
    const TYPE_MS = 62, HOLD_MS = 1500, DELETE_MS = 34, GAP_MS = 420
    const tick = () => {
      const s = stateRef.current
      const word = words[s.i]
      if (!s.deleting) {
        s.char += 1
        setText(word.slice(0, s.char))
        if (s.char >= word.length) {
          s.deleting = true
          timer = setTimeout(tick, HOLD_MS)
        } else {
          timer = setTimeout(tick, TYPE_MS)
        }
      } else {
        s.char -= 1
        setText(word.slice(0, s.char))
        if (s.char <= 0) {
          s.deleting = false
          s.i = (s.i + 1) % words.length
          timer = setTimeout(tick, GAP_MS)
        } else {
          timer = setTimeout(tick, DELETE_MS)
        }
      }
    }
    timer = setTimeout(tick, GAP_MS)
    return () => clearTimeout(timer)
  }, [active, words])

  return text
}

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
  // Photographic art exists for 23 of the 30 niches so far (dental, clinic,
  // pharmacy, school, kids, ngo, wedding are still being rendered) — rather
  // than a hardcoded manifest, this follows Banners.jsx's own rule: reference
  // the file unconditionally and let onLoad/onError decide, so a niche that
  // gains art later needs no code change here at all. `loaded` resets on
  // every niche switch because AnswerCard itself never unmounts between
  // answers (only the inner motion.article's key changes, for the
  // AnimatePresence crossfade) — without the reset, a photo niche's
  // `has-photo` class would still be sitting on the very next card even if
  // that next niche has no art yet.
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setLoaded(false) }, [n.key])
  return (
    <motion.article
      key={n.key}
      className={`sol-panelcard sol-answer${loaded ? ' has-photo' : ''}`}
      style={{ '--panel-yarn': YARN_HEX[yarn] }}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: reduced ? 0.01 : 0.4, ease: EASE }}
    >
      {/* the wool-render banner — subject grouped in the right two thirds,
          left third left calm on purpose so the card copy has somewhere to
          sit once this becomes the card's background. `display: contents` so
          the <picture> adds no box of its own (same reason Banners.jsx wraps
          every img the same way) — the real img is positioned straight
          against `.sol-answer` by `.sol-answer-bg`. Stays out of the tree
          visually (no class swap) until it actually decodes, so a niche with
          no art yet is still today's finished pink card, never a white hole
          or a broken image icon. */}
      {/* The photograph and its scrim moved OUT of this card on 10 Aug 2026 —
          they belong to `.sol-stage` now, one level up. The card used to BE
          the photo with copy floated over it; the client's mock puts the
          search box and the copy in two white cards on the left of a single
          wide photo instead, so the photo has to outlive the card that swaps
          inside it. Keeping it here made every industry change re-decode the
          backdrop and flash. */}
      <motion.i
        className="sol-answer-thread"
        aria-hidden="true"
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: reduced ? 0.01 : 0.6, ease: EASE }}
      />
      <div className="sol-answer-left">
        <div className="sol-answer-head">
          <span className="sol-answer-badge" aria-hidden="true">
            <GroupIcon group={n.group} className="sol-answer-gicon" />
          </span>
          <div className="sol-answer-headtext">
            <p className="sol-answer-kicker">{GROUP_LABEL[n.group]}</p>
            <h3 className="sol-answer-name">{n.name}</h3>
          </div>
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

/* THE STAGE PHOTO. One 21:9 render behind the whole console, swapped when the
   resolved industry changes — not re-mounted per answer card, which is what
   made the backdrop flash on every keystroke. `display: contents` on the
   <picture> so it adds no box; the <img> is positioned against `.sol-stage`. */
function StagePhoto({ n }) {
  if (!n) return null
  return (
    <picture style={{ display: 'contents' }} key={n.key}>
      <source media="(max-width: 719px)" type="image/avif" srcSet={`/img/niches/${n.key}-9x16.avif`} />
      <source media="(max-width: 719px)" type="image/webp" srcSet={`/img/niches/${n.key}-9x16.webp`} />
      <source type="image/avif" srcSet={`/img/niches/${n.key}.avif`} />
      <img
        className="sol-stage-bg"
        src={`/img/niches/${n.key}.webp`}
        alt=""
        width={1400}
        height={600}
        loading="lazy"
        decoding="async"
        onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
      />
    </picture>
  )
}

function NoMatchCard({ query, reduced, onOpen }) {
  return (
    <motion.article
      key="no-match"
      className="sol-panelcard sol-answer sol-answer--empty"
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

export function Solutions({ merged = false } = {}) {
  // A section may not nest a section and keep its outline meaning, and the
  // merged copy lives INSIDE .counter — so the tag itself is the switch.
  const Tag = merged ? "div" : "section"

  const reduced = useReducedMotion()
  const { open } = useWizard()
  const [query, setQuery] = useState('')
  const [pinnedKey, setPinnedKey] = useState(NICHES[0].key)
  const [focused, setFocused] = useState(false)

  const typedMatch = useMemo(() => resolveNiche(query), [query])
  const noMatch = query.trim().length > 1 && !typedMatch
  const shown = typedMatch ?? NICHES.find((n) => n.key === pinnedKey) ?? NICHES[0]

  const pick = useCallback((n) => {
    setPinnedKey(n.key)
    setQuery(n.name)
  }, [])

  // Cycling only when there's nothing real to fight: idle, empty, unfocused,
  // motion allowed. The instant any of those flips — a tap into the field, a
  // keystroke — this goes false and the hook freezes on its current word
  // instead of finishing its animation underneath the cursor.
  const cycling = !reduced && !focused && query.length === 0
  const example = useTypewriter(SEARCH_EXAMPLES, cycling)
  const placeholder = reduced
    ? 'Try "cafés", "dental", "real estate"…'
    : cycling
      ? `Try "${example}"…`
      : 'Type an industry…'

  const sectionAccent = YARN_HEX[GROUP_YARN[shown.group]]

  return (
    /* `merged` = this is act two of the Counter section, not a section of its
       own (App.jsx mounts it as <Solutions merged />). Two full section heads
       back to back — "pick what you need", then "pick your industry" — read as
       two separate asks when they are one qualifier, and the second big
       headline made the first one feel answered and closed. Merged, the tag
       renders as a DIV and the head drops to a rule-and-sub-head: same words,
       one beat. Standalone still works and is what /studio previews. */
    <Tag
      className={`solutions${merged ? ' solutions--merged' : ''}`}
      id="solutions"
      style={{ '--sol-tint': sectionAccent }}
      {...(merged ? { 'aria-label': 'Solutions by industry' } : {})}
    >
      {merged ? (
        <div className="sol-act2">
          <span className="sol-act2-rule" aria-hidden="true" />
          <SplitWords as="h3" className="sol-act2-h" text="Or start from your industry." />
          <Reveal delay={0.12}>
            <p className="sol-act2-lede">
              Thirty of them, and the loom already knows yours — type it in.
            </p>
          </Reveal>
        </div>
      ) : (
        <div className="section-head">
          <p className="kicker"><span>—</span> Solutions</p>
          <SplitWords as="h2" className="h2" text="Thirty industries. One loom." />
          <Reveal delay={0.15}>
            <p className="lede" style={{ marginTop: 10 }}>
              Type your industry — the loom already knows it.
            </p>
          </Reveal>
        </div>
      )}

      <Reveal delay={0.05} className="sol-console">
        {/* THE STAGE — one wide 21:9 photograph, and everything else sits ON
            it. This is the client's mock: a search box and a content card as
            two white panels down the left of a single image, rather than a
            pink console with a search row stacked above a separate card. It
            also buys back the search row's height, which is most of why the
            section now clears the fold. */}
        <div className="sol-stage">
          <StagePhoto n={noMatch ? null : shown} />
          <i className="sol-stage-scrim" aria-hidden="true" />

          <div className="sol-ov">
            {/* white card one: the search box */}
            <div className="sol-searchbox">
              <label className="sol-search-label" htmlFor="sol-search">Find your industry</label>
              <div className="sol-search-field">
                <svg className="sol-search-glass" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="10.3" cy="10.3" r="6.3" />
                  <path d="M19.5 19.5l-4.7-4.7" />
                </svg>
                <input
                  id="sol-search"
                  className="sol-search"
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  placeholder={placeholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  list="sol-search-list"
                  aria-describedby="sol-answer"
                />
                <span className="sol-search-arrow" aria-hidden="true" />
                <datalist id="sol-search-list">
                  {NICHES.map((n) => <option key={n.key} value={n.name} />)}
                </datalist>
              </div>
            </div>

            {/* white card two: the resolved answer */}
            <div id="sol-answer" role="region" aria-live="polite" aria-label="Selected industry" className="sol-answer-slot">
              <AnimatePresence mode="wait" initial={false}>
                {noMatch ? (
                  <NoMatchCard query={query} reduced={reduced} onOpen={(niche) => open({ niche })} />
                ) : (
                  <AnswerCard n={shown} reduced={reduced} onOpen={(n) => open({ niche: n.name })} />
                )}
              </AnimatePresence>
            </div>
          </div>
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
                <span className="sol-idx-label"><GroupIcon group={g.id} className="sol-idx-gicon" />{g.label}</span>{' '}
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
    </Tag>
  )
}
