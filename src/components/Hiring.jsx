// WE ARE HIRING — the ninth chair.
//
// Four identical card stages, lit, with a felted `user` medallion standing in
// the spotlight instead of a person: the light is on, the thread is hanging,
// nobody is on the mark. It used to sit directly under Crew and lean on that
// rhyme ("four occupied stages, now four empty ones"); Crew is gone from the
// page, so the section carries the idea on its own and the copy no longer
// points upward at a roster that is not there.
//
// Roles are the studio's actual disciplines (motion, generative, web & app,
// 3D/AR). Nothing here claims a salary, a headcount, a benefit or a funding
// fact — the only company facts used are BRAND's two cities, its real contact
// routes, and the number of cards in ROLES.
//
// COST: zero animations at rest — no @keyframes in hiring.css at all. Entry is
// one-shot (Reveal / SplitWords) and every other move is a hover/focus
// transition. The page already carries two WebGL layers.
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
        {/* The shout runs the full width of the felt patch. It used to share a
            1.5fr/0.9fr row with the three instructions, which left the headline
            marooned in an ocean of empty felt and squeezed the steps into a
            column too narrow for their own lines. Full-width statement, then
            two even columns under it. */}
        <div className="hire-head-top">
          <p className="kicker"><span>—</span> Careers</p>
          {/* The client's own words, set in the studio's own display face.
              A real <h2>: SplitWords keeps the aria-label intact. */}
          <SplitWords as="h2" className="h2 hire-shout" text="WE ARE HIRING" />
          {/* Counted off ROLES, not typed — the number cannot drift from the
              grid below it. Cities come from BRAND. */}
          <p className="hire-count">
            <b>{String(ROLES.length).padStart(2, '0')}</b>
            <span>open roles</span>
            <i aria-hidden="true" />
            <span>{BRAND.cities[0]} &amp; {BRAND.cities[1]}</span>
          </p>
        </div>

        <div className="hire-head-cols">
          <div className="hire-head-copy">
            <Reveal delay={0.15}>
              <p className="lede hire-lede">
                Four chairs, and we are fussy. These are the four we are missing.
                Both studios read what comes in, so say which city you can get
                to, and show us something you made rather than something you
                managed.
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
