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

export const CLIENT_WALL = [
  'United Colors of Benetton', 'UNICEF', 'Vodafone', 'MAC', 'Max Factor',
  'Espresso Lab', 'Savia', 'Scion International', 'Weitnauer', 'Normfest',
  'Boccapiena', 'Zen2Fit', 'Herbas', 'MBA Centar', 'Maestro Suits',
  'Panda Kids', 'Brill Cosmetix', 'Zaman Events', 'The Place 87', 'Šah Mat Burger',
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
    screen: 'lahza',
    icon: 'heart-frame',
    grad: ['#f21c8c', '#7b2fbe'],
    glyph: 'M12 21s-7-4.6-9.5-9A5.6 5.6 0 0 1 12 6.3 5.6 5.6 0 0 1 21.5 12C19 16.4 12 21 12 21Z',
    blurb: 'Wedding photo-sharing — guests scan a QR and every moment lands in one live album.',
  },
  {
    name: 'Evora Scan', tag: 'iOS · LiDAR & AR',
    platforms: ['ios'],
    screen: 'evora-scan',
    icon: 'scan-room',
    grad: ['#59e6ff', '#7b2fbe'],
    glyph: 'M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M8 12h8M12 8v8',
    blurb: 'Point a phone at a room — get a 3D model, a floor plan and walk-in AR, in minutes.',
  },
  {
    name: 'Glowbar', tag: 'iOS · Beauty',
    platforms: ['ios'],
    shot: '/img/apps/glowbar.webp',
    screen: 'glowbar',
    icon: 'sparkle-face',
    grad: ['#ffc740', '#f21c8c'],
    glyph: 'M12 3l2.1 5.4L20 10.5l-5.9 2.1L12 18l-2.1-5.4L4 10.5l5.9-2.1L12 3Z',
    blurb: 'A luxury studio app for a face-pilates brand — rituals, bookings, glow tracking.',
  },
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
    screen: 'morphic',
    icon: 'face-morph',
    grad: ['#f21c8c', '#ffc740'],
    glyph: 'M12 4a8 8 0 1 0 8 8M16 4h4v4M21 3l-6 6',
    blurb: 'On-device face morphing — studio-grade edits with zero photos leaving the phone.',
  },
]

export const TOOLS = [
  {
    name: 'KUN',
    shot: '/img/lab/kun.webp', kicker: 'Talk-to-3D studio',
    blurb: 'Describe a scene, watch it assemble — a conversational 3D creation studio.',
    tag: 'Generative 3D',
  },
  {
    name: 'ORBIT',
    shot: '/img/lab/orbit.webp', kicker: '3D website editor',
    blurb: 'A Wix for 3D worlds — scenes, scroll choreography and publishing in one canvas.',
    tag: 'WebGL',
  },
  {
    name: 'ATELIER',
    shot: '/img/lab/atelier.webp', kicker: 'AI interior designer',
    blurb: 'Furnishes full apartments in 3D — procedural furniture, palettes and lighting.',
    tag: 'Spatial AI',
  },
  {
    name: 'SPLAT LAB', kicker: 'Gaussian splatting',
    blurb: 'Real spaces captured as photoreal 3D — trained on our own Apple-silicon rig.',
    tag: 'Capture',
  },
  {
    name: '2D→3D STUDIO',
    shot: '/img/lab/2d3d.webp', kicker: 'Plans to rooms',
    blurb: 'Flat floor plans become furnished, explorable 3D rooms — walls and slots auto-solved.',
    tag: 'Architecture',
  },
  {
    name: 'TESSERA',
    shot: '/img/lab/tessera.webp', kicker: 'Pattern engine',
    blurb: 'A generative lattice-pattern editor — brand patterns exported straight to code.',
    tag: 'Design systems',
  },
]


// ————— Solutions Explorer: 30 niches LOOM builds for —————
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

