// engine/lib/clientauth.mjs — client-facing, no-password auth: one-time
// 6-digit codes (delivered by the operator, never SMS) that exchange for a
// bearer token scoped to exactly one client.
//
// Two hard rules from ios/CONTRACT.md this file exists to satisfy:
//   1. requestCode() must return the identical shape/timing for a known and
//      an unknown handle — it must never become a way to enumerate LOOM's
//      client list.
//   2. Only HASHES of codes and tokens ever touch disk (engine/data/
//      clientauthcodes.json, clienttokens.json). The plaintext code is
//      logged to the console and held in a small in-process Map so the
//      operator UI can read it out — that memory is never persisted, and is
//      cleared on every server restart (acceptable: the log line survives).
//
// Same dependency-injection seam as ads.mjs/invoices.mjs — every exported
// function takes an optional trailing `{ store }` so fixtures/
// clientapi-selftest.mjs can run against an isolated in-memory store instead
// of the real engine/data/*.json files.

import crypto from 'node:crypto'
import * as realStore from './store.mjs'

export const CODE_TTL_MS = 10 * 60 * 1000          // codes expire in 10 minutes
export const TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000 // tokens live 60 days
export const MAX_ATTEMPTS = 5                        // per handle per window
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000       // 15 minutes

const nowIso = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// hashing
// ---------------------------------------------------------------------------

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code ?? '')).digest('hex')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token ?? '')).digest('hex')
}

