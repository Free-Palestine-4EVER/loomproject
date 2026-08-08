// GENERATED COPY — do not edit. Source: engine/lib/clientapi.mjs
// Regenerate with clients-backend/sync-engine-libs.sh
// engine/lib/clientapi.mjs — the client-scoped read/write API. Every function
// here takes `clientId` as its FIRST argument and that value must always come
// from clientauth.authenticate(token) at the server.mjs call site, never from
// a query parameter or body field — that is the whole cross-tenant safety
// model (see ios/CONTRACT.md's privacy rule).
//
// THE PRIVACY RULE: every payload returned to a client is built by explicitly
// picking allowed fields off the store record — never by spreading a record
// and deleting keys. The helper functions below (clientSafePost, etc.) are
// the single place that happens, so a field added to posts.json/invoices.json
// tomorrow does NOT leak into a client response by default — someone has to
// deliberately add it here.
//
// Same DI seam as ads.mjs/invoices.mjs: `{ store, pricing }` optional
// trailing params let fixtures/clientapi-selftest.mjs run against an
// isolated in-memory store/pricing instead of the real files on disk.

import * as realStore from './store.mjs'
import { resolvePricing } from './pricing.mjs'
import { round2 } from './ads.mjs'

// ---------------------------------------------------------------------------
// the privacy-list recursive scanner — reusable by the selftest
// ---------------------------------------------------------------------------

// Every key name the privacy rule in CONTRACT.md forbids from ever appearing
// in a client-facing payload, plus a couple of extra internal-shape guards
// (creativeId/campaignId tie back to the creative library; clientId should
// never round-trip since it's implicit from the token).
export const PRIVACY_FORBIDDEN_KEYS = [
  'qaSeconds', 'regenerations',
  'generationCostJod', 'platformCostJod', 'operatorCostPerMin', 'qaCostJod', 'qaMinutesTotal', 'qaMinutesPerClient',
  'margin', 'marginPct', 'gross', 'grossJod',
  'adSpendJod', 'costJod', 'spendJod', 'budgetJod',
  'cpc', 'cpcJod', 'cpcByCategory',
  'clientsHeadroom', 'breakEvenClients',
  'creativeId', 'creatives', 'campaignId', 'campaigns',
  'clientId',
]

/**
 * Walk any JSON-shaped value recursively and return a list of `path.key`
 * strings for every occurrence of a forbidden key name (case-insensitive).
 * An empty array means the payload is clean.
 */
export function scanForbiddenKeys(value, forbidden = PRIVACY_FORBIDDEN_KEYS, path = '$') {
  const forbiddenSet = new Set(forbidden.map((k) => k.toLowerCase()))
  const hits = []
  function walk(v, p) {
    if (v === null || v === undefined) return
    if (Array.isArray(v)) { v.forEach((item, i) => walk(item, `${p}[${i}]`)); return }
    if (typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) {
        if (forbiddenSet.has(k.toLowerCase())) hits.push(`${p}.${k}`)
        walk(val, `${p}.${k}`)
      }
    }
  }
  walk(value, path)
  return hits
}

// ---------------------------------------------------------------------------
// explicit field-picking helpers
// ---------------------------------------------------------------------------

function postDecision(post) {
  if (post.status === 'rejected') return { verdict: 'no', note: post.rejectionNote || '' }
  if (['approved', 'scheduled', 'posted'].includes(post.status)) return { verdict: 'yes', note: '' }
  return null
}

function clientSafePost(post) {
  return {
    id: post.id,
    month: post.month,
    slot: post.slot,
    kind: post.kind,
    status: post.status,
    captionEn: post.captionEn,
    captionAr: post.captionAr,
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
    image: post.image ?? null,
    carousel: post.carousel ? { slides: Array.isArray(post.carousel.slides) ? post.carousel.slides : [] } : null,
    scheduledAt: post.scheduledAt ?? null,
    postedAt: post.postedAt ?? null,
    decision: postDecision(post),
  }
}

function clientSafeInvoice(inv) {
  return {
    id: inv.id,
    month: inv.month,
    lines: Array.isArray(inv.lines)
      ? inv.lines.map((l) => ({ label: l.label, qty: l.qty, unitJod: l.unitJod, totalJod: l.totalJod }))
      : [],
    totalJod: inv.totalJod,
    status: inv.status,
    issuedAt: inv.issuedAt,
  }
}

function clientSafeRequest(r) {
  return { id: r.id, text: r.text, at: r.at, from: r.from, status: r.status }
}

