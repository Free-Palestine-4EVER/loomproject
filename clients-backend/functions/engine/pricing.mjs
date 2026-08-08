// GENERATED COPY — do not edit. Source: engine/lib/pricing.mjs
// Regenerate with clients-backend/sync-engine-libs.sh
// engine/lib/pricing.mjs — the money constants from SPEC.md, plus a loader
// that lets settings.json override any of them at runtime. Everything here is
// an assumption the operator can edit — never present these as facts.

import { getSettings } from './store.mjs'

export const DEFAULT_PRICING = Object.freeze({
  CONTENT_PRICE_JOD: 89.00,      // per client per month
  PER_CONVERSATION_JOD: 1.75,    // what we bill
  CONVERSATION_MINIMUM: 100,     // per client per month
  OPERATOR_COST_PER_MIN: 0.195,  // 700 JOD salary / (30 d * ~2h/d) — assumption
  GENERATION_COST_JOD: 4.20,     // per client per month, assumption
  PLATFORM_COST_JOD: 1.10,       // scheduling/storage/API, assumption
  COMMISSION_RATE: 0.02,         // reserved, not built yet
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
