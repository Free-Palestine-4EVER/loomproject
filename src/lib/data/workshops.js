// ————————————————————————————————————————————
// AI WORKSHOPS BY LOOM — content + pricing for the /ai-workshops page and its
// home-page promo section.
//
// The argument: AI will not replace a company's employees — but a company
// that puts AI in its employees' hands will replace one that doesn't. This is
// not a headcount play. It is corporate training that turns an existing team
// into people who actually run agents day to day, department by department.
//
// PRICING is the one exported table every displayed number is derived from —
// edit it here, nowhere else. Per-seat, per-module-count, in JOD, premium and
// deliberately above a budget-bootcamp price: this is senior corporate
// training delivered on-site in Amman, not a webinar.
// ————————————————————————————————————————————

export const MIN_MODULES = 3
export const MAX_MODULES = 10

// Soft floor, not a gate — a cohort under this size still gets a real
// quote, just steered toward the open-cohort / 1-on-1 route instead of a
// dedicated in-house run. The form must never block on this number.
export const RECOMMENDED_MIN_SEATS = 7

// Anything at or above this heads to the enterprise "talk to us" tier —
// no on-page total, because at this size the shape of the engagement
// (multi-site, multi-cohort, custom curriculum) is a conversation, not a
// calculator output.
export const ENTERPRISE_MIN_SEATS = 51

// ————— the curriculum —————
// Every module includes the same four things (see MODULE_INCLUDES) — what
// differs module to module is the subject and the contact hours it needs.
export const MODULES = [
  {
    id: 'prompting',
    n: '01',
    title: 'Prompting fundamentals',
    hours: 3,
    blurb: 'The floor everything else stands on. Employees learn to give an AI system enough context to be useful on the first try instead of the fifth — how to state the actual goal, supply the missing facts a model can’t guess, and iterate on a bad answer instead of abandoning the tool and going back to doing it by hand. Most "AI doesn’t work for us" complaints trace back to this module never having happened.',
  },
  {
    id: 'agents',
    n: '02',
    title: 'Agent building & automation',
    hours: 4,
    blurb: 'Past chatting, into building. Teams learn to assemble agents that carry out a multi-step job on their own — read an inbox, draft a reply, check a calendar, update a sheet — using the no-code and low-code builders that make this realistic for a non-developer to own. The goal is a working agent the team can point at a real recurring task by the end of the session, not a slide about what agents are.',
  },
  {
    id: 'security',
    n: '03',
    title: 'AI security & data handling',
    hours: 3,
    blurb: 'What must never be pasted into a chatbot, and why. Client contracts, financial figures, personal data, source code, anything under NDA — this module draws the line plainly, covers how "free" consumer AI tools use what they’re fed, and gives the team a simple rule set for what goes into an approved, sanctioned system versus what never leaves the building. The single highest-leverage module for a company that has never had this conversation.',
  },
  {
    id: 'playbooks',
    n: '04',
    title: 'Department playbooks',
    hours: 5,
    blurb: 'One session, five functions: sales, marketing, finance, ops and HR/support each get their own concrete playbook — the sales team leaves with an agent that qualifies and follows up on leads, finance with one that reconciles and flags anomalies, HR with one that screens and schedules. Generic "AI for business" training teaches a skill nobody applies; this module hands every department a workflow it can run on Monday.',
  },
  {
    id: 'toolstack',
    n: '05',
    title: 'Tool stack selection',
    hours: 3,
    blurb: 'There are hundreds of AI tools and most companies need four. This module is a structured evaluation of what the business actually has — CRM, helpdesk, accounting, comms — and which AI layer fits on top of each without a rebuild, including honest cost-per-seat comparisons and which subscriptions to cancel because a newly-built agent now does that job for free.',
  },
  {
    id: 'workflow',
    n: '06',
    title: 'Workflow redesign',
    hours: 4,
    blurb: 'Automating a broken process just makes it break faster. This module puts a real workflow on the wall, strips out the steps that only existed because a human had to be the connective tissue between two systems, and rebuilds it around what an agent can now do end to end — the difference between "AI helps with the old way" and an actually shorter, actually cheaper way.',
  },
  {
    id: 'impact',
    n: '07',
    title: 'Measuring impact',
    hours: 3,
    blurb: 'What to track so "we use AI now" turns into a number a board can read — hours reclaimed per employee, cost per ticket or lead, adoption rate by department, error rate versus the old manual process. Without this module the training itself becomes unmeasurable, and unmeasurable training is the first thing cut next year.',
  },
  {
    id: 'capstone',
    n: '08',
    title: 'Capstone — ship one agent',
    hours: 6,
    blurb: 'Every team builds and ships one real, working agent against one real pain point they chose themselves — not a demo, a tool they keep using Monday morning. It is presented back to leadership in the room, so the training ends with proof already produced instead of a certificate and a slide deck nobody reopens.',
  },
]

