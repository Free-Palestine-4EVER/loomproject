// ————————————————————————————————————————————
// /journal/ecommerce-jordan-cliq-cod-checkout
//
// Backlog item 4: "E-commerce in Jordan: CliQ, cash on delivery, and
// Arabic-first checkout." The most tempting post on the backlog to fabricate
// numbers for — adoption percentages, average order values, conversion
// lifts. None appear below, on purpose. Where a number is not knowable it is
// stated as what it depends on instead, the same pattern the pricing posts
// use for a build's cost.
//
// SOURCING. Every factual claim traces to a real file in this repo:
//   · CliQ, as LOOM's own accepted payment method — src/lib/data/site.js,
//     the CLIQ export and the comment block above it: alias 0791792129,
//     name "LOOM STUDIO", the flow is manual (quantity selected, reference
//     minted, handed to WhatsApp, an operator confirms and credits the
//     account by hand) — there is explicitly no processor on LOOM's own
//     site. Also static/faq.js's `payment` entry: "the 3D models... paid by
//     CliQ and confirmed on WhatsApp."
//   · The e-commerce "COD confirmation gate" and "cart recovery in the
//     chat" lines — src/lib/data/site.js, NICHES array, key: 'ecommerce',
//     live today at /solutions. This is LOOM's own published description of
//     what it sells for this exact niche, not invented for this post.
//   · Pricing floors (site 500 / store 1,200 JOD, what the store floor
//     includes: "payment and delivery wired up", "an admin panel your team
//     can run") — src/lib/data/pricing.js.
//   · The Arabic-is-written-not-translated + RTL-built-properly claim —
//     src/lib/data/faq.js, id: 'arabic' (paraphrased, same facts).
//   · LOOM's own unfinished Arabic/RTL journal template, already stated
//     publicly in /journal/ai-native-agency and tracked as TASKS.md #19d —
//     referenced here honestly rather than re-litigated.
//   · CASES: evorahome (3D Catalogue, E-commerce, AR scope) —
//     src/lib/data/site.js, used exactly as described there, no invented
//     result attached to it.
//
// NO INVENTED FACTS. No CliQ adoption percentage, no COD failure rate, no
// average order value, no conversion lift, no market-size figure appears
// anywhere below — none of those numbers could be sourced, so instead the
// post states what each one depends on. No client name beyond CASES. No
// price beyond pricing.js.
// ————————————————————————————————————————————

