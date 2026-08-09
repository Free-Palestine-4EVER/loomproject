// ————————————————————————————————————————————————————————
// PRICING — the "starting from" band.
//
// The site had prices in two places and a floor in neither: The Machine quoted
// 89 JOD/month, /ai-workshops computed a live per-seat figure, and the three
// things LOOM is asked for most — a website, an app, a piece of software —
// carried no number at all. A visitor in Amman who cannot find a floor assumes
// the ceiling, and the ones who assume the ceiling do not send the form.
//
// EVERY FIGURE IS A FLOOR, NOT A QUOTE. Components must render these as
// "from X JOD" and never as "X JOD" — same rule offers.js already states for
// THE_MACHINE. `note` on each tier exists so the floor is never shown naked:
// it says what the floor buys, which is what stops the number reading as a
// bait price when the real quote comes back higher.
//
// The subscription and the workshop floors are IMPORTED, not retyped. They are
// quoted live elsewhere on the page (TheMachine.jsx, Workshops.jsx) and a
// second hardcoded copy is how two numbers for one product ship.
// ————————————————————————————————————————————————————————
import { THE_MACHINE } from './offers.js'
import { PRICE_PER_SEAT_BY_MODULE_COUNT, MIN_MODULES } from './workshops.js'

// The cheapest a workshop seat can be: the smallest bookable cohort, no volume
// break. tierForSeats() only ever discounts from here, so this is a true floor.
const WORKSHOP_FLOOR = PRICE_PER_SEAT_BY_MODULE_COUNT[MIN_MODULES]

export const PRICING = [
  {
    id: 'site',
    n: '01',
    name: 'Website',
    from: 750,
    unit: 'JOD',
    period: 'one-off',
    accent: 'var(--yarn-blue)',
    lede: 'A brand site that behaves like a campaign — built, not templated.',
    note: 'The floor buys a designed multi-section site in Arabic and English, on your domain, that you own outright.',
    includes: [
      'Design and build, no theme underneath',
      'Arabic and English, both written properly',
      'Mobile-first, measured on real devices',
      'Hosting set up and handed to you',
    ],
    cta: 'Price my website',
  },
  {
    id: 'store',
    n: '02',
    name: 'Store & platform',
    from: 1900,
    unit: 'JOD',
    period: 'one-off',
    accent: 'var(--yarn-violet)',
    lede: 'E-commerce, catalogues, booking — anything with a database behind it.',
    note: 'The floor buys a working store: products, checkout, orders and an admin you can actually run without us.',
    includes: [
      'Catalogue, cart and checkout',
      'Payment and delivery wired up',
      'An admin panel your team can run',
      'Product imagery generated, not shot',
    ],
    cta: 'Price my store',
  },
  {
    id: 'app',
    n: '03',
    name: 'Mobile app',
    from: 3900,
    unit: 'JOD',
    period: 'one-off',
    accent: 'var(--yarn-pink)',
    lede: 'iOS and Android from one codebase, submitted to both stores.',
    note: 'The floor buys a real, shippable app — design, build and store submission. Store fees and any paid service it calls are yours.',
    includes: [
      'One build, both stores',
      'Design system, not stock components',
      'Accounts, notifications, offline basics',
      'Submitted and shepherded through review',
    ],
    cta: 'Price my app',
  },
  {
    id: 'software',
    n: '04',
    name: 'Custom software',
    from: 5500,
    unit: 'JOD',
    period: 'one-off',
    accent: 'var(--yarn-gold)',
    lede: 'The internal tool nobody sells you — dashboards, configurators, AI agents.',
    note: 'The floor buys a scoped first version in production, not a prototype. Scope is agreed before anyone writes code.',
    includes: [
      'Scoped and specced before build',
      'Yours — source code handed over',
      'AI agents and automation where it pays',
      'Support window after handover',
    ],
    cta: 'Scope my software',
  },
  {
    id: 'machine',
    n: '05',
    name: 'The Machine',
    from: THE_MACHINE.priceFromJod,
    unit: 'JOD',
    period: 'per month',
    accent: 'var(--yarn-pink)',
    lede: 'A month of content — written, designed, scheduled, checked by a human.',
    note: THE_MACHINE.priceNote,
    includes: [
      `${THE_MACHINE.monthGrid.posts} photos a month`,
      `${THE_MACHINE.monthGrid.reels} videos a month`,
      'Arabic and English, every piece',
      'No retainer, no minimum term',
    ],
    cta: 'Put the machine on my brand',
    href: '#the-machine',
  },
  {
    id: 'workshops',
    n: '06',
    name: 'AI workshops',
    from: WORKSHOP_FLOOR,
    unit: 'JOD',
    period: 'per seat',
    accent: 'var(--yarn-blue)',
    lede: 'We teach your team to run the machine themselves.',
    note: 'Floor is the smallest bookable cohort at three modules. Cohorts of 15+ and 30+ get a volume break.',
    includes: [
      'Three modules minimum, ten available',
      'Run in your office, in Arabic or English',
      'Two consulting days included',
      'Live price on the booking page',
    ],
    cta: 'See the modules',
    href: '/ai-workshops',
  },
]

// The honest caveat, stated once under the grid rather than six times inside
// it. Without this the band reads as a menu, and a menu is a promise.
export const PRICING_NOTE =
  'Every figure is a starting point, not a quote. What moves it: how many languages, how much of the content already exists, and how deep the thing has to go. You get a fixed number in writing before anything starts — LOOM does not bill by the hour.'