// Applies to every module above — this is why a premium per-seat price is
// justified rather than asserted.
export const MODULE_INCLUDES = [
  'Live instruction — in person in Amman, or run remotely for distributed teams',
  'A workbook and prompt/template pack, one per employee, theirs to keep',
  'The full session recorded, available to the company for 90 days',
  'A 2-week post-workshop WhatsApp support window with the instructor',
]

// ————— pricing —————
// Per-employee price, in JOD, keyed by how many modules the company picks.
// Anchored at the two ends of the range LOOM has priced this at: 3 modules
// ≈ 320 JOD/employee, 10 modules ≈ 850 JOD/employee. Every other count sits
// on a near-linear ramp between them — more modules costs more per seat, but
// at a shrinking marginal rate, because contact hours share the same room,
// the same two consulting days and the same instructor once a cohort is
// already booked.
export const PRICE_PER_SEAT_BY_MODULE_COUNT = {
  3: 320,
  4: 395,
  5: 470,
  6: 545,
  7: 620,
  8: 695,
  9: 770,
  10: 850,
}

// Volume breaks — a bigger cohort costs LOOM less per employee to run (one
// room, one instructor trip, one set of materials printed once), so the
// saving is passed on at these two thresholds. Below 15 there is no break:
// this is priced as senior corporate training, not a bootcamp seat.
export const VOLUME_TIERS = [
  { id: 'standard', min: 1, max: 14, discount: 0, label: 'Standard' },
  { id: 'volume-15', min: 15, max: 29, discount: 0.10, label: 'Volume — 15+ employees' },
  { id: 'volume-30', min: 30, max: ENTERPRISE_MIN_SEATS - 1, discount: 0.18, label: 'Volume — 30+ employees' },
]

export const INDUSTRIES = [
  'Retail & e-commerce',
  'Hospitality, F&B',
  'Real estate & construction',
  'Healthcare & clinics',
  'Finance & professional services',
  'Manufacturing & logistics',
  'Education',
  'Government & NGO',
  'Other',
]

export const START_WINDOWS = [
  'Within 2 weeks',
  'Within a month',
  '1–3 months',
  'Flexible — still exploring',
]

// ————— derived helpers — every displayed number goes through these,
// never a second hardcoded copy of a figure already in the tables above —————

const clampModules = (n) => Math.min(MAX_MODULES, Math.max(MIN_MODULES, n))

/** Per-employee JOD for a given module count. Counts outside 3–10 clamp to
 *  the nearest priced tier rather than returning undefined. */
export function pricePerSeat(moduleCount) {
  return PRICE_PER_SEAT_BY_MODULE_COUNT[clampModules(moduleCount)]
}

/** Which volume tier a headcount falls into. Returns null at/above the
 *  enterprise floor — callers must treat null as "no computed price". */
export function tierForSeats(seats) {
  if (seats >= ENTERPRISE_MIN_SEATS) return null
  return VOLUME_TIERS.find((t) => seats >= t.min && seats <= t.max) || VOLUME_TIERS[0]
}

/** The single source of truth for the live estimate panel, the worked
 *  example, and the WhatsApp/email brief — all three call this, none of them
 *  compute a JOD figure of their own. */
export function estimate({ seats, moduleCount }) {
  const s = Number(seats) || 0
  const m = Number(moduleCount) || 0
  if (s < 1 || m < MIN_MODULES) return null
  if (s >= ENTERPRISE_MIN_SEATS) return { enterprise: true, seats: s, moduleCount: m }
  const perSeat = pricePerSeat(m)
  const tier = tierForSeats(s)
  const discountedPerSeat = Math.round(perSeat * (1 - tier.discount))
  return {
    enterprise: false,
    seats: s,
    moduleCount: m,
    perSeat,
    tier,
    discountedPerSeat,
    total: discountedPerSeat * s,
  }
}
