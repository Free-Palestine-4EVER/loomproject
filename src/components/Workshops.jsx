// /ai-workshops — corporate AI training, sold to the company, not to one
// employee. The argument the whole page is built to land: AI will not
// replace your staff, but a competitor who has trained theirs will replace
// you. Structure mirrors Typeface.jsx (the site's other dedicated sub-page):
// its own hero, its own section rhythm, its own CSS file — no wool material,
// no case-study wall, because this page's whole job is one booking form.
import { useMemo, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { SplitWords, Reveal, CountUp, Magnetic } from '../lib/motion.jsx'
import { BRAND } from '../data/site.js'
import {
  MODULES, MODULE_INCLUDES, MIN_MODULES, MAX_MODULES, RECOMMENDED_MIN_SEATS,
  ENTERPRISE_MIN_SEATS, PRICE_PER_SEAT_BY_MODULE_COUNT, VOLUME_TIERS,
  INDUSTRIES, START_WINDOWS, estimate,
} from '../data/workshops.js'
import './workshops.css'

const fmt = (n) => n.toLocaleString('en-US')

// The worked example in the pricing section — a plausible mid-size cohort,
// computed through the exact same estimate() the live form uses. Change the
// two numbers below and every figure on the page that quotes this example
// updates with them; nothing here is typed twice.
const EXAMPLE_SEATS = 12
const EXAMPLE_MODULES = 5

/* ═══════════════════ hero ═══════════════════ */
function WkHero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 90])
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0])
  return (
    <section className="wk-hero" ref={ref}>
      <div className="wk-hero-media" aria-hidden="true">
        {/* Art-directed exactly like Banners.jsx's need tiles: a `-wide` panorama
            for phones under the same 719px switch banners.css already uses, a
            `-pc` portrait for everything above it, and a display:contents wrapper
            so the <picture> adds no box of its own. Neither file exists yet — the
            gradient behind this layer (workshops.css) is the whole picture until
            they ship, and onError keeps a failed decode from leaving a hole. */}
        <picture style={{ display: 'contents' }}>
          <source media="(max-width: 719px)" srcSet="/img/workshops/hero-wide.webp" />
          <img
            src="/img/workshops/hero-pc.webp"
            alt=""
            width={1600}
            height={2000}
            loading="eager"
            fetchpriority="high"
            decoding="async"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </picture>
      </div>
      <motion.div className="wk-hero-inner" style={{ y, opacity: fade }}>
        <p className="wk-tag">AI Workshops by LOOM · Corporate training, Amman</p>
        <h1 className="wk-h1">
          <SplitWords as="span" text="AI will not replace your employees." />
          <SplitWords as="span" className="wk-h1-line2" text="But a company that uses it will replace one that doesn’t." delay={0.35} />
        </h1>
        <Reveal delay={0.55}>
          <p className="wk-hero-sub">
            This is not a headcount play. LOOM trains the team you already have
            to run AI agents day to day — inside sales, marketing, finance,
            ops, HR and support — until they are the reason your company moves
            faster than the one down the street that never sent anyone to a
            workshop.
          </p>
        </Reveal>
        <Reveal delay={0.68}>
          <div className="wk-hero-cta">
            <Magnetic strength={0.2}>
              <a className="wk-btn wk-btn--fill" href="#wk-form">Book a cohort</a>
            </Magnetic>
            <a className="wk-btn" href="#wk-curriculum">See the curriculum</a>
          </div>
        </Reveal>
      </motion.div>
    </section>
  )
}

/* ═══════════════════ positioning / super-employees ═══════════════════ */
function WkPositioning() {
  return (
    <section className="wk-section wk-position">
      <div className="wk-position-grid">
        <Reveal>
          <p className="wk-kicker"><span>—</span> Not fewer people. Sharper ones.</p>
          <h2 className="wk-h2">
            The company that wins isn’t the one that cuts staff for AI. It’s the
            one that hands AI to the staff it already trusts.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="wk-position-body">
            Every AI headline sold this backwards: robots taking jobs, teams
            shrinking, headcount as the metric that matters. In practice the
            companies pulling ahead right now did the opposite — they kept
            their people and made each one capable of the output that used to
            take three. A salesperson who can build their own follow-up agent.
            A finance lead who can reconcile a whole ledger by lunch. An ops
            manager who redesigns a workflow instead of just watching it
            break slower. That is what LOOM builds in a workshop room: not
            headcount reduction, <em>super employees</em> — your own team,
            with the same judgment and client relationships they already
            have, now moving at the speed of the tool instead of around it.
          </p>
        </Reveal>
      </div>
      <div className="wk-facts">
        <Reveal delay={0.05}><div className="wk-fact"><span className="wk-fact-n"><CountUp value={MODULES.length} /></span><span className="wk-fact-l">curriculum modules to choose from</span></div></Reveal>
        <Reveal delay={0.1}><div className="wk-fact"><span className="wk-fact-n"><CountUp value={MIN_MODULES} suffix={`–${MAX_MODULES}`} /></span><span className="wk-fact-l">modules picked per cohort</span></div></Reveal>
        <Reveal delay={0.15}><div className="wk-fact"><span className="wk-fact-n"><CountUp value={RECOMMENDED_MIN_SEATS} suffix="+" /></span><span className="wk-fact-l">employees is where a cohort runs best</span></div></Reveal>
        <Reveal delay={0.2}><div className="wk-fact"><span className="wk-fact-n">14</span><span className="wk-fact-l">days of post-workshop support, every module</span></div></Reveal>
      </div>
    </section>
  )
}

