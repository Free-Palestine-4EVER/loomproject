#!/usr/bin/env node
// ————————————————————————————————————————————————————————————
// LOOM Studio — local edit server.
//
// Binds 127.0.0.1 only. No dependencies beyond node builtins.
// Speaks to the in-page overlay (src/studio) which runs on the Vite
// dev server at :4930.
//
//   POST /api/text      { file, line, oldText, newText }  -> edit source
//   POST /api/undo      {}                                -> revert last edit
//   GET  /api/history                                     -> recent edits
//   GET  /api/comments                                    -> comments.json
//   POST /api/comments  { comments }                      -> write comments.json
//   POST /api/ask       { prompt, context }               -> SSE claude -p run
//   POST /api/ask/cancel{ id }                            -> kill a run
//   GET  /api/asks                                        -> recent asks
//   GET  /api/health
// ————————————————————————————————————————————————————————————

import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')
const SRC = path.join(REPO, 'src')
const STUDIO_SRC = path.join(SRC, 'studio')
const HISTORY_DIR = path.join(HERE, '.history')
const HISTORY_INDEX = path.join(HISTORY_DIR, 'index.json')
const COMMENTS_FILE = path.join(HERE, 'comments.json')
const ASKS_FILE = path.join(HERE, 'asks.json')

const PORT = Number(process.env.STUDIO_PORT || 4931)
const HOST = '127.0.0.1'
const ASK_TIMEOUT_MS = 10 * 60 * 1000

const CODE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs'])
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'studio'])

// ——— tiny helpers ————————————————————————————————————————————

const json = (res, code, body) => {
  const payload = JSON.stringify(body)
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    ...cors(),
  })
  res.end(payload)
}

const cors = () => ({
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
})

const readBody = (req, limit = 2_000_000) =>
  new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try { resolve(JSON.parse(raw)) } catch (e) { reject(new Error('invalid JSON body')) }
    })
    req.on('error', reject)
  })

const readJsonFile = async (file, fallback) => {
  try { return JSON.parse(await fsp.readFile(file, 'utf8')) } catch { return fallback }
}

/** Write via a temp file in the same directory + rename — never a partial file. */
async function writeAtomic(file, contents) {
  const tmp = path.join(path.dirname(file), `.studio-tmp-${process.pid}-${Date.now()}`)
  await fsp.writeFile(tmp, contents, 'utf8')
  await fsp.rename(tmp, file)
}

// ——— path confinement ————————————————————————————————————————

/**
 * Resolve a client-supplied path and prove it lives inside <repo>/src.
 * Anything else — absolute paths elsewhere, `..` escapes, symlink hops,
 * the studio's own source — is refused.
 */
function resolveSourcePath(input) {
  if (typeof input !== 'string' || !input.trim()) return { error: 'no file given' }
  let p = input.trim()
  // Accept absolute paths, repo-relative paths, and Vite-style "/src/..." ids.
  if (!path.isAbsolute(p)) p = path.join(REPO, p)
  let abs = path.resolve(p)
  // Follow symlinks where possible so a link out of the repo can't be used.
  try { abs = fs.realpathSync(abs) } catch { /* file may not exist yet */ }
  const srcReal = (() => { try { return fs.realpathSync(SRC) } catch { return SRC } })()
  const rel = path.relative(srcReal, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) return { error: `refused: ${input} is outside src/` }
  if (abs === STUDIO_SRC || abs.startsWith(STUDIO_SRC + path.sep))
    return { error: 'refused: Studio cannot edit its own source' }
  if (!CODE_EXT.has(path.extname(abs))) return { error: `refused: ${path.extname(abs) || 'no'} files are not editable` }
  return { abs, rel: path.relative(REPO, abs) }
}

/** Every editable source file under src/ (studio excluded). */
async function listSourceFiles(dir = SRC, out = []) {
  let entries
  try { entries = await fsp.readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue
      if (full === STUDIO_SRC) continue
      await listSourceFiles(full, out)
    } else if (CODE_EXT.has(path.extname(e.name))) {
      out.push(full)
    }
  }
  return out
}

