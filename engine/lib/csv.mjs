// engine/lib/csv.mjs — liberal, dependency-free CSV parser for pasted Meta Ads
// exports and anything else an operator might paste. Handles: BOM, CRLF/LF/CR
// line endings, quoted fields (including embedded commas and embedded
// newlines), doubled-quote escaping (""), and auto-detects the delimiter
// among comma / semicolon / tab.

/**
 * Tokenize `text` into rows of raw string cells using `delimiter`.
 * RFC4180-style: a field starting with `"` is a quoted field; inside a quoted
 * field, `""` is a literal `"`, and delimiters/newlines inside quotes are
 * part of the field value. Returns `string[][]`, one array per row,
 * including any trailing partial row.
 */
function tokenize(text, delimiter) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  const n = text.length

  const endField = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }

  while (i < n) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += ch
      i += 1
      continue
    }

    if (ch === '"' && field === '') {
      inQuotes = true
      i += 1
      continue
    }

    if (ch === delimiter) {
      endField()
      i += 1
      continue
    }

    if (ch === '\r') {
      if (text[i + 1] === '\n') i += 1
      endRow()
      i += 1
      continue
    }
    if (ch === '\n') {
      endRow()
      i += 1
      continue
    }

    field += ch
    i += 1
  }

  // Trailing field/row (file may or may not end with a newline).
  if (field !== '' || row.length > 0) {
    endRow()
  }

  return rows
}

/** Count occurrences of `ch` in `s`, ignoring content inside quoted spans. */
function countOutsideQuotes(s, ch) {
  let count = 0
  let inQuotes = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '"') {
      if (inQuotes && s[i + 1] === '"') { i++; continue }
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && c === ch) count++
  }
  return count
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r\n|\r|\n/, 1)[0] || ''
  const candidates = [',', ';', '\t']
  let best = ','
  let bestCount = 0
  for (const c of candidates) {
    const count = countOutsideQuotes(firstLine, c)
    if (count > bestCount) {
      bestCount = count
      best = c
    }
  }
  return best
}

function stripBom(text) {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1)
  return text
}

function isBlankRow(cells) {
  return cells.every((c) => (c ?? '').trim() === '')
}

/**
 * Parse a CSV/TSV string into `{ delimiter, headers, rows, raw }`.
 * - `headers`: trimmed header cells, in order.
 * - `rows`: array of plain objects keyed by header, one per data row
 *   (fully-blank rows are dropped).
 * - `raw`: the same data rows as arrays, in header order, for callers that
 *   want positional access.
 */
export function parseCsv(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { delimiter: ',', headers: [], rows: [], raw: [] }
  }
  const clean = stripBom(text)
  const delimiter = detectDelimiter(clean)
  const tokenRows = tokenize(clean, delimiter).filter((r) => !(r.length === 1 && r[0] === ''))
  if (tokenRows.length === 0) return { delimiter, headers: [], rows: [], raw: [] }

  const headers = tokenRows[0].map((h) => (h ?? '').trim())
  const dataTokenRows = tokenRows.slice(1).filter((r) => !isBlankRow(r))

  const rows = dataTokenRows.map((cells) => {
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] !== undefined ? cells[idx] : ''
    })
    return obj
  })

  return { delimiter, headers, rows, raw: dataTokenRows }
}

/** Normalize a header for liberal case/whitespace-insensitive matching. */
export function normalizeHeader(h) {
  return String(h ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Find the source header in `headers` that best matches one of `candidates`
 * (case/whitespace-insensitive). Tries exact normalized matches first, then
 * falls back to substring containment. Returns the original header string,
 * or null if nothing matched — callers must treat null as "unmapped",
 * never as zero.
 */
export function matchColumn(headers, candidates) {
  const normHeaders = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }))
  const normCandidates = candidates.map(normalizeHeader)

  for (const cand of normCandidates) {
    const exact = normHeaders.find((h) => h.norm === cand)
    if (exact) return exact.raw
  }
  for (const cand of normCandidates) {
    const partial = normHeaders.find((h) => h.norm.includes(cand) || cand.includes(h.norm))
    if (partial) return partial.raw
  }
  return null
}

/** Parse a possibly currency-formatted, thousand-separated number. Returns null (not 0) on failure. */
export function parseLooseNumber(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '') return null
  const negative = /^\(.*\)$/.test(s)
  const stripped = s.replace(/[^0-9.\-]/g, '')
  if (stripped === '' || stripped === '-') return null
  const n = Number(stripped)
  if (!Number.isFinite(n)) return null
  return negative ? -Math.abs(n) : n
}

/** Parse a loose date string into a YYYY-MM-DD ISO date, or null on failure. */
export function parseLooseDate(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '') return null
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}
