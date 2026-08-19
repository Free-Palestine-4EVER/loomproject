// ————————————————————————————————————————————
// /journal/instagram-or-website-jordan-smb
//
// Backlog item 6: "Instagram or a website: what a Jordanian SMB actually
// needs first in 2026." Items 1 and 5 (the Arabic posts) are BLOCKED on
// TASKS.md #19d — no per-post RTL/dir/lang mechanism, no Arabic-shaping
// webfont — so this is the next unclaimed English item, not a substitute
// for either.
//
// WHY THIS TOPIC IS GROUNDED RATHER THAN GENERIC: every one of the ten
// outreach leads in loom-growth/CLIENTS.md is an Amman business with a real
// Instagram presence and no website — restated here only as a general,
// unquantified market pattern this studio has observed while doing outreach
// research, never as a statistic, and NONE of those ten businesses is named,
// counted, or implied to be a client anywhere below. They are un-contacted
// research subjects and stay entirely out of this post.
//
// SOURCING. Every factual claim traces to a real file in this repo:
//   · CORE_SERVICES, 'Website or online store' + 'Content engine' entries —
//     src/lib/data/site.js — the site's own published description of what a
//     website buys vs. what a content engine buys.
//   · NICHES, key: 'fashion' ("A stylist in every DM", DM-based sizing and
//     checkout) and key: 'ecommerce' ("COD confirmation gate", cart recovery
//     in chat) — src/lib/data/site.js — LOOM's own published description of
//     exactly the DM-commerce pattern this post discusses, used as-is, no
//     invented detail added.
//   · ENTRY_OFFER (49 JOD / 100 photos) and PRICING (site from 500 JOD,
//     store from 1,200 JOD) — src/lib/data/site.js and pricing.js.
//   · THE_MACHINE (20 photos + 2 videos/month, human editor, 89 JOD floor) —
//     offers.js, quoted in pricing.js and static/llms.txt.
//   · FAQ id: 'small' (no minimum, no minimum company size) and id:
//     'ownership' (the "you own it" argument, paraphrased and applied here to
//     owning a domain vs. renting a platform account — the underlying
//     reasoning, not a new fact) — faq.js.
//   · llms.txt's own AEO / GPT BOOST section (llms.txt, schema.org, being
//     "readable" and "quotable" to named AI crawlers/assistants) —
//     static/llms.txt — used to explain what a website can do that a
//     platform profile structurally cannot, without citing any adoption or
//     ranking number.
//   · The previous post's CliQ/COD material — /journal/ecommerce-jordan-cliq-cod-checkout
//     — referenced, not repeated verbatim, for the "when DM-checkout breaks"
//     argument.
//
// NO INVENTED FACTS. No Instagram usage or follower statistic for Jordan or
// Amman, no percentage of SMBs without a website, no conversion or DM-response
// benchmark, no named business beyond CASES, no price beyond pricing.js. Where
// a number is not knowable — how many DMs a day is "too many," how much COD
// refusal a given shop actually eats — the post says what it depends on
// instead of guessing one.
// ————————————————————————————————————————————

