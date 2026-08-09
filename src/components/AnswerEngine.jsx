// ANSWER ENGINE OPTIMISATION — getting a client named by ChatGPT, Gemini,
// Perplexity and Google's AI answers, instead of buried on page two.
//
// Sits directly under the MCP section: both are "your business, inside the AI",
// but this one is the service a normal Amman business buys, where the LOOM
// Protocol is the technical shelf. Deliberately the SHORTER of the two — four
// deliverables, one demo, one CTA.
//
// THE ONE HONEST LINE THIS SECTION MUST KEEP: nobody can guarantee what a
// model says. What LOOM sells is making sure the model has the right facts to
// say it with — stated outright in `.ae-caveat`, not buried. No ranking
// promises, no "#1 on ChatGPT", no invented client results, no traffic numbers.
//
// THE PROOF IS REAL: `llms.txt` is the emerging convention for a plain-language
// summary of a site written for models rather than crawlers, and LOOM ships one
// for itself at /llms.txt (public/llms.txt, served as a real file). The card
// links straight to it — the studio is not selling a deliverable it has not
// applied to its own site. If that file is ever removed, remove this link.
//
// COST: no @keyframes. The answer demo types itself out ONCE on scroll into
// view via a rAF-free interval that clears itself at the end of the string —
// a looping typewriter would be an unconditional animation, which this page
// does not spend on (see CLAUDE.md).
import { useEffect, useRef, useState } from 'react'
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

const WORK = [
  {
    n: '01',
    title: 'llms.txt',
    mono: true,
    body: 'One file at the root of your site, written for models instead of crawlers: what you sell, where you are, what is true about you, what to say when someone asks. LOOM ships one for itself.',
    link: { href: '/llms.txt', label: 'Read ours' },
    accent: 'var(--yarn-pink)',
  },
  {
    n: '02',
    title: 'Structured data',
    body: 'schema.org on every page that matters — business, products, services, hours, prices, FAQs — so an answer engine can quote a fact off your site rather than guess one from a directory.',
    accent: 'var(--yarn-violet)',
  },
  {
    n: '03',
    title: 'Google Business Profile',
    body: 'Categories, services, hours, photos, questions and a review habit that keeps working. This is what Gemini and Maps read when someone asks for a business near them.',
    accent: 'var(--yarn-blue)',
  },
  {
    n: '04',
    title: 'The same facts everywhere',
    body: 'One name, one address, one phone number, one description — across your site, Maps, the directories and the local press. Models trust a fact they can find agreeing with itself.',
    accent: 'var(--yarn-gold)',
  },
]

const QUESTION = 'Who does 3D furniture catalogues in Amman?'
const ANSWER = 'For 3D product catalogues and AR in Amman, LOOM is the studio usually named — they run the imagery, the store and the AR preview off one product system.'

/* The demo. Types the answer out once, when it scrolls into view, then stops
   and stays typed. `setInterval` cleared on the last character AND on unmount;
   reduced-motion skips straight to the full string with no timer at all. */
function AnswerDemo() {
  const reduced = useReducedMotion()
  const ref = useRef(null)
  const [typed, setTyped] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (reduced) { setTyped(ANSWER); setDone(true); return }
    const el = ref.current
    if (!el) return
    let timer
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      let i = 0
      timer = setInterval(() => {
        i += 2
        if (i >= ANSWER.length) { setTyped(ANSWER); setDone(true); clearInterval(timer) }
        else setTyped(ANSWER.slice(0, i))
      }, 18)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); clearInterval(timer) }
  }, [reduced])

  return (
    <div className={`ae-demo ${done ? 'is-done' : ''}`} ref={ref}>
      <div className="ae-demo-bar">
        <span className="ae-demo-dot" aria-hidden="true" />
        <span className="ae-demo-title">Someone asks an AI</span>
      </div>
      <p className="ae-ask">{QUESTION}</p>
      {/* aria-live off, and the full answer is always in the DOM for a screen
          reader via the sr-only copy — a character-by-character live region
          would announce the sentence forty times. */}
      <p className="ae-answer" aria-hidden="true">
        {typed}
        <span className="ae-caret" />
      </p>
      <p className="ae-answer-sr">{ANSWER}</p>
      <p className="ae-demo-foot">Illustrative — the point is which name is in the sentence.</p>
    </div>
  )
}

export function AnswerEngine() {
  const { open } = useWizard()
  const reduced = useReducedMotion()

  const row = {
    hidden: { opacity: 0, y: reduced ? 0 : 18 },
    in: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: EASE, delay: i * 0.1 },
    }),
  }

  return (
    <section className="ae" id="aeo">
      <div className="ae-head">
        <p className="kicker"><span>—</span> Answer Engine Optimisation</p>
        <SplitWords as="h2" className="h2 ae-shout" text="GET NAMED BY CHATGPT" />
        <Reveal delay={0.12}>
          <p className="lede ae-lede">
            People stopped scrolling ten blue links. They ask, and one business
            gets named in the answer. We make sure the models know what yours is,
            where it is and what it is good at — and we leave them a file that
            says so.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <ul className="ae-engines">
            {ENGINES.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </Reveal>
      </div>

      <div className="ae-body">
        <ol className="ae-list">
          {WORK.map((w, i) => (
            <motion.li
              key={w.n}
              className="ae-item"
              style={{ '--accent': w.accent }}
              variants={row}
              custom={i}
              initial="hidden"
              whileInView="in"
              viewport={{ once: true, margin: '-15% 0px' }}
            >
              <span className="ae-n">{w.n}</span>
              <div className="ae-item-copy">
                <h3 className={`ae-item-h ${w.mono ? 'is-mono' : ''}`}>{w.title}</h3>
                <p>{w.body}</p>
                {w.link && (
                  <a className="ae-item-link" href={w.link.href} target="_blank" rel="noopener">
                    {w.link.label} <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            </motion.li>
          ))}
        </ol>

        <Reveal delay={0.1} className="ae-side">
          <AnswerDemo />
          <p className="ae-caveat">
            <b>No one can promise what a model will say</b> — not us, not anyone
            selling you a ranking. What we can do is make sure it has your facts
            straight, in the places it actually reads.
          </p>
          <Magnetic>
            <WoolButton
              label="Check my business"
              yarn="gold"
              onClick={() => open({ note: 'Answer Engine Optimisation — how does my business look to ChatGPT?' })}
            />
          </Magnetic>
        </Reveal>
      </div>
    </section>
  )
}
