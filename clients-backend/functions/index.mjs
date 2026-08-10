// clients-backend/functions/index.mjs — the hosted LOOM client API.
//
// This is a TRANSPORT port of engine/server.mjs's /api/client/* routes, not a
// rewrite. Every route below delegates to the SAME clientauth.mjs and
// clientapi.mjs modules the operator engine uses, injected with a Firestore
// store instead of the JSON-file one. The privacy rule, the field-picking, the
// cross-tenant 404, the timing-safe compare and the attempt limiter are
// therefore the same code, not a second copy of it.
//
// Route surface (identical paths and shapes to the local engine, so the iOS
// app changes exactly one constant — its base URL):
//   POST   /api/client/auth/request        { handle } -> always { ok, delivery }
//   POST   /api/client/auth/verify         { handle, code } -> { token, client }
//   POST   /api/client/auth/logout         (Bearer)
//   GET    /api/client/me                  (Bearer)
//   GET    /api/client/months              (Bearer)
//   GET    /api/client/months/:month/posts (Bearer)
//   POST   /api/client/posts/:id/decide    (Bearer) { verdict, note }
//   GET    /api/client/performance?month=  (Bearer)
//   GET    /api/client/invoices            (Bearer)
//   GET|POST /api/client/requests          (Bearer)

import { onRequest } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import * as store from './firestore-store.mjs'
import * as clientauth from './engine/clientauth.mjs'
import * as clientapi from './engine/clientapi.mjs'
import { DEFAULT_PRICING } from './engine/pricing.mjs'

initializeApp()

// blip.net — a second, independent product sharing this Firebase project.
// Own Firestore collections (blipusers/blipdevices/bliptransfers/blipquota),
// own Cloud Function export, own Firebase-Auth-ID-token scheme. See
// functions/blip.mjs for the full route surface; nothing below this line
// touches it or is touched by it.
export { blip } from './blip.mjs'

// LOOM FORGE — a third independent product on this project: the 2D-photo-to-3D
// model tool on loomstudio-jo.com/3d. Own Firestore collections
// (forgeusers/forgejobs/forgeorders/forgeips), own Cloud Function export, own
// Firebase-Auth-ID-token scheme, and the only holder of the Meshy API key. See
// functions/forge.mjs; nothing above or below this line touches it.
export { forge } from './forge.mjs'

const DI = { store }

// ---------------------------------------------------------------------------
// pricing
// ---------------------------------------------------------------------------
// clientapi.performance() calls resolvePricing() itself when no `pricing` is
// injected — and that would read the LOCAL settings.json, which does not exist
// in a function. So pricing is always resolved here, from Firestore, and passed
// in explicitly. Same override semantics as engine/lib/pricing.mjs: only known
// keys with finite numeric values win.

async function resolvePricingFromFirestore() {
  const settings = await store.getSettings()
  const overrides = settings?.pricing || {}
  const resolved = { ...DEFAULT_PRICING }
  for (const key of Object.keys(DEFAULT_PRICING)) {
    const v = overrides[key]
    if (typeof v === 'number' && Number.isFinite(v)) resolved[key] = v
  }
  return resolved
}

// ---------------------------------------------------------------------------
// http plumbing
// ---------------------------------------------------------------------------

function send(res, status, body) {
  res.status(status)
  res.set('Content-Type', 'application/json; charset=utf-8')
  // No caching anywhere on this API — every payload is client-scoped, and an
  // intermediary caching one client's months under a shared URL is precisely
  // the cross-tenant leak the rest of this file is built to prevent.
  res.set('Cache-Control', 'no-store')
  res.send(JSON.stringify(body))
}

const fail = (res, status, code, message) => send(res, status, { error: { code, message } })

function bearer(req) {
  const raw = req.get('authorization') || ''
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim())
  return m ? m[1].trim() : null
}

/** Resolve the caller's clientId from the Bearer token, or null. */
async function callerId(req) {
  return clientauth.authenticate(bearer(req), DI)
}

// ---------------------------------------------------------------------------
// the router
// ---------------------------------------------------------------------------

