// ————————————————————————————————————————————————————————
// The eight needs, in full.
//
// The Counter's tiles used to open the contact wizard on the first click:
// eight photographs of a decision, and the moment anyone touched one they got
// a form. Nothing on the page said what "Brand identity" or "AI systems"
// actually MEANS at LOOM — what arrives, how long it takes, what it costs in
// the client's own time — so the tile was asking for a commitment it had not
// earned. This file is the answer that now sits between the two: one detailed
// panel per need, then the brief.
//
// RULES FOR EDITING THIS FILE
//
// 1. Every `deliverables` line is a THING THAT ARRIVES, not a capability.
//    "Logo system: primary, stacked and one-colour lockups" is a deliverable.
//    "Expert brand thinking" is not — it names no artefact, so it cannot be
//    checked, and a client cannot tell whether they got it.
//
// 2. No numbers that are not true. `timeline` is the only number here and it
//    is a RANGE, phrased as a typical, because a range that gets missed is a
//    broken promise on the first screen of the relationship. Nothing in this
//    file states a price: WIZARD.budgets asks the client for theirs instead,
//    which is the honest direction for that question to travel.
//
// 3. `pairs` must reference other NEED keys, and the panel renders them as
//    live buttons that swap the panel's contents. It is the cross-sell, and
//    it is the reason the panel is a panel and not eight separate pages.
//
// 4. `proof` is the one line that has to survive a sceptic. Prefer a fact
//    about how the work is made over an adjective about how good it is.
//
// `photo` is the 21:9 hero. It falls back to the tile's own `-wide` still if
// the dedicated shot is missing, so a need whose art has not been generated
// yet still opens a finished panel rather than a broken image — same
// paint-in-then-upgrade contract the Counter tiles themselves run on.
// ————————————————————————————————————————————————————————

