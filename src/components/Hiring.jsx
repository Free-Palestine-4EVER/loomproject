// WE ARE HIRING — the ninth chair.
//
// Client brief, verbatim: shorter and simpler, moved to just above the footer,
// and reframed around a reel instead of a CV — "show us your projects then
// what you studied." That ask sets the whole shape of this file: one short ask
// (reel first, big; education second, small), four roles reduced to name +
// discipline (the old per-card blurb + three-bullet "needs" list is gone —
// that was the CV instinct this section now argues against), and one visible
// way to actually send something.
//
// The empty-stage visual survives untouched: four lit stages, a felted `user`
// medallion standing in for the missing hire, the warp thread still hanging.
// That is the section's one piece of art direction and cutting copy around it
// only sharpens it — less to read before the eye lands on the empty mark.
//
// Roles are the studio's actual disciplines (motion, generative, web & app,
// 3D/AR). Nothing here claims a salary, a headcount, a benefit or a funding
// fact — the only company facts used are BRAND's two cities and its real
// contact routes.
//
// COST: zero animations at rest — no @keyframes in hiring.css at all. Entry is
// one-shot (Reveal / SplitWords) and every other move is a hover/focus
// transition. The page already carries two WebGL layers.
import { WoolButton, WoolIcon } from './Wool.jsx'
import { SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { BRAND } from '../data/site.js'
import './hiring.css'

const ROLES = [
  { id: 'dyer', n: '01', role: 'The Dyer', owns: 'Motion & Colour', accent: 'var(--yarn-pink)' },
  { id: 'prompter', n: '02', role: 'The Prompter', owns: 'Generative Image & Film', accent: 'var(--yarn-violet)' },
  { id: 'stitcher', n: '03', role: 'The Stitcher', owns: 'Web & App Engineering', accent: 'var(--yarn-blue)' },
  { id: 'carver', n: '04', role: 'The Carver', owns: '3D, AR & CGI', accent: 'var(--yarn-gold)' },
]

function RoleCard({ r, i, onApply }) {
  return (
    <Reveal delay={i * 0.06} className="hire-cell">
      <article className="hire-card" style={{ '--accent': r.accent }}>
        <span className="hire-open">Open</span>

        {/* The empty stage: a lit mark with the felted `user` medallion on it
            instead of a person, the role's number ghosted behind as the
            backdrop, and the warp thread still hanging with nothing tied on.
            Decorative — the role is named in the heading below. */}
        <div className="hire-stage" aria-hidden="true">
          <span className="hire-glow" />
          <span className="hire-ghost">{r.n}</span>
          <span className="hire-warp" />
          <span className="hire-ring">
            <WoolIcon name="user" size="lg" />
          </span>
          <span className="hire-ground" />
        </div>

        <div className="hire-meta">
          <span className="hire-index">{r.n}</span>
          <h3 className="hire-name">{r.role}</h3>
          <p className="hire-owns">{r.owns}</p>
        </div>

        <div className="hire-foot">
          <button
            type="button"
            className="hire-apply"
            onClick={() => onApply(r)}
          >
            Send reel for {r.role}
          </button>
        </div>
      </article>
    </Reveal>
  )
}

export function Hiring() {
  const { open } = useWizard()
  const apply = (r) => open({ note: `Reel — ${r.role} (${r.owns})` })

  return (
    <section className="hire" id="hiring">
      <span className="hire-rail" aria-hidden="true" />

      <div className="hire-head">
        <p className="kicker"><span>—</span> Careers</p>
        {/* The client's own words, set in the studio's own display face.
            A real <h2>: SplitWords keeps the aria-label intact. */}
        <SplitWords as="h2" className="h2 hire-shout" text="WE ARE HIRING" />

        {/* The ask, in the order the client gave it: the reel is the big line,
            what you studied is the small one under it — not two ideas of
            equal weight, one instruction with a footnote. */}
        <Reveal delay={0.15} className="hire-ask">
          <p className="hire-ask-primary">
            <b>Show us what you’ve made.</b> A reel, three links, whatever proves it —
            that comes first.
          </p>
          <p className="hire-ask-secondary">Then tell us what you studied.</p>
        </Reveal>

        <p className="hire-count">
          <b>{String(ROLES.length).padStart(2, '0')}</b>
          <span>open roles</span>
          <i aria-hidden="true" />
          <span>{BRAND.cities[0]} &amp; {BRAND.cities[1]}</span>
        </p>
      </div>

      <div className="hire-grid">
        {ROLES.map((r, i) => <RoleCard key={r.id} r={r} i={i} onApply={apply} />)}
      </div>

      <Reveal delay={0.1} className="hire-strip">
        <div className="hire-strip-copy">
          <h3 className="hire-strip-h">None of the four? Send it anyway.</h3>
          <p className="hire-strip-p">One link to the work beats a page of adjectives.</p>
        </div>
        <div className="hire-strip-cta">
          <Magnetic>
            <WoolButton
              label="Send your reel"
              yarn="violet"
              onClick={() => open({ note: 'Send your reel — LOOM crew' })}
            />
          </Magnetic>
          <a className="hire-mail" href={`mailto:${BRAND.email}?subject=${encodeURIComponent('LOOM — my reel')}`}>
            {BRAND.email}
          </a>
        </div>
      </Reveal>
    </section>
  )
}