const countOccurrences = (haystack, needle) => {
  if (!needle) return 0
  let n = 0
  let i = haystack.indexOf(needle)
  while (i !== -1) { n++; i = haystack.indexOf(needle, i + needle.length) }
  return n
}

const lineOf = (contents, index) => contents.slice(0, index).split('\n').length

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Same words, same order, any whitespace between them. Returns the literal
 * substrings of `contents` that match — so the caller still replaces an exact,
 * verified span rather than running a regex over the file.
 */
function flexibleMatches(contents, text) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length < 2) return []
  const re = new RegExp(words.map(escapeRe).join('[\\s\\u00a0]+'), 'g')
  const out = []
  let m
  while ((m = re.exec(contents)) !== null) {
    out.push(m[0])
    if (out.length > 4) break
  }
  return out
}

/**
 * Text coming off the DOM can carry non-breaking spaces that are written as
 * `&nbsp;` (or a plain space) in the JSX. Try the literal first, then the
 * sensible variants — but only ever accept a variant that is itself unique.
 */
function textVariants(s) {
  const out = [s]
  if (s.includes(' ')) {
    out.push(s.replace(/ /g, ' '))
    out.push(s.replace(/ /g, '&nbsp;'))
  }
  return [...new Set(out)]
}

// ——— /api/text ————————————————————————————————————————————————

async function handleText(req, res, body) {
  const { file, files, line, oldText, newText } = body || {}
  if (typeof oldText !== 'string' || !oldText.length) return json(res, 400, { error: 'oldText is required' })
  if (typeof newText !== 'string') return json(res, 400, { error: 'newText is required' })
  if (oldText === newText) return json(res, 200, { ok: true, noop: true })
  if (newText.length > 20000) return json(res, 400, { error: 'newText is unreasonably long' })

  // 1. The files the fiber chain pointed at, nearest first. A hint that fails
  //    confinement is simply dropped — the copy may still live in a data file
  //    the search below will find. Nothing is ever written outside src/.
  const candidates = []
  for (const f of [file, ...(Array.isArray(files) ? files : [])]) {
    if (!f) continue
    const r = resolveSourcePath(f)
    if (r.abs && !candidates.includes(r.abs)) candidates.push(r.abs)
  }

  const tryFile = async (abs) => {
    let contents
    try { contents = await fsp.readFile(abs, 'utf8') } catch { return null }
    // a) the literal string, plus the nbsp spellings of it
    for (const variant of textVariants(oldText)) {
      const n = countOccurrences(contents, variant)
      if (n === 1) return { abs, contents, needle: variant }
      if (n > 1) return { abs, contents, ambiguous: n, needle: variant }
    }
    // b) whitespace-flexible: JSX collapses a wrapped text child into one
    //    space, so the source often reads "…sells it,\n    and the AI…" while
    //    the DOM reads "…sells it, and the AI…". Same words, same order, only
    //    the whitespace differs — still an exact, unambiguous match.
    const found = flexibleMatches(contents, oldText)
    if (found.length === 1) return { abs, contents, needle: found[0] }
    if (found.length > 1) return { abs, contents, ambiguous: found.length, needle: found[0] }
    return null
  }

  let hit = null
  let ambiguous = null
  for (const abs of candidates) {
    const r = await tryFile(abs)
    if (r?.ambiguous) { ambiguous = { file: path.relative(REPO, abs), count: r.ambiguous }; continue }
    if (r) { hit = r; break }
  }

  // 2. Fallback: exact search across src/**. Most LOOM copy lives in
  //    src/data/site.js, which the JSX fiber will never point at.
  let searched = false
  if (!hit) {
    searched = true
    const files = await listSourceFiles()
    const found = []
    for (const abs of files) {
      const r = await tryFile(abs)
      if (r?.ambiguous) found.push({ abs, ambiguous: r.ambiguous })
      else if (r) found.push(r)
    }
    const unique = found.filter((f) => !f.ambiguous)
    if (unique.length === 1) hit = unique[0]
    else if (unique.length > 1) {
      return json(res, 409, {
        error: 'That exact text appears in more than one file, so Studio will not guess which one you meant.',
        matches: unique.map((f) => path.relative(REPO, f.abs)),
      })
    } else if (found.length) {
      return json(res, 409, {
        error: 'That exact text appears more than once in the same file, so Studio will not guess which one you meant.',
        matches: found.map((f) => `${path.relative(REPO, f.abs)} (${f.ambiguous}x)`),
      })
    }
  }

  if (!hit) {
    return json(res, 409, {
      error: 'Could not find that text in the source. It may have changed since the page loaded — reload and try again.',
      lookedIn: searched ? 'src/**' : candidates.map((c) => path.relative(REPO, c)).join(', '),
      ambiguous,
    })
  }

  // The needle may have been a variant (nbsp -> space). Apply the same
  // normalisation to the replacement so the file keeps its own convention.
  let replacement = newText
  if (hit.needle !== oldText) {
    if (hit.needle === oldText.replace(/ /g, ' ')) replacement = newText.replace(/ /g, ' ')
    else if (hit.needle === oldText.replace(/ /g, '&nbsp;')) replacement = newText.replace(/ /g, '&nbsp;')
  }
  const index = hit.contents.indexOf(hit.needle)

  // Decide what the match actually is in the source, then refuse anything that
  // would break the syntax around it. The character before the match tells us:
  // a quote means we are inside a string literal, anything else means JSX text.
  const before = hit.contents[index - 1]
  const insideString = before === '"' || before === "'" || before === '`'
  if (insideString) {
    const quote = before
    if (replacement.includes(quote) || /[\\\n\r]/.test(replacement) || (quote === '`' && replacement.includes('${'))) {
      return json(res, 400, {
        error: `That text lives inside a ${quote}…${quote} string. Straight quotes, backslashes and line breaks would break it — use a curly apostrophe (’) instead.`,
      })
    }
  } else if (/[<>{}]/.test(replacement)) {
    return json(res, 400, { error: 'Sorry — the characters < > { } are not allowed in inline text edits.' })
  }

  const next = hit.contents.slice(0, index) + replacement + hit.contents.slice(index + hit.needle.length)

  const entry = await snapshot(hit.abs, hit.contents, { oldText: hit.needle, newText: replacement })
  await writeAtomic(hit.abs, next)

  return json(res, 200, {
    ok: true,
    file: path.relative(REPO, hit.abs),
    line: lineOf(hit.contents, index),
    editId: entry.id,
    viaSearch: searched,
  })
}

