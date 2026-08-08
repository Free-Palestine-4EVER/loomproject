// clients-backend/functions/blip.mjs — the hosted blip.net API.
//
// blip is a SEPARATE product from LOOM's client portal, sharing only the
// Firebase project. It is a peer-to-peer WebRTC file-transfer app: the file
// bytes never touch this backend. This API only handles accounts, devices,
// and a server-enforced free-tier quota (10 files/day), plus a payment seam
// for a future paid tier.
//
// Auth is real Firebase Auth (Email/Password, self-serve), verified with
// `getAuth().verifyIdToken()` — NOT the portal's custom Bearer/handle scheme
// in engine/lib/clientauth.mjs. Do not conflate the two: blip users are not
// LOOM clients, and this file does not touch any `clients`/`posts`/etc.
// collection.
//
// Route surface (paths below are relative to this function's own base URL,
// https://europe-west1-loom-clients.cloudfunctions.net/blip):
//   GET    /health                    -> { ok: true }, no auth
//   POST   /register                  (Bearer ID token) -> creates/returns blipusers/{uid}
//   GET    /me                        (Bearer ID token) -> profile + today's quota
//   POST   /devices                   (Bearer ID token) { name, platform }
//   GET    /devices                   (Bearer ID token) -> list, most-recent first
//   DELETE /devices/:id               (Bearer ID token) -> 404 if not the caller's
//   POST   /quota/consume             (Bearer ID token) { fileCount } -> atomic quota spend
//   POST   /subscription/checkout     (Bearer ID token) -> 501 stub, no payment processor wired
//
// Firestore writes here always go through the Admin SDK, which bypasses
// firestore.rules by design — that is what keeps `plan` and the quota
// counters un-forgeable by a client (see firestore.rules for the read-only
// rules that pair with this).

import { onRequest } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const FREE_DAILY_LIMIT = 10
const MAX_DEVICES = 20

// ---------------------------------------------------------------------------
// http plumbing — same shape as functions/index.mjs's `api` export
// ---------------------------------------------------------------------------

function send(res, status, body) {
  res.status(status)
  res.set('Content-Type', 'application/json; charset=utf-8')
  res.set('Cache-Control', 'no-store')
  res.send(JSON.stringify(body))
}

const fail = (res, status, code, message, extra) =>
  send(res, status, { error: { code, message, ...(extra || {}) } })

function bearer(req) {
  const raw = req.get('authorization') || ''
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim())
  return m ? m[1].trim() : null
}

/** Verify the caller's Firebase Auth ID token. Returns the decoded token or null. */
async function callerFromIdToken(req) {
  const token = bearer(req)
  if (!token) return null
  try {
    return await getAuth().verifyIdToken(token)
  } catch (err) {
    console.warn('[blip] verifyIdToken failed', err?.message || err)
    return null
  }
}

// ---------------------------------------------------------------------------
// plan helpers — the payment seam
// ---------------------------------------------------------------------------
// A user is "paid/active" if plan !== 'free' AND subscriptionStatus is one of
// the active states. There is no real billing integration yet — see
// /subscription/checkout below — so in practice every account is 'free' /
// 'none' until a human wires a processor and starts writing these fields via
// the Admin SDK (never from client input).

function isPaidActive(profile) {
  if (!profile) return false
  const activeStatuses = new Set(['active', 'trialing'])
  return profile.plan && profile.plan !== 'free' && activeStatuses.has(profile.subscriptionStatus)
}

function todayDateKeyUTC() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD, UTC
}

function tomorrowMidnightUTC() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0))
  return next.toISOString()
}

// ---------------------------------------------------------------------------
// the router
// ---------------------------------------------------------------------------

