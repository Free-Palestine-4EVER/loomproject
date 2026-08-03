// ————————————————————————————————————————————————————————
// LOOM — the rentable agents.
//
// The Crew (data/crew.js) are the studio's disciplines wearing faces: you hire
// LOOM, and Spooly is who shows up. These are different. An agent here is a
// PRODUCT you rent by the month — it runs on your accounts, does one job, and
// keeps doing it after we leave. That distinction drives everything below:
//
//   · every agent states what it NEEDS from you (`needs`). An AI product that
//     hides its inputs is how you end up two weeks in discovering it wanted
//     admin access to something the client will never grant.
//   · every agent states where it RUNS (`runsOn`). "AI agent" means nothing
//     until you say which inbox it sits in.
//   · `does` are capabilities, never outcomes. No "+300% engagement" — we do
//     not know that, and the Consultancy section already argues that inventing
//     numbers is how this industry lost people's trust.
//
// No prices here on purpose. Rent is quoted on volume and on how much of the
// setup the client already has; a made-up "from $X/mo" would be the exact fake
// precision CONSULTANCY.calculator refuses to print.
//
// Same `ready` gate crew.js uses: an agent renders only once its character art
// exists in /public/img/agents/, so the roster arrives as a finished set rather
// than as a row of broken images.
// ————————————————————————————————————————————————————————

export const AGENTS = [
  {
    id: 'spool',
    name: 'Spool',
    role: 'The Planner',
    owns: 'Social scheduling & post ideas',
    // The pitch in one breath — this is the line that has to earn the click.
    line: 'Plans your month, writes the posts, and puts them in the queue before you have had coffee.',
    quote: 'Thirty posts. Already scheduled. You are welcome.',
    does: [
      'Reads your product photos and past posts, then proposes a month of ideas in your own voice',
      'Writes the caption, the hook and the hashtags — Arabic, English or both',
      'Fills a calendar you can drag around, and schedules straight to Instagram, TikTok and Facebook',
      'Watches what actually performed and shifts next month toward it',
    ],
    needs: [
      'Your product photos, or a shoot we run once',
      'Connected Instagram / TikTok / Facebook business accounts',
      'One 30-minute call to lock the voice',
    ],
    runsOn: 'Instagram · TikTok · Facebook',
    cadence: 'Monthly rental',
    accent: '#f21c8c',
    img: '/img/agents/spool.webp',
    ready: false,
  },
  {
    id: 'concierge',
    name: 'Concierge',
    role: 'The Front Desk',
    owns: 'Bookings & replies, 24/7',
    line: 'Answers at 3am in Arabic and English, takes the booking, and never puts anyone on hold.',
    quote: 'Table for four, Thursday. Done.',
    does: [
      'Replies to WhatsApp, Instagram DMs and site chat in Arabic and English',
      'Takes bookings and orders straight into your calendar or POS',
      'Knows your menu, prices, hours and location — and says "I will get a human" when it should',
      'Hands off to your team with the whole conversation attached',
    ],
    needs: [
      'WhatsApp Business number',
      'Your menu or service list and opening hours',
      'A calendar or booking system to write into',
    ],
    runsOn: 'WhatsApp · Instagram DM · Site chat',
    cadence: 'Monthly rental',
    accent: '#7b2fbe',
    img: '/img/agents/concierge.webp',
    ready: false,
  },
  {
    id: 'echo',
    name: 'Echo',
    role: 'The Reputation',
    owns: 'Reviews & local presence',
    line: 'Answers every review before you have read it, and keeps your Maps listing looking open.',
    quote: 'Four stars. I already thanked them.',
    does: [
      'Drafts a reply to every Google and TripAdvisor review, in the reviewer’s language',
      'Flags anything angry for a human instead of auto-sending it',
      'Refreshes your Maps photos and hours on a schedule',
      'Reports what people actually complain about, monthly',
    ],
    needs: [
      'Google Business Profile access',
      'A named person to approve the flagged replies',
    ],
    runsOn: 'Google Business · TripAdvisor',
    cadence: 'Monthly rental',
    accent: '#ffc740',
    img: '/img/agents/echo.webp',
    ready: false,
  },
  {
    id: 'reel',
    name: 'Reel',
    role: 'The Editor',
    owns: 'Clips from one shoot',
    line: 'Takes a single afternoon of footage and hands back a month of vertical video.',
    quote: 'Cut, captioned, and in the right ratio.',
    does: [
      'Cuts long footage into vertical clips with hooks in the first second',
      'Burns in captions — Arabic and English',
      'Reframes one edit to 9:16, 1:1 and 16:9 without recropping by hand',
      'Names and files everything so the queue never runs dry',
    ],
    needs: [
      'Raw footage, or one shoot day we run',
      'Your brand fonts and colours',
    ],
    runsOn: 'Reels · TikTok · Shorts',
    cadence: 'Monthly rental',
    accent: '#59e6ff',
    img: '/img/agents/reel.webp',
    ready: false,
  },
  {
    id: 'ledger',
    name: 'Ledger',
    role: 'The Qualifier',
    owns: 'Lead triage & follow-up',
    line: 'Reads every enquiry, asks the two questions you always forget, and ranks the pile before you open it.',
    quote: 'Three of these are real. Start with the second one.',
    does: [
      'Answers new enquiries instantly and asks the qualifying questions',
      'Scores and sorts leads so the sales-ready ones sit at the top',
      'Chases the quiet ones on a schedule you set',
      'Writes each lead into your CRM or a sheet, with a summary',
    ],
    needs: [
      'Your inbox or form endpoint',
      'The two or three questions that decide if a lead is real',
    ],
    runsOn: 'Email · Site forms · WhatsApp',
    cadence: 'Monthly rental',
    accent: '#2ee6a8',
    img: '/img/agents/ledger.webp',
    ready: false,
  },
  {
    id: 'shelf',
    name: 'Shelf',
    role: 'The Merchandiser',
    owns: 'Catalogue & product copy',
    line: 'Writes every product page, keeps the catalogue current, and never gets bored on item four hundred.',
    quote: 'All 400 written. Same voice on every one.',
    does: [
      'Writes titles, descriptions and specs for a whole catalogue in one voice',
      'Cuts and colour-matches product shots to a single background',
      'Keeps stock, price and copy in sync across the store and the feeds',
      'Translates the lot into Arabic without losing the tone',
    ],
    needs: [
      'A product list or an export from your store',
      'Product photography, or the shoot we run',
    ],
    runsOn: 'Shopify · WooCommerce · Instagram Shop',
    cadence: 'Monthly rental',
    accent: '#ff7a45',
    img: '/img/agents/shelf.webp',
    ready: false,
  },
]

// Same gate as CREW_READY: only agents whose character art has landed.
export const AGENTS_READY = AGENTS.filter((a) => a.ready)