export const NICHES = [
  {
    key: "restaurant", name: "Restaurants", group: "food",
    hook: "Tables that book themselves.",
    agent: "An agent that takes reservations on WhatsApp and fills quiet nights with offers.",
    moon: "From neighborhood spot to citywide name.",
    deliverables: [
      "3D menu with AR dishes — guests see plates before ordering",
      "WhatsApp booking agent — replies in Arabic and English, 24/7",
      "Reels engine — a month of food content from one shoot",
      "Google Maps domination — reviews answered, photos refreshed weekly",
    ],
  },
  {
    key: "cafe", name: "Cafés & Coffee", group: "food",
    hook: "The coffee people scroll to find.",
    agent: "An agent that remembers regulars, pushes new drops, and turns walk-ins into weekly habits.",
    moon: "From one counter to the corner everyone tags.",
    deliverables: [
      "Loyalty agent on WhatsApp — free-cup nudges that bring regulars back",
      "Menu photography — every drink shot for Instagram in one afternoon",
      "AR cup preview — customers see the seasonal drink before it drops",
      "Google Maps refresh — new photos and review replies every week",
    ],
  },
  {
    key: "bakery", name: "Bakeries & Sweets", group: "food",
    hook: "Cakes that sell before they're baked.",
    agent: "An agent that quotes custom orders, confirms deposits, and reminds customers before Eid and weddings.",
    moon: "From word-of-mouth to the city's go-to cake name.",
    deliverables: [
      "AR cake preview — brides see the design on their table before ordering",
      "WhatsApp order agent — takes custom cake briefs in Arabic and English",
      "Reels engine — the piping, the reveal, the slice, packaged weekly",
      "Google Maps domination — five-star proof surfaces first, always",
    ],
  },
  {
    key: "burger", name: "Fast Food & Burgers", group: "food",
    hook: "Orders that move faster than the line.",
    agent: "An agent that takes the order, upsells the combo, and never puts anyone on hold.",
    moon: "From one location to a name people crave citywide.",
    deliverables: [
      "WhatsApp ordering agent — takes the order, upsells the combo, confirms pickup",
      "3D menu build — every burger rendered stacked and dripping",
      "Reels engine — sizzle shots and drop-day hype on repeat",
      "Google Maps domination — reviews answered before the next rush",
    ],
  },
  {
    key: "fine-dining", name: "Fine Dining", group: "food",
    hook: "A reservation that feels like the meal already started.",
    agent: "A concierge agent that books the table, remembers the anniversary, and never sounds like a bot.",
    moon: "From destination to the reservation people fight for.",
    deliverables: [
      "AR tasting menu — courses previewed in 3D before guests sit down",
      "WhatsApp concierge agent — books tables, notes allergies, remembers regulars",
      "Cinematic film — a single tracking shot through the kitchen and the room",
      "Bilingual site rebuild — Arabic and English, built to match the room's taste",
    ],
  },
  {
    key: "catering", name: "Catering & Events", group: "food",
    hook: "Quotes that go out before the client hangs up.",
    agent: "An agent that quotes headcounts, sends proposals, and follows up before the client books elsewhere.",
    moon: "From weekend gigs to the caterer every planner calls first.",
    deliverables: [
      "WhatsApp quoting agent — headcount in, proposal out, in Arabic and English",
      "3D spread previews — clients see the buffet before the deposit",
      "Portfolio film — one wedding shoot recut into a season of proof",
      "Google Maps domination — reviews from every event, answered fast",
    ],
  },
  {
    key: "dental", name: "Dental Clinics", group: "health",
    hook: "Bookings that don't wait for office hours.",
    agent: "An agent that answers pricing questions, books the slot, and reminds patients the night before.",
    moon: "From one chair to a fully booked calendar.",
    deliverables: [
      "WhatsApp booking agent — answers questions and books slots in Arabic and English, 24/7",
      "3D smile preview — patients see the result before they commit",
      "Reminder agent — cuts no-shows with automatic appointment nudges",
      "Google Maps domination — reviews answered, before/after photos refreshed",
    ],
  },
  {
    key: "clinic", name: "Medical Clinics", group: "health",
    hook: "Appointments booked while the clinic sleeps.",
    agent: "An agent that answers first questions, books the right doctor, and follows up after the visit.",
    moon: "From single practice to the clinic patients recommend.",
    deliverables: [
      "WhatsApp triage agent — books appointments in Arabic and English, 24/7",
      "Reminder agent — automatic follow-ups that cut no-shows",
      "Doctor profile films — trust built before the patient walks in",
      "Google Maps domination — reviews answered, listings kept accurate",
    ],
  },
  {
    key: "pharmacy", name: "Pharmacies", group: "health",
    hook: "Refills that reorder themselves.",
    agent: "An agent that handles refill requests, checks stock, and confirms delivery without a single call.",
    moon: "From walk-in counter to the pharmacy people message first.",
    deliverables: [
      "WhatsApp refill agent — repeat orders and stock checks in Arabic and English",
      "Delivery status updates — automatic, no phone calls needed",
      "Product photography — the shelf, made scroll-stopping online",
      "Google Maps domination — hours, stock, and reviews always current",
    ],
  },
  {
    key: "salon", name: "Beauty Salons", group: "beauty",
    hook: "A chair that's always booked, never overbooked.",
    agent: "An agent that books the slot, suggests the add-on, and reminds clients before their next visit is due.",
    moon: "From full chair to the name every bride asks for.",
    deliverables: [
      "WhatsApp booking agent — books, reschedules, and upsells in Arabic and English",
      "AR style preview — clients see the cut or color before the chair",
      "Reels engine — transformation content from every appointment",
      "Google Maps domination — reviews answered, before/after gallery refreshed",
    ],
  },
  {
    key: "barber", name: "Barbershops", group: "beauty",
    hook: "Chairs full before you unlock the door.",
    agent: "An agent that books chairs on WhatsApp and texts regulars when their cut is due.",
    moon: "From walk-ins only to a booked-out week.",
    deliverables: [
      "WhatsApp booking agent — fills chairs in Arabic and English, 24/7",
      "Before/after reel engine — a month of cuts content from one Saturday",
      "Google Maps domination — reviews answered, photos refreshed weekly",
      "No-show killer — automated reminders and waitlist fills gaps",
    ],
  },
  {
    key: "medspa", name: "Med Spas & Aesthetics", group: "health",
    hook: "Results people can see before they book.",
    agent: "An agent that answers treatment questions on WhatsApp and books the consult.",
    moon: "From one-off treatments to a waitlist clinic.",
    deliverables: [
      "AR treatment preview — clients see results before committing",
      "WhatsApp consult agent — qualifies leads and books in Arabic and English",
      "Before/after content engine — clinic-grade proof, posted weekly",
      "Review and reputation system — five-star trail across Google and Instagram",
    ],
  },
  {
    key: "gym", name: "Gyms & Fitness", group: "health",
    hook: "Members recruited while you sleep.",
    agent: "An agent that signs up trials on WhatsApp and reminds members before they churn.",
    moon: "From one location to a citywide membership brand.",
    deliverables: [
      "WhatsApp coaching agent — trial signups and class bookings, 24/7",
      "3D facility tour — the floor, the classes, the equipment, before they visit",
      "Reels engine — a month of transformation content from one shoot",
      "Retention agent — nudges lapsing members before they cancel",
    ],
  },
  {
    key: "fashion", name: "Fashion Boutiques", group: "retail",
    hook: "A store that never closes for business.",
    agent: "An agent that styles customers on WhatsApp and turns browsers into orders.",
    moon: "From one rack to a brand shoppers seek out.",
    deliverables: [
      "AR try-on — shoppers see the fit before they buy",
      "WhatsApp styling agent — replies with looks and sizes in Arabic and English",
      "Lookbook engine — a season of shoot-quality content from one rack",
      "3D storefront — the boutique, browsable from a phone",
    ],
  },
  {
    key: "jewelry", name: "Jewelry", group: "retail",
    hook: "Pieces that sell themselves before the fitting.",
    agent: "An agent that answers piece inquiries on WhatsApp and closes custom orders.",
    moon: "From counter sales to a name clients request by.",
    deliverables: [
      "AR try-on — rings and necklaces worn on camera before purchase",
      "3D piece configurator — metal, stone, and size chosen live",
      "WhatsApp concierge agent — replies to inquiries in Arabic and English, 24/7",
      "Product film engine — jeweler-grade footage from a single studio pass",
    ],
  },
  {
    key: "perfume", name: "Perfume Houses", group: "retail",
    hook: "A scent story told before the first spray.",
    agent: "An agent that recommends scents on WhatsApp and closes the sale before checkout.",
    moon: "From a counter in Amman to a house people search for by name.",
    deliverables: [
      "3D bottle showcase — every angle, every note, before they smell it",
      "WhatsApp fragrance agent — matches scents to buyers in Arabic and English",
      "Generative campaign engine — a season of visuals from one bottle shoot",
      "Google Maps and marketplace domination — reviews and listings kept sharp",
    ],
  },
  {
    key: "furniture", name: "Furniture & Home", group: "retail",
    hook: "Rooms furnished before the truck arrives.",
    agent: "An agent that quotes pieces on WhatsApp and lets buyers place them in their room first.",
    moon: "From a showroom in one district to orders across the country.",
    deliverables: [
      "AR room placement — see the piece at true scale before ordering",
      "3D configurator — fabric, wood, and size chosen live on the model",
      "WhatsApp sales agent — quotes and closes in Arabic and English, 24/7",
      "Catalog film engine — a season of showroom content from one shoot",
    ],
  },
  {
    key: "realestate", name: "Real Estate", group: "property",
    hook: "Buyers walk the unit before the keys exist.",
    agent: "An agent that qualifies buyers on WhatsApp and books the site visit.",
    moon: "From listings that sit to units that move pre-launch.",
    deliverables: [
      "3D walkthrough — units toured from a phone, pre-construction",
      "WhatsApp leasing agent — qualifies buyers and books viewings, 24/7",
      "Listing film engine — cinematic units from one shoot, reused across every channel",
      "Google Maps and portal domination — listings and reviews kept current",
    ],
  },
  {
    key: "construction", name: "Construction", group: "property",
    hook: "Projects sold before the ground breaks.",
    agent: "An agent that qualifies project inquiries on WhatsApp and routes serious buyers to the team.",
    moon: "From tender by referral to a pipeline that fills itself.",
    deliverables: [
      "3D project renders — the build, walkable before the first pour",
      "WhatsApp inquiry agent — qualifies buyers and contractors in Arabic and English",
      "Progress film engine — timelapse and drone content from every phase",
      "Proposal generator — branded, priced decks sent in minutes",
    ],
  },
  {
    key: "auto", name: "Car Dealers & Rental", group: "services",
    hook: "The lot, browsed and booked from a phone.",
    agent: "An agent that quotes cars on WhatsApp and books the test drive, 24/7.",
    moon: "From lot traffic to a booked test-drive calendar.",
    deliverables: [
      "3D vehicle showroom — every trim and color, walkable before the test drive",
      "WhatsApp sales agent — quotes, financing, and bookings in Arabic and English",
      "Vehicle reel engine — a month of listing content from one lot pass",
      "Google Maps domination — reviews answered, inventory photos kept fresh",
    ],
  },
  {
    key: "travel", name: "Travel Agencies", group: "services",
    hook: "Itineraries that sell themselves before the call.",
    agent: "An agent that qualifies leads on WhatsApp, prices packages, and books consultations while you sleep.",
    moon: "From one-off bookings to a name people ask for by destination.",
    deliverables: [
      "AI trip-planner agent — builds custom itineraries on WhatsApp, day or night",
      "3D destination previews — clients preview resorts and routes before booking",
      "Reels engine — a month of destination content from one archive",
      "Google Maps domination — reviews answered, listings kept fresh",
    ],
  },
  {
    key: "hotel", name: "Hotels & Stays", group: "property",
    hook: "Rooms that book while the front desk sleeps.",
    agent: "An agent that answers booking questions on WhatsApp, upsells rooms, and fills last-minute vacancies with offers.",
    moon: "From a listing among hundreds to the stay people search for by name.",
    deliverables: [
      "3D room tours with AR — guests preview the exact room before reserving",
      "WhatsApp concierge agent — handles bookings and requests in Arabic and English",
      "Reels engine — a month of property content from one shoot",
      "Google Maps domination — reviews answered, photos refreshed weekly",
    ],
  },
  {
    key: "school", name: "Schools & Academies", group: "services",
    hook: "Enrollment that runs itself all season.",
    agent: "An agent that answers admissions questions on WhatsApp, books campus tours, and follows up until the form is signed.",
    moon: "From word-of-mouth enrollment to a full waitlist every term.",
    deliverables: [
      "Virtual campus tour in 3D — parents walk the halls before the visit",
      "WhatsApp admissions agent — answers parent questions in Arabic and English, 24/7",
      "Reels engine — a term of student-life content from one shoot day",
      "Google Maps domination — reviews answered, photos kept current",
    ],
  },
  {
    key: "kids", name: "Nurseries & Kids", group: "services",
    hook: "Waitlists that fill before the flyer prints.",
    agent: "An agent that reassures parents on WhatsApp, shares openings by age group, and books tours automatically.",
    moon: "From neighborhood daycare to the nursery every parent asks about.",
    deliverables: [
      "3D nursery walkthrough — parents preview classrooms before the visit",
      "WhatsApp enrollment agent — answers parent questions in Arabic and English, 24/7",
      "Reels engine — a month of daily-activity content from one visit",
      "Google Maps domination — reviews answered, photos refreshed weekly",
    ],
  },
  {
    key: "law", name: "Law Firms", group: "services",
    hook: "Clients qualified before they reach a partner.",
    agent: "An agent that screens inquiries by practice area, collects case details, and books consultations with the right lawyer.",
    moon: "From referral-dependent to the firm people find and trust first.",
    deliverables: [
      "Intake agent — screens cases on WhatsApp and web chat in Arabic and English",
      "Practice-area microsite — clear, credible, built for referrals and search",
      "Case-result content engine — wins turned into shareable proof, monthly",
      "Google Maps domination — reviews answered, profile kept authoritative",
    ],
  },
  {
    key: "consulting", name: "Consulting & Finance", group: "services",
    hook: "Credibility that closes deals before the pitch.",
    agent: "An agent that qualifies prospects by budget and need, then books discovery calls straight into your calendar.",
    moon: "From cold outreach to inbound clients who already trust you.",
    deliverables: [
      "Lead-qualifying agent — screens prospects on WhatsApp and web, 24/7",
      "Authority site — case studies, credentials, and results built for scrutiny",
      "Insight content engine — a month of thought-leadership from one interview",
      "LinkedIn and Maps presence — kept current, answered, and searchable",
    ],
  },
  {
    key: "ecommerce", name: "E-commerce Brands", group: "retail",
    hook: "A storefront that sells while you sleep.",
    agent: "An agent that recovers abandoned carts, answers sizing and stock questions, and closes sales on WhatsApp.",
    moon: "From one-time buyers to a following that reorders on its own.",
    deliverables: [
      "AI product photography — studio-grade shots without the studio",
      "WhatsApp sales agent — answers product questions and closes orders, 24/7",
      "3D and AR product previews — customers see it before they buy it",
      "Reels engine — a month of product content from one shoot",
    ],
  },
  {
    key: "photographer", name: "Photographers", group: "creative",
    hook: "A portfolio that books shoots on its own.",
    agent: "An agent that quotes packages on WhatsApp, checks your calendar, and locks in bookings without back-and-forth.",
    moon: "From word-of-mouth gigs to a fully booked season.",
    deliverables: [
      "Cinematic portfolio site — every gallery scroll-animated and fast",
      "WhatsApp booking agent — quotes packages and holds dates, day or night",
      "Reels engine — a month of behind-the-scenes content from one shoot",
      "Google Maps domination — reviews answered, galleries kept fresh",
    ],
  },
  {
    key: "wedding", name: "Weddings & Venues", group: "creative",
    hook: "Bookings that close before the site tour.",
    agent: "An agent that shares availability on WhatsApp, sends packages, and locks in date holds automatically.",
    moon: "From a few bookings a season to a fully reserved calendar.",
    deliverables: [
      "3D venue walkthrough — couples preview the space before visiting",
      "WhatsApp planning agent — answers pricing and date questions in Arabic and English",
      "Reels engine — a month of real-wedding content from one event",
      "Google Maps domination — reviews answered, photos refreshed weekly",
    ],
  },
  {
    key: "ngo", name: "NGOs & Community", group: "creative",
    hook: "A cause people find, trust, and fund.",
    agent: "An agent that answers donor and volunteer questions on WhatsApp and routes each one to the right program.",
    moon: "From a small circle of supporters to a cause the city recognizes.",
    deliverables: [
      "Impact site — mission, programs, and outcomes told in Arabic and English",
      "WhatsApp volunteer and donor agent — answers questions and routes signups, 24/7",
      "Story engine — a month of field content from one visit",
      "Google Maps and social presence — kept current, answered, and visible",
    ],
  },
]

