// clients-backend/functions/forge.mjs — the LOOM FORGE API (2D photo -> 3D model).
//
// FORGE is a THIRD, independent product sharing this Firebase project with the
// LOOM client portal (index.mjs) and blip (blip.mjs). It owns its own
// collections — forgeusers / forgejobs / forgeorders / forgeips — and touches
// none of theirs. It is modelled directly on blip.mjs: real Firebase Auth
// (Email/Password, self-serve) verified with `getAuth().verifyIdToken()`, every
// write through the Admin SDK, and a server-enforced entitlement the browser
// cannot forge.
//
// THE PRODUCT RULE, which is the whole reason this file exists:
//   Every account gets exactly ONE free model, ever. After that each model
//   costs 2 JOD, paid out of band, and credited to the account by an operator.
// `freeUsed` and `credits` therefore live ONLY here, are written ONLY by the
// Admin SDK, and are consumed inside a Firestore TRANSACTION — two tabs hitting
// "generate" at the same moment must not both spend the same single free try.
//
// The Meshy API key never reaches a browser. The client uploads its image to
// this function, the function calls Meshy, and the client polls THIS function
// for status. That indirection is not decoration: the key is a spending
// credential on a shared balance, so a client-side call would let any visitor
// drain it.
//
// Route surface (relative to https://europe-west1-loom-clients.cloudfunctions.net/forge):
//   GET    /health                 -> { ok: true }, no auth
//   POST   /register               (Bearer ID token) -> creates/returns forgeusers/{uid}
//   GET    /me                     (Bearer ID token) -> profile + entitlement
//   POST   /jobs                   (Bearer ID token) { image, name? } -> spends entitlement, starts Meshy
//   GET    /jobs                   (Bearer ID token) -> the caller's jobs, newest first
//   GET    /jobs/:id               (Bearer ID token) -> live status, proxied from Meshy
//   POST   /orders                 (Bearer ID token) { quantity } -> a payment reference to quote
//   POST   /admin/grant            (x-forge-admin-key) { email|uid, credits } -> operator top-up

import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { createHash, randomBytes } from 'node:crypto'

const MESHY_API_KEY = defineSecret('MESHY_API_KEY')
const FORGE_ADMIN_KEY = defineSecret('FORGE_ADMIN_KEY')

const MESHY_BASE = 'https://api.meshy.ai/openapi/v1/image-to-3d'

/** Price of one model, in Jordanian dinars. Quoted to the client in /me so the
 *  page never hardcodes a number the server disagrees with. */
const PRICE_JOD = 2

/** Bytes of base64 image payload we accept. A phone photo downscaled to 1024px
 *  by the client lands around 300-900KB; 8MB is generous and still well inside
 *  the function's request limit. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

/** Free tries allowed per IP per day. The per-ACCOUNT limit is 1-ever and is
 *  the real rule; this only blunts the obvious attack of registering throwaway
 *  addresses in a loop. It is deliberately loose — a household or an office
 *  behind one NAT should not lock each other out. */
const FREE_TRIES_PER_IP_PER_DAY = 3

// ---------------------------------------------------------------------------
// http plumbing — same shape as blip.mjs / index.mjs
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

async function callerFromIdToken(req) {
  const token = bearer(req)
  if (!token) return null
  try {
    return await getAuth().verifyIdToken(token)
  } catch (err) {
    console.warn('[forge] verifyIdToken failed', err?.message || err)
    return null
  }
}

/** Hash of the caller's IP. Stored instead of the address itself so the abuse
 *  counter never becomes a log of who visited. */
function ipKey(req) {
  const raw = (req.get('x-forwarded-for') || '').split(',')[0].trim() || req.ip || 'unknown'
  return createHash('sha256').update(`forge:${raw}`).digest('hex').slice(0, 32)
}

const todayKeyUTC = () => new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// entitlement
// ---------------------------------------------------------------------------

/** What the client is allowed to do right now, derived from the profile. The
 *  page renders from this — it never decides for itself whether a try is free. */
