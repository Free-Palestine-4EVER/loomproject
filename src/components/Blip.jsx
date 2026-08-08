// /blip — the dedicated page for blip.net, LOOM's flagship product.
//
// Follows the /type precedent exactly: its own top-level route, wired into
// App.jsx's PAGES table, Nav/Footer stay mounted around it and Contact stays
// off it on purpose (same reasoning Typeface.jsx states — the page's job is
// the product, not a lead form; the CTA below routes into the SAME contact
// wizard the rest of the site uses rather than duplicating it).
//
// Every fact rendered here comes from BLIP in site.js. Nothing on this page
// invents a download link, a screenshot, a testimonial or a user count —
// blip.net is real (a name, a price, self-serve registration) but this repo
// does not host its product, so the honest CTA is "talk to us", not a fake
// "Download" button pointing nowhere.
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { BLIP } from '../data/site.js'
import { EASE, SplitWords, Reveal, Magnetic } from '../lib/motion.jsx'
import { WoolButton } from './Wool.jsx'
import { useWizard } from '../lib/wizard.jsx'
import './blip.css'

const PLATFORMS = ['macOS', 'Windows', 'iOS', 'Web']

function PlanCard({ plan, i }) {
  return (
    <Reveal delay={i * 0.08} className="bp-cell">
      <article className={`bp-plan ${plan.featured ? 'is-featured' : ''}`}>
        {plan.featured && <span className="bp-plan-badge">Most transfers</span>}
        <span className="bp-plan-name">{plan.name}</span>
        <span className="bp-plan-price">{plan.price}<em>{plan.period}</em></span>
        <p className="bp-plan-blurb">{plan.blurb}</p>
        <ul className="bp-plan-features">
          {plan.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </article>
    </Reveal>
  )
}

export function Blip() {
  const { open } = useWizard()
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const heroFade = useTransform(scrollYProgress, [0, 0.9], [1, 0])

  const contact = () => open({ note: `Interested in ${BLIP.name}` })

  return (
    <div className="bp" style={{ '--g1': BLIP.grad[0], '--g2': BLIP.grad[1] }}>
      {/* ——————————————————————————— hero */}
      <section className="bp-hero" ref={heroRef}>
        <div className="bp-hero-glow" aria-hidden="true" />
        <motion.div className="bp-hero-inner" style={{ y: heroY, opacity: heroFade }}>
          <div className="bp-hero-meta">
            <span className="bp-tag"><i />{BLIP.status}</span>
            <span>{BLIP.tag}</span>
          </div>
          <h1 className="bp-hero-word">
            <SplitWords as="span" text={BLIP.name} className="bp-wordmark" />
          </h1>
          <SplitWords as="h2" className="bp-h1" text={BLIP.headline} delay={0.2} />
          <Reveal delay={0.4}>
            <p className="bp-hero-sub">{BLIP.lede}</p>
          </Reveal>
          <Reveal delay={0.5}>
            <div className="bp-hero-cta">
              <Magnetic><WoolButton label="Send message" className="wool-btn--hero" onClick={contact} /></Magnetic>
              <div className="bp-platforms" aria-label="Available on">
                {PLATFORMS.map((p) => <span key={p}>{p}</span>)}
              </div>
            </div>
          </Reveal>
        </motion.div>
      </section>

      {/* ——————————————————————————— how it works */}
      <section className="bp-section">
        <div className="bp-head">
          <p className="kicker"><span>—</span> How it works</p>
          <SplitWords as="h2" className="h2" text="No upload. No middle server." />
        </div>
        <div className="bp-how">
          {BLIP.how.map((h, i) => (
            <Reveal key={h.k} delay={i * 0.08} className="bp-how-cell">
              <article className="bp-how-card">
                <span className="bp-how-n">{String(i + 1).padStart(2, '0')}</span>
                <h3>{h.k}</h3>
                <p>{h.d}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ——————————————————————————— pricing */}
      <section className="bp-section bp-section--pricing">
        <div className="bp-head">
          <p className="kicker"><span>—</span> Pricing</p>
          <SplitWords as="h2" className="h2" text="Free for the occasional send." />
          <Reveal delay={0.15}>
            <p className="lede" style={{ marginTop: 22 }}>
              One account, every device. Upgrade the day the free tier stops being enough —
              nothing else changes.
            </p>
          </Reveal>
        </div>
        <div className="bp-plans">
          {BLIP.plans.map((p, i) => <PlanCard plan={p} i={i} key={p.id} />)}
        </div>
      </section>

      {/* ——————————————————————————— closing CTA */}
      <section className="bp-cta-band">
        <Reveal>
          <p className="bp-cta-eyebrow">{BLIP.name}</p>
          <h2 className="bp-cta-h2">Questions before you register?</h2>
          <p className="bp-cta-p">Talk to the studio directly — a human answers, fast.</p>
          <Magnetic><WoolButton label="Send message" className="wool-btn--hero" onClick={contact} /></Magnetic>
        </Reveal>
      </section>
    </div>
  )
}
