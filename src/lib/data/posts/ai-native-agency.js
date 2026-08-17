// ————————————————————————————————————————————
// /journal/ai-native-agency
//
// Backlog item 3: "What 'AI-native agency' actually means, and what it
// doesn't." LOOM's own homepage positioning line is "The AI-native creative
// agency" (src/lib/data/site.js, BRAND.positioning) — this post is the honest
// definition of that claim, written by the studio that makes it, which is
// the only way a claim like this earns any trust at all.
//
// SOURCING. Every factual claim traces to a real file in this repo, not to
// invention:
//   · BRAND.positioning, SERVICES (the six service lines, esp. "AI &
//     Automation") — src/lib/data/site.js
//   · The Machine's real numbers (20 photos / 2 reels a month, human editor
//     checking every piece, 89 JOD/month floor) — static/llms.txt, quoted,
//     plus src/lib/data/pricing.js for the floor figure shown in the PRICING
//     array (id: 'machine')
//   · The LOOM Protocol — three MCP servers in private beta (ATELIER,
//     MACHINE, ROOM) — static/llms.txt
//   · CASES: ellie, maison, evorahome — src/lib/data/site.js, used exactly as
//     described there, no embellishment
//   · The one-off pricing floors (500 / 1,200 / 2,500 / 3,900 JOD) —
//     src/lib/data/pricing.js
//   · The RTL/Arabic-typography gap on LOOM's own site — TASKS.md #19d,
//     found 14 Aug 2026 during this same growth loop, and still open. Stated
//     here as a real, current limitation, not softened or hidden.
//   · The competitor finding that Ijjad and Dfeelings also sell AI-adjacent
//     services (an "AI Visibility Sprint" and a named "GEO" line
//     respectively) — research/2026-08-14-competitors.md in loom-growth.
//     LOOM is not the only agency in Jordan using AI language, and this post
//     says so rather than implying otherwise.
//
// NO INVENTED FACTS. No client result, no percentage, no "saves you X hours"
// claim appears anywhere below, because none of those numbers exist yet for
// LOOM to state honestly.
// ————————————————————————————————————————————