export const post = {
  slug: 'instagram-or-website-jordan-smb',
  title: 'Instagram or a Website: What a Jordanian SMB Actually Needs First in 2026',
  description:
    'The honest answer is not "always a website." Here is what Instagram actually does well for a small Amman business, what it structurally cannot do, and the three concrete moments that mean it is time to build a site.',
  publishedAt: '2026-08-19',
  updatedAt: '2026-08-19',
  author: { name: 'LOOM Studio', role: 'Amman × Sarajevo' },
  tags: ['Small Business', 'Strategy', 'Amman'],
  image: {
    src: '/img/core/content.webp',
    alt: 'A knitted camera on a small tripod feeding one long ribbon of wool that folds into a stack of blank felted tiles, a grid of blank knitted squares pinned behind it',
    width: 1200,
    height: 896,
  },
  readMinutes: 8,
  body: [
    {
      type: 'p',
      text:
        'This question comes up constantly with small businesses in Amman, and the honest answer is not "always build a website" — plenty of businesses are doing real, profitable work through an Instagram page and nothing else, and telling them to spend money on a site they do not yet need is bad advice dressed up as a sales pitch. The useful version of the question is not "which one," it is "what does each one actually do, and which of those things does this business need right now." Here is that breakdown, without a single invented statistic about how many businesses in Jordan have a website or don\'t, because no honest source publishes that number for this market.',
    },
    {
      type: 'h2',
      text: 'What can Instagram actually do well for a small Amman business?',
    },
    {
      type: 'p',
      text:
        'It is a genuinely good discovery and selling channel for a certain kind of business, and it is worth saying plainly what it gets right rather than treating it as the thing you graduate out of. People browse it the way they used to browse a shop window, it costs nothing to post to, and for a product that sells on how it looks — a dress, a cake, a piece of jewellery, a plate of food — a feed of good photography does real work that a website\'s product grid often does worse, because the customer is already in a scrolling, browsing mood rather than a searching one.',
    },
    {
      type: 'p',
      spans: [
        'LOOM\'s own published description of fashion retail names this pattern directly rather than tiptoeing around it: "A stylist in every DM" — a business fielding "size, stock and fit" questions and taking "the order in the thread" is not doing something wrong, it is running a real, working sales channel. The same shape shows up across ',
        { text: 'the solutions LOOM builds for retail and food businesses', href: '/solutions' },
        ' — DM-based ordering is common enough to be worth designing for, not a stopgap everyone is presumed to be embarrassed about.',
      ],
    },
    {
      type: 'h2',
      text: 'What can Instagram not do, no matter how well it is run?',
    },
    {
      type: 'p',
      text:
        'Three structural things, and none of them are about how good the page looks or how many people follow it.',
    },
    {
      type: 'h3',
      text: '1. It does not compound the way owned content does',
    },
    {
      type: 'p',
      spans: [
        'A post that did well six months ago is not still bringing anyone new in — the feed format means a page\'s history mostly stops working the moment it stops being recent. A website with a real content engine behind it — ',
        { text: 'The Machine', href: '/machine' },
        ' produces 20 photos and 2 videos a month, in Arabic and English, with a human editor checking every piece before it ships — keeps that same volume of content going, but a page that lives on a domain LOOM or the business itself controls, in a place search engines and AI assistants can actually index and re-surface later, keeps earning from a good piece long after the week it was posted.',
      ],
    },
    {
      type: 'h3',
      text: '2. It is not what AI assistants read when someone asks "who does this near me"',
    },
    {
      type: 'p',
      text:
        'Being findable by ChatGPT, Gemini and Perplexity increasingly depends on things that only exist on an actual website: a clean, crawlable page, structured data that states what a business is and does, a file written in plain language for a model to read. A platform profile is not that — it is not the kind of page these tools cite when they answer a question about a local business, and no amount of good content on it changes that. A business whose entire public presence is one Instagram page is, for that specific channel, effectively invisible to it. That is a real and growing gap, not a hypothetical one, and it is one of the two things LOOM\'s own answer-engine work exists to close.',
    },
    {
      type: 'h3',
      text: '3. The account is rented, not owned',
    },
    {
      type: 'p',
      text:
        'A domain and a website belong to the business that paid for them. A platform account runs on someone else\'s rules, someone else\'s algorithm changes, and someone else\'s decision about whether that account stays reachable — none of which the business controls. That is not a prediction about any specific business losing access to anything; it is simply true of any rented channel, and it is the same underlying reason LOOM tells its own clients they own every asset produced for them outright. A business whose only public presence is a platform profile has, structurally, nothing that is fully theirs.',
    },
    {
      type: 'h2',
      text: 'So what does a Jordanian SMB actually need first?',
    },
    {
      type: 'p',
      text:
        'It depends on what is actually breaking today, not on a rule that applies to every business the same way. Three concrete moments are worth treating as the real trigger for building a site, rather than "growth" in the abstract:',
    },
    {
      type: 'ul',
      items: [
        'DM-based ordering has stopped being manageable — the same size, stock and price questions asked over and over, or orders getting missed inside the thread. That is the moment a real checkout, not a friendlier DM script, is the fix.',
        'Refused cash-on-delivery orders are costing real money — a driver making the trip, the customer not there, stock and a courier fee lost with nothing to show for it. A confirmed-order flow before dispatch fixes that; a platform DM thread cannot enforce one.',
        'The business wants to show up when someone asks an AI assistant a local, category-level question instead of searching the business by name. That specifically requires a website — a Google Business Profile helps too, but neither replaces the other.',
      ],
    },
    {
      type: 'p',
      spans: [
        'The cash-on-delivery point is worth reading in full rather than taking on faith — ',
        { text: 'the previous post', href: '/journal/ecommerce-jordan-cliq-cod-checkout' },
        ' covers the confirmation-gate fix in detail. And none of this requires abandoning Instagram once a site exists: the two are not competing channels. LOOM\'s own site pairs ',
        { text: 'a website or online store', href: '/pricing' },
        ' with the same content engine that already feeds a good Instagram page, precisely because the honest answer to "Instagram or a website" is usually "both, doing different jobs," not "replace one with the other."',
      ],
    },
    {
      type: 'h2',
      text: 'What if the budget only covers one thing right now?',
    },
    {
      type: 'p',
      spans: [
        'There is no minimum company size or minimum retainer here, and that is worth saying plainly rather than assumed: if a full site is genuinely more than a business needs this month, the honest move is to say so rather than sell it anyway. A ',
        { text: 'website starts from 500 JOD', href: '/pricing' },
        ' and a store with checkout, orders and an admin panel from 1,200 — both real floors, not teaser prices — but a business that is not ready for either yet can start smaller: 100 finished product or space photos for 49 JOD, or ',
        { text: 'The Machine', href: '/machine' },
        ' at 89 JOD a month for an ongoing 20 photos and 2 videos, keeps the Instagram page itself genuinely strong while the case for a website builds on its own timeline, not a sales one.',
      ],
    },
    {
      type: 'h2',
      text: 'The honest summary',
    },
    {
      type: 'p',
      spans: [
        'Instagram is a real, working channel for a business that sells on how something looks and is small enough to answer its own DMs — nothing about that needs fixing on its own. A website earns its cost the moment one of three things is true: the DMs have outgrown manual handling, refused cash orders are an actual cost line, or the business wants to be findable by the AI assistants that platform profiles are structurally invisible to. If none of those is true yet, the honest answer is not yet — and if one of them is, ',
        { text: 'the contact form', href: '/contact' },
        ' is the place to say which one, so the quote matches the actual problem instead of a generic package.',
      ],
    },
  ],
}
