// ————————————————————————————————————————————————————————
// FAQ — the objection band, immediately above Contact.
//
// Last thing before the ask, on purpose. Everything above this point argues
// for LOOM; this is the only section whose job is to remove reasons to leave.
// Nothing new is introduced — see data/faq.js, which forbids new facts
// outright, because an FAQ is the last place a stray invented figure gets
// caught.
//
// BUILT ON <details>, NOT ON useState. The native disclosure element gives
// keyboard operation, the correct expanded/collapsed semantics, and — the part
// that matters on this site — find-in-page. Chrome and Safari now open a
// closed <details> when its text matches a Cmd-F search; a div with a state
// hook does not, so a hand-rolled accordion silently hides the answer from the
// visitor who went looking for it. It also renders open and readable if JS
// never boots.
//
// The height transition uses `interpolate-size: allow-keywords` +
// `transition-behavior: allow-discrete` (faq.css) rather than measuring
// scrollHeight in an effect. That is a progressive enhancement: where it is
// unsupported the panel simply snaps open, which is what a <details> does
// anyway, and no JS runs either way.
//
// THE SCHEMA IS NOT DECORATION. #aeo on this same page sells schema.org markup
// so an answer engine can quote a fact off your site rather than guess one
// from a directory. Shipping an FAQ section with no FAQPage schema under it
// would be the studio failing its own pitch on its own home page. The JSON-LD
// is generated from the same FAQ array the section renders, so the two can
// never drift.
import { useMemo } from 'react'
import { SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { WoolButton } from './Wool.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { FAQ } from '../data/faq.js'
import './faq.css'

export function Faq() {
  const { open } = useWizard()

  // One object, built once. Derived from FAQ rather than written out again —
  // a second hand-maintained copy of these answers is how a page ends up
  // telling a crawler something it no longer tells a reader.
  const schema = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }), [])

  return (
    <section className="faq" id="faq" aria-label="Frequently asked questions">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />

      <div className="faq-head">
        <p className="kicker"><span>—</span> Before you ask</p>
        <SplitWords as="h2" className="h2 faq-h2" text="The questions that come up every time." />
        <Reveal delay={0.12}>
          <p className="lede faq-sub">
            Answered here rather than on a call, because the answer does not change
            depending on who is asking.
          </p>
        </Reveal>
      </div>

      <div className="faq-list">
        {FAQ.map((f, i) => (
          <Reveal key={f.id} delay={Math.min(i, 5) * 0.05} className="faq-row">
            <details className="faq-item" name="loom-faq">
              <summary className="faq-q">
                <span className="faq-q-text">{f.q}</span>
                {/* one glyph that rotates — not a swapped +/− pair, which
                    cannot be transitioned and pops */}
                <i className="faq-sign" aria-hidden="true" />
              </summary>
              <div className="faq-a"><p>{f.a}</p></div>
            </details>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1} className="faq-foot">
        <div className="faq-foot-copy">
          <h3 className="faq-foot-h">Still something unanswered?</h3>
          <p className="faq-foot-p">Ask it in the form — you get a person, not a bot.</p>
        </div>
        <Magnetic>
          <WoolButton
            label="Ask us anything"
            yarn="violet"
            onClick={() => open({ note: 'Question — from the FAQ' })}
          />
        </Magnetic>
      </Reveal>
    </section>
  )
}
