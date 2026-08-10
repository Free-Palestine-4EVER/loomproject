// THE LOOM PROTOCOL — three MCP servers, private beta, access by request.
//
// MCP (Model Context Protocol) is how an AI client — Claude, Cursor, an agent
// a client already runs — plugs into an outside system. This section presents
// three LOOM servers as the studio's most technical product shelf: a brand
// server, the Machine as tools, and the 3D/AR room server.
//
// IT IS A GATE, NOT A DOWNLOAD. Nothing here links to an endpoint. Every card
// shows the shape of the config with the host and the key redacted, and the
// only action is "Request access", which opens an inline signup (name, work
// email, company, what they'd wire it to) and hands the request to the studio's
// existing contact routes — WhatsApp deep link, mailto fallback. There is no
// backend on this site and this section does not pretend otherwise: the form
// composes a message, it does not POST anywhere.
//
// HONESTY RULES kept here deliberately:
//   - every card is labelled "Private beta" — none claims general availability
//   - no seat counts, no queue positions, no uptime figures, no testimonials
//   - the redacted key is visibly a placeholder (•), never a plausible token
//
// REWORK (client: "smaller, more direct, more animation"): the pitch used to
// run two paragraphs before a reader reached the cards — cut to one line, and
// the second paragraph's job (private beta, hand-issued) now doubles as the
// tail of that same sentence instead of a separate block. Card `line` copy is
// trimmed the same way — same claims, fewer words carrying them.
//
// THE CONNECTOR (<Connector>, below) replaces the cut paragraph with a
// picture of the claim instead of a restatement of it: "your agent" branching
// into the three servers. It is why the section needed less text, not just
// smaller text.
//
// COST: no @keyframes at rest. Entry is one-shot (Reveal / SplitWords /
// Connector's branches); the card's lock-lift, the gate's AnimatePresence
// swap and the panel's open are transitions, played once per state change,
// never looping. The page already carries two WebGL layers — see CLAUDE.md.
import { useCallback, useId, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { SplitWords, Reveal, Magnetic, EASE } from '../lib/motion.jsx'
import { WoolButton } from './Wool.jsx'
import { BRAND } from '../data/site.js'
import './loommcp.css'

const SERVERS = [
  {
    id: 'atelier',
    n: '01',
    name: 'ATELIER',
    slug: 'loom-atelier',
    role: 'Brand context server',
    line: 'The brand as data, not a style guide to remind it of — tokens, tone, approved lockups, read live. A model that drifts gets corrected by the source.',
    tools: [
      ['brand.tokens', 'colour, type and spacing, as data'],
      ['brand.voice', 'tone rules + the banned-words list'],
      ['asset.find', 'the right lockup for the placement'],
      ['copy.check', 'flags a line that is off-brand, and why'],
    ],
    photo: 'atelier',
    accent: 'var(--yarn-pink)',
    yarn: 'magenta',
  },
  {
    id: 'machine',
    n: '02',
    name: 'MACHINE',
    slug: 'loom-machine',
    role: 'Content production server',
    line: 'The Machine, exposed as tools — plan, draft, render, queue, from wherever the client already sits. Nothing ships until an editor releases it.',
    tools: [
      ['month.plan', 'a month of posts from one brief'],
      ['post.draft', 'AR + EN copy for a single slot'],
      ['post.render', 'the frame, at the brand’s art direction'],
      ['queue.release', 'ships only what an editor approved'],
    ],
    photo: 'machine',
    accent: 'var(--yarn-violet)',
    yarn: 'violet',
  },
  {
    id: 'room',
    n: '03',
    name: 'ROOM',
    slug: 'loom-room',
    role: '3D & AR server',
    line: 'A photo goes in, a mesh comes out, staged in a room the customer can walk around on their phone — ask for it in a sentence instead of booking a render.',
    tools: [
      ['mesh.from_photo', 'one still → a clean, scaled mesh'],
      ['room.stage', 'places the piece, lights it, frames it'],
      ['ar.link', 'a shareable AR view, no app'],
      ['catalogue.sync', 'pushes the set to the store'],
    ],
    photo: 'room',
    accent: 'var(--yarn-blue)',
    yarn: 'blue',
  },
]

// ——— the connector ——————————————————————————————————————————
// Replaces the paragraph this rework cut: instead of telling a reader "point
// your agent at one and it becomes tools inside it", this SHOWS it — a node
// for the reader's agent, branching into the three servers below, coloured to
// match each card's accent so the line the eye follows down is the same
// colour the card lands in. One-shot on scroll-into-view, staggered on the
// same index as CARD below so the branch to a server arrives just ahead of
// that server's card — the signal reaches it first, then the card follows.
//
// scaleX only (never width/flex-basis): a growing line is a transform, which
// is the one thing this section is allowed to animate at scroll-cost. The dot
// at the end is a static ::after — nothing about it moves independently, it
// just appears where the line's edge stops.
function Connector() {
  const reduced = useReducedMotion()
  const branch = {
    hidden: reduced ? { opacity: 0 } : { scaleX: 0, opacity: 0 },
    in: (i = 0) => ({
      opacity: 1,
      scaleX: 1,
      transition: { duration: 0.7, ease: EASE, delay: 0.15 + i * 0.12 },
    }),
  }
  return (
    <div className="mcp-connector" aria-hidden="true">
      <span className="mcp-connector-node">your agent</span>
      <div className="mcp-connector-branches">
        {SERVERS.map((s, i) => (
          <motion.span
            key={s.id}
            className="mcp-connector-branch"
            style={{ '--accent': s.accent }}
            variants={branch}
            custom={i}
            initial="hidden"
            whileInView="in"
            viewport={{ once: true, margin: '-15% 0px' }}
          />
        ))}
      </div>
    </div>
  )
}

/* The config every MCP client takes, with the two things access buys — the
   host and the key — struck out. Rendered as text, not a copy target: there is
   nothing here to paste yet, and a copy button would say otherwise. */
function ConfigBlock({ s }) {
  return (
    /* ONE LINE, not the nine-line mcpServers block this started as. That block
       was the tallest thing in the card and pushed the section past a viewport
       and a half on 1440x900 — which is the "make it smaller" note. Nothing is
       lost: a redacted config cannot be pasted, so its only job was to say
       "this is a real MCP endpoint", and the slug plus the host says that in a
       fifth of the height. */
    <p className="mcp-config" aria-label={`Endpoint for ${s.slug}, host redacted until access is granted`}>
      <code className="mcp-config-slug">{s.slug}</code>
      <span className="mcp-config-arrow" aria-hidden="true">→</span>
      <code className="mcp-config-url">
        https://<i className="mcp-redact">••••••</i>.loomstudio-jo.com/mcp
      </code>
    </p>
  )
}

function AccessForm({ s, onDone }) {
  const uid = useId()
  const [f, setF] = useState({ name: '', email: '', company: '', use: '' })
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const body = [
      `LOOM ${s.name} — MCP access request`,
      ``,
      `Server:  ${s.slug}`,
      `Name:    ${f.name}`,
      `Email:   ${f.email}`,
      `Company: ${f.company || '—'}`,
      ``,
      `Wiring it to: ${f.use || '—'}`,
    ].join('\n')
    // No backend on this site — the request leaves through the same two routes
    // every other CTA uses. WhatsApp in a new tab, mailto as the fallback for
    // anyone who blocks it.
    window.open(`${BRAND.whatsapp}?text=${encodeURIComponent(body)}`, '_blank', 'noopener')
    onDone(f.email)
  }

  return (
    <form className="mcp-form" onSubmit={submit}>
      <div className="mcp-field">
        <label htmlFor={`${uid}-n`}>Name</label>
        <input id={`${uid}-n`} required value={f.name} onChange={set('name')} autoComplete="name" placeholder="Who's asking" />
      </div>
      <div className="mcp-field">
        <label htmlFor={`${uid}-e`}>Work email</label>
        <input id={`${uid}-e`} required type="email" value={f.email} onChange={set('email')} autoComplete="email" placeholder="you@company.com" />
      </div>
      <div className="mcp-field">
        <label htmlFor={`${uid}-c`}>Company</label>
        <input id={`${uid}-c`} value={f.company} onChange={set('company')} autoComplete="organization" placeholder="Optional" />
      </div>
      <div className="mcp-field mcp-field--wide">
        <label htmlFor={`${uid}-u`}>What would you wire it to?</label>
        <input id={`${uid}-u`} value={f.use} onChange={set('use')} placeholder="Claude, Cursor, your own agent…" />
      </div>
      <div className="mcp-form-foot">
        <Magnetic>
          <WoolButton label="Request access" yarn={s.yarn} type="submit" size="small" />
        </Magnetic>
        <p className="mcp-form-note">
          Goes straight to the studio — no list, no drip. Keys are issued by hand.
        </p>
      </div>
    </form>
  )
}

