/**
 * Small, shared, dumb helpers for the /dashboard workspace.
 *
 * Everything here is presentation only — formatting a timestamp, naming a
 * status, listing the four file keys the forge function can return. NOTHING in
 * this file decides entitlement, and nothing invents a field: every function
 * takes what the API actually sent and returns a string. If the API did not
 * send it, the caller renders nothing rather than a placeholder.
 */

/** The four download formats a finished FORGE job can carry, in the order the
 *  panel lists them. A job only shows the keys ITS OWN `modelUrls` contains —
 *  this array is the order, never the promise. */
export const FORMATS = ['glb', 'fbx', 'obj', 'usdz']

/** The four `job.status` values the forge function emits, mapped to the words
 *  a client reads. An unknown status falls through to the raw value rather
 *  than being swallowed — a status we have never seen is information. */
export const STATUS = {
  PENDING: { label: 'Queued', key: 'pending' },
  IN_PROGRESS: { label: 'Generating', key: 'in_progress' },
  SUCCEEDED: { label: 'Ready', key: 'succeeded' },
  FAILED: { label: 'Failed', key: 'failed' },
}

export function statusLabel(status) {
  return STATUS[status]?.label || status || 'Unknown'
}
export function statusKey(status) {
  return STATUS[status]?.key || 'pending'
}
export function isRunning(job) {
  return job?.status === 'PENDING' || job?.status === 'IN_PROGRESS'
}
export function isDone(job) {
  return job?.status === 'SUCCEEDED'
}

/**
 * `createdAt` has arrived as three different shapes from Firestore-backed
 * functions over this project's life — an ISO string, epoch ms, and a
 * `{ _seconds }` Timestamp once serialised. Guessing wrong sorts the library
 * backwards, which is the one thing a "newest first" grid must never do, so
 * all three are handled and anything else sorts as 0 (oldest) instead of NaN.
 */
export function toMs(value) {
  if (!value) return 0
  if (typeof value === 'number') return value < 1e12 ? value * 1000 : value
  if (typeof value === 'string') {
    const t = Date.parse(value)
    return Number.isNaN(t) ? 0 : t
  }
  if (typeof value === 'object') {
    const s = value.seconds ?? value._seconds
    if (typeof s === 'number') return s * 1000
  }
  return 0
}

const RELATIVE = [
  [60_000, 1000, 'second'],
  [3_600_000, 60_000, 'minute'],
  [86_400_000, 3_600_000, 'hour'],
  [604_800_000, 86_400_000, 'day'],
]

/** "4 minutes ago" for anything inside a week, an absolute date beyond it.
 *  Returns null when there is no timestamp — the card then shows no date line
 *  at all, rather than "Invalid Date". */
export function whenLabel(value, now = Date.now()) {
  const ms = toMs(value)
  if (!ms) return null
  const diff = now - ms
  if (diff < 45_000) return 'Just now'
  if (diff > 0) {
    for (const [limit, unit, name] of RELATIVE) {
      if (diff < limit) {
        const n = Math.round(diff / unit)
        return `${n} ${name}${n === 1 ? '' : 's'} ago`
      }
    }
  }
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** The full timestamp, for the `title=` on the relative one. */
export function whenExact(value) {
  const ms = toMs(value)
  if (!ms) return null
  return new Date(ms).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/** mm:ss, for the elapsed clock on a running job. */
export function clock(ms) {
  const total = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Byte length of a data URL's payload, without decoding it. */
export function dataUrlBytes(dataUrl) {
  if (typeof dataUrl !== 'string') return 0
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return 0
  const b64 = dataUrl.length - comma - 1
  const pad = dataUrl.endsWith('==') ? 2 : dataUrl.endsWith('=') ? 1 : 0
  return Math.max(0, Math.round(b64 * 0.75) - pad)
}

/** A sensible default model name from a picked file: no extension, no
 *  underscores, trimmed to what the API accepts. */
export function nameFromFile(file) {
  const raw = (file?.name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return raw.slice(0, 60)
}
