// ————————————————————————————————————————————————————————————
// Mapping a DOM node back to the source that wrote it.
//
// React 18 dev builds hang `_debugSource` ({fileName, lineNumber}) off a
// fiber whenever the JSX carried `__source` — which @vitejs/plugin-react
// switches on by default in dev via the automatic jsx-dev runtime.
// Verified against react@18.3.1 (react-dom.development.js sets
// `existing._debugSource = element._source`).
//
// The file it names is the JSX call site, which for LOOM is usually a
// component in src/components/. The literal copy very often lives in
// src/data/site.js instead — so the file is only ever a HINT. The server
// falls back to an exact, uniqueness-checked search across src/**.
// ————————————————————————————————————————————————————————————

export const STUDIO_ROOT_ID = 'loom-studio-root'

/** The React fiber attached to a DOM node, if any. */
export function getFiber(el) {
  if (!el || el.nodeType !== 1) return null
  for (const key in el) {
    if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) return el[key]
  }
  return null
}

/** Walk up the fiber tree for the nearest recorded JSX source location. */
export function getSourceLocation(el) {
  let fiber = getFiber(el)
  let hops = 0
  while (fiber && hops++ < 60) {
    const src = fiber._debugSource
    if (src?.fileName) return { file: src.fileName, line: src.lineNumber ?? null }
    fiber = fiber._debugOwner || fiber.return
  }
  return null
}

/**
 * Every distinct source file on the way up the tree, nearest first.
 *
 * The nearest hit is often a shared primitive rather than the copy's home —
 * a heading rendered through `SplitWords` reports src/lib/motion.jsx, and the
 * actual words live three frames up in src/components/Sections.jsx (or, most
 * often, in src/data/site.js, which no fiber ever names). So these are hints
 * to try in order, not an answer; the server falls back to an exact,
 * uniqueness-checked search across src/** when none of them match.
 */
export function getSourceFiles(el, limit = 5) {
  const files = []
  let fiber = getFiber(el)
  let hops = 0
  while (fiber && hops++ < 80 && files.length < limit) {
    const f = fiber._debugSource?.fileName
    if (f && !files.includes(f)) files.push(f)
    fiber = fiber._debugOwner || fiber.return
  }
  return files
}

/** A readable "where am I" label for the panel. */
export function describe(el) {
  if (!el) return ''
  const tag = el.tagName.toLowerCase()
  const cls = (el.className && typeof el.className === 'string')
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : ''
  return tag + cls
}

/** Nearest section id/heading, for comment + ask context. */
export function sectionOf(el) {
  const sec = el?.closest?.('section, header, footer, [id]')
  if (!sec) return ''
  return sec.id || sec.tagName.toLowerCase()
}

const isInStudio = (el) => !!el?.closest?.(`#${STUDIO_ROOT_ID}`)

// Elements whose text we will not touch, because editing them means editing
// markup, not copy.
const BLOCKED = 'script,style,svg,canvas,input,textarea,select,option,video,audio,iframe'

/**
 * `SplitWords` (src/lib/motion.jsx) shreds a heading into one <span> per word
 * inside per-word clipping masks. Clicking a word must edit the WHOLE string,
 * so we always resolve up to the `.sw` container and read its aria-label —
 * which holds the untouched original (the spans carry &nbsp; padding).
 */
function splitContainer(el) {
  const sw = el.closest?.('.sw')
  if (sw && sw.getAttribute('aria-label')) return sw
  return null
}

/**
 * Is this element a clean, editable run of text?
 * We require every child to be a text node — then `textContent` is exactly
 * what the source wrote, with no markup to reconstruct.
 */
function isPlainTextEl(el) {
  if (!el || el.nodeType !== 1) return false
  if (el.matches(BLOCKED)) return false
  if (!el.childNodes.length) return false
  for (const n of el.childNodes) {
    if (n.nodeType === 3) continue
    if (n.nodeType === 8) continue
    return false
  }
  const t = el.textContent
  return !!t && t.trim().length > 0 && t.length < 2000
}

/**
 * Given a point, find the text run the owner means.
 * Returns { el, text, kind } or null.
 */
export function textTargetAt(x, y) {
  const hit = document.elementFromPoint(x, y)
  if (!hit || isInStudio(hit)) return null
  return textTargetFrom(hit)
}

export function textTargetFrom(hit) {
  if (!hit || isInStudio(hit)) return null

  const sw = splitContainer(hit)
  if (sw) return { el: sw, text: sw.getAttribute('aria-label'), kind: 'split' }

  // Walk up a few levels: the pointer often lands on an inline decoration.
  let el = hit
  for (let i = 0; i < 4 && el && el !== document.body; i++) {
    if (isPlainTextEl(el)) {
      const inner = splitContainer(el)
      if (inner) return { el: inner, text: inner.getAttribute('aria-label'), kind: 'split' }
      return { el, text: el.textContent, kind: 'text' }
    }
    el = el.parentElement
  }
  return null
}

/** Everything the server needs to make the edit. */
export function editPayload(target, newText) {
  const loc = getSourceLocation(target.el) || {}
  return {
    file: loc.file || null,
    files: getSourceFiles(target.el),
    line: loc.line || null,
    oldText: target.text,
    newText,
  }
}
