// BY RESULT (بالنتيجة) — LOOM's results-priced advertising. Same section
// grammar as TheMachine.jsx / Solutions.jsx: ThreadDivider, .section-head,
// a two-column panel, a dedicated native-Arabic passage. New `br-` class
// prefix, scoped in byresult.css only.
//
// The "fifth furniture retailer" example is explicitly hypothetical (both
// languages say so) — it illustrates how the category creative library
// carries forward, it is not a claim about a real client count.
import { BY_RESULT } from '../data/offers.js'
import { SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { ThreadDivider } from './Rich.jsx'
import { WoolButton } from './Wool.jsx'
import { useWizard } from '../lib/wizard.jsx'

import './byresult.css'

export function ByResult() {
  const { open } = useWizard()
  const r = BY_RESULT

  return (
    <section className="br" id="by-result" style={{ '--br-tint': 'var(--gold)' }}>
      <ThreadDivider flip />
      <div className="section-head">
        <p className="kicker">
          <span>—</span> By Result
          <span className="br-kicker-ar" lang="ar">{r.nameAr}</span>
        </p>
        <SplitWords as="h2" className="h2" text={r.h2} />
        <Reveal delay={0.15}>
          <p className="lede" style={{ marginTop: 22 }}>{r.ledeEn}</p>
        </Reveal>
      </div>

      <div className="br-panel">
        <Reveal className="br-left">
          <ul className="br-bullets">
            {r.bullets.map((b) => (
              <li key={b.en}>
                <i className="br-stitch" aria-hidden="true" />
                <span className="br-bullet-en">{b.en}</span>
                {/* no dir="rtl" — see the comment on .br-bullet-ar in
                    byresult.css for why */}
                <span className="br-bullet-ar" lang="ar">{b.ar}</span>
              </li>
            ))}
          </ul>

          <div className="br-price">
            <span className="br-price-label">From</span>
            <span className="br-price-value">
              {r.priceFromJod.toFixed(2)} JOD<span className="br-price-unit">/{r.priceUnit}</span>
            </span>
            <span className="br-price-note">{r.priceNote}</span>
          </div>

          <div className="br-cta-row">
            <Magnetic>
              <WoolButton
                label={r.ctaLabel}
                className="br-cta"
                onClick={() => open({ note: `${r.nameEn} (${r.nameAr}) — results-priced ads` })}
              />
            </Magnetic>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="br-right">
          <div className="br-example" data-cursor>
            <p className="br-example-tag">{r.example.labelEn}</p>
            <p className="br-example-body">{r.example.en}</p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.2} className="br-arabic-wrap">
        <p className="br-arabic" lang="ar" dir="rtl">{r.arabicPitch}</p>
      </Reveal>
    </section>
  )
}
