// clients-backend/functions/firestore-store.mjs — a drop-in replacement for
// engine/lib/store.mjs backed by Firestore instead of engine/data/*.json.
//
// WHY THIS SHAPE: clientauth.mjs and clientapi.mjs already take an optional
// trailing `{ store }`, which exists so their selftests can run against an
// in-memory store. That same seam is what lets the hosted backend reuse those
// two files VERBATIM — the privacy rule, the field-picking, the cross-tenant
// 404, the timing-safe code compare and the attempt limiter are all literally
// the same code running here as on the operator's laptop. Nothing was ported by
// hand, so nothing can drift apart later. Do not reimplement that logic here.
//
// The interface below must stay signature-compatible with store.mjs:
//   list(name, match?)  get(name, id)  insert(name, fields)  update(name, id, patch)
//
// `match` may be a plain field-match object (pushed down into a Firestore
// query) or a predicate function (cannot be introspected, so the collection is
// read and filtered in memory). The predicate paths are only used for the auth
// collections, which are small and short-lived by construction.

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import crypto from 'node:crypto'

const db = () => getFirestore()

// Same allow-list as store.mjs. An unknown name is a programming error, not a
// new collection — fail loudly rather than silently creating one.
const COLLECTIONS = new Set([
  'clients', 'products', 'posts', 'approvals', 'creatives',
  'campaigns', 'conversations', 'invoices', 'settings',
  'clientauthcodes', 'clientauthattempts', 'clienttokens', 'clientrequests',
])

function col(name) {
  if (!COLLECTIONS.has(name)) {
    throw Object.assign(new Error(`unknown collection: ${name}`), { code: 'BAD_COLLECTION' })
  }
  return db().collection(name)
}

const withId = (doc) => ({ id: doc.id, ...doc.data() })

/**
 * All items in a collection, optionally filtered. An object `match` becomes a
 * Firestore equality query; a function `match` forces a full read + in-memory
 * filter (see the note at the top of this file).
 */
export async function list(name, match) {
  if (match && typeof match === 'object') {
    let q = col(name)
    for (const [k, v] of Object.entries(match)) {
      if (v !== undefined) q = q.where(k, '==', v)
    }
    const snap = await q.get()
    return snap.docs.map(withId)
  }

  const snap = await col(name).get()
  const items = snap.docs.map(withId)
  if (typeof match === 'function') return items.filter(match)
  return items
}

export async function get(name, id) {
  if (!id) return null
  const doc = await col(name).doc(String(id)).get()
  return doc.exists ? withId(doc) : null
}

/** Insert a new item. Mints an id unless one is supplied. Returns the stored record. */
export async function insert(name, fields) {
  const id = fields?.id || crypto.randomUUID()
  const record = { ...fields, id }
  // Strip `id` from the stored body — it lives in the document key, and
  // withId() puts it back. Keeping both would let them disagree.
  const { id: _omit, ...body } = record
  await col(name).doc(id).set(body)
  return record
}

/** Merge `patch` into the item with `id`. Returns the updated record, or null if absent. */
export async function update(name, id, patch) {
  const ref = col(name).doc(String(id))
  const doc = await ref.get()
  if (!doc.exists) return null
  // A patch value of `null` is meaningful in this codebase (clientapi clears
  // rejectionNote with null), so null must be written, not treated as a delete.
  const { id: _omit, ...body } = patch || {}
  await ref.set(body, { merge: true })
  const after = await ref.get()
  return withId(after)
}

export async function remove(name, id) {
  const ref = col(name).doc(String(id))
  const doc = await ref.get()
  if (!doc.exists) return false
  await ref.delete()
  return true
}

export async function getSettings() {
  const snap = await col('settings').limit(1).get()
  return snap.empty ? null : withId(snap.docs[0])
}

export { COLLECTIONS, FieldValue }
