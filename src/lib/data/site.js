// ————————————————————————————————————————————
// LOOM — single source of truth for all site content.
// Portfolio drawn from the studio’s 2026 profile deck.
// ————————————————————————————————————————————

export const BRAND = {
  name: 'LOOM',
  tagline: 'We weave brands on the edge of creativity.',
  positioning: 'The AI-native creative agency',
  cities: ['Amman', 'Sarajevo'],
  whatsapp: 'https://wa.me/962791792129',
  phoneJO: '+962 79 179 2129',
  email: 'mofakhori@gmail.com',
}

// ————————————————————————————————————————————
// How FORGE gets paid (components/Forge.jsx).
//
// CliQ, confirmed over WhatsApp, settled by hand — there is no processor on
// the site and nothing here touches a card. The panel asks for a quantity,
// mints a reference, and hands the visitor to WhatsApp; an operator confirms
// the transfer and credits the account with /admin/grant.
//
// `alias` is the ONLY thing standing between that flow and the customer being
// able to pay before they message: fill it in and the panel prints the CliQ
// alias with a copy button, leave it empty and the panel says the details will
// arrive on WhatsApp. Both paths are complete — do not ship a placeholder
// alias, an alias that is wrong by one character sends somebody's money to a
// stranger and there is no getting it back.
// ————————————————————————————————————————————
// Confirmed by the client 10 Aug 2026. The alias is the same number as
// BRAND.phoneJO / BRAND.whatsapp above — that is not a coincidence to tidy
// away into a shared constant: a CliQ alias and a phone number are different
// facts that happen to share a value today, and pointing one at the other
// means changing the WhatsApp line would silently redirect payments.
export const CLIQ = {
  alias: '0791792129',
  name: 'LOOM STUDIO', // the name the payer will see on the CliQ confirmation screen
}

export const CLIENT_WALL = [
  'United Colors of Benetton', 'UNICEF', 'Vodafone', 'MAC', 'Max Factor',
  'Espresso Lab', 'Savia', 'Scion International', 'Weitnauer', 'Normfest',
  'Boccapiena', 'Zen2Fit', 'Herbas', 'MBA Centar', 'Maestro Suits',
  'Panda Kids', 'Brill Cosmetix', 'Zaman Events', 'The Place 87',
]

export const SERVICES = [
  {
    n: '01', title: 'AI & Automation',
    blurb: 'Generative campaign imagery, AI film, content engines and chat agents — production systems that compound, not one-off posts.',
    tags: ['Generative imagery & film', 'AI content systems', 'Chat & voice agents', 'Marketing automation'],
  },
  {
    n: '02', title: 'Branding & Identity',
    blurb: 'Strategy, positioning and visual identity systems built to outlive the trend cycle — from first mark to full brand world.',
    tags: ['Brand strategy & positioning', 'Visual identity systems', 'Rebranding & evolution'],
  },
  {
    n: '03', title: 'Social & Content',
    blurb: 'Content calendars, campaign concepts and daily storytelling that keep a brand alive between launches.',
    tags: ['Social strategy', 'Content creation', 'Campaign concepts', 'Digital storytelling'],
  },
  {
    n: '04', title: 'Web & App',
    blurb: 'Websites, e-commerce and product UI that perform like campaigns and feel like craft.',
    tags: ['Web design & development', 'E-commerce & platforms', 'App design UI/UX'],
  },
  {
    n: '05', title: 'Campaigns & Production',
    blurb: 'Key visuals, launch films, OOH and retail worlds — concept to shipped, in one pipeline.',
    tags: ['Key visuals', 'Launch campaigns', 'OOH & retail', 'Photo & film production'],
  },
  {
    n: '06', title: 'AR & Emerging Tech',
    blurb: 'CGI characters in real streets, AR activations and experimental formats that make people stop walking.',
    tags: ['CGI & VFX', 'Augmented reality', 'Interactive activations'],
  },
]

export const PROCESS = [
  { n: '01', title: 'Intent', body: 'Every project starts with intent, not aesthetics. We interrogate the brief until the real problem shows itself.' },
  { n: '02', title: 'Weave', body: 'Strategy, creativity and technology braided into one direction — where emotion meets logic and ideas are backed by systems.' },
  { n: '03', title: 'Craft', body: 'No templates. No shortcuts. Identity, content, code and CGI built properly, by hand and by machine.' },
  { n: '04', title: 'Perform', body: 'Work designed to perform, engage and last beyond the scroll — then measured, tuned and pushed further.' },
]

export const STATS = [
  { value: 28, suffix: '+', label: 'Brands woven' },
  { value: 7, suffix: '', label: 'Countries shipped to' },
  { value: 12, suffix: '+', label: 'Apps & tools in the lab' },
  { value: 2, suffix: '', label: 'Studios — Amman × Sarajevo' },
]