// ——— undo log ————————————————————————————————————————————————

async function snapshot(abs, beforeContents, meta) {
  await fsp.mkdir(HISTORY_DIR, { recursive: true })
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const snapName = `${id}.snapshot`
  await fsp.writeFile(path.join(HISTORY_DIR, snapName), beforeContents, 'utf8')
  const index = await readJsonFile(HISTORY_INDEX, [])
  const entry = {
    id,
    ts: new Date().toISOString(),
    file: path.relative(REPO, abs),
    abs,
    snapshot: snapName,
    undone: false,
    ...meta,
  }
  index.push(entry)
  await writeAtomic(HISTORY_INDEX, JSON.stringify(index.slice(-500), null, 2))
  return entry
}

async function handleUndo(req, res) {
  const index = await readJsonFile(HISTORY_INDEX, [])
  for (let i = index.length - 1; i >= 0; i--) {
    const e = index[i]
    if (e.undone) continue
    const guard = resolveSourcePath(e.abs || e.file)
    if (guard.error) return json(res, 500, { error: `refusing to undo: ${guard.error}` })
    let before
    try { before = await fsp.readFile(path.join(HISTORY_DIR, e.snapshot), 'utf8') }
    catch { return json(res, 500, { error: 'undo snapshot is missing' }) }
    await writeAtomic(guard.abs, before)
    e.undone = true
    e.undoneAt = new Date().toISOString()
    await writeAtomic(HISTORY_INDEX, JSON.stringify(index, null, 2))
    return json(res, 200, { ok: true, file: e.file, restored: e.oldText, wasChangedTo: e.newText })
  }
  return json(res, 200, { ok: false, error: 'Nothing left to undo.' })
}

async function handleHistory(req, res) {
  const index = await readJsonFile(HISTORY_INDEX, [])
  json(res, 200, {
    edits: index.slice(-40).reverse().map(({ id, ts, file, oldText, newText, undone }) =>
      ({ id, ts, file, oldText, newText, undone })),
  })
}