// ——— the sequence ———————————————————————————————————————————
// The three cards deal themselves in one after another, and each card then
// assembles its own rows in order (title → line → the four tools → config →
// gate). Written as VARIANTS rather than per-element `delay` props for one
// reason: on a phone the grid is a tall single column, so a fixed delay set on
// each card fires whether or not that card is anywhere near the viewport, and
// by the time the reader scrolls to card three it has long since finished. Each
// card owns its own `whileInView` trigger — the stagger below is INSIDE the
// card — so the sequence plays where it can actually be seen, on any width.
//
// `once: true` everywhere: this is a one-shot entry, not a loop. Nothing in this
// section animates at rest (see loommcp.css).
// `in` is a FUNCTION variant taking the card index through `custom` — a plain
// `transition={{ delay }}` prop would be the default transition and the variant
// declares its own, which is exactly the case where the delay can be dropped.
const CARD = {
  hidden: { opacity: 0, y: 44 },
  in: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: EASE,
      delay: i * 0.12,
      when: 'beforeChildren',
      staggerChildren: 0.075,
    },
  }),
}
const ROW = {
  hidden: { opacity: 0, y: 14 },
  in: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}
// Reduced motion keeps the sequence but drops the travel — the cards still
// arrive in order, they just fade rather than rise.
const flat = (v) => ({ ...v, hidden: { ...v.hidden, y: 0 } })

