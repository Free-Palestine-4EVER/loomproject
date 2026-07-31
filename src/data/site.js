// ————————————————————————————————————————————
// LOOM — single source of truth for all site content.
// Portfolio drawn from the ADVN Digital 2026 profile (sister studio, Sarajevo).
// ————————————————————————————————————————————

export const BRAND = {
  name: 'LOOM',
  tagline: 'We weave brands on the edge of creativity.',
  positioning: 'The AI-native creative agency',
  cities: ['Amman', 'Sarajevo'],
  whatsapp: 'https://wa.me/962791792129',
  phoneJO: '+962 79 179 2129',
  phoneBA: '+387 62 475 412',
  email: 'israa@advndigital.com',
  instagram: 'https://instagram.com/advndigital',
  instagramHandle: '@advndigital',
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
  { value: 14, suffix: '', label: 'Case studies in the book' },
  { value: 2, suffix: '', label: 'Studios — Amman × Sarajevo' },
]

const img = (slug, f) => `/img/cases/${slug}/${f}`
const boards = (slug, pages) => pages.map((p) => img(slug, `board-${p}.webp`))
const stars = (slug, n) => Array.from({ length: n }, (_, i) => img(slug, `star-${i}.webp`))

export const CASES = [
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
    featured: true,
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
    featured: true,
  },
  {
    slug: 'weitnauer', client: 'Weitnauer Holding', country: 'Switzerland', year: '2024',
    scope: ['Rebranding', 'Identity'], filter: ['branding'],
    title: 'Swiss precision, rewoven',
    copy: 'A full visual identity and rebrand for a Swiss holding — from wordmark to facade signage, engineered to feel inevitable.',
    cover: img('weitnauer', 'cover.webp'), feature: stars('weitnauer', 3), boards: boards('weitnauer', [43, 44]),
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
]