// ——— comments ————————————————————————————————————————————————

async function handleComments(req, res, body) {
  if (req.method === 'GET') {
    return json(res, 200, { comments: await readJsonFile(COMMENTS_FILE, []) })
  }
  const list = body?.comments
  if (!Array.isArray(list)) return json(res, 400, { error: 'comments must be an array' })
  if (list.length > 500) return json(res, 400, { error: 'too many comments' })
  const clean = list.map((c) => ({
    id: String(c.id || '').slice(0, 64),
    text: String(c.text ?? '').slice(0, 4000),
    xPct: Number(c.xPct) || 0,
    yPct: Number(c.yPct) || 0,
    label: String(c.label ?? '').slice(0, 200),
    resolved: !!c.resolved,
    ts: c.ts || new Date().toISOString(),
  })).filter((c) => c.id)
  await writeAtomic(COMMENTS_FILE, JSON.stringify(clean, null, 2))
  json(res, 200, { ok: true, comments: clean })
}

// ——— ask (claude -p) ——————————————————————————————————————————

const jobs = new Map()

async function recordAsk(entry) {
  const asks = await readJsonFile(ASKS_FILE, [])
  const i = asks.findIndex((a) => a.id === entry.id)
  if (i === -1) asks.push(entry)
  else asks[i] = { ...asks[i], ...entry }
  await writeAtomic(ASKS_FILE, JSON.stringify(asks.slice(-60), null, 2))
}

function buildPrompt(prompt, context) {
  const lines = []
  lines.push('You are editing the LOOM agency website (Vite + React 18) in this repository.')
  lines.push('The request below comes from the site owner, who is looking at the live page right now.')
  lines.push('Make the change directly in the source under src/. Keep the existing code style.')
  lines.push('Do not run git commit or git push. Do not touch src/studio/ or studio/.')
  lines.push('')
  if (context?.file) {
    lines.push('They had this element selected on the page:')
    lines.push(`  file: ${context.file}${context.line ? `:${context.line}` : ''}`)
    if (context.selector) lines.push(`  element: ${context.selector}`)
    if (context.text) lines.push(`  visible text: ${JSON.stringify(String(context.text).slice(0, 400))}`)
    if (context.section) lines.push(`  section: ${context.section}`)
    lines.push('')
  }
  lines.push('Request:')
  lines.push(String(prompt))
  return lines.join('\n')
}

async function handleAsk(req, res, body) {
  const prompt = String(body?.prompt || '').trim()
  if (!prompt) return json(res, 400, { error: 'prompt is required' })
  if (prompt.length > 8000) return json(res, 400, { error: 'prompt is too long' })

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
    ...cors(),
  })
  const send = (event) => { try { res.write(`data: ${JSON.stringify(event)}\n\n`) } catch {} }

  const full = buildPrompt(prompt, body?.context)
  send({ type: 'start', id, prompt })
  await recordAsk({ id, ts: new Date().toISOString(), prompt, status: 'running', files: [] })

  const bin = process.env.CLAUDE_BIN || 'claude'
  const args = [
    '-p', full,
    '--output-format', 'stream-json',
    '--verbose',
    '--permission-mode', 'acceptEdits',
  ]
  let child
  try {
    child = spawn(bin, args, {
      cwd: REPO,
      env: { ...process.env, PATH: `${path.join(os.homedir(), '.local/node/bin')}:${path.join(os.homedir(), '.local/bin')}:${process.env.PATH}` },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (e) {
    send({ type: 'error', message: `could not start ${bin}: ${e.message}` })
    send({ type: 'done', ok: false })
    return res.end()
  }

  const touched = new Set()
  let summary = ''
  let buf = ''
  const timer = setTimeout(() => {
    send({ type: 'error', message: 'Timed out after 10 minutes — stopping.' })
    try { child.kill('SIGTERM') } catch {}
  }, ASK_TIMEOUT_MS)

  jobs.set(id, child)

  child.stdout.on('data', (chunk) => {
    buf += chunk.toString('utf8')
    let nl
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line) continue
      let msg
      try { msg = JSON.parse(line) } catch { send({ type: 'log', text: line }); continue }
      translate(msg, send, touched, (s) => { summary = s })
    }
  })

  child.stderr.on('data', (c) => {
    const t = c.toString('utf8').trim()
    if (t) send({ type: 'log', text: t })
  })

  const finish = async (code) => {
    clearTimeout(timer)
    jobs.delete(id)
    const files = [...touched]
    const status = code === 0 ? 'done' : 'failed'
    send({ type: 'files', files })
    send({ type: 'done', ok: code === 0, code, files, summary })
    await recordAsk({ id, status, files, summary, endedAt: new Date().toISOString() })
    res.end()
  }

  child.on('error', (e) => { send({ type: 'error', message: e.message }); finish(1) })
  child.on('close', (code) => finish(code))
  req.on('close', () => {
    if (jobs.has(id)) { try { child.kill('SIGTERM') } catch {} }
  })
}

