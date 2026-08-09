// The talking half of the contact experience: transcript, sound toggle, AR/EN switch.
// Pairs with <LoomHead /> (the visual) and <ContactWizard /> (the actual form).
//
// Scope note: this is the only bilingual surface on the site. The rest of the page is
// English, so the switch is labelled and scoped to the machine rather than dressed up
// as a site-wide language toggle it is not.
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MACHINE_LINES, MACHINE_UI } from '../data/machine.js'
import { createVoice } from '../lib/machineVoice.js'
import { EASE } from '../lib/motion.jsx'

const LANG_KEY = 'loom.machine.lang'

// `reduced` is passed in rather than read here — the section already has motion's
// useReducedMotion and two subscriptions to the same query is one too many.
export function MachineChat({ state, lang, onLang, reduced }) {
  const [sound, setSound] = useState(false)
  const [log, setLog] = useState([])
  const voice = useRef(null)
  const railRef = useRef(null)
  if (!voice.current) voice.current = createVoice()
  const ui = MACHINE_UI[lang]

  // Append on state change. The transcript is the record of the conversation, so a
  // repeated state (revisiting a step) does not duplicate the line.
  useEffect(() => {
    const line = MACHINE_LINES[state]
    if (!line) return
    setLog((prev) => (prev[prev.length - 1]?.key === state ? prev : [...prev, { key: state }]))
    if (sound) voice.current.say(state, lang, line[lang])
  }, [state, lang, sound])

  useEffect(() => {
    if (sound) voice.current.preload(lang)
    else voice.current.stop()
  }, [sound, lang])

  useEffect(() => () => voice.current?.stop(), [])

  // Follow the conversation without yanking the whole page — scroll the rail only.
  useEffect(() => {
    const el = railRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' })
  }, [log, reduced])

  const toggleLang = useCallback(() => {
    voice.current.stop()
    onLang(lang === 'en' ? 'ar' : 'en')
  }, [lang, onLang])

  return (
    <div className="machine" dir={ui.dir} lang={lang}>
      <div className="machine-bar">
        <span className="machine-label">{ui.label}</span>
        <div className="machine-actions">
          <button
            type="button"
            className={`machine-btn ${sound ? 'is-on' : ''}`}
            aria-pressed={sound}
            onClick={() => setSound((s) => !s)}
          >
            <i aria-hidden="true" className="machine-dot" />
            {sound ? ui.sound_on : ui.sound_off}
          </button>
          <button
            type="button"
            className="machine-btn"
            aria-label={ui.lang_switch_label}
            onClick={toggleLang}
          >{ui.lang_switch}</button>
        </div>
      </div>

      {/* polite, not assertive: the machine narrates alongside the form, it does not
          interrupt what a screen reader is already saying about the current field. */}
      <div className="machine-rail" data-lenis-prevent ref={railRef} role="log" aria-live="polite" aria-label={ui.transcript}>
        <AnimatePresence initial={false}>
          {log.map((entry, i) => (
            <motion.p
              key={`${entry.key}-${i}`}
              className="machine-line"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {MACHINE_LINES[entry.key][lang]}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>

      {reduced && <p className="machine-note">{ui.reduced}</p>}
    </div>
  )
}

export function useMachineLang() {
  const [lang, setLang] = useState('en')
  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'ar' || saved === 'en') setLang(saved)
  }, [])
  const set = useCallback((next) => {
    setLang(next)
    localStorage.setItem(LANG_KEY, next)
  }, [])
  return [lang, set]
}