export const api = onRequest(
  { region: 'europe-west1', cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      const path = (req.path || '/').replace(/\/+$/, '') || '/'
      const method = req.method.toUpperCase()

      if (method === 'OPTIONS') return res.status(204).send('')
      if (path === '/health') return send(res, 200, { ok: true })

      // --- unauthenticated: the two auth entry points --------------------
      if (path === '/api/client/auth/request' && method === 'POST') {
        const result = await clientauth.requestCode(req.body?.handle, DI)
        await recordOperatorCode(req.body?.handle)
        return send(res, 200, result)
      }

      if (path === '/api/client/auth/verify' && method === 'POST') {
        const result = await clientauth.verifyCode(req.body?.handle, req.body?.code, DI)
        if (!result.ok) return send(res, result.status, { error: result.error })
        await clearOperatorCode(req.body?.handle)
        return send(res, 200, { token: result.token, client: result.client })
      }

      // --- everything below requires a live Bearer token -----------------
      const clientId = await callerId(req)
      if (!clientId) return fail(res, 401, 'UNAUTHENTICATED', 'Sign in again.')

      if (path === '/api/client/auth/logout' && method === 'POST') {
        await clientauth.revoke(bearer(req), DI)
        return send(res, 200, { ok: true })
      }

      if (path === '/api/client/me' && method === 'GET') {
        const client = await store.get('clients', clientId)
        if (!client) return fail(res, 401, 'UNAUTHENTICATED', 'Sign in again.')
        return send(res, 200, { client: clientauth.clientSafe(client) })
      }

      if (path === '/api/client/months' && method === 'GET') {
        return send(res, 200, { months: await clientapi.listMonths(clientId, DI) })
      }

      const postsMatch = /^\/api\/client\/months\/([^/]+)\/posts$/.exec(path)
      if (postsMatch && method === 'GET') {
        const month = decodeURIComponent(postsMatch[1])
        return send(res, 200, { posts: await clientapi.listPosts(clientId, month, DI) })
      }

      const decideMatch = /^\/api\/client\/posts\/([^/]+)\/decide$/.exec(path)
      if (decideMatch && method === 'POST') {
        const postId = decodeURIComponent(decideMatch[1])
        const result = await clientapi.decidePost(clientId, postId, req.body?.verdict, req.body?.note, DI)
        if (!result.ok) return send(res, result.status, { error: result.error })
        return send(res, 200, { post: result.post })
      }

      if (path === '/api/client/performance' && method === 'GET') {
        const month = String(req.query?.month || '').slice(0, 7)
        if (!/^\d{4}-\d{2}$/.test(month)) {
          return fail(res, 400, 'BAD_MONTH', 'month must be YYYY-MM')
        }
        const pricing = await resolvePricingFromFirestore()
        return send(res, 200, await clientapi.performance(clientId, month, { store, pricing }))
      }

      if (path === '/api/client/invoices' && method === 'GET') {
        return send(res, 200, { invoices: await clientapi.listInvoices(clientId, DI) })
      }

      if (path === '/api/client/requests') {
        if (method === 'GET') {
          return send(res, 200, { requests: await clientapi.listRequests(clientId, DI) })
        }
        if (method === 'POST') {
          const result = await clientapi.createRequest(clientId, req.body?.text, DI)
          if (!result.ok) return send(res, result.status, { error: result.error })
          return send(res, 200, { request: result.request })
        }
      }

      return fail(res, 404, 'NOT_FOUND', 'no such route')
    } catch (err) {
      // Never let an exception body reach a client — it can carry record
      // shapes, field names, or stack paths that the privacy rule excludes.
      console.error('[client-api] unhandled', err)
      return fail(res, 500, 'INTERNAL', 'Something went wrong.')
    }
  },
)

// ---------------------------------------------------------------------------
// operator code readout — the one thing hosting genuinely changes
// ---------------------------------------------------------------------------
// There is no SMS provider: the DELIVERY MECHANISM IS THE OPERATOR, who reads
// the six digits out to the client. On the laptop that worked because
// clientauth.requestCode() logs the plaintext and parks it in an in-process
// Map that the operator UI reads.
//
// Neither survives hosting. Function instances are ephemeral, so the Map is
// gone by the time the operator looks, and there is no console to tail.
//
// So the plaintext is written to `operatorcodes`, a collection that
// firestore.rules denies to EVERY client-SDK caller (only the Admin SDK inside
// these functions can touch it), and it is deleted the moment the code is
// consumed.
//
// BE HONEST ABOUT WHAT THIS COSTS: clientauth.mjs's header states that only
// HASHES ever touch disk. Hosted, that is no longer strictly true — this is a
// deliberate, documented exception, not an oversight, and it is the reason the
// engine's own data files still hold hashes only. It is not a NEW exposure
// (the plaintext already went to a persisted console log, which Cloud Logging
// would retain anyway) but it IS a change to a stated invariant, and the user
// should decide whether to keep it or move to a real SMS provider.
//
// Mitigations in place: locked to the Admin SDK, deleted on consume, and
// carries `expiresAt` for a Firestore TTL policy (see README — the TTL policy
// must be enabled once in the console; it is not expressible in rules).

import { getFirestore } from 'firebase-admin/firestore'

const CODE_READOUT_TTL_MS = 10 * 60 * 1000 // matches clientauth.CODE_TTL_MS

function normalizeHandle(raw) {
  if (typeof raw !== 'string') return ''
  let h = raw.trim().toLowerCase()
  if (h.startsWith('@')) h = h.slice(1)
  return h
}

/**
 * Mirror the just-issued plaintext code for the operator. Deliberately silent
 * for an unknown handle: requestCode() returns an identical response either
 * way, and writing a document only for real clients would reintroduce exactly
 * the enumeration oracle that clientauth.mjs works to avoid — anyone who could
 * observe the collection could diff it to learn LOOM's client list.
 */
async function recordOperatorCode(handle) {
  const normalized = normalizeHandle(handle)
  if (!normalized) return
  const pending = clientauth.listPendingCodesForOperator().find((e) => e.handle === normalized)
  if (!pending) return // unknown handle — nothing was issued, write nothing
  await getFirestore().collection('operatorcodes').doc(normalized).set({
    handle: normalized,
    code: pending.code,
    clientId: pending.clientId,
    clientName: pending.clientName,
    createdAt: pending.createdAt,
    expiresAt: new Date(Date.now() + CODE_READOUT_TTL_MS),
  })
}

async function clearOperatorCode(handle) {
  const normalized = normalizeHandle(handle)
  if (!normalized) return
  await getFirestore().collection('operatorcodes').doc(normalized).delete().catch(() => {})
}