export const blip = onRequest(
  { region: 'europe-west1', cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      const path = (req.path || '/').replace(/\/+$/, '') || '/'
      const method = req.method.toUpperCase()
      const db = getFirestore()

      if (method === 'OPTIONS') return res.status(204).send('')
      if (path === '/health' && method === 'GET') return send(res, 200, { ok: true })

      // --- everything below requires a Firebase Auth ID token ------------
      const decoded = await callerFromIdToken(req)
      if (!decoded) return fail(res, 401, 'UNAUTHENTICATED', 'Sign in again.')
      const uid = decoded.uid

      if (path === '/register' && method === 'POST') {
        const ref = db.collection('blipusers').doc(uid)
        const existing = await ref.get()
        if (!existing.exists) {
          await ref.set({
            uid,
            email: decoded.email || null,
            displayName: (req.body && typeof req.body.displayName === 'string' && req.body.displayName.trim()) || null,
            plan: 'free',
            subscriptionStatus: 'none',
            createdAt: FieldValue.serverTimestamp(),
          })
        }
        const snap = await ref.get()
        return send(res, 200, { profile: snap.data() })
      }

      if (path === '/me' && method === 'GET') {
        const ref = db.collection('blipusers').doc(uid)
        const snap = await ref.get()
        if (!snap.exists) return fail(res, 404, 'NOT_REGISTERED', 'Call /register first.')
        const profile = snap.data()

        const dateKey = todayDateKeyUTC()
        const quotaSnap = await db.collection('blipquota').doc(`${uid}_${dateKey}`).get()
        const used = quotaSnap.exists ? quotaSnap.data().used || 0 : 0
        const paid = isPaidActive(profile)

        const quota = paid
          ? { limit: null, used, remaining: null, resetsAt: tomorrowMidnightUTC() }
          : {
              limit: FREE_DAILY_LIMIT,
              used,
              remaining: Math.max(0, FREE_DAILY_LIMIT - used),
              resetsAt: tomorrowMidnightUTC(),
            }

        return send(res, 200, { profile, quota })
      }

      if (path === '/devices' && method === 'POST') {
        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
        const platform = typeof req.body?.platform === 'string' ? req.body.platform.trim() : ''
        if (!name) return fail(res, 400, 'BAD_REQUEST', 'name is required')

        const existingCountSnap = await db.collection('blipdevices').where('uid', '==', uid).count().get()
        if (existingCountSnap.data().count >= MAX_DEVICES) {
          return fail(res, 400, 'TOO_MANY_DEVICES', `Accounts are capped at ${MAX_DEVICES} devices.`)
        }

        const now = FieldValue.serverTimestamp()
        const ref = await db.collection('blipdevices').add({
          uid,
          name,
          platform: platform || null,
          createdAt: now,
          lastSeenAt: now,
        })
        const snap = await ref.get()
        return send(res, 200, { device: { id: snap.id, ...snap.data() } })
      }

      if (path === '/devices' && method === 'GET') {
        const listSnap = await db
          .collection('blipdevices')
          .where('uid', '==', uid)
          .orderBy('createdAt', 'desc')
          .get()
        const devices = listSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        return send(res, 200, { devices })
      }

      const deviceDeleteMatch = /^\/devices\/([^/]+)$/.exec(path)
      if (deviceDeleteMatch && method === 'DELETE') {
        const deviceId = decodeURIComponent(deviceDeleteMatch[1])
        const ref = db.collection('blipdevices').doc(deviceId)
        const snap = await ref.get()
        // Cross-tenant 404: a device that exists but belongs to someone else
        // reports identically to one that does not exist at all, so this
        // endpoint can never be used to probe for other accounts' device ids.
        if (!snap.exists || snap.data().uid !== uid) {
          return fail(res, 404, 'NOT_FOUND', 'no such device')
        }
        await ref.delete()
        return send(res, 200, { ok: true })
      }

      if (path === '/quota/consume' && method === 'POST') {
        const fileCount = Number(req.body?.fileCount)
        if (!Number.isInteger(fileCount) || fileCount < 1 || fileCount > 1000) {
          return fail(res, 400, 'BAD_REQUEST', 'fileCount must be an integer between 1 and 1000')
        }

        const profileSnap = await db.collection('blipusers').doc(uid).get()
        if (!profileSnap.exists) return fail(res, 404, 'NOT_REGISTERED', 'Call /register first.')
        const profile = profileSnap.data()

        if (isPaidActive(profile)) {
          // Unlimited: no cap, just log usage.
          await db.collection('bliptransfers').add({
            uid,
            fileCount,
            at: FieldValue.serverTimestamp(),
            allowed: true,
          })
          return send(res, 200, { allowed: true, used: null, remaining: null })
        }

        const dateKey = todayDateKeyUTC()
        const quotaRef = db.collection('blipquota').doc(`${uid}_${dateKey}`)

        let result
        try {
          result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(quotaRef)
            const used = snap.exists ? snap.data().used || 0 : 0
            const nextUsed = used + fileCount

            if (nextUsed > FREE_DAILY_LIMIT) {
              const remaining = Math.max(0, FREE_DAILY_LIMIT - used)
              return { rejected: true, remaining }
            }

            if (snap.exists) {
              tx.update(quotaRef, { used: nextUsed })
            } else {
              tx.set(quotaRef, { uid, dateKey, used: nextUsed, limit: FREE_DAILY_LIMIT })
            }
            return { rejected: false, used: nextUsed }
          })
        } catch (err) {
          console.error('[blip] quota transaction failed', err)
          return fail(res, 500, 'INTERNAL', 'Something went wrong.')
        }

        if (result.rejected) {
          return fail(
            res,
            429,
            'DAILY_LIMIT',
            'Free plan is 10 files a day. Resets at 00:00 UTC.',
            { remaining: result.remaining },
          )
        }

        await db.collection('bliptransfers').add({
          uid,
          fileCount,
          at: FieldValue.serverTimestamp(),
          allowed: true,
        })

        return send(res, 200, {
          allowed: true,
          used: result.used,
          remaining: Math.max(0, FREE_DAILY_LIMIT - result.used),
        })
      }

      if (path === '/subscription/checkout' && method === 'POST') {
        return fail(
          res,
          501,
          'NOT_CONNECTED',
          'Payment processing is not connected yet. This endpoint is a placeholder for a future Stripe (or similar) integration — no card data is collected or handled by this API.',
        )
      }

      return fail(res, 404, 'NOT_FOUND', 'no such route')
    } catch (err) {
      console.error('[blip] unhandled', err)
      return fail(res, 500, 'INTERNAL', 'Something went wrong.')
    }
  },
)