// ————— contact wizard —————
export const WIZARD = {
  intents: [
    { id: 'idea', icon: 'idea', title: 'I have an idea', sub: 'Something new that needs shape' },
    { id: 'business', icon: 'building', title: 'I run a business', sub: 'Growth, content or a stronger brand' },
    { id: 'rebrand', icon: 'refresh-brand', title: 'I need a rebrand', sub: 'What we have no longer fits' },
    { id: 'explore', icon: 'compass', title: 'Just exploring', sub: 'Show me what’s possible' },
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
    cover: img('ellie', 'cover.webp'), feature: stars('ellie', 1), boards: [],
    video: '/video/ellie.mp4', featured: true,
  },
  {
    slug: 'maison', client: 'Maison de l’Avenir', country: 'UAE', year: '2026',
    scope: ['Campaign', 'AI Imaging', 'Fragrance'], filter: ['campaign', 'ai'],
    title: 'Nebula Nectar, carved in ice',
    copy: 'A niche fragrance launch built entirely in generative production — the flacon suspended in glacial ice, citrus and mint frozen mid-fall. Dozens of campaign-grade key visuals from one art direction, in days rather than a shoot week.',
    cover: img('maison', 'cover.webp'), feature: stars('maison', 1), boards: [],
    video: '/video/maison.mp4', featured: true,
  },
  {
    slug: 'evorahome', client: 'Evora Future Home', country: 'Jordan', year: '2026',
    scope: ['3D Catalogue', 'E-commerce', 'AR'], filter: ['web', 'packaging', 'ai'],
    title: 'A furniture catalogue that builds itself',
    copy: 'Every piece in the range rendered on one seamless set — sofas, beds, cabinets, tables — consistent light, consistent shadow, infinite angles. One product system feeding the store, the catalogue and the AR room preview.',
    cover: img('evorahome', 'cover.webp'), feature: stars('evorahome', 1), boards: [],
    video: '/video/evora.mp4', featured: true,
  },
  {
    slug: 'boccapiena', client: 'Boccapiena', country: 'Croatia', year: '2024',
    scope: ['Social Media', 'Campaign', 'Franchise'], filter: ['campaign', 'social'],
    title: '#MouthfulOfHappiness',
    copy: 'A candy-bright brand world for Croatia’s happiest gelato franchise — hand-drawn sticker universes, neon-lit parlours and a social engine that made joy repeatable, cone after cone.',
    cover: img('boccapiena', 'cover.webp'), feature: stars('boccapiena', 3), boards: boards('boccapiena', [8, 9, 10, 11, 12]),
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
    slug: 'scion', client: 'Scion International', country: 'UAE', year: '2024–25',
    scope: ['Campaign', 'Social Media'], filter: ['campaign', 'social'],
    title: 'Four houses, one cinema',
    copy: 'A multi-house fragrance portfolio — Jean Paul Dupont, Rich Parfum, Majestic Aura, Maison de l’Avenir — each given its own cinematic key-visual language under one production pipeline.',
    cover: img('scion', 'cover.webp'), feature: stars('scion', 2), boards: boards('scion', [17, 18, 19, 20, 21]),
    featured: false,
  },
  {
    slug: 'vucko', client: 'Vučko ZOI84', country: 'Sarajevo', year: '2024',
    scope: ['VFX', 'CGI', 'AR'], filter: ['vfx'],
    title: 'An Olympic mascot walks again',
    copy: 'Forty years after the 1984 Winter Olympics, we brought Vučko back — a CGI character roaming real Sarajevo streets, bridging a city’s Olympic heritage with its present in one citywide campaign.',
    cover: img('vucko', 'cover.webp'), feature: stars('vucko', 2), boards: boards('vucko', [47, 48]),
    featured: true,
  },
  {
    slug: 'sahmat', client: 'Šah Mat Burger', country: 'CH / BiH', year: '2023',
    scope: ['Branding', 'Franchise'], filter: ['branding'],
    title: 'Checkmate, extra sauce',
    copy: 'A chess-themed burger brand built for franchising — logo, packaging, collateral and interiors, all playing the same opening.',
    cover: img('sahmat', 'cover.webp'), feature: stars('sahmat', 3), boards: boards('sahmat', [37, 38]),
    featured: false,
  },
  {
    slug: 'weitnauer', client: 'Weitnauer Holding', country: 'Switzerland', year: '2024',
    scope: ['Rebranding', 'Identity'], filter: ['branding'],
    title: 'Swiss precision, rewoven',
    copy: 'A full visual identity and rebrand for a Swiss holding — from wordmark to facade signage, engineered to feel inevitable.',
    cover: img('weitnauer', 'cover.webp'), feature: stars('weitnauer', 3), boards: boards('weitnauer', [43, 44]),
    featured: false,
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
    slug: 'herbas', client: 'Herbas', country: 'BiH', year: '2025',
    scope: ['Branding', 'Packaging'], filter: ['branding', 'packaging'],
    title: 'Nature, shelf-ready',
    copy: 'Packaging and brand system for a natural cosmetics line — botanical warmth with the discipline of a pharmacy shelf.',
    cover: img('herbas', 'cover.webp'), feature: stars('herbas', 3), boards: boards('herbas', [35, 36]),
    featured: false,
  },
  {
    slug: 'place87', client: 'The Place 87', country: 'Sarajevo', year: '2023',
    scope: ['Logo', 'Web Design'], filter: ['branding', 'web'],
    title: 'An address becomes a brand',
    copy: 'Identity and website for Sarajevo’s The Place 87 — theplace87.com — a mark, a system and a site that carry one address with confidence.',
    cover: img('place87', 'cover.webp'), feature: stars('place87', 3), boards: boards('place87', [39, 40]),
    featured: false,
  },
  {
    slug: 'modulart', client: 'ModulArt · Liberty Group', country: 'German market', year: '2024',
    scope: ['Branding', 'Web', 'UI/UX'], filter: ['branding', 'web'],
    title: 'Architecture in modules',
    copy: 'Brand, web design and UI/UX for a modular architecture venture aimed at the German market — precise, constructive, expandable by design.',
    cover: img('modulart', 'cover.webp'), feature: stars('modulart', 1), boards: boards('modulart', [41, 42]),
    featured: false,
  },
  {
    slug: 'shteq', client: 'SHTEQ', country: 'BiH', year: '2024',
    scope: ['Product Launch', 'OOH'], filter: ['campaign', 'packaging'],
    title: 'A launch you can’t drive past',
    copy: 'Product launch and out-of-home campaign — packaging, key visuals and billboards built to land at 60 km/h.',
    cover: img('shteq', 'cover.webp'), feature: stars('shteq', 3), boards: boards('shteq', [45, 46]),
    featured: false,
  },
  {
    slug: 'zen2fit', client: 'Zen2Fit', country: 'USA', year: '2024–25',
    scope: ['Branding', 'Social Media'], filter: ['branding', 'social'],
    title: 'Calm strength, loud feed',
    copy: 'Brand energy and social system for a US fitness platform — balance in the identity, intensity in the content.',
    cover: img('zen2fit', 'cover.webp'), feature: stars('zen2fit', 1), boards: boards('zen2fit', [27, 28]),
    featured: false,
  },
  {
    slug: 'bezdrob', client: 'Bezdrob', country: 'BiH', year: '2023–24',
    scope: ['Personal Branding', 'Social Media'], filter: ['branding', 'social'],
    title: 'A person, positioned',
    copy: 'Personal brand and content identity for a transformation program — one voice, one look, every post on message.',
    cover: img('bezdrob', 'cover.webp'), feature: stars('bezdrob', 1), boards: boards('bezdrob', [25, 26]),
    featured: false,
  },
  {
    slug: 'benetton', client: 'United Colors of Benetton', country: 'BiH', year: '2023–24',
    scope: ['Campaign', 'Social Media'], filter: ['campaign', 'social'],
    title: 'Global colors, local voice',
    copy: 'Seasonal retail campaigns for Benetton’s Bosnian market — global brand codes, translated with local instinct.',
    cover: img('benetton', 'cover.webp'), feature: [], boards: boards('benetton', [22, 23, 24]),
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