/** Turn a claude stream-json message into something a non-developer can read. */
function translate(msg, send, touched, setSummary) {
  if (msg.type === 'assistant' && msg.message?.content) {
    for (const part of msg.message.content) {
      if (part.type === 'text' && part.text.trim()) send({ type: 'text', text: part.text.trim() })
      if (part.type === 'tool_use') {
        const name = part.name
        const input = part.input || {}
        const file = input.file_path || input.path || input.notebook_path
        if (file && /^(Edit|Write|NotebookEdit|MultiEdit)$/.test(name)) touched.add(relToRepo(file))
        let detail = ''
        if (file) detail = relToRepo(file)
        else if (input.pattern) detail = input.pattern
        else if (input.command) detail = String(input.command).slice(0, 80)
        else if (input.description) detail = String(input.description).slice(0, 80)
        send({ type: 'tool', name, detail })
      }
    }
  } else if (msg.type === 'result') {
    if (typeof msg.result === 'string' && msg.result.trim()) setSummary(msg.result.trim())
    if (msg.is_error) send({ type: 'error', message: String(msg.result || 'run failed') })
  } else if (msg.type === 'system' && msg.subtype === 'init') {
    send({ type: 'log', text: `model ${msg.model || ''}` })
  }
}

const relToRepo = (p) => {
  try {
    const r = path.relative(REPO, path.resolve(p))
    return r.startsWith('..') ? p : r
  } catch { return p }
}

// ——— router ——————————————————————————————————————————————————

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`)
  const route = url.pathname

  if (req.method === 'OPTIONS') { res.writeHead(204, cors()); return res.end() }

  try {
    if (route === '/api/health') return json(res, 200, { ok: true, repo: REPO, port: PORT })
    if (route === '/api/history' && req.method === 'GET') return handleHistory(req, res)
    if (route === '/api/asks' && req.method === 'GET')
      return json(res, 200, { asks: (await readJsonFile(ASKS_FILE, [])).slice(-25).reverse() })
    if (route === '/api/comments' && req.method === 'GET') return handleComments(req, res)

    if (req.method === 'POST') {
      const body = await readBody(req)
      if (route === '/api/text') return handleText(req, res, body)
      if (route === '/api/undo') return handleUndo(req, res)
      if (route === '/api/comments') return handleComments(req, res, body)
      if (route === '/api/ask') return handleAsk(req, res, body)
      if (route === '/api/ask/cancel') {
        const child = jobs.get(String(body?.id))
        if (child) { try { child.kill('SIGTERM') } catch {} ; jobs.delete(String(body?.id)) }
        return json(res, 200, { ok: !!child })
      }
    }
    json(res, 404, { error: `no route ${req.method} ${route}` })
  } catch (e) {
    if (!res.headersSent) json(res, 500, { error: e?.message || String(e) })
    else { try { res.end() } catch {} }
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[studio] editing ${REPO}`)
  console.log(`[studio] listening on http://${HOST}:${PORT}`)
})

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[studio] port ${PORT} is already in use. Close whatever is on it, or set STUDIO_PORT.`)
    process.exit(1)
  }
  throw e
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const child of jobs.values()) { try { child.kill('SIGTERM') } catch {} }
    process.exit(0)
  })
}