export const post = {
  slug: 'ecommerce-jordan-cliq-cod-checkout',
  title: 'E-commerce in Jordan: CliQ, Cash on Delivery, and Building an Arabic-First Checkout',
  description:
    'What actually belongs in a Jordanian online store\'s checkout — why CliQ is worth supporting, why cash on delivery is not worth dropping, and what "Arabic-first" means beyond translating the buttons.',
  publishedAt: '2026-08-18',
  updatedAt: '2026-08-18',
  author: { name: 'LOOM Studio', role: 'Amman × Sarajevo' },
  tags: ['E-commerce', 'Payments', 'Amman'],
  image: {
    src: '/img/core/website.webp',
    alt: 'A knitted laptop and a felted phone in wool, a yarn cable running from one into a small woollen shopping bag',
    width: 1200,
    height: 896,
  },
  readMinutes: 8,
  body: [
    {
      type: 'p',
      text:
        'A Jordanian online store gets its payment page wrong in one of two directions: it forces prepayment on a customer who has never heard of the brand and does not trust it enough to send money first, or it accepts cash on delivery for everything and quietly eats the cost of every refused parcel. Both are avoidable. What follows is the honest version — what CliQ actually is, why cash on delivery is not worth removing, and what "Arabic-first" checkout means as a design decision rather than a translation task.',
    },
    {
      type: 'h2',
      text: 'What is CliQ, and does a Jordanian store actually need to support it?',
    },
    {
      type: 'p',
      text:
        'CliQ is Jordan\'s instant bank-to-bank payment system: a customer sends money straight from their own banking app to a business\'s registered alias — a phone number or a short ID — and it settles directly between banks, with no card details exchanged and no separate payment gateway required to receive it. For a store, that is the appeal: it is a real-time transfer, not a promise of one, and it does not depend on the buyer owning a card that works online, which not everyone in Jordan does. A store that only offers cash on delivery is turning away every customer who would rather pay now and be done with it; a store that only offers card payment is turning away everyone who does not have one wired up for the web. CliQ sits in the middle of that gap, and it is worth supporting for that reason alone, not because of any adoption figure — none is cited here because none could be sourced honestly.',
    },
    {
      type: 'p',
      spans: [
        'LOOM takes its own advice here in a small, honest way: the one thing on LOOM\'s own site sold on the spot — the ',
        { text: 'downloadable 3D models', href: '/pricing' },
        ' — is paid by CliQ, confirmed over WhatsApp. It is worth being precise about what that flow actually is, because it is not a real-time integration: a visitor picks a quantity, the page mints a reference and hands them to WhatsApp, and a person on LOOM\'s side confirms the transfer arrived and credits the account by hand. That is CliQ accepted honestly, not CliQ automated. A store built to actually process orders at volume needs more than that — which is exactly the distinction the next section is about.',
      ],
    },
    {
      type: 'h2',
      text: 'Should a Jordanian store drop cash on delivery once it supports CliQ?',
    },
    {
      type: 'p',
      text:
        'No. Cash on delivery is not a legacy habit a Jordanian store can safely retire in favour of prepayment — it is the way a first-time buyer with no reason to trust an unfamiliar brand yet still completes an order instead of abandoning the cart. Removing it does not convert those customers to CliQ or card; it mostly removes the order. The honest recommendation is to keep cash on delivery available and design around its real cost, rather than pretend the cost does not exist or use it as a reason to remove the option altogether.',
    },
    {
      type: 'h3',
      text: 'What cash on delivery actually costs a store',
    },
    {
      type: 'p',
      spans: [
        'The cost is not the courier fee — it is the refused delivery: a driver makes the trip, the customer is not there or changes their mind at the door, and the store is out the courier cost, the stock movement and a day of cash-flow, with no sale to show for it. LOOM\'s own description of what it builds for e-commerce brands names this directly, in the service already published at ',
        { text: 'the solutions page', href: '/solutions' },
        ': a "COD confirmation gate," which confirms every cash order with the customer before it is dispatched, on the reasoning stated plainly there — "refused deliveries are a pure loss both ways." That is the actual fix, and it is a process fix, not a payments fix: it does not remove cash on delivery, it removes the orders that were never going to be collected in the first place.',
      ],
    },
    {
      type: 'h3',
      text: 'Where CliQ and cash should each sit in the flow',
    },
    {
      type: 'p',
      text:
        'The practical order that respects both: offer CliQ (and a card option, where the gateway relationship supports it) as the fast, default-looking path at checkout, because a customer who is willing to pay now should meet no friction on the way to doing it. Keep cash on delivery visible and equally easy to select, not hidden behind a second click or a "more options" toggle designed to discourage it — a store that makes cash on delivery deliberately awkward is quietly telling its least-trusting customers to go elsewhere, and that is the segment that most needs the option. Confirm every cash order before it leaves the warehouse. That order — instant option first, cash kept easy, cash confirmed before dispatch — is a defensible checkout, not a compromise.',
    },
    {
      type: 'h2',
      text: 'What does "Arabic-first checkout" actually mean, beyond translating the buttons?',
    },
    {
      type: 'p',
      text:
        'It means the checkout is designed for how a Jordanian customer actually fills it in, not an English checkout with Arabic labels swapped over the same fields. Three concrete differences: address fields built around Jordan\'s landmark-and-area addressing rather than a postal-code field nobody can fill in correctly; a phone field that accepts and displays Jordanian mobile formats without fighting the customer over a country-code assumption built for somewhere else; and order confirmations — on-page, SMS, WhatsApp — written in Arabic as the default for an Arabic-language session, not appended as an afterthought once the English version already shipped.',
    },
    {
      type: 'p',
      text:
        'The layout matters as much as the copy. A checkout mirrored from left-to-right into right-to-left, rather than built right-to-left from the start, tends to leave one control — usually the submit button, sometimes the field order itself — in the wrong visual place relative to how an Arabic reader\'s eye actually moves down the page. Copy that is translated rather than written in Arabic first reads as translated to exactly the customer it was meant to reassure, at the exact moment — entering a card or bank alias — where trust matters most.',
    },
    {
      type: 'p',
      spans: [
        'LOOM has published this same limitation about its own site rather than hidden it: the journal template this post is rendered in has no per-post right-to-left mechanism yet, which is why every post here — including this one — ships in English. That gap is stated plainly in ',
        { text: 'the previous post', href: '/journal/ai-native-agency' },
        ', and it stands as the clearest illustration available of the difference this section is arguing for: translating a page is fast, building it to actually work in Arabic is a real, unfinished piece of engineering, and a store owner should expect an honest agency to say which one it has done.',
      ],
    },
    {
      type: 'h2',
      text: 'Does LOOM build CliQ into the stores it ships for clients?',
    },
    {
      type: 'p',
      spans: [
        'Plainly: what a client\'s store gets is scoped per project, not assumed. The ',
        { text: 'store floor', href: '/pricing' },
        ' — from 1,200 JOD — includes "payment and delivery wired up" as part of a working catalogue, cart, checkout and admin panel, and what that means in practice depends on which payment relationships the client\'s own bank supports, because CliQ and card processing are bank- and gateway-specific arrangements LOOM does not control end to end. LOOM\'s own site, as described above, currently accepts CliQ through a manual, human-confirmed flow for one product line — not a live, automated API integration — and that limitation is stated here for the same reason it was stated about LOOM\'s Arabic support: an agency selling e-commerce work should be precise about which parts of its own stack are automated and which are still a person watching a WhatsApp thread.',
      ],
    },
    {
      type: 'h2',
      text: 'So what should a Jordanian SMB actually do about payments and checkout?',
    },
    {
      type: 'p',
      spans: [
        'Support CliQ as the fast default for a customer who is ready to pay now. Keep cash on delivery, because removing it costs more first-time customers than it saves in courier fees, and confirm every cash order before dispatch instead of absorbing the refused ones as a fixed cost of doing business. Build the checkout in Arabic first if that is the language most customers will actually use, with the address, phone and confirmation flow designed for Jordan rather than copied from a template built for somewhere else. None of that requires guessing at a market-size number or a conversion percentage that no honest source publishes for this market yet — it requires building the three things above properly, which is a design and engineering problem, not a statistics one. That is the actual scope conversation worth having, and ',
        { text: 'the work page', href: '/work' },
        ' shows what a full product-and-store system looks like when it ships — nothing on it invented for a pitch.',
      ],
    },
  ],
}
