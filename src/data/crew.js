// The LOOM Crew — the studio's mascot cast, AND the four things a client
// rents. Each character owns a discipline, and between them they cover every
// service on the Capabilities list. Each ready member also carries `rentsAs`:
// the id of its matching product record in data/agents.js — the rentable
// specifics (what it does, what it needs from you, what it runs on, its
// cadence) live there once, as the single source of truth, and Crew.jsx looks
// the record up rather than duplicating it here. See agents.js's own header
// comment for why those four products exist and what they cost to build.
//
// The mapping is not a coin flip — three of the four pairs are the original
// author's own signal, still visible in the data:
//   · nexo → concierge: Nexo's own line ("answers your customers at 3am in
//     Arabic and English, books the table") already previews Concierge's job
//     almost word for word, and both share the violet accent (#7b2fbe).
//   · spooly → shelf: Shelf's whole pitch is keeping one voice across a
//     whole catalogue, in two languages, without drifting — that IS Spooly's
//     "weaves it back tighter", applied to product copy instead of brand.
//   · flick → spool: Flick shoots the content; Spool is the monthly engine
//     that keeps writing and queuing more of it after the shoot wraps.
//   · prism → ledger: the weakest link, kept honest rather than forced —
//     Ledger's channels include "site forms", a surface Prism is the one who
//     builds, and lead-routing is closer to Prism's systems/web territory
//     than to any other crew member's.
//
// The first four shipped with the site. The second four are new hires: designed,
// written and cast, but holding at `ready: false` until their reference art is
// rendered into /public/img/crew/. The Crew grid renders ready members only, so
// they arrive as a set the moment the art lands rather than as four broken
// images. Their generation prompts are in campaign-prompts/loom-hq-film.md.

export const CREW = [
  {
    id: 'spooly',
    name: 'Spooly',
    role: 'The Weaver',
    owns: 'Brand & Strategy',
    line: 'Starts every project by pulling one thread until the whole idea unravels — then weaves it back tighter.',
    quote: 'Give me the thread. I’ll give you the fabric.',
    accent: '#f21c8c',
    img: '/img/crew/spooly.webp',
    ready: true,
    rentsAs: 'shelf',
  },
  {
    id: 'flick',
    name: 'Flick',
    role: 'The Director',
    owns: 'Photo, Film & Campaigns',
    line: 'Has never met a product it couldn’t light. Shoots a season of content before lunch.',
    quote: 'One more take. This one’s the one.',
    accent: '#59e6ff',
    img: '/img/crew/flick.webp',
    ready: true,
    rentsAs: 'spool',
  },
  {
    id: 'nexo',
    name: 'Nexo',
    role: 'The Agent',
    owns: 'AI Systems & Automation',
    line: 'Answers your customers at 3am in Arabic and English, books the table, and never asks for a day off.',
    quote: 'Already replied. Twice.',
    accent: '#7b2fbe',
    img: '/img/crew/nexo.webp',
    ready: true,
    rentsAs: 'concierge',
  },
  {
    id: 'prism',
    name: 'Prism',
    role: 'The Builder',
    owns: '3D, AR & Web',
    line: 'Turns flat rooms into worlds you can walk through. Floats, because gravity is a layout constraint.',
    quote: 'Everything is a dimension away.',
    accent: '#ffc740',
    img: '/img/crew/prism.webp',
    ready: true,
    rentsAs: 'ledger',
  },

  // ——— the new hires ———
  {
    id: 'bobbin',
    name: 'Bobbin',
    role: 'The Producer',
    owns: 'Production & Delivery',
    line: 'Knows what every floor is doing without asking. Has never once been surprised by a deadline.',
    quote: 'A deadline is a fabric. Don’t stretch it.',
    accent: '#f0d9a8',
    img: '/img/crew/bobbin.webp',
    ready: false,
  },
  {
    id: 'skein',
    name: 'Skein',
    role: 'The Voice',
    owns: 'Social & Content',
    line: 'Writes a month of posts before you’ve finished your coffee, in two languages, without going off-brand once.',
    quote: 'Say it daily or don’t say it.',
    accent: '#ff5fa8',
    img: '/img/crew/skein.webp',
    ready: false,
  },
  {
    id: 'pulse',
    name: 'Pulse',
    role: 'The Tracker',
    owns: 'Performance & Media',
    line: 'Watches every number so the rest of the crew can stay brave. Kills its own favourite ad without blinking.',
    quote: 'If it didn’t move, it didn’t happen.',
    accent: '#2fd8c4',
    img: '/img/crew/pulse.webp',
    ready: false,
  },
  {
    id: 'knot',
    name: 'Knot',
    role: 'The Closer',
    owns: 'New Business & Partnerships',
    line: 'Turns a cold first call into a five-year rope. Remembers your kids’ names before the second meeting.',
    quote: 'Two threads. One knot. Done.',
    accent: '#b98cff',
    img: '/img/crew/knot.webp',
    ready: false,
  },
]

export const CREW_READY = CREW.filter((c) => c.ready)