export const NEEDS = {
  'Brand identity': {
    key: 'brand-identity',
    group: 'Branding',
    yarn: 'magenta',
    hook: 'A mark, a system, and the rules that keep it from falling apart six months in.',
    body:
      'Most identities die of neglect, not of bad drawing — the logo survives and everything around it drifts. ' +
      'LOOM ships the system, not just the mark: the type scale, the palette, the spacing rules and the ' +
      'worked examples that make the next person\'s decision obvious.',
    deliverables: [
      'Logo system — primary, stacked and one-colour lockups',
      'Type scale and palette, with the hex and the reasoning',
      'Brand book as PDF and as a live Figma file',
      'Worked examples: social, print, packaging, a page of the site',
    ],
    timeline: 'Typically 2–4 weeks',
    proof: 'LOOM drew its own display typeface from scratch and gives it away — the same hand does the client work.',
    pairs: ['Website', 'Social content', 'Launch campaign'],
  },

  'Website': {
    key: 'website',
    group: 'Web',
    yarn: 'violet',
    hook: 'A site that performs like a campaign and reads like craft.',
    body:
      'Built, not assembled: no page-builder, no bought template wearing your colours. ' +
      'The site you are reading is the reference — the motion, the type and the 3D on this page are the ' +
      'same toolchain a client project ships on.',
    deliverables: [
      'Design and build, desktop through phone',
      'CMS or a flat build — whichever the content actually needs',
      'Performance and accessibility pass before launch, not after',
      'Analytics, search metadata and an AI-answer file',
    ],
    timeline: 'Typically 3–6 weeks',
    proof: 'Every site LOOM ships is measured in a real browser at three widths before it goes live.',
    pairs: ['Brand identity', 'AI systems', '3D / AR experience'],
  },

  'Mobile app': {
    key: 'mobile-app',
    group: 'Product',
    yarn: 'blue',
    hook: 'iOS and Android, designed and actually shipped — not a prototype in a deck.',
    body:
      'LOOM builds and submits its own apps, which means the unglamorous half is covered: signing, ' +
      'store review, rejection appeals, the metadata that gets a listing pulled. ' +
      'A studio that has only ever handed off a Figma file has not met that half.',
    deliverables: [
      'Product design — flows, states, the empty and error screens',
      'Native or cross-platform build, your codebase at the end of it',
      'TestFlight and Play internal testing with real devices',
      'Store submission, review handling and the launch listing',
    ],
    timeline: 'Typically 6–12 weeks',
    proof: 'LOOM has taken its own apps through App Store review, including the rejections.',
    pairs: ['Brand identity', 'AI systems', 'Website'],
  },

  'Social content': {
    key: 'social-content',
    group: 'Content',
    yarn: 'crimson',
    hook: 'A month of content from one session, in Arabic and English.',
    body:
      'The expensive part of social is not the posting, it is starting from nothing every week. ' +
      'LOOM runs a content machine that writes, designs and schedules the month — with a human editor ' +
      'checking every piece before it ships, because the machine is fast and not wise.',
    deliverables: [
      'A month of posts, captioned in both languages',
      'Reels and short film cut from a single shoot',
      'A calendar you can see and move, not a surprise every Monday',
      'One editor accountable for everything that goes out',
    ],
    timeline: 'Ongoing, monthly',
    proof: 'This is THE MACHINE — the same subscription the page pitches further down, not a separate promise.',
    pairs: ['Launch campaign', 'AI systems', 'Brand identity'],
  },

  'AI systems': {
    key: 'ai-systems',
    group: 'AI',
    yarn: 'grey',
    hook: 'Agents that answer, book and follow up — on WhatsApp, in Arabic, at 2am.',
    body:
      'Not a chatbot bolted to a website. LOOM builds the agent into the channel the customer already ' +
      'uses, wires it to the calendar or the catalogue it needs to be useful, and leaves a human ' +
      'override on every path — because the failure mode of a confident agent is worse than no agent.',
    deliverables: [
      'A WhatsApp or web agent, bilingual, trained on your material',
      'Connected to the real thing — bookings, catalogue, inbox',
      'Human handover on every path it can get wrong',
      'A transcript log you can actually read',
    ],
    timeline: 'Typically 2–5 weeks',
    proof: 'LOOM runs three MCP servers of its own and publishes them — the tooling is in daily use, not demoed.',
    pairs: ['Social content', 'Website', 'Mobile app'],
  },

  '3D / AR experience': {
    key: 'ar-experience',
    group: 'Immersive',
    yarn: 'gold',
    hook: 'Product in the room, on the street, or in the browser — no app to install.',
    body:
      'WebGL and WebAR that runs off a link. LOOM has built room scanners, furniture configurators and ' +
      'scroll-driven 3D sites, so the question is not whether the render is pretty — it is whether the ' +
      'thing holds thirty frames a second on a mid-range Android, and that is the part LOOM measures.',
    deliverables: [
      'Modelling, or your existing CAD cleaned up for the web',
      'A configurator, an AR viewer, or a scroll-driven scene',
      'Runs in the browser from a link — no app, no store',
      'Budgeted for a mid-range phone, not a workstation',
    ],
    timeline: 'Typically 4–8 weeks',
    proof: 'The butterfly on this page is procedural — built in a vertex shader at runtime, not a downloaded model.',
    pairs: ['Website', 'Brand identity', 'Launch campaign'],
  },

  'Launch campaign': {
    key: 'launch-campaign',
    group: 'Campaign',
    yarn: 'magenta',
    hook: 'Key visual, film, and the media plan that puts them in front of someone.',
    body:
      'One pipeline from concept to shipped: the idea, the imagery, the cutdowns for every placement, ' +
      'and the paid setup underneath. Generative imagery where it saves a shoot, a real camera where ' +
      'it does not — the choice is made per shot, not per agency preference.',
    deliverables: [
      'Concept and key visual, in the formats each placement needs',
      'Launch film with cutdowns — feed, story, pre-roll',
      'Paid setup and creative testing on the platforms that matter',
      'A weekly read on what is working, in plain language',
    ],
    timeline: 'Typically 3–6 weeks to launch',
    proof: 'LOOM has produced full campaign catalogues generatively, without a studio booking.',
    pairs: ['Social content', 'Brand identity', '3D / AR experience'],
  },

  'Not sure yet': {
    key: 'not-sure',
    group: 'Start here',
    yarn: 'felt',
    hook: 'Bring the problem, not the brief. Shaping it is the first job.',
    body:
      'The most common honest answer, and the one this tile exists for. ' +
      'LOOM starts with intent rather than aesthetics — a call where the goal is to find the real ' +
      'problem, and a written direction afterwards that you own whether or not you hire us.',
    deliverables: [
      'A 30-minute call about the business, not the design',
      'A written direction — what to do first, and what to ignore',
      'A rough shape for scope and time before any commitment',
      'Yours to keep, and to take elsewhere if you want',
    ],
    timeline: 'A call this week',
    proof: 'The first station of LOOM\'s process is Intent: interrogate the brief until the real problem shows itself.',
    pairs: ['Brand identity', 'Website', 'Social content'],
  },
}

// The Counter renders WIZARD.needs, so the panel has to answer to the same
// keys. Anything in that list without an entry here simply opens the wizard
// the way it always did — the panel is an upgrade, never a gate.
export const hasNeedDetail = (need) => Boolean(NEEDS[need])
