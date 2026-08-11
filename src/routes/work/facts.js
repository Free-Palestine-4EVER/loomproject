// ————————————————————————————————————————————————————————————————
// /work — the derivations.
//
// WHY THIS IS A MODULE AND NOT INLINE. The page hero, the filter chips AND
// the <title>/<meta description> in +page.svelte all quote the same numbers:
// how many cases, how many countries, how many disciplines, which years. A
// number typed into a meta tag is a number that goes stale the first time
// somebody adds a case to $data/site.js and nobody notices, because nothing
// on screen changes. Everything is computed here, once, off CASES/FILTERS,
// and both files read it.
//
// NOTHING IN THIS FILE IS A CLAIM — it only counts what the data already
// says. If a fact isn't in $data/site.js, it doesn't exist on this page.
// ————————————————————————————————————————————————————————————————

import { CASES, FILTERS } from '$data/site.js'

const titleCase = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1)

/* `country` is PROSE, not a country code. "Sarajevo" means Bosnia, "German
   market" is a market served rather than a place worked in, and "Oman × UAE"
   is two countries in one string. Normalising before counting is the whole
   difference between counting countries and counting strings. This is the
   same table Work.svelte uses for the same reason. */
const COUNTRY_ALIAS = {
  sarajevo: 'Bosnia', bih: 'Bosnia', ch: 'Switzerland', switzerland: 'Switzerland',
  'german market': 'Germany', germany: 'Germany', uae: 'UAE', oman: 'Oman',
  jordan: 'Jordan', croatia: 'Croatia', usa: 'USA',
}

/** Every real country one case touches. 'Oman × UAE' → ['Oman', 'UAE']. */
export function marketsOf(c) {
  return String(c.country || '')
    .split(/[/×,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => COUNTRY_ALIAS[s] || titleCase(s))
}

/** Every year one case was active. '2026' → [2026]; '2024–25' → [2024, 2025].
 *  The tail of a range is written as two digits, so it is completed from the
 *  century of the head rather than read as the year 25. */
export function yearsOf(c) {
  const parts = String(c.year || '').split(/[–—-]/).map((s) => s.trim()).filter(Boolean)
  if (!parts.length) return []
  const start = Number(parts[0])
  if (!Number.isFinite(start)) return []
  if (parts.length === 1) return [start]
  const tail = Number(parts[1])
  const end = tail < 100 ? Math.floor(start / 100) * 100 + tail : tail
  if (!Number.isFinite(end) || end < start) return [start]
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

/** The last year a case was active — what "newest first" sorts on. */
export const lastYear = (c) => Math.max(...yearsOf(c), 0)

/** Every market in the archive, alphabetical. */
export const MARKETS = [...new Set(CASES.flatMap(marketsOf))].sort((a, b) => a.localeCompare(b))

/** Every year in the archive, newest first. */
export const ALL_YEARS = [...new Set(CASES.flatMap(yearsOf))].sort((a, b) => b - a)

/** FILTERS minus the synthetic `all` row — the real disciplines. */
export const DISCIPLINES = FILTERS.filter((f) => f.id !== 'all')

export const CASE_COUNT = CASES.length
export const COUNTRY_COUNT = MARKETS.length
export const DISCIPLINE_COUNT = DISCIPLINES.length
export const YEAR_FIRST = Math.min(...ALL_YEARS)
export const YEAR_LAST = Math.max(...ALL_YEARS)

/** Distinct strings written in any case's `scope` — a finer-grained count
 *  than the seven filter buckets, and the honest name for it is "scopes of
 *  work", not "services". */
export const SCOPE_COUNT = new Set(CASES.flatMap((c) => c.scope || [])).size

/** The discipline labels, lower-cased, as one readable list — used in the
 *  meta description so the sentence there is generated, not typed. */
export const DISCIPLINE_LIST = DISCIPLINES.map((f) => f.label.toLowerCase()).join(', ')

const NUMBER_WORD = {
  1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six',
  7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Eleven', 12: 'Twelve',
  13: 'Thirteen', 14: 'Fourteen', 15: 'Fifteen', 16: 'Sixteen',
  17: 'Seventeen', 18: 'Eighteen', 19: 'Nineteen', 20: 'Twenty',
}
/** Spelled out where the data can plausibly reach; past that the digit is
 *  fine and honest. */
export const word = (n) => NUMBER_WORD[n] ?? String(n)