/* ═══════════════════ curriculum ═══════════════════ */
function WkCurriculum() {
  return (
    <section className="wk-section" id="wk-curriculum">
      <div className="wk-head">
        <p className="wk-kicker"><span>—</span> The curriculum</p>
        <h2 className="wk-h2">Eight modules. Your company picks three to ten.</h2>
        <p className="wk-lede">
          No two teams need the same training — a boutique agency and a
          logistics company are not solving the same problem. The catalogue
          below is fixed; the cohort is not. Pick what your departments
          actually need in the form further down and the price adjusts with it.
        </p>
      </div>
      <div className="wk-mods">
        {MODULES.map((m, i) => (
          <Reveal key={m.id} delay={0.04 * i} y={22} className="wk-mod-cell">
            <article className="wk-mod">
              <span className="wk-mod-n" aria-hidden="true">{m.n}</span>
              <h3 className="wk-mod-title">{m.title}</h3>
              <p className="wk-mod-hours">{m.hours} contact hours</p>
              <p className="wk-mod-blurb">{m.blurb}</p>
            </article>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.1} className="wk-includes">
        <p className="wk-includes-kicker">Every module includes</p>
        <ul>
          {MODULE_INCLUDES.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </Reveal>
    </section>
  )
}

/* ═══════════════════ pricing ═══════════════════ */
function WkPricing() {
  const example = useMemo(() => estimate({ seats: EXAMPLE_SEATS, moduleCount: EXAMPLE_MODULES }), [])
  return (
    <section className="wk-section wk-pricing">
      <div className="wk-head">
        <p className="wk-kicker"><span>—</span> Pricing, in the open</p>
        <h2 className="wk-h2">Priced per employee, per module — with the maths shown.</h2>
        <p className="wk-lede">
          This is senior corporate training, delivered on-site, and priced
          like it — not a webinar sold by the seat. Every figure below comes
          out of one table; nothing is quoted that isn’t derived from it.
        </p>
      </div>

      <div className="wk-price-grid">
        <Reveal className="wk-price-table-wrap">
          <table className="wk-price-table">
            <caption>JOD per employee, by modules picked</caption>
            <thead>
              <tr><th>Modules</th><th>JOD / employee</th></tr>
            </thead>
            <tbody>
              {Object.entries(PRICE_PER_SEAT_BY_MODULE_COUNT).map(([n, price]) => (
                <tr key={n}>
                  <td>{n}</td>
                  <td>{fmt(price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>

        <Reveal delay={0.06} className="wk-price-table-wrap">
          <table className="wk-price-table">
            <caption>Volume breaks, by headcount</caption>
            <thead>
              <tr><th>Employees</th><th>Discount</th></tr>
            </thead>
            <tbody>
              {VOLUME_TIERS.map((t) => (
                <tr key={t.id}>
                  <td>{t.max === Infinity ? `${t.min}+` : `${t.min}–${t.max}`}</td>
                  <td>{t.discount ? `${Math.round(t.discount * 100)}% off` : '—'}</td>
                </tr>
              ))}
              <tr>
                <td>{ENTERPRISE_MIN_SEATS}+</td>
                <td>Enterprise — talk to us</td>
              </tr>
            </tbody>
          </table>
        </Reveal>
      </div>

      {example && !example.enterprise && (
        <Reveal delay={0.1} className="wk-example">
          <p className="wk-example-kicker">Worked example</p>
          <p className="wk-example-body">
            <strong>{example.seats} employees</strong>, <strong>{example.moduleCount} modules</strong> picked
            → <strong>{fmt(example.perSeat)} JOD</strong> per employee at standard rate
            {example.tier.discount > 0 && <> ({Math.round(example.tier.discount * 100)}% {example.tier.label} volume break applied → <strong>{fmt(example.discountedPerSeat)} JOD</strong>)</>}
            {' '}× {example.seats} employees ={' '}
            <strong className="wk-example-total">{fmt(example.total)} JOD</strong> for the whole cohort.
          </p>
        </Reveal>
      )}
    </section>
  )
}

/* ═══════════════════ the form ═══════════════════ */
function WkForm() {
  const [form, setForm] = useState({
    company: '', contactName: '', email: '', phone: '',
    seats: '', industry: '', startWindow: '', notes: '',
  })
  const [selected, setSelected] = useState(['prompting', 'agents', 'security'])
  const [maxHit, setMaxHit] = useState(false)
  const [touched, setTouched] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const toggleModule = (id) => {
    setSelected((xs) => {
      if (xs.includes(id)) { setMaxHit(false); return xs.filter((x) => x !== id) }
      if (xs.length >= MAX_MODULES) { setMaxHit(true); return xs }
      setMaxHit(false)
      return [...xs, id]
    })
  }

  const seatsNum = Number(form.seats) || 0
  const est = useMemo(
    () => estimate({ seats: seatsNum, moduleCount: selected.length }),
    [seatsNum, selected.length]
  )
  const underRecommended = seatsNum > 0 && seatsNum < RECOMMENDED_MIN_SEATS
  const belowMinModules = selected.length < MIN_MODULES
  const atMaxModules = selected.length >= MAX_MODULES

  const detailsValid = form.company.trim().length > 1 && form.contactName.trim().length > 1
    && form.email.trim().length > 3 && seatsNum > 0
  const canSubmit = detailsValid && !belowMinModules

  const selectedTitles = useMemo(
    () => MODULES.filter((m) => selected.includes(m.id)).map((m) => m.title),
    [selected]
  )

  const brief = useMemo(() => {
    const lines = [
      'Hi LOOM! We’d like to book an AI Workshop.',
      form.company ? `Company: ${form.company}` : null,
      form.contactName ? `Contact: ${form.contactName}` : null,
      form.email ? `Email: ${form.email}` : null,
      form.phone ? `Phone: ${form.phone}` : null,
      form.seats ? `Employees to train: ${form.seats}` : null,
      form.industry ? `Industry: ${form.industry}` : null,
      form.startWindow ? `Preferred start: ${form.startWindow}` : null,
      `Modules (${selected.length}): ${selectedTitles.join(', ') || 'none picked yet'}`,
      est && !est.enterprise
        ? `Estimate: ${fmt(est.discountedPerSeat)} JOD/employee × ${est.seats} = ${fmt(est.total)} JOD (${est.tier.label})`
        : est?.enterprise ? 'Enterprise tier — please send a custom quote.' : null,
      form.notes ? `Notes: ${form.notes}` : null,
    ].filter(Boolean)
    return lines.join('\n')
  }, [form, selected, selectedTitles, est])

  const waHref = `${BRAND.whatsapp}?text=${encodeURIComponent(brief)}`
  const mailHref = `mailto:${BRAND.email}?subject=${encodeURIComponent(`AI Workshops — ${form.company || 'inquiry'}`)}&body=${encodeURIComponent(brief)}`

  return (
    <section className="wk-section wk-form-section" id="wk-form">
      <div className="wk-head">
        <p className="wk-kicker"><span>—</span> Book a cohort</p>
        <h2 className="wk-h2">Pick your modules. See your price. Send it our way.</h2>
      </div>

      <div className="wk-form-grid">
        <div className="wk-form-main">
          <div className="wk-fields">
            <label>
              <span>Company name *</span>
              <input value={form.company} onChange={set('company')} placeholder="e.g. Evora Future Home" />
            </label>
            <label>
              <span>Contact name *</span>
              <input value={form.contactName} onChange={set('contactName')} placeholder="e.g. Rania Haddad" />
            </label>
            <label>
              <span>Work email *</span>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                onBlur={() => setTouched(true)}
                placeholder="you@company.com"
                aria-invalid={touched && form.email.trim().length <= 3}
              />
            </label>
            <label>
              <span>Phone</span>
              <input value={form.phone} onChange={set('phone')} placeholder="+962 ..." />
            </label>
            <label>
              <span>Employees to train *</span>
              <input
                type="number" min={1} inputMode="numeric"
                value={form.seats} onChange={set('seats')} placeholder="e.g. 12"
              />
            </label>
            <label>
              <span>Industry</span>
              <select value={form.industry} onChange={set('industry')}>
                <option value="">Select one</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
            <label>
              <span>Preferred start window</span>
              <select value={form.startWindow} onChange={set('startWindow')}>
                <option value="">Not sure yet</option>
                {START_WINDOWS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label className="wk-full">
              <span>Anything else we should know</span>
              <textarea
                rows={3} value={form.notes} onChange={set('notes')}
                placeholder="Current tools, specific pain points, a department this is really for — anything that helps us shape the room."
              />
            </label>
          </div>

          {/* The soft floor: shown, never enforced. A 4-person company still
              gets a real form and a real price — it is just steered toward
              the cheaper route instead of a dedicated in-house cohort. */}
          {underRecommended && (
            <p className="wk-note wk-note--info" role="status">
              Cohorts run best at {RECOMMENDED_MIN_SEATS}+ employees — enough
              in the room for the department exercises to actually work. At{' '}
              {seatsNum}, you’ll get the same modules either through our next
              open cohort (mixed companies, same curriculum) or a 1-on-1
              track. Send this anyway — we’ll tell you which fits better.
            </p>
          )}

          <div className="wk-picker">
            <div className="wk-picker-head">
              <p className="wk-picker-label">Choose your modules</p>
              <p className={`wk-picker-count ${belowMinModules ? 'is-under' : ''}`}>
                {selected.length} / {MAX_MODULES} selected — minimum {MIN_MODULES}
              </p>
            </div>
            <div className="wk-chips" role="group" aria-label="Workshop modules">
              {MODULES.map((m) => {
                const on = selected.includes(m.id)
                const disabled = !on && atMaxModules
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`wk-chip ${on ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''}`}
                    aria-pressed={on}
                    disabled={disabled}
                    onClick={() => toggleModule(m.id)}
                  >
                    <span className="wk-chip-title">{m.title}</span>
                    <span className="wk-chip-hours">{m.hours}h</span>
                  </button>
                )
              })}
            </div>
            {belowMinModules && (
              <p className="wk-note wk-note--warn">Pick at least {MIN_MODULES} modules to price a cohort.</p>
            )}
            {maxHit && (
              <p className="wk-note wk-note--warn">
                Maximum {MAX_MODULES} modules per cohort — remove one to add a different one.
              </p>
            )}
          </div>
        </div>

        {/* the live estimate — recomputes from the exact same estimate()
            the pricing table and the worked example use */}
        <aside className="wk-estimate" aria-live="polite">
          <p className="wk-estimate-kicker">Your estimate</p>
          {!est && (
            <p className="wk-estimate-empty">
              Enter your employee count and pick at least {MIN_MODULES} modules to see a price.
            </p>
          )}
          {est && est.enterprise && (
            <>
              <p className="wk-estimate-total">Enterprise tier</p>
              <p className="wk-estimate-sub">
                At {est.seats} employees this is a multi-cohort engagement —
                send the form and we’ll come back with a custom quote and schedule.
              </p>
            </>
          )}
          {est && !est.enterprise && (
            <>
              <p className="wk-estimate-perseat">
                {fmt(est.discountedPerSeat)} <span>JOD / employee</span>
              </p>
              {est.tier.discount > 0 && (
                <p className="wk-estimate-tier">{Math.round(est.tier.discount * 100)}% {est.tier.label} discount applied</p>
              )}
              <div className="wk-estimate-line">
                <span>{fmt(est.discountedPerSeat)} JOD × {est.seats} employees</span>
              </div>
              <p className="wk-estimate-total">
                {fmt(est.total)} <span>JOD total</span>
              </p>
            </>
          )}

          <div className="wk-send">
            {canSubmit ? (
              <>
                <Magnetic>
                  <a className="wk-btn wk-btn--fill" href={waHref} target="_blank" rel="noreferrer">
                    Send via WhatsApp
                  </a>
                </Magnetic>
                <a className="wk-btn" href={mailHref}>Send as email</a>
              </>
            ) : (
              <>
                <button className="wk-btn wk-btn--fill" type="button" disabled aria-disabled="true">
                  Send via WhatsApp
                </button>
                <button className="wk-btn" type="button" disabled aria-disabled="true">
                  Send as email
                </button>
              </>
            )}
          </div>
          {!canSubmit && (
            <p className="wk-note wk-note--muted">
              {belowMinModules
                ? `Pick at least ${MIN_MODULES} modules to enable sending.`
                : 'Fill in company, contact, work email and employee count to enable sending.'}
            </p>
          )}
        </aside>
      </div>
    </section>
  )
}

export function Workshops() {
  return (
    <div className="wk">
      <WkHero />
      <WkPositioning />
      <WkCurriculum />
      <WkPricing />
      <WkForm />
    </div>
  )
}
