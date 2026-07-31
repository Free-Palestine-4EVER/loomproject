// Multi-step contact wizard: intent -> needs -> details -> WhatsApp / email handoff.
// Fully static — composes a structured brief and opens wa.me / mailto prefilled.
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BRAND, WIZARD } from '../data/site.js'
import { EASE, Magnetic } from '../lib/motion.jsx'

const STEPS = ['Start', 'Needs', 'Details', 'Send']

export function ContactWizard() {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [intent, setIntent] = useState(null)
  const [needs, setNeeds] = useState([])
  const [form, setForm] = useState({ name: '', company: '', budget: '', timeline: '', message: '' })
  const [touched, setTouched] = useState(false)

  const go = (n) => { setDir(n > step ? 1 : -1); setStep(n) }
  const toggleNeed = (n) =>
    setNeeds((xs) => (xs.includes(n) ? xs.filter((x) => x !== n) : [...xs, n]))

  const intentObj = WIZARD.intents.find((i) => i.id === intent)
  const brief = useMemo(() => {
    const lines = [
      `Hi LOOM! ${intentObj ? intentObj.title : ''}`.trim(),
      needs.length ? `What I need: ${needs.join(', ')}` : null,
      form.name ? `Name: ${form.name}` : null,
      form.company ? `Company: ${form.company}` : null,
      form.budget ? `Budget: ${form.budget}` : null,
      form.timeline ? `Timeline: ${form.timeline}` : null,
      form.message ? `Details: ${form.message}` : null,
    ].filter(Boolean)
    return lines.join('\n')
  }, [intentObj, needs, form])

  const waHref = `${BRAND.whatsapp}?text=${encodeURIComponent(brief)}`
  const mailHref = `mailto:${BRAND.email}?subject=${encodeURIComponent(`Project inquiry — ${intentObj ? intentObj.title : 'LOOM'}`)}&body=${encodeURIComponent(brief)}`
  const detailsValid = form.name.trim().length > 1

  const slide = {
    initial: (d) => ({ opacity: 0, x: d * 60 }),
    animate: { opacity: 1, x: 0 },
    exit: (d) => ({ opacity: 0, x: d * -60 }),
  }

  return (
    <div className="wizard" id="start-project">
      <div className="wizard-steps" role="tablist" aria-label="Inquiry steps">
        {STEPS.map((s, i) => (
          <button
            key={s}
            role="tab"
            aria-selected={step === i}
            className={`wstep ${i === step ? 'is-now' : ''} ${i < step ? 'is-done' : ''}`}
            onClick={() => i < step && go(i)}
            disabled={i > step}
          >
            <i>{i + 1}</i>{s}
          </button>
        ))}
        <div className="wizard-bar" aria-hidden="true">
          <motion.i animate={{ scaleX: (step + 1) / STEPS.length }} transition={{ duration: 0.5, ease: EASE }} />
        </div>
      </div>

      <div className="wizard-stage">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          {step === 0 && (
            <motion.div key="s0" className="wpane" custom={dir} variants={slide}
              initial="initial" animate="animate" exit="exit" transition={{ duration: 0.45, ease: EASE }}>
              <h3 className="wq">What brings you to the loom?</h3>
              <div className="wintents">
                {WIZARD.intents.map((it) => (
                  <button
                    key={it.id}
                    className={`wintent ${intent === it.id ? 'is-picked' : ''}`}
                    onClick={() => { setIntent(it.id); go(1) }}
                  >
                    <span className="wintent-icon" aria-hidden="true">{it.icon}</span>
                    <span className="wintent-title">{it.title}</span>
                    <span className="wintent-sub">{it.sub}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" className="wpane" custom={dir} variants={slide}
              initial="initial" animate="animate" exit="exit" transition={{ duration: 0.45, ease: EASE }}>
              <h3 className="wq">What do you need exactly?</h3>
              <p className="wsub">Pick everything that applies — we’ll shape it with you.</p>
              <div className="wchips">
                {WIZARD.needs.map((n) => (
                  <button
                    key={n}
                    className={`wchip ${needs.includes(n) ? 'is-on' : ''}`}
                    aria-pressed={needs.includes(n)}
                    onClick={() => toggleNeed(n)}
                  >{n}</button>
                ))}
              </div>
              <div className="wnav">
                <button className="wback" onClick={() => go(0)}>← Back</button>
                <button className="btn btn--primary" disabled={!needs.length} onClick={() => go(2)}>
                  Continue →
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" className="wpane" custom={dir} variants={slide}
              initial="initial" animate="animate" exit="exit" transition={{ duration: 0.45, ease: EASE }}>
              <h3 className="wq">Almost there — the essentials.</h3>
              <div className="wform">
                <label>
                  <span>Your name *</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    onBlur={() => setTouched(true)}
                    placeholder="e.g. Rania Haddad"
                    aria-invalid={touched && !detailsValid}
                  />
                </label>
                <label>
                  <span>Company / project</span>
                  <input
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="optional"
                  />
                </label>
                <label>
                  <span>Budget</span>
                  <select value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}>
                    <option value="">Prefer not to say</option>
                    {WIZARD.budgets.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                <label>
                  <span>Timeline</span>
                  <select value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })}>
                    <option value="">Not sure yet</option>
                    {WIZARD.timelines.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="wfull">
                  <span>Tell us more</span>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="The idea, the market, the deadline — anything that helps us think."
                  />
                </label>
              </div>
              <div className="wnav">
                <button className="wback" onClick={() => go(1)}>← Back</button>
                <button className="btn btn--primary" disabled={!detailsValid} onClick={() => { setTouched(true); if (detailsValid) go(3) }}>
                  Review →
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" className="wpane" custom={dir} variants={slide}
              initial="initial" animate="animate" exit="exit" transition={{ duration: 0.45, ease: EASE }}>
              <h3 className="wq">Your brief, woven. Send it your way.</h3>
              <pre className="wbrief" aria-label="Your inquiry summary">{brief}</pre>
              <div className="wsend">
                <Magnetic><a className="btn btn--primary btn--big" href={waHref} target="_blank" rel="noreferrer">Send via WhatsApp</a></Magnetic>
                <Magnetic><a className="btn btn--ghost btn--big" href={mailHref}>Send as email</a></Magnetic>
              </div>
              <div className="wnav wnav--end">
                <button className="wback" onClick={() => go(2)}>← Edit details</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
