// WE ARE HIRING — the ninth chair.
//
// Sits directly under Crew on purpose. Crew has just introduced the roster as
// ARCHETYPES ("The Weaver", "The Director", …) and sold every one of them as
// something a client can rent. This section is the same roster with the people
// taken out of it: four identical card stages, lit, with a felted `user`
// medallion standing in the spotlight instead of a mascot. The rhyme is the
// whole idea — the reader has just scrolled past four occupied stages, so four
// empty ones need no explanation.
//
// Roles are invented for this studio's actual disciplines (AI/automation,
// branding, social, web & app, campaigns, AR/CGI) and named in crew.js's voice.
// Nothing here claims a salary, a headcount, a benefit or a funding fact — the
// only company facts used are BRAND's two cities and its real contact routes.
//
// COST: zero animations at rest. Crew's mascots each run an infinite float;
// this section deliberately runs nothing — entry reveals are one-shot (Reveal /
// SplitWords) and every other move is a hover/focus transition. The page already
// carries two WebGL layers.
import { WoolButton, WoolIcon } from './Wool.jsx'
import { SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { BRAND } from '../data/site.js'
import './hiring.css'

// Optional art, resolved at BUILD time. A separate process may drop a single
// still at public/img/hiring/hero.webp; until it does, this glob resolves to
// {} and the panel renders as a one-column felt block that is finished on its
// own. Deliberately not a runtime fetch or an <img onError> — either one would
// put a 404 in the network log of every visitor.
// (keys only — the modules are never imported, so nothing from public/ is ever
// pulled into the bundle; the file is served from its own public URL as usual.)
const HERO_FILES = import.meta.glob('../../public/img/hiring/*.webp')
const HERO = Object.keys(HERO_FILES).some((k) => k.endsWith('/hero.webp'))
  ? '/img/hiring/hero.webp'
  : null

const ROLES = [
  {
    id: 'dyer',
    n: '01',
    role: 'The Dyer',
    owns: 'Motion & Colour',
    line: 'Cuts the campaign film and decides what colour the brand is on screen. Owns the last ten per cent everyone else runs out of patience for.',
    needs: ['Edit and grade, start to finish', 'A reel, not a CV', 'Opinions about frame rate'],
    accent: 'var(--yarn-pink)',
  },
  {
    id: 'prompter',
    n: '02',
    role: 'The Prompter',
    owns: 'Generative Image & Film',
    line: 'Gets a model to produce the frame that was storyboarded — twice, on brief, at full resolution — and says so when it would be faster to shoot it for real.',
    needs: ['Image and video models, daily', 'Retouches what the model got wrong', 'Reads the brief before the settings panel'],
    accent: 'var(--yarn-violet)',
  },
  {
    id: 'stitcher',
    n: '03',
    role: 'The Stitcher',
    owns: 'Web & App Engineering',
    line: 'Builds what the studio designs and keeps it fast on a phone in a lift. Writes CSS on purpose.',
    needs: ['React, and the browser underneath it', 'Accessible by default, not by audit', 'Three URLs you actually built'],
    accent: 'var(--yarn-blue)',
  },
  {
    id: 'carver',
    n: '04',
    role: 'The Carver',
    owns: '3D, AR & CGI',
    line: 'Models it, lights it, and puts it in a real street. Turns a product photo into something you can walk around.',
    needs: ['Blender or equal, plus a renderer', 'Realtime as well as offline', 'Turntables in the portfolio'],
    accent: 'var(--yarn-gold)',
  },
]

function RoleCard({ r, i, onApply }) {
  return (
    <Reveal delay={i * 0.07} className="hire-cell">
      <article className="hire-card" style={{ '--accent': r.accent }}>
        <span className="hire-open">Open</span>

        {/* The empty stage. Same geometry as a crew card's, with the felted
            `user` medallion where the mascot stands — a placeholder, not a
            portrait. Decorative: the role is named in the heading below. */}
        <div className="hire-stage" aria-hidden="true">
          <span className="hire-glow" />
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
          <p className="hire-line">{r.line}</p>
          <ul className="hire-needs">
            {r.needs.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>

        <div className="hire-foot">
          <button
            type="button"
            className="hire-apply"
            onClick={() => onApply(r)}
          >
            Apply as {r.role}
          </button>
        </div>
      </article>
    </Reveal>
  )
}

export function Hiring() {
  const { open } = useWizard()
  const apply = (r) => open({ note: `Application — ${r.role} (${r.owns})` })

  return (
    <section className="hire" id="hiring">
      <span className="hire-rail" aria-hidden="true" />

      <div className="hire-head">
        <div className="hire-head-copy">
          <p className="kicker"><span>—</span> Careers</p>
          {/* The client's own words, set in the studio's own display face.
              A real <h2>: SplitWords keeps the aria-label intact. */}
          <SplitWords as="h2" className="h2 hire-shout" text="WE ARE HIRING" />
          <Reveal delay={0.15}>
            <p className="lede hire-lede">
              Four chairs, and we are fussy. The crew above is who shows up
              today — these four are who is missing. Both studios read what
              comes in, so say which city you can get to, and show us something
              you made rather than something you managed.
            </p>
          </Reveal>
        </div>

        {/* The right rail. It carries the three instructions whether or not the
            still ever lands — the panel is a finished two-column object either
            way, and the image simply takes the top of the rail when it exists. */}
        <Reveal delay={0.2} className="hire-head-art">
          {HERO && (
            <img
              className="hire-hero"
              src={HERO}
              alt="An empty stool in the LOOM studio, a bare spool beside it and one loose thread still running up to the loom."
              width={1200}
              height={1500}
              loading="lazy"
              decoding="async"
            />
          )}
          <ol className="hire-how">
            <li><b>Pick a chair.</b> Or don’t — the open thread at the bottom counts.</li>
            <li><b>Send the work.</b> A link beats a CV, and three links beat a paragraph.</li>
            <li><b>Name the studio.</b> {BRAND.cities[0]} or {BRAND.cities[1]}, whichever you can get to.</li>
          </ol>
        </Reveal>
      </div>

      <div className="hire-grid">
        {ROLES.map((r, i) => <RoleCard key={r.id} r={r} i={i} onApply={apply} />)}
      </div>

      <Reveal delay={0.1} className="hire-strip">
        <div className="hire-strip-copy">
          <h3 className="hire-strip-h">None of the four? Send the thread anyway.</h3>
          <p className="hire-strip-p">
            Odd disciplines are how half this studio got built. One link to the
            work does more than a page of adjectives — {BRAND.cities[0]} or {BRAND.cities[1]}.
          </p>
        </div>
        <div className="hire-strip-cta">
          <Magnetic>
            <WoolButton
              label="Send message"
              yarn="violet"
              onClick={() => open({ note: 'Open application — LOOM crew' })}
            />
          </Magnetic>
          <a className="hire-mail" href={`mailto:${BRAND.email}?subject=${encodeURIComponent('LOOM — application')}`}>
            {BRAND.email}
          </a>
        </div>
      </Reveal>
    </section>
  )
}
