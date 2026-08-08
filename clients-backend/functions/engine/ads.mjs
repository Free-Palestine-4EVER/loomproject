// GENERATED COPY — do not edit. Source: engine/lib/ads.mjs
// Regenerate with clients-backend/sync-engine-libs.sh
// engine/lib/ads.mjs — the BY RESULT engine: Meta CSV import, cost-per-
// conversation, the learning curve, and winner promotion. This is the module
// that has to prove the business model, not just record numbers: cost per
// conversation must visibly fall as a category is learned, and a creative
// only gets promoted to "winner" on real, thick data.
//
// Every exported function takes an optional trailing `{ store }` dependency
// so tests (see fixtures/ads-selftest.mjs) can point at an in-memory temp
// store instead of the real engine/data/*.json files, without touching
// store.mjs (owned elsewhere) or racing other agents working in that folder.

import * as realStore from './store.mjs'
import { resolvePricing } from './pricing.mjs'
import { parseCsv, matchColumn, parseLooseNumber, parseLooseDate } from './csv.mjs'

export const WINNER_MIN_CONVERSATIONS = 50

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function sum(arr) {
  return arr.reduce((a, b) => a + (Number(b) || 0), 0)
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

const COLUMN_CANDIDATES = {
  conversations: [
    'messaging conversations started',
    'messaging conversations',
    'conversations started',
    'conversations',
    'results',
  ],
  spend: [
    'amount spent (jod)',
    'amount spent (usd)',
    'amount spent',
    'spend',
    'amount spent (aud)',
  ],
  date: ['reporting starts', 'reporting start', 'date', 'day'],
  campaign: ['campaign name', 'campaign'],
}

const REQUIRED_FIELDS = ['conversations', 'spend', 'date']

/**
 * Import a pasted Meta Ads export CSV for one client. Liberal about the
 * source shape (delimiter, column names, currency formatting) but never
 * guesses on a required column — an unmapped required field is reported as
 * an error, not defaulted to zero. Returns a full mapping report so the
 * operator can see exactly what happened to every row.
 *
 * Each Meta row is a campaign×day aggregate ("N conversations, X JOD spent
 * that day"), while conversations.json is one record per conversation. We
 * expand each row into N individual conversation records with spend split
 * evenly across them — a row with 0 conversations has no conversation to
 * attach its spend to, so it is reported as "unattributed spend", never
 * silently dropped and never divided by zero.
 */
export async function importMetaCsv(clientId, csvText, { store = realStore, pricing } = {}) {
  if (!clientId) throw Object.assign(new Error('importMetaCsv requires clientId'), { code: 'BAD_INPUT' })

  const parsed = parseCsv(csvText || '')
  const mapping = {
    conversations: matchColumn(parsed.headers, COLUMN_CANDIDATES.conversations),
    spend: matchColumn(parsed.headers, COLUMN_CANDIDATES.spend),
    date: matchColumn(parsed.headers, COLUMN_CANDIDATES.date),
    campaign: matchColumn(parsed.headers, COLUMN_CANDIDATES.campaign),
  }

  const unmapped = REQUIRED_FIELDS.filter((f) => !mapping[f])
  const report = {
    ok: false,
    clientId,
    delimiter: parsed.delimiter,
    headers: parsed.headers,
    mapping,
    unmapped,
    rowsTotal: parsed.rows.length,
    rowsImported: 0,
    conversationsCreated: 0,
    spendJodTotal: 0,
    spendJodUnattributed: 0,
    skipped: [],
    campaignsCreated: [],
    errors: [],
  }

  if (unmapped.length > 0) {
    report.errors.push(
      `Unmapped required column(s): ${unmapped.join(', ')}. Nothing was imported — ` +
      `fix the export or the column-matching candidates, do not default to zero.`
    )
    return report
  }

  if (parsed.rows.length === 0) {
    report.errors.push('CSV had no data rows after the header.')
    return report
  }

  const effectivePricing = pricing || (await resolvePricing())
  const existingCampaigns = await store.list('campaigns', { clientId })
  const campaignByName = new Map(
    existingCampaigns.filter((c) => c.name).map((c) => [c.name, c])
  )

  let rowIndex = 0
  for (const row of parsed.rows) {
    rowIndex += 1

    const conversationsRaw = row[mapping.conversations]
    const spendRaw = row[mapping.spend]
    const dateRaw = row[mapping.date]
    const campaignName = mapping.campaign ? String(row[mapping.campaign] ?? '').trim() : ''

    const conversationsCount = parseLooseNumber(conversationsRaw)
    const spendJod = parseLooseNumber(spendRaw)
    const date = parseLooseDate(dateRaw)

    if (conversationsCount === null) {
      report.skipped.push({ rowIndex, reason: 'unparseable conversations value', raw: conversationsRaw })
      continue
    }
    if (spendJod === null) {
      report.skipped.push({ rowIndex, reason: 'unparseable spend value', raw: spendRaw })
      continue
    }
    if (!date) {
      report.skipped.push({ rowIndex, reason: 'missing or unparseable date', raw: dateRaw })
      continue
    }
    if (conversationsCount < 0 || spendJod < 0) {
      report.skipped.push({ rowIndex, reason: 'negative value', raw: { conversationsRaw, spendRaw } })
      continue
    }

    report.spendJodTotal = round2(report.spendJodTotal + spendJod)

    if (conversationsCount === 0) {
      // Division by zero, made explicit: spend with no conversation to
      // attach it to is unattributed, not silently discarded.
      report.spendJodUnattributed = round2(report.spendJodUnattributed + spendJod)
      report.skipped.push({ rowIndex, reason: 'zero conversations — spend recorded as unattributed, no conversation rows created' })
      continue
    }

    // Find-or-create the campaign this row belongs to.
    const name = campaignName || '(unnamed campaign)'
    let campaign = campaignByName.get(name)
    if (!campaign) {
      campaign = await store.insert('campaigns', {
        clientId,
        creativeId: null,
        name,
        startedAt: date,
        endedAt: null,
        status: 'live',
        budgetJod: 0,
      })
      campaignByName.set(name, campaign)
      report.campaignsCreated.push(campaign)
    }

    const costPerConversation = round2(spendJod / conversationsCount)
    for (let k = 0; k < conversationsCount; k++) {
      await store.insert('conversations', {
        clientId,
        campaignId: campaign.id,
        at: date,
        source: 'whatsapp',
        costJod: costPerConversation,
        billedJod: effectivePricing.PER_CONVERSATION_JOD,
        note: `Imported from Meta export row ${rowIndex} (${name})`,
      })
      report.conversationsCreated += 1
    }
    report.rowsImported += 1
  }

  report.ok = true
  report.spendJodTotal = round2(report.spendJodTotal)
  report.spendJodUnattributed = round2(report.spendJodUnattributed)
  return report
}

// ---------------------------------------------------------------------------
// Joins: conversation -> campaign -> creative(category)
// ---------------------------------------------------------------------------

async function loadJoinTables(store) {
  const [conversations, campaigns, creatives] = await Promise.all([
    store.list('conversations'),
    store.list('campaigns'),
    store.list('creatives'),
  ])
  const campaignById = new Map(campaigns.map((c) => [c.id, c]))
  const creativeById = new Map(creatives.map((c) => [c.id, c]))
  return { conversations, campaigns, creatives, campaignById, creativeById }
}

function categoryOf(cv, campaignById, creativeById) {
  const campaign = cv.campaignId ? campaignById.get(cv.campaignId) : null
  const creative = campaign?.creativeId ? creativeById.get(campaign.creativeId) : null
  return creative?.category ?? null
}

function inWindow(at, window) {
  if (!at) return false
  if (window?.from && at < window.from) return false
  if (window?.to && at > window.to) return false
  return true
}

// ---------------------------------------------------------------------------
// cpc — cost per conversation for a client or a category, over a window
// ---------------------------------------------------------------------------

/**
 * Cost per conversation over `window` (`{ from, to }` ISO dates, both
 * optional/inclusive) for either `{ clientId }` or `{ category }`.
 * Division-by-zero (no conversations in scope) returns `cpcJod: null` and
 * `insufficientData: true` rather than NaN/Infinity.
 */
export async function cpc(scope, window = {}, { store = realStore } = {}) {
  const clientId = scope?.clientId
  const category = scope?.category
  if (!clientId && !category) {
    throw Object.assign(new Error('cpc requires scope.clientId or scope.category'), { code: 'BAD_INPUT' })
  }

  const { conversations, campaignById, creativeById } = await loadJoinTables(store)

  const matches = conversations.filter((cv) => {
    if (!inWindow(cv.at, window)) return false
    if (clientId) return cv.clientId === clientId
    return categoryOf(cv, campaignById, creativeById) === category
  })

  const spendJod = round2(sum(matches.map((m) => m.costJod)))
  const conversationsCount = matches.length
  const cpcJod = conversationsCount > 0 ? round2(spendJod / conversationsCount) : null

  return {
    scope: clientId ? { clientId } : { category },
    window,
    conversations: conversationsCount,
    spendJod,
    cpcJod,
    insufficientData: conversationsCount === 0,
  }
}

// ---------------------------------------------------------------------------
// learningCurve — CPC by month for a category
// ---------------------------------------------------------------------------

/**
 * CPC per calendar month for `category` — the proof that cost per
 * conversation falls as the category is learned. `falling` is a convenience
 * flag comparing the first and last month with data; callers doing real
 * analysis should look at `months` directly.
 */
export async function learningCurve(category, { store = realStore } = {}) {
  if (!category) throw Object.assign(new Error('learningCurve requires a category'), { code: 'BAD_INPUT' })

  const { conversations, campaignById, creativeById } = await loadJoinTables(store)
  const relevant = conversations.filter((cv) => categoryOf(cv, campaignById, creativeById) === category)

  const byMonth = new Map()
  for (const cv of relevant) {
    const month = String(cv.at ?? '').slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(month)) continue
    const bucket = byMonth.get(month) || { month, spendJod: 0, conversations: 0 }
    bucket.spendJod += Number(cv.costJod) || 0
    bucket.conversations += 1
    byMonth.set(month, bucket)
  }

  const months = [...byMonth.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((b) => ({
      month: b.month,
      conversations: b.conversations,
      spendJod: round2(b.spendJod),
      cpcJod: b.conversations > 0 ? round2(b.spendJod / b.conversations) : null,
    }))

  const withCpc = months.filter((m) => m.cpcJod !== null)
  const falling = withCpc.length >= 2 && withCpc[withCpc.length - 1].cpcJod < withCpc[0].cpcJod

  return { category, months, falling }
}

// ---------------------------------------------------------------------------
// promoteWinner — never on thin data
// ---------------------------------------------------------------------------

/**
 * Promote the lowest-CPC creative in `category` with >= WINNER_MIN_CONVERSATIONS
 * conversations to "winner"; every other creative in that category that also
 * clears the threshold (and lost on CPC) becomes "retired". Creatives below
 * the threshold are left untouched — "testing" is not evidence yet.
 * If nothing in the category clears the threshold, nothing is mutated and
 * `status: "insufficient-data"` is returned.
 */
export async function promoteWinner(category, { store = realStore } = {}) {
  if (!category) throw Object.assign(new Error('promoteWinner requires a category'), { code: 'BAD_INPUT' })

  const creatives = await store.list('creatives', { category })
  if (creatives.length === 0) {
    return { category, status: 'no-creatives', threshold: WINNER_MIN_CONVERSATIONS, totals: [] }
  }

  const campaigns = await store.list('campaigns')
  const conversations = await store.list('conversations')

  const totals = creatives.map((cr) => {
    const campaignIds = new Set(campaigns.filter((c) => c.creativeId === cr.id).map((c) => c.id))
    const matched = conversations.filter((cv) => cv.campaignId && campaignIds.has(cv.campaignId))
    const spendJod = round2(sum(matched.map((m) => m.costJod)))
    const conversationsCount = matched.length
    const cpcJod = conversationsCount > 0 ? round2(spendJod / conversationsCount) : null
    return {
      creativeId: cr.id,
      headlineEn: cr.headlineEn,
      conversations: conversationsCount,
      spendJod,
      cpcJod,
      eligible: conversationsCount >= WINNER_MIN_CONVERSATIONS,
    }
  })

  const eligible = totals.filter((t) => t.eligible && t.cpcJod !== null)

  if (eligible.length === 0) {
    return {
      category,
      status: 'insufficient-data',
      threshold: WINNER_MIN_CONVERSATIONS,
      totals,
    }
  }

  eligible.sort((a, b) => a.cpcJod - b.cpcJod)
  const winnerTotal = eligible[0]
  const retiredTotals = eligible.slice(1)

  const winner = await store.update('creatives', winnerTotal.creativeId, { status: 'winner' })
  const retired = []
  for (const t of retiredTotals) {
    retired.push(await store.update('creatives', t.creativeId, { status: 'retired' }))
  }

  return {
    category,
    status: 'promoted',
    threshold: WINNER_MIN_CONVERSATIONS,
    winner,
    winnerCpcJod: winnerTotal.cpcJod,
    retired,
    totals,
  }
}
