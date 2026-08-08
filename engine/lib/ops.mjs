// engine/lib/ops.mjs — GET /api/ops: the economics snapshot. Computed fresh
// from the store every call, never persisted. This is the screen that tells
// the operator whether THE MACHINE and BY RESULT actually work.

import { list } from './store.mjs'
import { resolvePricing } from './pricing.mjs'

// Assumptions that are not per-client money constants (those live in
// pricing.mjs) but are still guesses, not facts — surfaced under
// `assumptions` in the response so the UI can label them honestly.
const FIXED_MONTHLY_COST_JOD = 700          // the operator's salary — the one fixed cost the content business must clear
const QA_MINUTES_AVAILABLE_PER_MONTH = 3600 // ~2h/day * 30 days, same arithmetic OPERATOR_COST_PER_MIN is built from
const DEFAULT_QA_MINUTES_PER_CLIENT = 15    // used only when there's no QA data yet for the month (empty store / new month)

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const safeDiv = (a, b) => (b > 0 ? a / b : 0)
const currentMonth = () => new Date().toISOString().slice(0, 7)

function isActiveForMonth(client, month, planKey) {
  if (!client.plan?.[planKey]) return false
  if (!client.archivedAt) return true
  return client.archivedAt.slice(0, 7) >= month
}

export async function computeOps(month) {
  const m = month || currentMonth()
  const pricing = await resolvePricing()

  const [allClients, allPosts, allConversations] = await Promise.all([
    list('clients'),
    list('posts', { month: m }),
    list('conversations'),
  ])

  const clientById = new Map(allClients.map((c) => [c.id, c]))

  // ——— content (THE MACHINE) ————————————————————————————————————
  const contentClients = allClients.filter((c) => isActiveForMonth(c, m, 'content'))
  const contentClientIds = new Set(contentClients.map((c) => c.id))

  const contentRevenueJod = contentClients.reduce(
    (sum, c) => sum + (Number(c.price?.contentJod) || pricing.CONTENT_PRICE_JOD), 0)

  const generationCostJod = pricing.GENERATION_COST_JOD * contentClients.length
  const platformCostJod = pricing.PLATFORM_COST_JOD * contentClients.length

  const monthPosts = allPosts.filter((p) => contentClientIds.has(p.clientId))
  const qaSecondsTotal = monthPosts.reduce((sum, p) => sum + (Number(p.qaSeconds) || 0), 0)
  const qaMinutesTotal = qaSecondsTotal / 60
  const qaCostJod = qaMinutesTotal * pricing.OPERATOR_COST_PER_MIN

  const contentGrossJod = contentRevenueJod - generationCostJod - platformCostJod - qaCostJod
  const contentMarginPct = safeDiv(contentGrossJod, contentRevenueJod) * 100
  const qaMinutesPerClient = safeDiv(qaMinutesTotal, contentClients.length)

  // breakEvenClients: how many content clients are needed to clear the fixed
  // monthly cost, given the per-client economics observed this month (or the
  // documented default assumption if there's no QA data yet).
  const qaMinutesAssumedPerClient = qaMinutesPerClient > 0 ? qaMinutesPerClient : DEFAULT_QA_MINUTES_PER_CLIENT
  const avgContentPriceJod = contentClients.length > 0
    ? safeDiv(contentRevenueJod, contentClients.length)
    : pricing.CONTENT_PRICE_JOD
  const contentGrossPerClient = avgContentPriceJod
    - pricing.GENERATION_COST_JOD
    - pricing.PLATFORM_COST_JOD
    - (qaMinutesAssumedPerClient * pricing.OPERATOR_COST_PER_MIN)
  const breakEvenClients = contentGrossPerClient > 0
    ? Math.ceil(FIXED_MONTHLY_COST_JOD / contentGrossPerClient)
    : null // economics are underwater per-client — no finite break-even

  // ——— ads (BY RESULT) ————————————————————————————————————————
  const adsClients = allClients.filter((c) => isActiveForMonth(c, m, 'ads'))
  const adsClientIds = new Set(adsClients.map((c) => c.id))

  const monthConversations = allConversations.filter((cv) => {
    if (!cv.at || typeof cv.at !== 'string') return false
    return cv.at.slice(0, 7) === m && adsClientIds.has(cv.clientId)
  })

  const conversationsCount = monthConversations.length
  const adsRevenueJod = monthConversations.reduce((sum, cv) => sum + (Number(cv.billedJod) || 0), 0)
  const adSpendJod = monthConversations.reduce((sum, cv) => sum + (Number(cv.costJod) || 0), 0)
  const adsGrossJod = adsRevenueJod - adSpendJod
  const adsMarginPct = safeDiv(adsGrossJod, adsRevenueJod) * 100
  const cpcJod = safeDiv(adSpendJod, conversationsCount)

  const byCategory = new Map() // category -> { spend, conversations }
  for (const cv of monthConversations) {
    const client = clientById.get(cv.clientId)
    const category = client?.category || 'uncategorized'
    const bucket = byCategory.get(category) || { spend: 0, conversations: 0 }
    bucket.spend += Number(cv.costJod) || 0
    bucket.conversations += 1
    byCategory.set(category, bucket)
  }
  const cpcByCategory = {}
  for (const [category, bucket] of byCategory) {
    cpcByCategory[category] = round2(safeDiv(bucket.spend, bucket.conversations))
  }

  // ——— total ——————————————————————————————————————————————————
  const totalRevenueJod = contentRevenueJod + adsRevenueJod
  const totalCostJod = generationCostJod + platformCostJod + qaCostJod + adSpendJod
  const totalGrossJod = totalRevenueJod - totalCostJod
  const totalMarginPct = safeDiv(totalGrossJod, totalRevenueJod) * 100

  // ——— capacity ———————————————————————————————————————————————
  const qaMinutesUsed = qaMinutesTotal
  const qaMinutesAvailable = QA_MINUTES_AVAILABLE_PER_MONTH
  const perClientForHeadroom = qaMinutesPerClient > 0 ? qaMinutesPerClient : DEFAULT_QA_MINUTES_PER_CLIENT
  const clientsHeadroom = Math.floor(safeDiv(qaMinutesAvailable, perClientForHeadroom)) - contentClients.length

  return {
    month: m,
    content: {
      clients: contentClients.length,
      revenueJod: round2(contentRevenueJod),
      generationCostJod: round2(generationCostJod),
      platformCostJod: round2(platformCostJod),
      qaMinutesTotal: round2(qaMinutesTotal),
      qaCostJod: round2(qaCostJod),
      grossJod: round2(contentGrossJod),
      marginPct: round2(contentMarginPct),
      qaMinutesPerClient: round2(qaMinutesPerClient),
      breakEvenClients,
    },
    ads: {
      clients: adsClients.length,
      conversations: conversationsCount,
      revenueJod: round2(adsRevenueJod),
      adSpendJod: round2(adSpendJod),
      grossJod: round2(adsGrossJod),
      marginPct: round2(adsMarginPct),
      cpcJod: round2(cpcJod),
      cpcByCategory,
    },
    total: {
      revenueJod: round2(totalRevenueJod),
      costJod: round2(totalCostJod),
      grossJod: round2(totalGrossJod),
      marginPct: round2(totalMarginPct),
    },
    capacity: {
      qaMinutesUsed: round2(qaMinutesUsed),
      qaMinutesAvailable,
      clientsHeadroom,
    },
    assumptions: {
      fixedMonthlyCostJod: FIXED_MONTHLY_COST_JOD,
      qaMinutesAvailablePerMonth: QA_MINUTES_AVAILABLE_PER_MONTH,
      defaultQaMinutesPerClient: DEFAULT_QA_MINUTES_PER_CLIENT,
      pricingOverridden: pricing.isOverridden,
    },
  }
}
