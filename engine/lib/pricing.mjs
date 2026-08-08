// engine/lib/pricing.mjs — the money constants from SPEC.md, plus a loader
// that lets settings.json override any of them at runtime. Everything here is
// an assumption the operator can edit — never present these as facts.

import { getSettings } from './store.mjs'

// ── ONE business, deliberately ─────────────────────────────────────────────
// LOOM sells a content subscription and nothing else: 20 photos + 2 videos per
// client per month, for CONTENT_PRICE_JOD.
//
// The results-priced ads product ("BY RESULT", 1.75 JOD per WhatsApp
// conversation, floor of 100) was RETIRED on 8 Aug 2026 by the owner's call,
// and the reason is worth keeping: LOOM does not control whether a
// conversation happens. Billing for a delivered conversation means promising an
// outcome that depends on the client's own replies, their prices and their
// market — and eating the loss whenever a category runs cold, which the seed
// data showed happening at −2.29% margin in month one. A subscription for work
// LOOM actually performs is a promise it can keep.
//
// `ads.mjs`, `conversations.json` and the ads selftest are left on disk but are
// no longer mounted by pricing, invoices, ops, the site or the app. Nothing
// bills per conversation any more. Do not reintroduce a per-conversation
// constant here without that decision being made again explicitly.
export const DEFAULT_PRICING = Object.freeze({
  CONTENT_PRICE_JOD: 89.00,      // per client per month
  PHOTOS_PER_MONTH: 20,          // what the subscription actually delivers
  VIDEOS_PER_MONTH: 2,
  OPERATOR_COST_PER_MIN: 0.195,  // 700 JOD salary / (30 d * ~2h/d) — assumption
  GENERATION_COST_JOD: 4.20,     // per client per month, assumption
  PLATFORM_COST_JOD: 1.10,       // scheduling/storage/API, assumption
})

const KEYS = Object.keys(DEFAULT_PRICING)

/**
 * Resolve the pricing in effect right now: defaults overlaid with any
 * `settings.pricing` overrides found in settings.json. Only known keys with
 * finite numeric values are accepted from overrides; anything else is
 * ignored so a bad edit in the UI can't corrupt the whole snapshot.
 */
export async function resolvePricing() {
  const settings = await getSettings()
  const overrides = settings?.pricing || {}
  const resolved = { ...DEFAULT_PRICING }
  const appliedOverrides = {}
  for (const key of KEYS) {
    const v = overrides[key]
    if (typeof v === 'number' && Number.isFinite(v)) {
      resolved[key] = v
      appliedOverrides[key] = v
    }
  }
  return { ...resolved, isOverridden: appliedOverrides, defaults: DEFAULT_PRICING }
}