export const post = {
  slug: 'ai-native-agency',
  title: "What “AI-Native Agency” Actually Means, and What It Doesn't",
  description:
    "LOOM calls itself an AI-native creative agency. Here is what that claim actually cashes out to — the real services, the human editor still checking every piece, and the parts of LOOM's own site AI has not fixed yet.",
  publishedAt: '2026-08-17',
  updatedAt: '2026-08-17',
  author: { name: 'LOOM Studio', role: 'Amman × Sarajevo' },
  tags: ['AI-Native', 'Positioning', 'Studio'],
  image: {
    src: '/img/core/ads.webp',
    alt: 'A knitted board with a single blue yarn line stitched climbing across it above four blank woollen bars, a felted target and arrow beside it',
    width: 1200,
    height: 896,
  },
  readMinutes: 8,
  body: [
    {
      type: 'p',
      text:
        'LOOM’s own homepage calls it "the AI-native creative agency," and that phrase is now common enough in Jordan and everywhere else that it has mostly stopped meaning anything. Almost any studio can put those two words in a hero line. The honest version of this post is not a defence of the phrase — it is a definition, written by the studio that uses it, of exactly what the claim does and does not cover, including the parts that are still unfinished.',
    },
    {
      type: 'h2',
      text: 'What does "AI-native" actually mean, as opposed to "uses AI"?',
    },
    {
      type: 'p',
      text:
        'The difference is whether AI is a tool bolted onto an existing production process, or whether the production process was designed around it from the start. An agency "uses AI" if a designer occasionally generates a mood-board image instead of sourcing stock photography. A studio is AI-native if entire deliverables — a full product catalogue, a month of campaign imagery, a chat agent that actually answers customers — are produced by a pipeline built for that from day one, with the AI step designed in rather than patched on afterward. That is a real distinction, and it is checkable: ask to see the pipeline, not the marketing line.',
    },
    {
      type: 'h2',
      text: 'What does LOOM actually build with it?',
    },
    {
      type: 'p',
      text:
        'One of the six service lines LOOM sells is named plainly "AI & Automation": generative campaign imagery and film, AI content systems, chat and voice agents, and marketing automation. That is not the whole studio — branding, social content, web and app work, campaign production and AR sit alongside it — but it is the load-bearing line, and three shipped cases show what it produces rather than promises:',
    },
    {
      type: 'ul',
      items: [
        'A full pet-accessories catalogue — bowls, plush, tunnels, wheels — shot, branded and catalogued without a single studio booking, every hero image generated and colour-matched to the brand.',
        'A niche fragrance launch built entirely in generative production: the flacon suspended in glacial ice, dozens of campaign-grade key visuals from one art direction, in days rather than a shoot week.',
        'A furniture catalogue rendered on one seamless AI-generated set — consistent light and shadow across the whole range — feeding the store, the print catalogue and an AR room preview from a single product system.',
      ],
    },
    {
      type: 'p',
      spans: [
        'Those are named cases, not composites — the full set, with the client names attached, is on ',
        { text: 'the work page', href: '/work' },
        ', and it is the fair way to check any AI-native claim: not the pitch, the shipped output.',
      ],
    },
    {
      type: 'h2',
      text: 'Does "AI-native" mean no humans are involved?',
    },
    {
      type: 'p',
      text:
        'No, and any agency implying otherwise is describing a product that does not exist yet. LOOM’s own productised content subscription — The Machine, twenty photos and two videos a month, in Arabic and English — states explicitly that a human editor checks every piece before it ships. That line exists because the failure mode of unsupervised generative output is well known: an extra finger, a brand colour drifted half a shade, an Arabic caption that reads as machine-translated. AI-native, done properly, means AI does the production and a person still owns the judgment call before anything reaches a client. Removing that check is not a more advanced version of the same service; it is a worse one.',
    },
    {
      type: 'h2',
      text: 'What does "AI-native" not mean?',
    },
    {
      type: 'h3',
      text: 'It does not mean cheaper',
    },
    {
      type: 'p',
      spans: [
        'A generated image can be produced faster than a studio-shot one, and that shows up in the price of the entry offer — a hundred product photos for a fixed, published figure. It does not collapse the price of a full build: a website still ',
        { text: 'starts at 500 JOD', href: '/pricing' },
        ', a store at 1,200, an app at 2,500, custom software at 3,900. AI changes how a deliverable gets made; it does not change how much scoping, integration, design judgement and QA a real build still needs. Anyone quoting AI as the reason a full project is unusually cheap is quietly cutting one of those, not discovering a shortcut.',
      ],
    },
    {
      type: 'h3',
      text: 'It does not mean the whole stack is already AI-solved',
    },
    {
      type: 'p',
      text:
        'This is the uncomfortable one to publish, and it is being published anyway because an agency that only states its finished work is not a useful source on this subject. LOOM’s own website, at the time this is written, has no way to render a full Arabic page correctly — no per-post right-to-left mechanism in the journal template, and a Latin-only display and body font stack with no Arabic-shaping face, so Arabic passages fall back to whatever system font a visitor’s device happens to carry. That gap was found by this same content operation while drafting an Arabic post, and it is tracked as open work rather than fixed and then mentioned only in hindsight. Being AI-native does not skip the ordinary, unglamorous engineering debt of building a bilingual site properly. It is still owed.',
    },
    {
      type: 'h3',
      text: 'It does not mean LOOM is the only one saying it',
    },
    {
      type: 'p',
      text:
        'At least two other agencies visible in Jordan’s search results already use AI-adjacent language for a version of this work: one sells a named "AI Visibility Sprint," the other lists a "Generative Engine Optimisation" service line. Neither publishes the depth of production pipeline described above, and neither runs a monthly content subscription of this shape as far as could be found — but the category is not empty, and claiming otherwise would be exactly the kind of unverifiable statement this whole post is arguing against. The honest claim is narrower and more defensible: LOOM builds AI production systems as its core method, not as an add-on service line, and says what it has and has not finished.',
    },
    {
      type: 'h2',
      text: 'What is the LOOM Protocol, and is it live?',
    },
    {
      type: 'p',
      text:
        'It is three MCP (Model Context Protocol) servers — LOOM ATELIER for brand context, LOOM MACHINE for content production, LOOM ROOM for 3D and AR — currently in private beta, issued by hand rather than opened to self-serve signup. That status is stated plainly because "in private beta" and "shipping product" are different claims, and a studio that calls the first one the second is doing exactly the kind of overstatement this post exists to push back against.',
    },
    {
      type: 'h2',
      text: 'How to tell if any agency’s "AI-native" claim is real',
    },
    {
      type: 'p',
      text:
        'A short, usable test, applicable to LOOM or to anyone else making the claim:',
    },
    {
      type: 'ul',
      items: [
        'Ask to see three finished deliverables the AI step actually produced, not a demo or a mock-up. If none exist, the claim is aspirational.',
        'Ask what a human checks before it ships, and who that person is. "Nobody, it is fully automated" is a red flag on anything client-facing.',
        'Ask what the studio has not finished yet. A studio with no unfinished AI work anywhere is either brand new or not telling you something.',
        'Ask whether the AI-native claim changes the price of a full build, or only the price of the fast, templated entry offer. If a full project quote comes back suspiciously low with "because AI" as the only justification, ask what got cut.',
      ],
    },
    {
      type: 'p',
      spans: [
        'That is the same test worth applying here. Describe what you actually need at ',
        { text: 'the contact page', href: '/contact' },
        ' and the answer back will name what LOOM has actually built for it — including, honestly, what still has to be built by hand.',
      ],
    },
  ],
}
