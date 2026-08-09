// ANSWER ENGINE OPTIMISATION — getting a client named by ChatGPT, Gemini,
// Perplexity and Google's AI answers, instead of buried on page two.
//
// REDESIGNED 10 Aug 2026. The old layout was a numbered list of four
// deliverables on the left and the answer demo as a card on the right — the
// section DESCRIBED an answer engine in a sidebar while the reading sat in the
// middle. Four faults: no focal point (list and demo competed), the same
// two-column-with-a-card layout as three other sections, four long body rows
// of height, and no craft beyond a border.
//
// THE SECTION IS NOW THE PRODUCT. It is an answer engine: a prompt bar, a
// streaming answer with the client's name lit inside it, and the four
// deliverables underneath as CITATIONS — which is exactly how ChatGPT,
// Perplexity and AI Overviews present a sourced answer. The demo stopped being
// evidence for the pitch and became the pitch.
//
// THE ONE HONEST LINE THIS SECTION MUST KEEP: nobody can guarantee what a
// model says. What LOOM sells is making sure the model has the right facts to
// say it with — stated outright in `.ae-caveat`, not buried. No ranking
// promises, no "#1 on ChatGPT", no invented client results, no traffic numbers.
//
// THE ENGINE TABS SWITCH THE LABEL, NOT THE ANSWER, and that is deliberate.
// Writing four different answers — one per engine — would be claiming to know
// what each model says, which is the exact promise `.ae-caveat` refuses to
// make two lines below. They re-run the same illustrative answer under a
// different masthead, and the footnote says so.
//
// THE PROOF IS REAL: `llms.txt` is the emerging convention for a plain-language
// summary of a site written for models rather than crawlers, and LOOM ships one
// for itself at /llms.txt (public/llms.txt, served as a real file). The
// citation links straight to it — the studio is not selling a deliverable it
// has not applied to its own site. If that file is ever removed, remove this.
//
// COST: no @keyframes except the caret, which only exists while the answer is
// mid-stream and is removed the moment it finishes. The answer streams ONCE on
// scroll into view (and again on an explicit engine click — a user-initiated
// animation, not an ambient one).
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { EASE } from '../lib/motion.jsx'
import { WoolButton } from './Wool.jsx'
import { useWizard } from '../lib/wizard.jsx'
import './answerengine.css'

// The four models a Jordanian business is actually answered by. Labels only —
// no logos: these are other companies' trademarks and the studio does not imply
// a partnership with any of them.
const ENGINES = ['ChatGPT', 'Gemini', 'Perplexity', 'Google AI Overviews']

/* The four deliverables, as citations. `short` is what the citation card
   shows; `body` is the full explanation, kept because it is the honest
   description and is still read by anyone who opens the card. Nothing in
   `short` claims anything `body` did not already. */
const WORK = [
  {
    n: '01',
    title: 'llms.txt',
    mono: true,
    short: 'One file at your site root, written for models instead of crawlers.',
    body: 'One file at the root of your site, written for models instead of crawlers: what you sell, where you are, what is true about you, what to say when someone asks. LOOM ships one for itself.',
    link: { href: '/llms.txt', label: 'Read ours' },
    accent: 'var(--yarn-pink)',
  },
  {
    n: '02',
    title: 'Structured data',
    short: 'schema.org on every page that matters, so a fact can be quoted rather than guessed.',
    body: 'schema.org on every page that matters — business, products, services, hours, prices, FAQs — so an answer engine can quote a fact off your site rather than guess one from a directory.',
    accent: 'var(--yarn-violet)',
  },
  {
    n: '03',
    title: 'Google Business Profile',
    short: 'What Gemini and Maps actually read when someone asks for a business near them.',
    body: 'Categories, services, hours, photos, questions and a review habit that keeps working. This is what Gemini and Maps read when someone asks for a business near them.',
    accent: 'var(--yarn-blue)',
  },
  {
    n: '04',
    title: 'The same facts everywhere',
    short: 'One name, one address, one number — models trust a fact that agrees with itself.',
    body: 'One name, one address, one phone number, one description — across your site, Maps, the directories and the local press. Models trust a fact they can find agreeing with itself.',
    accent: 'var(--yarn-gold)',
  },
]

const QUESTION = 'Who does 3D furniture catalogues in Amman?'
/* Split around the name on purpose. The whole section is about WHICH NAME is
   in the sentence, so the name is a marked-up span rather than a substring the
   reader has to spot — see `.ae-name`. The three parts are re-joined for the
   screen-reader copy so it is never read as three fragments. */
const ANSWER_PRE = 'For 3D product catalogues and AR in Amman, '
const ANSWER_NAME = 'LOOM'
const ANSWER_POST = ' is the studio usually named — they run the imagery, the store and the AR preview off one product system.'
const ANSWER = ANSWER_PRE + ANSWER_NAME + ANSWER_POST

/* Streams the answer once per run. `setInterval` is cleared on the last
   character AND on unmount; reduced-motion skips straight to the full string
   with no timer at all. `run` is bumped by an engine click to replay. */