function entitlement(profile) {
  const credits = Number(profile?.credits) || 0
  const freeUsed = profile?.freeUsed === true
  return {
    freeUsed,
    credits,
    canGenerate: !freeUsed || credits > 0,
    nextIsFree: !freeUsed,
    priceJod: PRICE_JOD,
  }
}

function publicProfile(profile) {
  if (!profile) return null
  return {
    uid: profile.uid,
    email: profile.email || null,
    displayName: profile.displayName || null,
    modelsMade: Number(profile.modelsMade) || 0,
    ...entitlement(profile),
  }
}

// ---------------------------------------------------------------------------
// Meshy
// ---------------------------------------------------------------------------

async function meshy(path, init = {}) {
  const res = await fetch(`${MESHY_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${MESHY_API_KEY.value()}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  if (!res.ok) {
    const err = new Error(`meshy ${res.status}: ${text.slice(0, 300)}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}

/** The client-safe projection of a Meshy task. Explicit field-picking, for the
 *  same reason the portal does it: the raw task carries `consumed_credits` and
 *  other operational data that is LOOM's cost, not the customer's business. */
function publicJob(doc, task) {
  const status = task?.status || doc?.status || 'PENDING'
  const done = status === 'SUCCEEDED'
  return {
    id: doc.id,
    name: doc.name || null,
    status,
    progress: Number(task?.progress ?? doc?.progress ?? 0),
    createdAt: doc.createdAtMs || null,
    source: doc.source || null,
    error: task?.task_error?.message || doc?.error || null,
    thumbnailUrl: done ? task?.thumbnail_url || null : null,
    modelUrls: done
      ? {
          glb: task?.model_urls?.glb || null,
          fbx: task?.model_urls?.fbx || null,
          obj: task?.model_urls?.obj || null,
          usdz: task?.model_urls?.usdz || null,
        }
      : null,
  }
}

// ---------------------------------------------------------------------------
// the router
// ---------------------------------------------------------------------------

export const forge = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: [MESHY_API_KEY, FORGE_ADMIN_KEY],
  },
  async (req, res) => {
    try {
      const path = (req.path || '/').replace(/\/+$/, '') || '/'
      const method = req.method.toUpperCase()
      const db = getFirestore()

      if (method === 'OPTIONS') return res.status(204).send('')
      if (path === '/health' && method === 'GET') return send(res, 200, { ok: true, priceJod: PRICE_JOD })

      // --- operator top-up ------------------------------------------------
      // Guarded by a shared secret in a header, NOT by an ID token: the person
      // running it is an operator on a laptop, not a signed-in FORGE customer.
      if (path === '/admin/grant' && method === 'POST') {
        const key = req.get('x-forge-admin-key') || ''
        const expected = FORGE_ADMIN_KEY.value()
        if (!expected || key !== expected) return fail(res, 403, 'FORBIDDEN', 'Bad admin key.')

        const body = req.body || {}
        const credits = Math.floor(Number(body.credits))
        if (!Number.isFinite(credits) || credits === 0 || Math.abs(credits) > 500) {
          return fail(res, 400, 'BAD_CREDITS', 'credits must be a non-zero integer within +/-500.')
        }

        let uid = typeof body.uid === 'string' ? body.uid.trim() : ''
        if (!uid && typeof body.email === 'string' && body.email.trim()) {
          try {
            uid = (await getAuth().getUserByEmail(body.email.trim().toLowerCase())).uid
          } catch {
            return fail(res, 404, 'NO_SUCH_USER', 'No account with that email.')
          }
        }
        if (!uid) return fail(res, 400, 'NO_TARGET', 'Pass uid or email.')

        const ref = db.collection('forgeusers').doc(uid)
        await ref.set({ credits: FieldValue.increment(credits) }, { merge: true })
        const snap = await ref.get()
        return send(res, 200, { profile: publicProfile(snap.data()) })
      }

      // --- everything below requires a Firebase Auth ID token ---------------
      const decoded = await callerFromIdToken(req)
      if (!decoded) return fail(res, 401, 'UNAUTHENTICATED', 'Sign in again.')
      const uid = decoded.uid
      const userRef = db.collection('forgeusers').doc(uid)

      if (path === '/register' && method === 'POST') {
        const existing = await userRef.get()
        if (!existing.exists) {
          const displayName =
            (req.body && typeof req.body.displayName === 'string' && req.body.displayName.trim().slice(0, 80)) || null
          await userRef.set({
            uid,
            email: decoded.email || null,
            displayName,
            freeUsed: false,
            credits: 0,
            modelsMade: 0,
            createdAt: FieldValue.serverTimestamp(),
          })
        }
        const snap = await userRef.get()
        return send(res, 200, { profile: publicProfile(snap.data()) })
      }

      if (path === '/me' && method === 'GET') {
        const snap = await userRef.get()
        if (!snap.exists) return fail(res, 404, 'NOT_REGISTERED', 'Call /register first.')
        return send(res, 200, { profile: publicProfile(snap.data()) })
      }

      // --- start a model ----------------------------------------------------
      if (path === '/jobs' && method === 'POST') {
        const body = req.body || {}
        const image = typeof body.image === 'string' ? body.image.trim() : ''
        if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) {
          return fail(res, 400, 'BAD_IMAGE', 'Send a PNG, JPEG or WebP data URL.')
        }
        if (image.length > MAX_IMAGE_BYTES) {
          return fail(res, 413, 'IMAGE_TOO_BIG', 'That photo is too large — under 8MB please.')
        }
        const name = (typeof body.name === 'string' && body.name.trim().slice(0, 80)) || null

        // Spend the entitlement FIRST, inside a transaction. Two tabs pressing
        // generate together must not both consume the same single free try —
        // a read-then-write outside a transaction is exactly how that leaks.
        let source
        try {
          source = await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef)
            if (!snap.exists) throw Object.assign(new Error('not registered'), { code: 'NOT_REGISTERED' })
            const profile = snap.data()
            const credits = Number(profile.credits) || 0

            if (profile.freeUsed !== true) {
              // Free try — also count it against the IP for the day.
              const ipRef = db.collection('forgeips').doc(`${ipKey(req)}_${todayKeyUTC()}`)
              const ipSnap = await tx.get(ipRef)
              const used = ipSnap.exists ? Number(ipSnap.data().freeTries) || 0 : 0
              if (used >= FREE_TRIES_PER_IP_PER_DAY) {
                throw Object.assign(new Error('ip limit'), { code: 'IP_LIMIT' })
              }
              tx.set(ipRef, { freeTries: FieldValue.increment(1), day: todayKeyUTC() }, { merge: true })
              tx.update(userRef, { freeUsed: true })
              return 'free'
            }

            if (credits > 0) {
              tx.update(userRef, { credits: FieldValue.increment(-1) })
              return 'credit'
            }

            throw Object.assign(new Error('payment required'), { code: 'PAYMENT_REQUIRED' })
          })
        } catch (err) {
          if (err.code === 'NOT_REGISTERED') return fail(res, 404, 'NOT_REGISTERED', 'Call /register first.')
          if (err.code === 'IP_LIMIT') {
            return fail(res, 429, 'IP_LIMIT', 'Too many free trials from this connection today.')
          }
          if (err.code === 'PAYMENT_REQUIRED') {
            return fail(res, 402, 'PAYMENT_REQUIRED', `Your free model is used. Each further model is ${PRICE_JOD} JOD.`, {
              priceJod: PRICE_JOD,
            })
          }
          throw err
        }

        // Now call Meshy. If this fails the customer has already been charged,
        // so the refund below is not optional — put it back exactly as taken.
        let task
        try {
          task = await meshy('', {
            method: 'POST',
            body: JSON.stringify({
              image_url: image,
              ai_model: 'meshy-5',
              topology: 'triangle',
              target_polycount: 30000,
              should_texture: true,
              enable_pbr: false,
            }),
          })
        } catch (err) {
          console.error('[forge] meshy create failed', err?.message || err)
          if (source === 'free') await userRef.update({ freeUsed: false })
          else await userRef.update({ credits: FieldValue.increment(1) })
          return fail(res, 502, 'UPSTREAM', 'The 3D engine refused that image. Nothing was used — try another photo.')
        }

        const taskId = task?.result
        if (!taskId) {
          if (source === 'free') await userRef.update({ freeUsed: false })
          else await userRef.update({ credits: FieldValue.increment(1) })
          return fail(res, 502, 'UPSTREAM', 'The 3D engine did not start. Nothing was used.')
        }

        const jobDoc = {
          id: taskId,
          uid,
          name,
          source,
          status: 'PENDING',
          progress: 0,
          createdAtMs: Date.now(),
          createdAt: FieldValue.serverTimestamp(),
        }
        await db.collection('forgejobs').doc(taskId).set(jobDoc)
        await userRef.update({ modelsMade: FieldValue.increment(1) })

        const snap = await userRef.get()
        return send(res, 200, { job: publicJob(jobDoc, null), profile: publicProfile(snap.data()) })
      }

      if (path === '/jobs' && method === 'GET') {
        const q = await db
          .collection('forgejobs')
          .where('uid', '==', uid)
          .orderBy('createdAtMs', 'desc')
          .limit(30)
          .get()
        return send(res, 200, { jobs: q.docs.map((d) => publicJob(d.data(), null)) })
      }

      // --- poll one model ---------------------------------------------------
      const one = /^\/jobs\/([A-Za-z0-9_-]{6,80})$/.exec(path)
      if (one && method === 'GET') {
        const jobRef = db.collection('forgejobs').doc(one[1])
        const jobSnap = await jobRef.get()
        // A job belonging to somebody else is a 404, not a 403 — the same rule
        // the portal uses. "Exists but not yours" is itself information.
        if (!jobSnap.exists || jobSnap.data().uid !== uid) {
          return fail(res, 404, 'NOT_FOUND', 'No such model.')
        }
        const doc = jobSnap.data()

        let task = null
        try {
          task = await meshy(`/${one[1]}`, { method: 'GET' })
        } catch (err) {
          console.warn('[forge] meshy poll failed', err?.message || err)
          return send(res, 200, { job: publicJob(doc, null) })
        }

        const patch = { status: task.status, progress: Number(task.progress) || 0 }
        if (task.status === 'SUCCEEDED') {
          patch.thumbnailUrl = task.thumbnail_url || null
          patch.finishedAtMs = Date.now()
        }
        if (task.status === 'FAILED') {
          patch.error = task?.task_error?.message || 'generation failed'
          patch.finishedAtMs = Date.now()
          // A failed generation must not cost the customer anything.
          if (doc.refunded !== true) {
            patch.refunded = true
            if (doc.source === 'free') await db.collection('forgeusers').doc(uid).update({ freeUsed: false })
            else await db.collection('forgeusers').doc(uid).update({ credits: FieldValue.increment(1) })
          }
        }
        if (doc.status !== patch.status || doc.progress !== patch.progress) await jobRef.update(patch)

        return send(res, 200, { job: publicJob({ ...doc, ...patch }, task) })
      }

      // --- record an intent to pay -----------------------------------------
      // There is no payment processor wired yet. This mints a short reference
      // the customer quotes when they pay out of band; an operator then runs
      // /admin/grant. When a processor is added, it replaces the body of this
      // route and nothing else on the page has to move.
      if (path === '/orders' && method === 'POST') {
        const quantity = Math.min(50, Math.max(1, Math.floor(Number(req.body?.quantity) || 1)))
        const ref = `FRG-${randomBytes(3).toString('hex').toUpperCase()}`
        await db.collection('forgeorders').doc(ref).set({
          ref,
          uid,
          email: decoded.email || null,
          quantity,
          amountJod: quantity * PRICE_JOD,
          status: 'awaiting_payment',
          createdAt: FieldValue.serverTimestamp(),
        })
        return send(res, 200, { order: { ref, quantity, amountJod: quantity * PRICE_JOD, priceJod: PRICE_JOD } })
      }

      return fail(res, 404, 'NO_ROUTE', `No route for ${method} ${path}`)
    } catch (err) {
      console.error('[forge] unhandled', err?.stack || err)
      return fail(res, 500, 'INTERNAL', 'Something broke on our side.')
    }
  },
)
