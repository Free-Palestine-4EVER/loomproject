// The machine's script for the contact experience — the loom-head character that
// talks the visitor through the wizard (see gen-videos/CONTACT-PAGE-PROMPTS.md).
//
// Arabic is written natively, not translated from the English line: same voice and
// same dryness, different phrasing. Never run these through a translator "to sync
// them up" — they are two originals, not a source and a copy.

// Visual state per script beat. Four clips cover seven beats; several beats share
// the idle loop deliberately so the video never fights the reading.
export const MACHINE_STATES = {
  idle:    { clip: 'idle',   glow: 'magenta' },
  greet:   { clip: 'idle',   glow: 'magenta' },
  needs:   { clip: 'listen', glow: 'magenta' },
  details: { clip: 'listen', glow: 'cyan' },
  review:  { clip: 'listen', glow: 'cyan' },
  sent:    { clip: 'sent',   glow: 'gold' },
  error:   { clip: 'error',  glow: 'red' },
}

export const CLIPS = ['idle', 'listen', 'sent', 'error']

// key -> { en, ar }. `en`/`ar` are what the machine says AND what lands in the
// transcript — the experience has to be complete with the sound off.
export const MACHINE_LINES = {
  greet: {
    en: "Hi. I'm LOOM's machine. I weave brands. Give me a thread to pull.",
    ar: 'أهلاً. أنا آلة LOOM. أنا أنسج العلامات. أعطِني خيطاً أشدّه.',
  },
  needs: {
    en: "Good. Now tell me what you actually need — pick as many threads as you like.",
    ar: 'جيّد. الآن قُل لي ما تحتاجه فعلاً — اختر ما شئت من الخيوط.',
  },
  details: {
    en: "Step one of working together: your name. I'll pretend I don't already know it.",
    ar: 'أول خطوة في العمل معاً: اسمك. سأتظاهر بأنني لا أعرفه.',
  },
  review: {
    en: "Here's your brief, woven. Read it once, then send it whichever way you like.",
    ar: 'هذا مُلخّصك، منسوجاً. اقرأه مرّة، ثم أرسله بالطريقة التي تريد.',
  },
  sent: {
    en: "Woven. A human picks this up from Amman or Sarajevo — fast.",
    ar: 'تمّ النسج. سيتابعها إنسان من عمّان أو سراييفو — بسرعة.',
  },
  error: {
    en: "That thread snapped. I need a name before I can carry on.",
    ar: 'انقطع هذا الخيط. أحتاج اسماً قبل أن أُكمل.',
  },
}

// UI chrome around the machine, same two-originals rule.
export const MACHINE_UI = {
  en: {
    dir: 'ltr',
    label: 'The machine',
    transcript: 'Transcript',
    sound_on: 'Sound on',
    sound_off: 'Sound off',
    lang_switch: 'العربية',
    lang_switch_label: 'Switch the machine to Arabic',
    reduced: 'Motion reduced — the machine is holding still.',
  },
  ar: {
    dir: 'rtl',
    label: 'الآلة',
    transcript: 'النص',
    sound_on: 'الصوت يعمل',
    sound_off: 'الصوت متوقف',
    lang_switch: 'English',
    lang_switch_label: 'تحويل الآلة إلى الإنجليزية',
    reduced: 'الحركة مُخفّفة — الآلة ثابتة.',
  },
}

export const LANGS = ['en', 'ar']