function genCode() {
  // 000000-999999, zero-padded — crypto.randomInt is rejection-sampled, no modulo bias.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

function normalizeHandle(raw) {
  if (typeof raw !== 'string') return ''
  let h = raw.trim().toLowerCase()
  if (h.startsWith('@')) h = h.slice(1)
  return h
}

async function findClientByHandle(handle, store) {
  const normalized = normalizeHandle(handle)
  if (!normalized) return null
  const clients = await store.list('clients')
  // Deliberately scans the WHOLE list instead of `.find()`, which short-circuits
  // on a match. With an early exit, a known handle returns as soon as it hits its
  // record while an unknown handle always walks every client — a timing signal
  // that says "this handle exists", and one that widens as the client list grows.
  // Doing the same work either way removes the oracle at the source rather than
  // relying on the difference staying too small to measure.
  let found = null
  for (const c of clients) {
    const isMatch = !c.archivedAt && normalizeHandle(c.handle) === normalized
    if (isMatch && found === null) found = c
  }
  return found
}

// ---------------------------------------------------------------------------
// client-safe shape — picked explicitly, never store-record-minus-keys
// ---------------------------------------------------------------------------

export function clientSafe(client) {
  if (!client) return null
  return {
    id: client.id,
    name: client.name,
    nameAr: client.nameAr,
    handle: client.handle,
    category: client.category,
    city: client.city,
    plan: { content: !!client.plan?.content, ads: !!client.plan?.ads },
  }
}

// ---------------------------------------------------------------------------
// in-process "operator readout" of the plaintext code
// ---------------------------------------------------------------------------
// This is deliberately NOT persisted — engine/data/clientauthcodes.json only
// ever holds a hash. This Map is how the operator UI (GET
// /api/operator/client-codes) and the console log both get to show the
// human the actual digits, since there is no SMS provider.

const pendingCodesMemory = new Map() // normalizedHandle -> { code, clientId, clientName, clientHandle, createdAt, expiresAt }

export function listPendingCodesForOperator() {
  const now = nowIso()
  const out = []
  for (const [handle, entry] of pendingCodesMemory) {
    if (entry.expiresAt > now) out.push({ handle, ...entry })
    else pendingCodesMemory.delete(handle)
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// ---------------------------------------------------------------------------
// request / verify
// ---------------------------------------------------------------------------

/**
 * Request a one-time code for `handle`. ALWAYS resolves to the same shape —
 * `{ ok: true, delivery: "operator" }` — whether or not the handle matches a
 * real client, and does an equivalent amount of work on both paths (hashing
 * a code either way) so the response can't be used to probe the client list.
 */
export async function requestCode(handle, { store = realStore } = {}) {
  const normalized = normalizeHandle(handle)
  const client = normalized ? await findClientByHandle(handle, store) : null

  const code = genCode()
  const codeHash = hashCode(code) // computed on both branches — keeps the cost close

  if (client) {
    // Invalidate any still-active codes for this handle first, so requesting
    // twice can't leave two valid codes racing each other.
    //
    // `permanent` codes are EXEMPT, and that exemption is load-bearing. The app's
    // sign-in flow always calls requestCode before verifyCode, so without this a
    // demo/pitch code was consumed by the very first request and could never be
    // used again — verifyCode's `permanent` check (below) never got the chance to
    // run, because the code was already filtered out as consumed. That destroyed
    // the App Store review account on the reviewer's first tap, which is exactly
    // the guideline 2.1 rejection the flag exists to prevent. Proven, then fixed.
    const active = await store.list('clientauthcodes', (r) => r.handle === normalized && !r.consumedAt && !r.permanent && r.expiresAt > nowIso())
    for (const r of active) await store.update('clientauthcodes', r.id, { consumedAt: nowIso() })

    const createdAt = nowIso()
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString()
    await store.insert('clientauthcodes', {
      handle: normalized, clientId: client.id, codeHash, createdAt, expiresAt, consumedAt: null,
    })

    pendingCodesMemory.set(normalized, {
      code, clientId: client.id, clientName: client.name, clientHandle: client.handle, createdAt, expiresAt,
    })

    // The delivery mechanism IS the operator — say so in the log, plainly.
    console.log(`[client-auth] code for ${client.name} (${normalized}): ${code} — expires ${expiresAt}, read it out to the client`)
  }
  // Unknown handle: no record, nothing logged, nothing to read out — but the
  // response below is identical either way.

  return { ok: true, delivery: 'operator' }
}

/**
 * Verify a submitted code for `handle`. Enforces the attempt limiter (max
 * MAX_ATTEMPTS per handle per ATTEMPT_WINDOW_MS, sliding window) before
 * looking at the code at all. On success, mints and persists (hashed) a new
 * bearer token and returns it plus the client-safe client record.
 */
export async function verifyCode(handle, code, { store = realStore } = {}) {
  const normalized = normalizeHandle(handle)
  const now = nowIso()
  const windowStart = new Date(Date.now() - ATTEMPT_WINDOW_MS).toISOString()

  // Only FAILED attempts count toward the lockout. Brute force is made of wrong
  // guesses, so counting successes buys no security and costs real logins: with
  // successes counted, the 6th correct sign-in inside 15 minutes was refused —
  // which an App Store reviewer retrying the demo account across devices and
  // reinstalls would hit (guideline 2.1), and so would a client using a phone
  // and an iPad. Successes are still recorded, just not counted.
  const recentAttempts = await store.list('clientauthattempts', (a) => a.handle === normalized && a.at >= windowStart && a.ok !== true)
  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return { ok: false, status: 401, error: { code: 'LOCKED_OUT', message: 'Too many attempts. Ask LOOM for a fresh code in 15 minutes.' } }
  }

  const candidates = normalized
    ? await store.list('clientauthcodes', (r) => r.handle === normalized && !r.consumedAt && r.expiresAt > now)
    : []

  const submittedBuf = Buffer.from(hashCode(code), 'hex')
  let match = null
  for (const r of candidates) {
    const storedBuf = Buffer.from(r.codeHash, 'hex')
    if (storedBuf.length === submittedBuf.length && crypto.timingSafeEqual(storedBuf, submittedBuf)) {
      match = r
      break
    }
  }

  // Record the attempt (success or failure) BEFORE returning, so the
  // limiter counts it.
  await store.insert('clientauthattempts', { handle: normalized, at: now, ok: !!match })

  if (!match) {
    return { ok: false, status: 401, error: { code: 'INVALID_CODE', message: 'That code is wrong or expired.' } }
  }

  // A `permanent` code is NOT consumed. This exists for exactly one reason:
  // App Store review. The app is gated behind operator-issued codes that expire
  // in 10 minutes and are read out by a human, so a reviewer has no way in, and
  // guideline 2.1 rejects login-gated apps without a working demo account.
  //
  // The flag is deliberately narrow — it only skips the consume step. The
  // attempt limiter, the timing-safe compare, the expiry check and the
  // client-scoping all still apply, so a permanent code is a reusable password
  // for ONE seeded demo client, not a bypass. Only seed-demo-client.mjs sets
  // it, and it must never be set on a real client.
  if (!match.permanent) {
    await store.update('clientauthcodes', match.id, { consumedAt: now })
  }
  pendingCodesMemory.delete(normalized)

  const client = await store.get('clients', match.clientId)
  if (!client) {
    return { ok: false, status: 401, error: { code: 'INVALID_CODE', message: 'That code is wrong or expired.' } }
  }

  const rawToken = crypto.randomBytes(32).toString('base64url')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
  await store.insert('clienttokens', { tokenHash, clientId: client.id, createdAt: now, expiresAt, revokedAt: null })

  return { ok: true, token: rawToken, client: clientSafe(client) }
}

/**
 * Resolve a bearer token to a clientId, or null if missing/unknown/expired/
 * revoked. This is the ONLY place a client route may learn its clientId —
 * never from a query param or body field.
 */
export async function authenticate(rawToken, { store = realStore } = {}) {
  if (!rawToken) return null
  const tokenHash = hashToken(rawToken)
  const records = await store.list('clienttokens', (t) => t.tokenHash === tokenHash)
  const record = records[0]
  if (!record) return null
  if (record.revokedAt) return null
  if (record.expiresAt <= nowIso()) return null
  return record.clientId
}

/** Revoke a bearer token (logout). Returns true if a live token was found and revoked. */
export async function revoke(rawToken, { store = realStore } = {}) {
  if (!rawToken) return false
  const tokenHash = hashToken(rawToken)
  const records = await store.list('clienttokens', (t) => t.tokenHash === tokenHash)
  const record = records[0]
  if (!record || record.revokedAt) return false
  await store.update('clienttokens', record.id, { revokedAt: nowIso() })
  return true
}