/* ——— A RACK UNIT (redesigned 10 Aug 2026) ———
   Was one of three identical outlined cards in a 3-up grid — the same shape as
   Studios, the Lab, Apps and the old Process, and the reason this section read
   as templated. Now each server is a full-width unit in a rack: a photographed
   plate, the name at display scale, and its four tools as a real monospace
   list rather than a bulleted one. Units alternate which side the plate sits
   on, so three of them read as a stack rather than as a repeated row.

   EVERYTHING FUNCTIONAL IS UNTOUCHED — ConfigBlock, AccessForm, the three gate
   states and their AnimatePresence swap all keep their markup and class names,
   so the honesty rules at the top of this file (redacted host, private-beta
   label, no endpoint) survive the redesign exactly as written. */
function ServerCard({ s, i }) {
  const [state, setState] = useState('shut') // shut → form → sent
  const [email, setEmail] = useState('')
  const done = useCallback((e) => { setEmail(e); setState('sent') }, [])
  const reduced = useReducedMotion()
  const card = reduced ? flat(CARD) : CARD
  const row = reduced ? flat(ROW) : ROW

  return (
    <motion.article
      className={`mcp-unit is-${state} ${i % 2 ? 'is-flipped' : ''}`}
      style={{ '--accent': s.accent }}
      variants={card}
      custom={i}
      initial="hidden"
      whileInView="in"
      viewport={{ once: true, margin: '-12% 0px' }}
    >
      {/* THE PLATE. The photograph is the redesign's answer to "this needs
          photos", and it degrades honestly: the plate carries a dyed gradient
          of the server's own accent underneath, so a missing or still-loading
          render reads as a coloured plate rather than as a broken box. */}
      <motion.div className="mcp-plate" variants={row}>
        {/* The photography finally exists (10 Aug 2026) — this section shipped
            its redesign before it did, which is why every plate rendered as
            just the dyed gradient below and the six files 404'd in production.
            AVIF first, then WebP, in BOTH the phone and the desktop branch:
            one <source> per format per breakpoint, since a browser takes the
            first <source> whose media AND type it can use. Width/height are
            the real encoded dimensions, so the plate reserves its box before
            the bytes land instead of reflowing the unit beside it. */}
        <picture>
          <source media="(max-width: 720px)" type="image/avif" srcSet={`/img/mcp/${s.photo}-sm.avif`} />
          <source media="(max-width: 720px)" type="image/webp" srcSet={`/img/mcp/${s.photo}-sm.webp`} />
          <source type="image/avif" srcSet={`/img/mcp/${s.photo}.avif`} />
          <img
            className="mcp-plate-img"
            src={`/img/mcp/${s.photo}.webp`}
            alt=""
            width={900}
            height={502}
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </picture>
        <span className="mcp-plate-n" aria-hidden="true">{s.n}</span>
      </motion.div>

      <div className="mcp-main">
        <motion.header className="mcp-unit-head" variants={row}>
          <h3 className="mcp-name">
            <span className="mcp-name-pre">LOOM</span> {s.name}
          </h3>
          <p className="mcp-role">{s.role}</p>
          <span className="mcp-beta">Private beta</span>
        </motion.header>

        <motion.p className="mcp-line" variants={row}>{s.line}</motion.p>

        <motion.div variants={row}>
          <ConfigBlock s={s} />
        </motion.div>

        <motion.div className="mcp-gate" variants={row}>
          <AnimatePresence mode="wait" initial={false}>
            {state === 'shut' && (
              <motion.button
                key="shut"
                type="button"
                className="mcp-unlock"
                onClick={() => setState('form')}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <span className="mcp-unlock-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" />
                    <path className="mcp-shackle" d="M8 10.5V7.6a4 4 0 0 1 7.8-1.3" />
                  </svg>
                </span>
                Request access
              </motion.button>
            )}

            {state === 'form' && (
              <motion.div
                key="form"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <AccessForm s={s} onDone={done} />
              </motion.div>
            )}

            {state === 'sent' && (
              <motion.p
                key="sent"
                className="mcp-sent"
                role="status"
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <b>Request in.</b> If it fits, the key and the real host come back
                to {email || 'your inbox'} by hand — usually the same week.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* the tools, as a rack label rather than a bulleted list */}
      <motion.div className="mcp-toolwrap" variants={row}>
        <p className="mcp-tools-label">Tools</p>
        <ul className="mcp-tools">
          {s.tools.map(([t, d]) => (
            <motion.li key={t} variants={row}>
              <code>{t}</code>
              <span>{d}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </motion.article>
  )
}

export function LoomMcp() {
  return (
    <section className="mcp" id="mcp">
      <span className="mcp-rail" aria-hidden="true" />

      <div className="mcp-head">
        <p className="kicker"><span>—</span> The LOOM Protocol</p>
        <SplitWords as="h2" className="h2 mcp-shout" text="PLUG YOUR AI INTO THE STUDIO" />
        <Reveal delay={0.15}>
          <p className="lede mcp-lede">
            Three MCP servers. Point Claude, Cursor or your own agent at one and
            the studio's tools show up inside it — private beta, issued by hand.
          </p>
        </Reveal>
      </div>

      {/* The <Connector> branch diagram was removed with the redesign: it
          existed to picture "your agent branches into three servers" in place
          of a paragraph the earlier rework cut. The rack does that on its own
          — three units, each with its own endpoint line — and keeping both
          meant two diagrams of one idea stacked on each other. `Connector` is
          still defined above, mounted by nothing. */}
      <div className="mcp-rack">
        {SERVERS.map((s, i) => <ServerCard key={s.id} s={s} i={i} />)}
      </div>

      <Reveal delay={0.1} className="mcp-strip">
        <div className="mcp-strip-copy">
          <h3 className="mcp-strip-h">Need one that doesn’t exist yet?</h3>
          <p className="mcp-strip-p">
            Half of what the studio builds started as “can it just talk to our
            system?” Tell us what your team asks for twice a week and we will
            tell you whether it is a server.
          </p>
        </div>
        <div className="mcp-strip-cta">
          <a
            className="mcp-mail"
            href={`mailto:${BRAND.email}?subject=${encodeURIComponent('LOOM — MCP access')}`}
          >
            {BRAND.email}
          </a>
        </div>
      </Reveal>
    </section>
  )
}
