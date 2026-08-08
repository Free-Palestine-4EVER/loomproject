// engine/lib/invoices.mjs — monthly billing. Two revenue lines per active
// client: the content subscription (flat) and conversations (count x price,
// floored at the monthly minimum). The floor is always its own visible line
// item — never folded silently into the conversations line — so an operator
// (or a client) can see exactly what was delivered vs. what was guaranteed.
//
// Same dependency-injection pattern as ads.mjs: every function takes an
// optional trailing `{ store }` so tests can point at a temp store.

import * as realStore from './store.mjs'
import { resolvePricing } from './pricing.mjs'
import { round2 } from './ads.mjs'

/**
 * Build (but do not persist) the invoice for one client for one month.
 * Handles every edge case explicitly:
 * - client not found -> throws (operator-visible error, not a blank invoice)
 * - plan.content off -> no content line
 * - plan.ads off -> no conversations lines at all (not even a zeroed one)
 * - zero conversations / no campaign that month -> conversations line at
 *   qty 0, plus a top-up line for the full minimum
 * - conversations below the minimum -> a top-up line for the shortfall
 * - conversations at/above the minimum -> no top-up line at all
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
  const perConversationJod = client.price?.perConversationJod ?? effectivePricing.PER_CONVERSATION_JOD
  const minimum = effectivePricing.CONVERSATION_MINIMUM

  const lines = []

  const wantsContent = Boolean(client.plan?.content)
  const wantsAds = Boolean(client.plan?.ads)

  if (wantsContent) {
    lines.push({
      label: 'Content subscription (المصنع)',
      qty: 1,
      unitJod: round2(contentPriceJod),
      totalJod: round2(contentPriceJod),
    })
  }

  let conversationsCount = 0
  if (wantsAds) {
    const conversations = await store.list('conversations', (cv) => cv.clientId === clientId && String(cv.at ?? '').slice(0, 7) === month)
    conversationsCount = conversations.length

    lines.push({
      label: 'Conversations delivered (WhatsApp)',
      qty: conversationsCount,
      unitJod: round2(perConversationJod),
      totalJod: round2(conversationsCount * perConversationJod),
    })

    if (conversationsCount < minimum) {
      const shortfall = minimum - conversationsCount
      lines.push({
        label: `Monthly minimum top-up (floor of ${minimum} conversations)`,
        qty: shortfall,
        unitJod: round2(perConversationJod),
        totalJod: round2(shortfall * perConversationJod),
      })
    }
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
    _meta: { conversationsDelivered: conversationsCount, conversationMinimum: minimum, contentPriceJod, perConversationJod },
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