// ————— LOOM-built products —————
export const APPS = [
  {
    name: 'Lahza', ar: 'لحظة', tag: 'iOS · Events',
    platforms: ['ios'],
    store: 'TestFlight',
    shot: '/img/apps/lahza.webp',
    logo: '/img/apps/lahza-icon.webp',
    screen: 'lahza',
    icon: 'heart-frame',
    grad: ['#f21c8c', '#7b2fbe'],
    glyph: 'M12 21s-7-4.6-9.5-9A5.6 5.6 0 0 1 12 6.3 5.6 5.6 0 0 1 21.5 12C19 16.4 12 21 12 21Z',
    blurb: 'Wedding photo-sharing — guests scan a QR and every moment lands in one live album.',
  },
  {
    name: 'Evora Scan', tag: 'iOS · LiDAR & AR',
    platforms: ['ios'],
    // real device capture — RoomPlan needs LiDAR hardware, so this is the
    // App Store screenshot's own device frame, cropped to the screen
    shot: '/img/apps/evora-scan.webp',
    logo: '/img/apps/evora-scan-icon.webp',
    screen: 'evora-scan',
    icon: 'scan-room',
    grad: ['#59e6ff', '#7b2fbe'],
    glyph: 'M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M8 12h8M12 8v8',
    blurb: 'Point a phone at a room — get a 3D model, a floor plan and walk-in AR, in minutes.',
  },
  /* Glowbar removed here too — 14 Aug 2026, same client call that took it out
     of SUITE (suite.js). This `APPS` array currently has no consumer anywhere
     in src/, so nothing was rendering from it; it is cleared anyway so the two
     product lists cannot disagree, and so a future component that does start
     reading APPS does not quietly bring Glowbar back. */
  {
    name: 'TAWSIYAT', tag: 'Web · Ordering',
    shot: '/img/apps/tawsiyat.webp',
    platforms: ['web'],
    screen: 'tawsiyat',
    icon: 'receipt',
    grad: ['#2ee6a8', '#59e6ff'],
    glyph: 'M4 6h16M4 12h16M4 18h10',
    blurb: 'Pickup-first food ordering for Amman — menus imported, orders claimed by code.',
  },
  {
    name: 'TrueSize AR', tag: 'iOS · AR Commerce',
    platforms: ['ios'],
    screen: 'truesize',
    icon: 'cube-ar',
    grad: ['#7b2fbe', '#f21c8c'],
    glyph: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3ZM12 12l8-4.5M12 12v9M12 12L4 7.5',
    blurb: 'Drop true-to-scale products into a customer’s room before they buy.',
  },
  {
    name: 'Morphic', tag: 'iOS · AI Imaging',
    platforms: ['ios'],
    store: 'App Store',
    shot: '/img/apps/morphic.webp',
    logo: '/img/apps/morphic-icon.webp',
    screen: 'morphic',
    icon: 'face-morph',
    grad: ['#f21c8c', '#ffc740'],
    glyph: 'M12 4a8 8 0 1 0 8 8M16 4h4v4M21 3l-6 6',
    blurb: 'On-device face morphing — studio-grade edits with zero photos leaving the phone.',
  },
  // Last, deliberately: seven cards leave a lone card in the final row, and
  // the grid centres it (styles.css, .app-cell:last-child:nth-child(3n+1)).
  // KwaKwa is the one product here with a live, working download link, so it
  // is the one that earns that centred slot.
  {
    name: 'KwaKwa', tag: 'iOS · Couples',
    platforms: ['ios'],
    store: 'TestFlight',
    // real device capture (iPhone 16, 1206×2622) from the running build —
    // the sign-in surface, because it is the one screen carrying the
    // duckling, the wordmark and the whole warmth of the app at once
    // The stage cycles `shots` — three real captures from the running build:
    // the sign-in surface, the name prompt, and a live chat with a voice quack
    // and the shared playlist. `shot` stays the poster/first frame so anything
    // that only knows about one image (a preload, an og:image) still works.
    shot: '/img/apps/kwakwa.webp',
    shots: ['/img/apps/kwakwa.webp', '/img/apps/kwakwa-2.webp', '/img/apps/kwakwa-3.webp'],
    // `mocks` OVERRIDES the stage's own iPhone frame: these are the rendered
    // KwaKwa mockups with the pond background cut away (macOS Vision subject
    // mask — see scratchpad/cutout.swift), so each image already carries its
    // own device at its own tilt. The stage drops the frame + glass entirely
    // for an app that has them and cycles these instead, on the same 2s beat.
    // All three are padded onto one 460 × 790 canvas so the cycle never nudges
    // the device; each phone keeps the position it was composed at.
    // ordered for the fan, not chronologically: the middle slot is the one
    // rendered at full size and in front, so the duck-hatching screen (the
    // shot that says what the app IS) sits there, with chat and the shared
    // playlist flanking it
    mocks: [
      '/img/apps/kwakwa-mock-2.webp',
      '/img/apps/kwakwa-mock-1.webp',
      '/img/apps/kwakwa-mock-3.webp',
    ],
    logo: '/img/apps/kwakwa-icon.webp',
    icon: 'duck',
    grad: ['#ffc740', '#ff9f5a'],
    glyph: 'M12 4a4 4 0 0 1 4 4v1h3l-2.4 2.4A7 7 0 0 1 5 12V8a4 4 0 0 1 4-4h3ZM10 8h.01',
    blurb: 'A private pond for two — chat, calls, a shared playlist, and an egg you raise into a duck together.',
  },
]

