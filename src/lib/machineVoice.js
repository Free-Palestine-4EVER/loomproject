// Voice layer for the contact machine.
//
// Two sources, in order of preference:
//   1. Pre-rendered audio at /audio/contact/<lang>/<key>.mp3 — deterministic, on-brand,
//      works offline. Drop the files in and they win automatically.
//   2. speechSynthesis — zero assets, but Arabic voices are poor-to-absent on most
//      machines, so it is a fallback and never the plan.
//
// Muted until the visitor asks for sound: Safari blocks autoplay audio anyway, and a
// page that starts talking at you is hostile. Every line is also in the transcript,
// so nothing here is load-bearing.

const audioCache = new Map()

function clipUrl(lang, key) {
  return `/audio/contact/${lang}/${key}.mp3`
}

// A miss must be cheap and silent. The SPA rewrite means a missing file resolves to
// index.html rather than a 404, so we let the <audio> element's own error/decode
// failure be the signal instead of trusting the status code.
function loadClip(lang, key) {
  const url = clipUrl(lang, key)
  if (audioCache.has(url)) return audioCache.get(url)
  const p = new Promise((resolve) => {
    const el = new Audio()
    el.preload = 'auto'
    el.src = url
    const ok = () => { cleanup(); resolve(el) }
    const fail = () => { cleanup(); resolve(null) }
    const cleanup = () => {
      el.removeEventListener('canplaythrough', ok)
      el.removeEventListener('error', fail)
      el.removeEventListener('stalled', fail)
    }
    el.addEventListener('canplaythrough', ok)
    el.addEventListener('error', fail)
    el.addEventListener('stalled', fail)
    el.load()
  })
  audioCache.set(url, p)
  return p
}

function speak(text, lang) {
  const synth = window.speechSynthesis
  if (!synth) return false
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang === 'ar' ? 'ar-SA' : 'en-US'
  u.rate = 0.95
  u.pitch = 0.85
  // Prefer a voice that actually matches the language over the system default,
  // which will happily read Arabic text with an English voice.
  const match = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(u.lang.slice(0, 2)))
  if (match) u.voice = match
  synth.speak(u)
  return true
}

export function createVoice() {
  let current = null

  const stop = () => {
    if (current) { current.pause(); current.currentTime = 0; current = null }
    window.speechSynthesis?.cancel()
  }

  return {
    stop,
    // Fire-and-forget: a failed line must never block the wizard.
    async say(key, lang, text) {
      stop()
      const clip = await loadClip(lang, key)
      if (clip) {
        current = clip
        try { await clip.play() } catch { current = null }
        return
      }
      speak(text, lang)
    },
    // Warm the active language only — preloading both doubles the transfer for
    // audio half of it will never play.
    preload(lang) {
      if (typeof window === 'undefined') return
      for (const key of ['greet', 'needs', 'details', 'review', 'sent', 'error']) {
        loadClip(lang, key)
      }
    },
  }
}
