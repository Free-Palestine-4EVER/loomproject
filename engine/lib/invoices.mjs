// engine/lib/invoices.mjs — monthly billing. ONE revenue line per active
// client: the content subscription, flat, for 20 photos + 2 videos a month.
//
// The second revenue stream (conversations x price, floored at 100) was
// retired with BY RESULT on 8 Aug 2026 — LOOM cannot promise an outcome that
// depends on the client's own replies and market. See pricing.mjs for the full
// reasoning. An invoice now bills only for work LOOM actually performed.
//
// Same dependency-injection pattern as the rest of the engine: every function
// takes an optional trailing `{ store }` so tests can point at a temp store.

import * as realStore from './store.mjs'
import { resolvePricing } from './pricing.mjs'
import { round2 } from './ads.mjs'

/**
 * Build (but do not persist) the invoice for one client for one month.
 * - client not found -> throws (operator-visible error, not a blank invoice)
 * - plan.content off -> no lines at all, total 0
 */
export async function billing(clientId, month, { store = realStore, pricing } = {}) {
  if (!clientId) throw Object.assign(new Error('billing requires clientId'), { code: 'BAD_INPUT' })
  if (!/^\d{4}-\d{2}$/.test(month || '')) {
    throw Object.assign(new Error(`billing requires month as "YYYY-MM", got ${JSON.stringify(month)}`), { code: 'BAD_INPUT' })
  }

  const client = await store.get('clients', clientId)
  if (!client) {
    throw Object.assign(new Error(`billing: no such client ${clientId}`), { code: 'NOT_FOUND' })
  }

  const effectivePricing = pricing || (await resolvePricing())
  const contentPriceJod = client.price?.contentJod ?? effectivePricing.CONTENT_PRICE_JOD
  const photos = effectivePricing.PHOTOS_PER_MONTH
  const videos = effectivePricing.VIDEOS_PER_MONTH

  const lines = []

  const wantsContent = Boolean(client.plan?.content)

  // ONE line, because there is one product. The per-conversation lines and the
  // 100-conversation floor were retired with BY RESULT on 8 Aug 2026 — see the
  // header of pricing.mjs for why. An invoice now says exactly what LOOM did.
  if (wantsContent) {
    lines.push({
      label: `Content subscription (المصنع) — ${photos} photos + ${videos} videos`,
      qty: 1,
      unitJod: round2(contentPriceJod),
      totalJod: round2(contentPriceJod),
    })
  }


  const totalJod = round2(lines.reduce((sum, l) => sum + l.totalJod, 0))

  return {
    clientId,
    month,
    lines,
    totalJod,
    status: 'draft',
    issuedAt: new Date().toISOString(),
    // Not part of the persisted invoice shape — useful context for the
    // caller/report without having to re-derive it.
    _meta: { contentPriceJod, photosPerMonth: photos, videosPerMonth: videos },
  }
}

/**
 * Build invoices for every active (non-archived) client with an active plan
 * for `month`, and persist them: update the existing draft-or-later invoice
 * for that client+month if one exists, otherwise insert a new one.
 */
export async function generateMonth(month, { store = realStore, pricing } = {}) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) {
    throw Object.assign(new Error(`generateMonth requires month as "YYYY-MM", got ${JSON.stringify(month)}`), { code: 'BAD_INPUT' })
  }

  const clients = await store.list('clients', (c) => !c.archivedAt && (c.plan?.content || c.plan?.ads))
  const existingInvoices = await store.list('invoices', (inv) => inv.month === month)
  const existingByClient = new Map(existingInvoices.map((inv) => [inv.clientId, inv]))

  const invoices = []
  for (const client of clients) {
    const built = await billing(client.id, month, { store, pricing })
    const { _meta, ...persistable } = built
    const existing = existingByClient.get(client.id)
    const saved = existing
      ? await store.update('invoices', existing.id, persistable)
      : await store.insert('invoices', persistable)
    invoices.push({ ...saved, _meta })
  }

  return { month, count: invoices.length, invoices }
}