// ---------------------------------------------------------------------------
// GET /api/client/months
// ---------------------------------------------------------------------------

export async function listMonths(clientId, { store = realStore } = {}) {
  const posts = await store.list('posts', { clientId })
  const byMonth = new Map()
  for (const p of posts) {
    const bucket = byMonth.get(p.month) || { month: p.month, total: 0, pending: 0, approved: 0, rejected: 0 }
    bucket.total += 1
    if (p.status === 'rejected') bucket.rejected += 1
    else if (['approved', 'scheduled', 'posted'].includes(p.status)) bucket.approved += 1
    else bucket.pending += 1 // draft, qa, or anything else not yet decided
    byMonth.set(p.month, bucket)
  }
  return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month))
}

// ---------------------------------------------------------------------------
// GET /api/client/months/:month/posts
// ---------------------------------------------------------------------------

export async function listPosts(clientId, month, { store = realStore } = {}) {
  const posts = await store.list('posts', { clientId, month })
  return posts.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)).map(clientSafePost)
}

// ---------------------------------------------------------------------------
// POST /api/client/posts/:id/decide
// ---------------------------------------------------------------------------

export async function decidePost(clientId, postId, verdict, note, { store = realStore } = {}) {
  if (!['yes', 'no'].includes(verdict)) {
    return { ok: false, status: 400, error: { code: 'BAD_VERDICT', message: 'verdict must be "yes" or "no"' } }
  }
  const post = await store.get('posts', postId)
  // Cross-tenant safety: a post belonging to a DIFFERENT client must look
  // exactly like a post that doesn't exist — never leak its existence.
  if (!post || post.clientId !== clientId) {
    return { ok: false, status: 404, error: { code: 'NOT_FOUND', message: 'post not found' } }
  }
  const updated = await store.update('posts', postId, {
    status: verdict === 'yes' ? 'approved' : 'rejected',
    rejectionNote: verdict === 'no' ? (note ?? '') : null,
  })
  return { ok: true, post: clientSafePost(updated) }
}

// ---------------------------------------------------------------------------
// GET /api/client/performance?month=
// ---------------------------------------------------------------------------

export async function performance(clientId, month, { store = realStore, pricing } = {}) {
  const client = await store.get('clients', clientId)
  const effectivePricing = pricing || (await resolvePricing())
  const perConversationJod = client?.price?.perConversationJod ?? effectivePricing.PER_CONVERSATION_JOD
  const minimum = effectivePricing.CONVERSATION_MINIMUM

  const conversations = client?.plan?.ads
    ? await store.list('conversations', (cv) => cv.clientId === clientId && String(cv.at ?? '').slice(0, 7) === month)
    : []

  const conversationsDelivered = conversations.length
  const billedJod = client?.plan?.ads
    ? round2(Math.max(conversationsDelivered, minimum) * perConversationJod)
    : 0

  const byDayMap = new Map()
  for (const cv of conversations) {
    const date = String(cv.at ?? '').slice(0, 10)
    if (!date) continue
    byDayMap.set(date, (byDayMap.get(date) || 0) + 1)
  }
  const byDay = [...byDayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  return {
    month,
    conversationsDelivered,
    billedJod,
    perConversationJod: round2(perConversationJod),
    byDay,
  }
}

// ---------------------------------------------------------------------------
// GET /api/client/invoices
// ---------------------------------------------------------------------------

export async function listInvoices(clientId, { store = realStore } = {}) {
  const invoices = await store.list('invoices', { clientId })
  return invoices
    .slice()
    .sort((a, b) => (a.month || '').localeCompare(b.month || ''))
    .map(clientSafeInvoice)
}

// ---------------------------------------------------------------------------
// GET/POST /api/client/requests
// ---------------------------------------------------------------------------

export async function listRequests(clientId, { store = realStore } = {}) {
  const items = await store.list('clientrequests', { clientId })
  return items
    .slice()
    .sort((a, b) => (a.at || '').localeCompare(b.at || ''))
    .map(clientSafeRequest)
}

export async function createRequest(clientId, text, { store = realStore } = {}) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return { ok: false, status: 400, error: { code: 'BAD_INPUT', message: 'text is required' } }
  const record = await store.insert('clientrequests', {
    clientId, text: trimmed, at: new Date().toISOString(), from: 'client', status: 'open',
  })
  return { ok: true, request: clientSafeRequest(record) }
}