// LOOM's own product line — apps the studio is building for itself, not for a
// client. `status` is the one honest claim each card is allowed to make: no
// store links, no App Store badges, no download counts or user numbers,
// because none of that exists yet for these four. When one ships for real,
// give it a `store` field the way APPS entries above do — OwnApps.jsx already
// knows how to render that state, it is just never been true yet.
export const OWN_APPS = [
  {
    id: 'loom-clients',
    name: 'LOOM for Clients', tag: 'iOS · Client portal',
    status: 'In development',
    grad: ['#f21c8c', '#7b2fbe'],
    glyph: 'M4 5.5h16v13H4v-13ZM4 9.5h16M8 13h4M8 16h7',
    blurb: 'The account in an app — briefs, deliverables and the monthly report, without the group chat.',
  },
  {
    id: 'snapvault',
    name: 'SNAPVAULT', tag: 'iOS · Screenshot triage, EN + AR',
    status: 'In development',
    grad: ['#ffc740', '#f21c8c'],
    glyph: 'M4 8V5.5a1.5 1.5 0 0 1 1.5-1.5H8M20 8V5.5A1.5 1.5 0 0 0 18.5 4H16M4 16v2.5A1.5 1.5 0 0 0 5.5 20H8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 9h8v6H8Z',
    blurb: 'The camera roll’s screenshot pile, sorted — bilingual, on-device, nothing uploaded to sort it.',
  },
  {
    id: 'parallax',
    name: 'PARALLAX', tag: 'iOS · Depth-photo parallax',
    status: 'In development',
    grad: ['#7b2fbe', '#2ee6a8'],
    glyph: 'M3 7l9-3 9 3v10l-9 3-9-3V7ZM3 7l9 3 9-3M12 10v10',
    blurb: 'Turns an ordinary iPhone photo’s depth data into a living, tilt-reactive image.',
  },
  {
    id: 'solid',
    name: 'SOLID', tag: 'iOS · 3D object capture',
    status: 'In development',
    grad: ['#2ee6a8', '#59e6ff'],
    glyph: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3ZM4 7.5l8 4.5 8-4.5M12 12v9',
    blurb: 'Walk around a real object with the camera; get a clean 3D scan out the other side.',
  },
]


export const TOOLS = [
  {
    name: 'KUN',
    shot: '/img/lab/kun.webp', kicker: 'Talk-to-3D studio',
    blurb: 'Describe a scene, watch it assemble — a conversational 3D creation studio.',
    grad: ['#f21c8c', '#7b2fbe'],
    tag: 'Generative 3D',
  },
  {
    name: 'ORBIT',
    shot: '/img/lab/orbit.webp', kicker: '3D website editor',
    blurb: 'A Wix for 3D worlds — scenes, scroll choreography and publishing in one canvas.',
    grad: ['#59e6ff', '#7b2fbe'],
    tag: 'WebGL',
  },
  {
    name: 'ATELIER',
    shot: '/img/lab/atelier.webp', kicker: 'AI interior designer',
    blurb: 'Furnishes full apartments in 3D — procedural furniture, palettes and lighting.',
    grad: ['#ffc740', '#f21c8c'],
    tag: 'Spatial AI',
  },
  {
    name: 'SPLAT LAB', kicker: 'Gaussian splatting',
    blurb: 'Real spaces captured as photoreal 3D — trained on our own Apple-silicon rig.',
    grad: ['#2ee6a8', '#59e6ff'],
    tag: 'Capture',
  },
  {
    name: '2D→3D STUDIO',
    shot: '/img/lab/2d3d.webp', kicker: 'Plans to rooms',
    blurb: 'Flat floor plans become furnished, explorable 3D rooms — walls and slots auto-solved.',
    grad: ['#7b2fbe', '#59e6ff'],
    tag: 'Architecture',
  },
  {
    name: 'TESSERA',
    shot: '/img/lab/tessera.webp', kicker: 'Pattern engine',
    blurb: 'A generative lattice-pattern editor — brand patterns exported straight to code.',
    grad: ['#f21c8c', '#ffc740'],
    tag: 'Design systems',
  },
]


export const NICHE_GROUPS = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food & Drink' },
  { id: 'health', label: 'Health & Fitness' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'retail', label: 'Retail & Brands' },
  { id: 'property', label: 'Property & Stay' },
  { id: 'services', label: 'Services' },
  { id: 'creative', label: 'Creative & Causes' },
]

// ————— The four every client gets. Stated ONCE, here, and rendered once by
// Solutions.jsx — never repeated per industry. The live page used to restate
// them inside all thirty `deliverables` arrays ("Google Maps domination"
// appeared in 17 of 30, "Reels engine" in 12), which made the section read as
// one product with the nouns swapped. Anything universal belongs in this
// array; `deliverables` below is ONLY what is specific to that trade.
//
// `img`/`alt` were added Aug 2026 when the four went from plain text columns to
// picture-led ones. THE PICTURES ARE NOT EVIDENCE AND MUST NEVER BE READ AS
// ANY. Two of these four — SEO & Google Business, and paid ads — have no case
// study anywhere in CASES to draw a real screenshot from, and the other two are
// only evidenced as imagery feeding a store, not as a site LOOM built. So none
// of the four is illustrated with a screenshot, a dashboard, a chart with
// numbers on it or anything else a reader could mistake for a result. Each is a
// felted-wool still life in the same house language as /img/needs — the same
// material the buttons and the mascots are made of — and every panel, card and
// screen inside them is deliberately BLANK. If a re-run ever comes back with a
// legible figure, a ranking, a follower count or an invented mark on it, that
// render is unusable here; regenerate it, do not crop it and hope.
export const CORE_SERVICES = [
  {
    title: 'Website or online store',
    blurb: 'Bilingual, fast, and built to sell — Arabic that reads as Arabic, not a translation.',
    points: ['Booking, ordering or checkout built in', 'Works on a phone on 4G', 'You own it — no monthly hostage'],
    img: '/img/core/website.webp',
    alt: 'A knitted laptop and a felted phone in wool, a yarn cable running from one into a small woollen shopping bag, their screens blank',
  },
  {
    title: 'SEO & Google Business',
    blurb: 'Get found for what people actually type, and look right when they find you.',
    points: ['Ranking for real local searches', 'Reviews answered every week', 'Hours, photos and listings always correct'],
    img: '/img/core/seo.webp',
    alt: 'A felted map pin standing on a knitted map of stitched streets, a woollen magnifying glass leaning against it and five knitted stars strung above',
  },
  {
    title: 'Content engine',
    blurb: 'One shoot day becomes a month of posts, reels and stories — scheduled, not scrambled.',
    points: ['A month of content per shoot', 'Posted at the hours your buyers are awake', 'Arabic and English captions'],
    img: '/img/core/content.webp',
    alt: 'A knitted camera on a small tripod feeding one long ribbon of wool that folds into a stack of blank felted tiles, a grid of blank knitted squares pinned behind it',
  },
  {
    title: 'Paid ads that report back',
    blurb: 'Meta and Google campaigns with the tracking to prove what came back.',
    points: ['Built and managed monthly', 'Tracking that survives iOS', 'A number you can check, not a vibe'],
    img: '/img/core/ads.webp',
    alt: 'A knitted board with a single blue yarn line stitched climbing across it above four blank woollen bars, a felted target and arrow beside it',
  },
]

