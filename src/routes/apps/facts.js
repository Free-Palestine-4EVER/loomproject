// ————————————————————————————————————————————————————————————————
// /apps — the derivations.
//
// Same contract as /work/facts.js: the page hero, the band headings and the
// <title>/<meta description> all quote these numbers, and none of them may be
// typed. Everything is counted off $data/suite.js.
//
// THE ONE THING THIS FILE IS REALLY FOR: the honest split.
// suite.js is emphatic that `status` is not decoration — exactly ONE of the
// nine products can be downloaded by a stranger today, five are built but not
// publicly installable, and three are CONCEPTS with nothing behind them but
// the mockups in `mocks/`. A page that sorted these into "Apps" and
// "Software" would quietly launder that. So the bands below are cut on
// SHIPPING REALITY, and the test for each one is mechanical:
//
//   live      — the product has an `href`. Not "we said it's on the store":
//               a link that actually resolves. suite.js only carries an href
//               where one does.
//   built     — status is not 'Concept' and there is no public link.
//   concept   — status === 'Concept'. Designed, not built.
//
// Add an href to suite.js the day something goes live and it moves band on
// its own; nothing here needs editing.
// ————————————————————————————————————————————————————————————————

import { SUITE } from '$data/suite.js'

export const isConcept = (p) => p.status === 'Concept'
export const isLive = (p) => !!p.href

/** Which of the three bands a product belongs to. */
export const bandOf = (p) => (isLive(p) ? 'live' : isConcept(p) ? 'concept' : 'built')

/* The bands, in the order the page shows them: what you can install, what
   exists but you can't, and what is only drawn. Each `note` states the claim
   the band is making, so a reader can never mistake one for another. */
export const BANDS = [
  {
    id: 'live',
    label: 'Available now',
    note: 'Installable by anyone, today. Every product in this band carries a link that resolves to a real store page.',
  },
  {
    id: 'built',
    label: 'Built — not public yet',
    note: 'Real software, running. On TestFlight, in review, or an internal studio tool with no public build — so there is no download link, because there is nothing honest to link to.',
  },
  {
    id: 'concept',
    label: 'Concept — nothing is built',
    note: 'Designed, not written. The screens below are the design; there is no app behind them, no waiting list and no date.',
  },
]

/** The products in one band, in suite.js's own order. */
export const inBand = (id) => SUITE.filter((p) => bandOf(p) === id)

// ── counts ────────────────────────────────────────────────────────────
export const TOTAL = SUITE.length
export const LIVE_COUNT = SUITE.filter(isLive).length
export const CONCEPT_COUNT = SUITE.filter(isConcept).length
export const BUILT_COUNT = TOTAL - CONCEPT_COUNT           // "exists as software"
export const NOT_PUBLIC_COUNT = BUILT_COUNT - LIVE_COUNT   // built, no public link

/* `kind` is a HARDWARE fact in suite.js — it decides whether the product is
   drawn in phones or in a laptop — so it is also the honest answer to "which
   platforms". 'app' means it runs on iPhone; 'software' means it runs on a
   desktop browser. Nothing here infers a platform the data doesn't state. */
export const PHONE_COUNT = SUITE.filter((p) => p.kind === 'app').length
export const DESKTOP_COUNT = SUITE.filter((p) => p.kind !== 'app').length

/** Every distinct `status` string in the data, in first-seen order — the
 *  filter chips are built from this, so a new status appears by itself. */
export const STATUSES = [...new Set(SUITE.map((p) => p.status))]

const NUMBER_WORD = {
  1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six',
  7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Eleven', 12: 'Twelve',
}
export const word = (n) => NUMBER_WORD[n] ?? String(n)