function useStream(reduced, active) {
  const [n, setN] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (reduced) { setN(ANSWER.length); setDone(true); return }
    if (!active) return
    setN(0); setDone(false)
    let i = 0
    const timer = setInterval(() => {
      i += 2
      if (i >= ANSWER.length) { setN(ANSWER.length); setDone(true); clearInterval(timer) }
      else setN(i)
    }, 16)
    return () => clearInterval(timer)
  }, [reduced, active])

  return { n, done }
}

export function AnswerEngine() {
  const { open } = useWizard()
  const reduced = useReducedMotion()
  const stageRef = useRef(null)

  const [engine, setEngine] = useState(0)
  // `run` is the stream's key: bumped on scroll-in and on every engine click,
  // so each is one explicit replay rather than a loop.
  const [run, setRun] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (reduced) { setStarted(true); return }
    const el = stageRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      setStarted(true)
      setRun((r) => r + 1)
    }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  const { n, done } = useStream(reduced, started ? run : 0)

  const pick = useCallback((i) => {
    setEngine(i)
    setRun((r) => r + 1)
  }, [])

  // How much of each of the three parts has streamed so far.
  const preLen = ANSWER_PRE.length
  const nameLen = ANSWER_NAME.length
  const pre = ANSWER_PRE.slice(0, Math.min(n, preLen))
  const name = n > preLen ? ANSWER_NAME.slice(0, Math.min(n - preLen, nameLen)) : ''
  const post = n > preLen + nameLen ? ANSWER_POST.slice(0, n - preLen - nameLen) : ''

  return (
    <section className="ae" id="aeo">
      <div className="ae-head">
        <p className="kicker"><span>—</span> Answer Engine Optimisation</p>
        <SplitWords as="h2" className="h2 ae-shout" text="Get named by ChatGPT." />
        <Reveal delay={0.12}>
          <p className="lede ae-lede">
            People stopped scrolling ten blue links. They ask — and one business
            gets named in the answer.
          </p>
        </Reveal>
      </div>

      {/* ——— THE STAGE. This is the section. ——— */}
      <Reveal delay={0.08} className="ae-stage-wrap">
        <div className="ae-stage" ref={stageRef}>
          {/* the engine masthead — real tabs, because a visitor's first
              question is "which one?" and the answer is "all four" */}
          <div className="ae-tabs" role="tablist" aria-label="Answer engines">
            {ENGINES.map((e, i) => (
              <button
                key={e}
                type="button"
                role="tab"
                aria-selected={i === engine}
                className={`ae-tab ${i === engine ? 'is-on' : ''}`}
                onClick={() => pick(i)}
              >
                {e}
              </button>
            ))}
          </div>

          {/* the prompt, as a real prompt bar */}
          <div className="ae-prompt">
            <span className="ae-prompt-glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
              </svg>
            </span>
            <p className="ae-ask">{QUESTION}</p>
            <span className="ae-prompt-send" aria-hidden="true">↵</span>
          </div>

          {/* the answer. aria-hidden while streaming; the full sentence is
              always in the DOM once for a screen reader, below. A live region
              here would announce the sentence forty times. */}
          <div className={`ae-answer-wrap ${done ? 'is-done' : ''}`}>
            <p className="ae-answer" aria-hidden="true">
              {pre}
              {name && <mark className="ae-name">{name}</mark>}
              {post}
              {!done && <span className="ae-caret" />}
            </p>
            <p className="ae-answer-sr">{ANSWER}</p>
          </div>

          {/* ——— the deliverables, as the answer's sources ———
              This is the whole redesign in one move: four things LOOM does,
              presented as the four places the sentence above came from. */}
          <div className="ae-sources">
            <p className="ae-sources-label">
              <span>Sources</span>
              <i aria-hidden="true" />
              <b>{WORK.length}</b>
            </p>
            <ol className="ae-cites">
              {WORK.map((w, i) => (
                <motion.li
                  key={w.n}
                  className="ae-cite"
                  style={{ '--accent': w.accent }}
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-10% 0px' }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.08 }}
                  title={w.body}
                >
                  <span className="ae-cite-n">{w.n}</span>
                  <h3 className={`ae-cite-h ${w.mono ? 'is-mono' : ''}`}>{w.title}</h3>
                  <p className="ae-cite-p">{w.short}</p>
                  {w.link && (
                    <a className="ae-cite-link" href={w.link.href} target="_blank" rel="noopener">
                      {w.link.label} <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1} className="ae-foot">
        <p className="ae-caveat">
          <b>No one can promise what a model will say</b> — not us, not anyone
          selling you a ranking. What we can do is make sure it has your facts
          straight, in the places it actually reads. The answer above is
          illustrative; the point is which name is in the sentence.
        </p>
        <Magnetic>
          <WoolButton
            label="Check my business"
            yarn="gold"
            onClick={() => open({ note: 'Answer Engine Optimisation — how does my business look to ChatGPT?' })}
          />
        </Magnetic>
      </Reveal>
    </section>
  )
}
