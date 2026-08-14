// ————————————————————————————————————————————
// /journal/website-cost-jordan
//
// Targets "how much does a website cost in Jordan" and its Arabic form
// ("كم تكلفة تصميم موقع في الأردن"). Every JOD figure in this post is pulled
// from $data/pricing.js and static/llms.txt — nothing here is a number
// invented for the post. See pricing.js's own header comment: every figure is
// a FLOOR, never a quote, and this post repeats that framing rather than
// softening it into something that reads like a price list.
// ————————————————————————————————————————————

export const post = {
  slug: 'website-cost-jordan',
  title: 'How Much Does a Website Cost in Jordan? An Honest Breakdown',
  description:
    'What a business in Amman actually pays for a website, a store, an app or custom software — real floor prices, and the four things that move a number up from there.',
  publishedAt: '2026-08-14',
  updatedAt: '2026-08-14',
  author: { name: 'LOOM Studio', role: 'Amman × Sarajevo' },
  tags: ['Pricing', 'Web & App', 'Amman'],
  image: {
    src: '/img/core/website.webp',
    alt: 'A knitted laptop and a felted phone in wool, a yarn cable running from one into a small woollen shopping bag',
    width: 1200,
    height: 896,
  },
  readMinutes: 7,
  body: [
    {
      type: 'p',
      text:
        'Ask five agencies in Amman what a website costs and you will get five different answers, most of them vague on purpose. The honest answer is that the question is underspecified — a website and an online store are not the same product, and neither is priced the same as a mobile app or a piece of internal software. What follows are LOOM’s own published floors, what each one actually buys, and the handful of things that move a number up from there.',
    },
    {
      type: 'h2',
      text: 'The floor prices',
    },
    {
      type: 'p',
      text:
        'These are starting points, not quotes — every figure below is the lowest a project of that kind has been priced at, stated as a floor rather than a range with no bottom shown, because a business owner who cannot find a floor usually assumes the ceiling and stops reading before they ever send an inquiry.',
    },
    {
      type: 'ul',
      items: [
        'Website — from 500 JOD, one-off. A designed, multi-section site in Arabic and English, on your own domain, that you own outright once it ships.',
        'Store or platform — from 1,200 JOD, one-off. Anything with a database behind it: e-commerce, a booking system, a catalogue with a checkout.',
        'Mobile app — from 2,500 JOD, one-off. iOS and Android from one codebase, designed and submitted to both stores.',
        'Custom software — from 3,900 JOD, one-off. The internal tool nobody sells you off the shelf — a dashboard, a configurator, an AI agent wired into how your team already works.',
      ],
    },
    {
      type: 'p',
      text:
        'Notice the ladder: a store is roughly the price of a site plus a database, a checkout and an admin panel someone can actually run without calling a developer every time a product changes. An app is the store again, plus two native platforms and a store review process. Software is the app again, plus a written scope and a support window after handover. Each step is defensible against the one below it — none of the four is priced in isolation.',
    },
    {
      type: 'h2',
      text: 'What the floor actually buys',
    },
    {
      type: 'p',
      text:
        'A floor with no explanation of what it includes is a bait price, so here is what each one is built to cover. The website floor buys a real design and build — no theme underneath it — written properly in both Arabic and English rather than one language written and the other run through a translator, measured on real phones rather than assumed to work on them, with hosting set up and handed to you at the end. The store floor adds a working catalogue, cart and checkout, payment and delivery wired up, an admin panel your own team can operate, and product photography generated rather than shot in a studio — which is one of the reasons a store costs more than a site and not simply a bigger site. The app floor buys one build submitted to both app stores, a real design system rather than stock components, the basics of accounts and notifications, and someone shepherding the submission through Apple and Google’s review process, which is its own unpaid part-time job if you have never done it. The software floor buys a scoped first version that reaches production, not a prototype demo — the scope is agreed and written down before anyone writes a line of code, and you keep the source code when it is done.',
    },
    {
      type: 'h2',
      text: 'What moves the number up from the floor',
    },
    {
      type: 'p',
      text:
        'Three things change a website’s real price more than anything else, and none of them is negotiating skill.',
    },
    {
      type: 'h3',
      text: 'How many languages, written properly',
    },
    {
      type: 'p',
      text:
        'Arabic and English both written as their own copy — not one translated from the other — is already inside the floor. A third language, or Arabic copy that has to be produced from scratch because none exists yet, is real writing work and it is priced as writing work.',
    },
    {
      type: 'h3',
      text: 'How much content already exists',
    },
    {
      type: 'p',
      text:
        'A business that hands over finished product photography, a written menu or price list, and real testimonials is buying a build. A business that has none of that is buying a build plus a content shoot plus copywriting — and the second one is a bigger project even if the finished site looks identical to the first.',
    },
    {
      type: 'h3',
      text: 'How deep the thing has to go',
    },
    {
      type: 'p',
      text:
        'A five-page brand site and a fifty-product catalogue with filters, variants and a loyalty scheme are both "a store." One of them is the floor and one of them is well past it. The honest version of scoping is naming the pages, the flows and the integrations before a number is set, which is the opposite of a template price that looks the same whether your business needs three pages or thirty.',
    },
    {
      type: 'h2',
      text: 'The subscription most people forget to price in',
    },
    {
      type: 'p',
      text:
        'A website is not the end of the spending, and pretending otherwise is how a business ends up with a beautiful site nobody updates. LOOM also runs a monthly content subscription called The Machine, from 89 JOD a month: twenty photos and two videos a month, written, designed and scheduled in Arabic and English, with a human editor checking every piece before it ships. There is no retainer and no minimum term, so it is worth pricing that in alongside the build if the plan is to actually post something after launch week. For a smaller first step, LOOM also runs a fixed 49 JOD entry offer — a hundred finished, on-brand images of your products, your space or your menu, yours to keep and use anywhere, which on its own is usually cheaper than a single studio day that gets you a dozen photos.',
    },
    {
      type: 'h2',
      text: 'How to actually get a real number',
    },
    {
      type: 'p',
      text:
        'None of the figures above are quotes, and treated as quotes they would be dishonest. The only way to get a real number is to describe the actual thing — how many pages, whether there is a checkout, how many languages, what content already exists, when it needs to be live — and get a fixed price back in writing before any work starts. That is the standard worth holding any agency to, in Amman or anywhere else: a number you can hold them to, not an hourly rate that turns a scoping conversation into the first invoice.',
    },
    {
      type: 'p',
      text:
        'كم تكلفة تصميم موقع في الأردن؟ يبدأ سعر الموقع الإلكتروني من 500 دينار أردني، والمتجر الإلكتروني من 1,200 دينار، والتطبيق من 2,500 دينار، والبرمجيات المخصصة من 3,900 دينار — وكلها أرقام أساسية وليست عروض أسعار نهائية. الرقم الفعلي يعتمد على عدد اللغات، وكمية المحتوى الجاهز، وعمق المشروع. تحصل على سعر ثابت ومكتوب قبل بدء العمل.',
    },
    {
      type: 'p',
      text:
        'If you want a real number for your own project — a site, a store, an app or something nobody has a name for yet — describe it and get a fixed price back, in writing, before anything starts.',
    },
  ],
}