// The entry offer. A fixed price, deliberately — `#pricing` renders every
// figure as "from X" because those are floors, but a tripwire offer with a
// floor price is not a tripwire offer.
export const ENTRY_OFFER = {
  title: '100 ultra-quality photos',
  price: '49 JOD',
  blurb: 'A hundred finished, on-brand images of your products, your space, your menu — yours to own and use anywhere. One day in a studio costs more than this and gets you twelve pictures.',
}

// ————— Solutions Explorer: the 30 niches, three offers each —————
// THREE, not four, and each one specific to the trade. Reviewed industry by
// industry Aug 2026; all thirty signed off, none flagged.
export const NICHES = [
  {
    key: 'restaurant', name: 'Restaurants', group: 'food',
    hook: 'A full room on a Tuesday.',
    agent: 'A WhatsApp host that takes the booking straight onto a live floor plan — party size, allergy, high chair — and never double-seats a table.',
    moon: 'From the neighbourhood spot to the name people book a week ahead.',
    deliverables: [
      'QR menu you can look inside — A code on every table opens the menu in 3D — each dish placed on their real table in AR before they order.',
      'WhatsApp host on a live floor plan — Takes the booking straight onto real tables. Never double-seats, never sleeps.',
      'Dead-hour filler — Reads tomorrow\'s empty covers and sends one offer to the guests most likely to fill them.',
    ],
  },
  {
    key: 'cafe', name: 'Cafés & Coffee', group: 'food',
    hook: 'The regulars come back without being asked.',
    agent: 'A counter agent that recognises the returning number, remembers the usual order, and pushes the seasonal drop to the people who actually drink it.',
    moon: 'From one counter to the corner the whole street tags.',
    deliverables: [
      'The barista who remembers — Tracks the streak on the phone number, names the usual, sends the free cup at the right visit.',
      'Skip the queue — Order and pay before you park; the cup is on the counter with a name on it.',
      'Bean-to-cup story page — The farm, the roast curve, the cup — the page that justifies 4 JOD next to a 2 JOD shop.',
    ],
  },
  {
    key: 'bakery', name: 'Bakeries & Sweets', group: 'food',
    hook: 'The cake is sold before the oven is on.',
    agent: 'An order agent that turns a photo and a date into a quote, takes the deposit, and locks the slot in the production calendar.',
    moon: 'From word of mouth to the name every bride is sent to.',
    deliverables: [
      'Photo in, quote out — Customer sends a reference picture; the agent prices it, takes the deposit and books the oven.',
      'Cake designer in 3D — Tiers, colour, flowers chosen live, then previewed in AR on the bride\'s real table.',
      'Season capacity calendar — Eid, Ramadan and wedding season pre-loaded with caps — stop overselling one week and underselling the next.',
    ],
  },
  {
    key: 'burger', name: 'Fast Food & Burgers', group: 'food',
    hook: 'Own the order before the aggregator takes its cut.',
    agent: 'An ordering agent on your own channel — takes the order, upsells the combo, and repeat customers never cost you a commission again.',
    moon: 'From one branch to a name people crave by name, not by app.',
    deliverables: [
      'Ordering that beats Talabat\'s commission — Full menu on WhatsApp with saved usuals. Moving a third of delivery direct is a pay rise, not a campaign.',
      'QR menu with the stack rendered — Every burger exploded layer by layer, add-ons tapped straight into the order.',
      'Win-back on the list you now own — Direct orders mean the numbers are yours. Lapsed customers get an offer at the right gap.',
    ],
  },
  {
    key: 'fine-dining', name: 'Fine Dining', group: 'food',
    hook: 'The evening starts at the booking.',
    agent: 'A concierge that books the table, records the anniversary and the allergy, and hands the room a briefed guest instead of a name.',
    moon: 'From a destination to the reservation people plan a trip around.',
    deliverables: [
      'Concierge with a guest book — Books the table, then quietly remembers the wine, the seat, the anniversary, the allergy.',
      'One unbroken take — A single tracking shot from the pass to the last table, cut for three channels.',
      'The tasting menu, previewed — Every course in 3D from the reservation confirmation and a discreet QR on the menu card.',
    ],
  },
  {
    key: 'catering', name: 'Catering & Events', group: 'food',
    hook: 'The proposal lands before the client hangs up.',
    agent: 'A quoting agent that takes headcount, date, menu tier and venue, and returns a branded, priced proposal in under a minute.',
    moon: 'From weekend gigs to the caterer every planner calls first.',
    deliverables: [
      'Headcount in, proposal out — Guests, date and service style go in; a branded, priced PDF comes back in under a minute.',
      'See the spread before the deposit — Buffet layouts built in 3D at the client\'s actual venue dimensions.',
      'Event-day pack, generated — Every confirmed job auto-produces the kitchen sheet, shopping list, rota and timings.',
    ],
  },
  {
    key: 'dental', name: 'Dental Clinics', group: 'health',
    hook: 'The nervous patient books anyway.',
    agent: 'An agent that answers the price question honestly, explains the procedure without jargon, and books the chair before the nerve returns.',
    moon: 'From one chair to a calendar that fills itself a month out.',
    deliverables: [
      'The price question, answered at midnight — Honest ranges for every treatment, then the chair booked — the two things reception can\'t do at 11pm.',
      'Smile simulation — Veneers, whitening and alignment modelled on the patient\'s own face. Nobody buys a smile they can\'t see.',
      'Treatment-plan follow-through — Chases the patient who did stage one and vanished. Your biggest untapped revenue is already in the file.',
    ],
  },
  {
    key: 'clinic', name: 'Medical Clinics', group: 'health',
    hook: 'The right doctor, on the first message.',
    agent: 'A triage agent that reads the complaint, points to the right department, books it, and never gives medical advice.',
    moon: 'From a single practice to the clinic patients name to their family.',
    deliverables: [
      'Symptom-to-specialist triage — Routes the complaint to the correct clinician and books it. No diagnosis, emergencies escalated to a human.',
      'Patient portal — Results, prescriptions and invoices behind a login, so reception stops being a lookup service.',
      'Doctor films — A short, calm piece per clinician. People choose the doctor, not the clinic.',
    ],
  },
  {
    key: 'pharmacy', name: 'Pharmacies', group: 'health',
    hook: 'The refill arrives before the box runs out.',
    agent: 'A refill agent that counts down the supply, asks once, checks stock and sends the driver.',
    moon: 'From a counter people pass to the pharmacy people message.',
    deliverables: [
      'Refill clock — Knows a 30-day pack started on the 3rd, asks on the 28th, checks stock, sends the driver.',
      'Live stock answer — \'Do you have it?\' answered in seconds with a substitute when you don\'t — that\'s most of your inbound.',
      'The front-of-shop half, online — Skincare, baby and supplements merchandised properly. Dispensing pays rent; the shelf pays profit.',
    ],
  },
  {
    key: 'salon', name: 'Beauty Salons', group: 'beauty',
    hook: 'Booked solid, never double-booked.',
    agent: 'A booking agent that knows which stylist does which service, how long it takes, and what the client had last time.',
    moon: 'From a full chair to the name every bride is told to call.',
    deliverables: [
      'Booking that understands the diary — Matches service to stylist to duration — a balayage never gets a 30-minute slot.',
      'Try the colour before the chair — Cut, colour and length agreed on her own photo. Ends the three-hour redo.',
      'Rebook rhythm — Knows the root touch-up is due in six weeks and asks in week five, same stylist held.',
    ],
  },
  {
    key: 'barber', name: 'Barbershops', group: 'beauty',
    hook: 'Every chair full before you unlock.',
    agent: 'An agent that books chairs by barber, texts a regular when his cut is due, and fills a cancellation in four minutes.',
    moon: 'From walk-ins only to a booked-out week.',
    deliverables: [
      'Cut-cycle recall — Learns each client\'s interval — 14, 21, 30 days — and messages at exactly the right moment. Almost nobody in Amman runs this.',
      'Live queue and waitlist — A public wait time and instant offers when someone cancels. Saturday overflow becomes Tuesday bookings.',
      'Barber profile pages — Each barber with their own gallery and booking link to post. Clients follow a barber; this keeps them in the shop.',
    ],
  },
  {
    key: 'medspa', name: 'Med Spas & Aesthetics', group: 'health',
    hook: 'The result, before the deposit.',
    agent: 'A consult agent that qualifies for suitability and budget, answers the awkward questions, and books only the leads worth a clinician\'s hour.',
    moon: 'From one-off treatments to a clinic with a waitlist.',
    deliverables: [
      'Qualify before you consult — Screens for suitability and budget. A clinician\'s free hour is the most expensive thing you give away.',
      'Outcome simulation — Filler and resurfacing previewed on her own face at realistic strength — closes the sale and prevents the complaint.',
      'Course tracking — Six-session courses spaced automatically with top-up recall at the right month.',
    ],
  },
  {
    key: 'gym', name: 'Gyms & Fitness', group: 'health',
    hook: 'Catch the member before they quit.',
    agent: 'A retention agent watching attendance — when someone\'s pattern breaks, it reaches out before the cancellation form does.',
    moon: 'From one floor to a citywide membership brand.',
    deliverables: [
      'Churn radar — Flags the member whose visits drop off and reaches out before month end. One in five saved beats any ad budget.',
      'Trial-to-member sequence — A structured seven days: welcome, first session booked, coach intro, offer at day five.',
      'Walk the floor first — A 3D tour of the floor and changing rooms. Gym anxiety is the biggest silent objection you face.',
    ],
  },
  {
    key: 'fashion', name: 'Fashion Boutiques', group: 'retail',
    hook: 'A stylist in every DM.',
    agent: 'A styling agent that answers size, stock and fit instantly, suggests the pieces that go with it, and takes the order in the thread.',
    moon: 'From one rack to a label people travel across the city for.',
    deliverables: [
      'Stock and size, answered in the DM — Live inventory in the chat plus three things that finish the look, checkout without leaving the thread.',
      'Fit before purchase — AR try-on and real per-garment measurements — returns are a missing-information problem.',
      'Drop mechanics — Waitlists, countdowns, early access for repeat buyers and restock alerts per size.',
    ],
  },
  {
    key: 'jewelry', name: 'Jewelry', group: 'retail',
    hook: 'Designed on the phone, made in the workshop.',
    agent: 'A concierge that handles the enquiry, then hands the client a configurator instead of a conversation.',
    moon: 'From counter sales to a house clients ask for by name.',
    deliverables: [
      'Build the piece live — Metal, stone, setting and engraving on a real-time 3D model that prices itself as it changes.',
      'On the hand, at true scale — AR try-on for rings and necklaces — scale is the one thing jewellery photography always fails at.',
      'The proposal concierge — Handles the discreet enquiry: budget, ring size sourced quietly, delivery timed to the day.',
    ],
  },
  {
    key: 'perfume', name: 'Perfume Houses', group: 'retail',
    hook: 'Sell a scent through a screen.',
    agent: 'A fragrance agent that interviews the buyer about what they already wear and love, and matches them to a bottle with reasons.',
    moon: 'From a counter in Amman to a house people search for by name.',
    deliverables: [
      'Scent matchmaking — Asks what they wear and hated, then recommends from your range in note language. Someone has to translate smell.',
      'Notes as film — Each fragrance art-directed as a short piece — the oud, the smoke, the citrus. Not a bottle on white.',
      'Discovery set, credited back — Samples ship cheap and the cost comes off the full bottle. Removes the blind-buy risk.',
    ],
  },
  {
    key: 'furniture', name: 'Furniture & Home', group: 'retail',
    hook: 'In their room before it\'s in the van.',
    agent: 'A sales agent that quotes fabric, size and lead time, then puts the piece at true scale in the customer\'s living room.',
    moon: 'From a showroom in one district to orders across the country.',
    deliverables: [
      'True-scale AR placement — The exact piece standing on their real floor. \'Will it fit\' is the last objection and it\'s answerable in ten seconds.',
      'Configurator on the model — Fabric, wood, leg and size changed live with the price moving. Every swatch-book option is a variant you never sell.',
      'Plan to furnished room — Customer sends a floor plan, it comes back a furnished 3D room using your catalogue. Turns one sofa into a room.',
    ],
  },
  {
    key: 'realestate', name: 'Real Estate', group: 'property',
    hook: 'Walk the unit before the concrete cures.',
    agent: 'A qualifying agent that establishes budget, financing, timeline and area before anyone gets in a car.',
    moon: 'From listings that sit to units that sell off-plan.',
    deliverables: [
      'Off-plan 3D walkthrough — Layout, light through the real windows, the view from that actual floor. Off-plan sells on imagination.',
      'Qualify before the viewing — Budget, financing and timeline settled in chat. Half your agents\' viewings shouldn\'t happen.',
      'Payment-plan calculator — Down payment, instalments and handover modelled live on each unit. Every buyer does this maths anyway.',
    ],
  },
  {
    key: 'construction', name: 'Construction', group: 'property',
    hook: 'Win the tender on the render.',
    agent: 'An inquiry agent that separates a serious developer from a homeowner pricing a wall, and routes each correctly.',
    moon: 'From tender-by-referral to a pipeline that fills itself.',
    deliverables: [
      'The build, walkable before the pour — Photoreal renders and a navigable model from the drawings. Committees approve what they can see.',
      'Proposal generator — Scope, phases, pricing and timeline into a consistent branded document in minutes.',
      'Client progress portal — Owners see milestones, photos and variations without phoning the site manager.',
    ],
  },
  {
    key: 'auto', name: 'Car Dealers & Rental', group: 'services',
    hook: 'The test drive is booked before the lot opens.',
    agent: 'A sales agent that answers spec, trim, financing and availability instantly, and books the test drive at a real time.',
    moon: 'From lot traffic to a booked test-drive calendar.',
    deliverables: [
      'Every trim, walkable — A 3D showroom with interiors — the buyer sits in the trim you don\'t have parked outside.',
      'Financing answered up front — Down payment and monthly instalment estimated in the chat. Opacity sends people to the dealer who\'s clear.',
      'Rental flow end-to-end — Dates, licence upload, deposit and contract done before pickup. Forty minutes becomes a signature.',
    ],
  },
  {
    key: 'travel', name: 'Travel Agencies', group: 'services',
    hook: 'The itinerary writes itself overnight.',
    agent: 'A trip agent that interviews on dates, budget, pace and party, then produces a real day-by-day itinerary with live pricing.',
    moon: 'From one-off bookings to the agency people ask for by destination.',
    deliverables: [
      'Overnight itinerary builder — A costed day-by-day plan produced from a chat, ready for you to price in the morning.',
      'Preview the hotel, not the photo — 3D room and resort previews. Hotel photography lies and clients know it.',
      'Traveller companion — Visa checklist, documents, arrival instructions and the 2am airport message answered.',
    ],
  },
  {
    key: 'hotel', name: 'Hotels & Stays', group: 'property',
    hook: 'Book direct, keep the commission.',
    agent: 'A concierge that answers pre-booking questions, beats the OTA price on your own site, and handles the stay once they arrive.',
    moon: 'From a listing among hundreds to the stay people search for by name.',
    deliverables: [
      'Direct booking that undercuts the OTA — Your own engine with a guaranteed-lower rate. A fifth of bookings moved direct is pure margin.',
      'The exact room, not a room type — 3D tours per room with the real view from that floor. The gap is where bad reviews come from.',
      'Last-minute inventory push — Unsold rooms at 4pm offered to a local list. Something beats an empty night.',
    ],
  },
  {
    key: 'school', name: 'Schools & Academies', group: 'services',
    hook: 'Admissions that run without the office.',
    agent: 'An admissions agent that answers curriculum, fees, transport and age policy, books the tour, and chases the unfinished form.',
    moon: 'From word-of-mouth enrolment to a waitlist every term.',
    deliverables: [
      'The admissions desk that never closes — Fees, curriculum, bus routes and entry requirements answered instantly, tour booked, form chased to signature.',
      'Walk the campus first — A 3D tour of classrooms, labs and the yard — visible from another country.',
      'Application and document portal — Certificates, transcripts and fee payment in one tracked pipeline. Chasing paper is what eats your team.',
    ],
  },
  {
    key: 'kids', name: 'Nurseries & Kids', group: 'services',
    hook: 'The parent who can see is the parent who stays.',
    agent: 'An enrolment agent that handles the anxious questions honestly — ratios, staff training, food, safety — and books the visit.',
    moon: 'From a neighbourhood daycare to the nursery every parent is told about.',
    deliverables: [
      'The daily thread — A private end-of-day note per child: ate, slept, played, learned, one photo. This alone drives retention and referral.',
      'The hard questions, answered straight — Ratios, staff qualifications, allergy and sickness policy given plainly — vagueness reads as hiding.',
      'Waitlist by age band — Live capacity per room with automatic offers as places open.',
    ],
  },
  {
    key: 'law', name: 'Law Firms', group: 'services',
    hook: 'The partner meets a prepared case.',
    agent: 'An intake agent that takes the facts, checks the practice area and conflicts, and hands the partner a structured brief.',
    moon: 'From referral-dependent to the firm people find and already trust.',
    deliverables: [
      'Structured intake, not a first call — Facts, dates, parties and documents collected and briefed before the meeting. Never gives legal advice.',
      'Document request loop — Requests, receives and chases the paperwork every matter stalls on.',
      'Regulation explainers — Plain-language notes each time a Jordanian law changes. That\'s how corporate clients arrive.',
    ],
  },
  {
    key: 'consulting', name: 'Consulting & Finance', group: 'services',
    hook: 'Inbound clients who already trust you.',
    agent: 'A qualifying agent that establishes company size, budget and problem, and only books the discovery calls worth having.',
    moon: 'From cold outreach to a waiting list of people who read you first.',
    deliverables: [
      'A diagnostic tool of your own — An interactive readiness score or cost model on your site. A tool people use beats a whitepaper nobody downloads.',
      'Qualify before the calendar — Company size, budget and the real problem settled before a discovery slot is offered.',
      'One interview, a month of authority — A single recorded session becomes an article, a newsletter and six posts.',
    ],
  },
  {
    key: 'ecommerce', name: 'E-commerce Brands', group: 'retail',
    hook: 'Recover the cart, keep the customer.',
    agent: 'A sales agent that answers the sizing and shipping question that stopped the checkout, then recovers the cart in the chat.',
    moon: 'From one-time buyers to a list that reorders on its own.',
    deliverables: [
      'Cart recovery in the chat — Reaches the abandoned cart on WhatsApp within the hour and closes it there. Usually the single biggest revenue line you can add.',
      'COD confirmation gate — Every cash order confirmed before dispatch. Refused deliveries are a pure loss both ways.',
      'Reorder rhythm — Knows the consumption cycle and asks at the right week. Second orders are where the profit is.',
    ],
  },
  {
    key: 'photographer', name: 'Photographers', group: 'creative',
    hook: 'Stop negotiating, start shooting.',
    agent: 'A booking agent that quotes the package, checks your real calendar, takes the retainer and holds the date.',
    moon: 'From word-of-mouth gigs to a booked season and a price you set.',
    deliverables: [
      'Quote, hold, retainer — Prices the package, checks your calendar, takes the deposit and locks the date — while you\'re mid-shoot.',
      'Galleries that sell prints — Private, favouritable galleries with print and album ordering. A Drive link leaves that margin on the table.',
      'Contract and shot list, automatic — Every booking generates the agreement and the list to confirm. Scope creep is the tax on being informal.',
    ],
  },
  {
    key: 'wedding', name: 'Weddings & Venues', group: 'creative',
    hook: 'The date is held before the tour.',
    agent: 'A planning agent that gives availability for their date instantly, sends the right package, and holds the date for 48 hours.',
    moon: 'From a few bookings a season to a calendar reserved a year out.',
    deliverables: [
      'Availability and a 48-hour hold — \'Is 14 June free\' answered in seconds with a provisional hold. Venue choice is a race and the instant answer wins.',
      'Set the room before they arrive — 3D walkthrough with layouts swapped live at their real guest count. Nobody can picture 250 people in an empty hall.',
      'Package builder — Guest count, menu tier and extras assembled with live pricing. Every couple builds this spreadsheet anyway.',
    ],
  },
  {
    key: 'ngo', name: 'NGOs & Community', group: 'creative',
    hook: 'Show the money landing.',
    agent: 'An agent that routes donors, volunteers and beneficiaries to the right programme and keeps each one informed afterwards.',
    moon: 'From a small circle of supporters to a cause the city recognises.',
    deliverables: [
      'Traceable impact — Every donation tied to a specific output and reported back to the donor who funded it. Second gifts come from proof.',
      'Recurring giving — Monthly giving in three taps, with cards that don\'t silently fail. One monthly donor beats eight campaign donors.',
      'One channel, three audiences — Recognises whether it\'s a donor, a volunteer or a beneficiary and routes each down the right path.',
    ],
  },
]

