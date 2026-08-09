// ————————————————————————————————————————————————————————
// PRICING — the floor, stated once, at the top of the SELL band.
//
// Before this section the page had prices in two places and a floor in
// neither: The Machine quoted 89 JOD/month deep in its own pitch, the
// workshops page computed a live figure behind a route, and the three things
// LOOM is asked for most — a site, an app, a piece of software — carried no
// number anywhere. In Jordan and the Gulf that is not restraint, it is a lost
// inbound: a visitor who cannot find a floor assumes the ceiling.
//
// REDESIGNED 10 Aug 2026, from a six-card grid to a RATE CARD.
//
// The grid was the problem, not the styling. Six rounded boxes three across is
// the same shape as Studios, the Lab, Apps and the old Process — and worse, it
// is the wrong shape for this content: a price list exists to be SCANNED DOWN
// its price column, and a grid puts the six numbers at six different x
// positions so the eye has to hunt for each one. As rows, every figure lands
// in the same column and the cheapest-to-dearest read is free.
//
// It is also how the thing is actually consumed. Nobody reads a rate card
// left-to-right; they run a finger down the right-hand edge until a number
// stops them, then read left into what it buys. The layout now matches that.
//
// EVERY NUMBER IS RENDERED "from X" — the word is inside the markup, not left
// to the data, so a copied row cannot lose it. data/pricing.js states the same
// rule at the top and imports the two live figures rather than retyping them.
//
// COST: nothing animates at rest. Entry is one Reveal per row, everything else
// is a hover transition. The page already carries two WebGL layers.
import { SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { WoolButton } from './Wool.jsx'
import { useWizard } from '../lib/wizard.jsx'
import { PRICING, PRICING_NOTE } from '../data/pricing.js'
import './pricing.css'

function Row({ t, i, onAsk }) {
  const Tag = t.href ? 'a' : 'button'
  const tagProps = t.href ? { href: t.href } : { type: 'button', onClick: () => onAsk(t) }

  return (
    <Reveal delay={Math.min(i, 5) * 0.05} y={18} className="price-row-wrap">
      <div className="price-row" style={{ '--accent': t.accent }}>
        <span className="price-n">{t.n}</span>

        <div className="price-what">
          <h3 className="price-name">{t.name}</h3>
          <p className="price-lede">{t.lede}</p>
          {/* the includes, inline and separated by dots rather than as a
              bulleted block — four bullets per row, six rows, would be
              twenty-four bullets and the tallest section on the page */}
          <p className="price-list">
            {t.includes.map((line, k) => (
              <span key={line}>
                {k > 0 && <i aria-hidden="true">·</i>}
                {line}
              </span>
            ))}
          </p>
        </div>

        {/* THE PRICE COLUMN. Every figure in this section lands at the same x
            so the six can be read down as one list — that is the entire
            argument for rows over the grid this replaced. */}
        <p className="price-fig">
          <span className="price-from">from</span>
          <b className="price-val">{t.from.toLocaleString('en-US')}</b>
          <span className="price-unit">{t.unit}</span>
          <span className="price-period">{t.period}</span>
        </p>

        <div className="price-cta">
          <Tag className="price-link" {...tagProps}>
            {t.cta}
            <i aria-hidden="true">→</i>
          </Tag>
        </div>

        {/* the floor is never shown naked: this is what it buys, and it is
            what stops the number reading as bait when the quote comes back
            higher */}
        <p className="price-note">{t.note}</p>
      </div>
    </Reveal>
  )
}

export function Pricing() {
  const { open } = useWizard()
  const ask = (t) => open({ note: `Quote — ${t.name} (from ${t.from} ${t.unit} ${t.period})` })

  return (
    <section className="price" id="pricing" aria-label="What things cost">
      <div className="price-head">
        <p className="kicker"><span>—</span> What it costs</p>
        <SplitWords as="h2" className="h2 price-h2" text="Here is the floor. No form required." />
        <Reveal delay={0.12}>
          <p className="lede price-sub">
            Most agencies in this market make you ask. These are the real starting
            points — what moves them is scope, not how big your company looks.
          </p>
        </Reveal>
      </div>

      <div className="price-card">
        {PRICING.map((t, i) => <Row key={t.id} t={t} i={i} onAsk={ask} />)}
      </div>

      <Reveal delay={0.1} className="price-foot">
        <p className="price-foot-note">{PRICING_NOTE}</p>
        <Magnetic>
          <WoolButton
            label="Get a fixed quote"
            yarn="magenta"
            onClick={() => open({ note: 'Fixed quote — from the pricing section' })}
          />
        </Magnetic>
      </Reveal>
    </section>
  )
}