// ————— contact wizard —————
export const WIZARD = {
  intents: [
    // `wool` names a felted medallion; `icon` stays as the SVG fallback for
    // any intent that has no medallion shot.
    { id: 'idea', icon: 'idea', wool: 'plus', title: 'I have an idea', sub: 'Something new that needs shape' },
    { id: 'business', icon: 'building', wool: 'home', title: 'I run a business', sub: 'Growth, content or a stronger brand' },
    { id: 'rebrand', icon: 'refresh-brand', wool: 'settings', title: 'I need a rebrand', sub: 'What we have no longer fits' },
    { id: 'explore', icon: 'compass', wool: 'search', title: 'Just exploring', sub: 'Show me what’s possible' },
  ],
  needs: [
    'Brand identity', 'Website', 'Mobile app', 'Social content',
    'AI systems', '3D / AR experience', 'Launch campaign', 'Not sure yet',
  ],
  budgets: ['Under $1k', '$1k – $5k', '$5k – $15k', '$15k+', 'Let’s discuss'],
  timelines: ['ASAP', 'Within a month', '1–3 months', 'Flexible'],
}

const img = (slug, f) => `/img/cases/${slug}/${f}`
const boards = (slug, pages) => pages.map((p) => img(slug, `board-${p}.webp`))
const stars = (slug, n) => Array.from({ length: n }, (_, i) => img(slug, `star-${i}.webp`))

export const CASES = [
  {
    slug: 'ellie', client: 'Ana Ellie', country: 'Jordan', year: '2026',
    scope: ['Product Photography', 'AI Imaging', 'E-commerce'], filter: ['campaign', 'packaging', 'ai'],
    title: 'A whole catalogue, no studio',
    copy: 'A full pet-accessories product line — bowls, plush, tunnels, wheels — shot, branded and catalogued without a single studio booking. Every hero image generated, colour-matched and label-locked to the brand, then dropped straight into the store.',
    // No reel: the only footage from this job is a screen recording of the
    // asset library — cursor, checkboxes and all. The stills carry the case.
    cover: img('ellie', 'cover.webp'), feature: stars('ellie', 1), boards: [],
    featured: true,
  },
  {
    slug: 'maison', client: 'Maison de l’Avenir', country: 'UAE', year: '2026',
    scope: ['Campaign', 'AI Imaging', 'Fragrance'], filter: ['campaign', 'ai'],
    title: 'Nebula Nectar, carved in ice',
    copy: 'A niche fragrance launch built entirely in generative production — the flacon suspended in glacial ice, citrus and mint frozen mid-fall. Dozens of campaign-grade key visuals from one art direction, in days rather than a shoot week.',
    cover: img('maison', 'cover.webp'), feature: stars('maison', 2), boards: [],
    featured: true,
  },
  {
    slug: 'evorahome', client: 'Evora Future Home', country: 'Jordan', year: '2026',
    scope: ['3D Catalogue', 'E-commerce', 'AR'], filter: ['web', 'packaging', 'ai'],
    title: 'A furniture catalogue that builds itself',
    copy: 'Every piece in the range rendered on one seamless set — sofas, beds, cabinets, tables — consistent light, consistent shadow, infinite angles. One product system feeding the store, the catalogue and the AR room preview.',
    cover: img('evorahome', 'cover.webp'), feature: stars('evorahome', 1), boards: [],
    featured: true,
  },
  {
    slug: 'auraa', client: 'Auraa Desire × Savia', country: 'UAE', year: '2024',
    scope: ['Campaign', 'Content', 'Social Media'], filter: ['campaign', 'social'],
    title: 'Extrait de désir',
    copy: 'Luxury fragrance launches for the Gulf: marble-set flacon families, silk-drenched product noir and model-led key visuals — a feed that reads like a maison, not a catalogue.',
    cover: img('auraa', 'cover.webp'), feature: stars('auraa', 3), boards: boards('auraa', [13, 14, 15, 16]),
    featured: true,
  },
  {
    slug: 'slatko', client: 'Slatko i Slano', country: 'BiH', year: '2023–25',
    scope: ['360 Campaign', 'VFX'], filter: ['campaign', 'vfx'],
    title: 'A bakery, fully baked',
    copy: 'Three years of full-stack brand work for Bosnia’s beloved bakery chain — refreshed identity, seasonal campaigns and CGI spots, all from one oven.',
    cover: img('slatko', 'cover.webp'), feature: stars('slatko', 2), boards: boards('slatko', [30, 31, 32, 33, 34]),
    featured: false,
  },
  {
    slug: 'ojar', client: 'OJAR', country: 'Oman × UAE', year: '2026',
    scope: ['Brand Identity', 'Product Photography', 'E-commerce', 'Campaign'], filter: ['branding', 'packaging', 'campaign'],
    title: 'Hojari, bottled',
    copy: 'A niche fragrance house built around six ingredients — oud, rose, frankincense, honey, sandalwood, musk — named for the finest Dhofar frankincense resin. Product photography, packaging and campaign imagery carrying the same coppery, sunlit identity from the flacon to the flatlay.',
    cover: img('ojar', 'cover.webp'), feature: stars('ojar', 3), boards: boards('ojar', [49, 50]),
    featured: false,
  },
]

export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'branding', label: 'Branding' },
  { id: 'campaign', label: 'Campaigns' },
  { id: 'social', label: 'Social' },
  { id: 'web', label: 'Web' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'vfx', label: 'VFX & CGI' },
  { id: 'ai', label: 'AI Production' },
]
