// ————————————————————————————————————————————
// /journal/arabic-website-typography
//
// Backlog item 2: "Why your Arabic website is losing you customers" — RTL,
// font shaping, line height, and the specific ways Arabic type breaks on the
// web. English post; the Arabic counterpart is a separate piece.
//
// SOURCING. Every technical claim here is either (a) plain, checkable browser
// behaviour, or (b) a decision this repo actually made, which is quoted from
// the code rather than invented for the post:
//   · the Arabic fallback stack and the "Clash/Satoshi carry no Arabic glyphs"
//     admission — src/lib/components/machine.css, machine-offer.css
//   · the "don't force dir=rtl on a two-word inline fragment" rule and why —
//     src/lib/components/machine-offer.css, .mo-bullet-ar
//   · the looser Arabic leading (1.8–1.95) — the same two sheets
//   · "Arabic is written, not translated" — src/lib/data/faq.js
// The single JOD figure is the website floor from src/lib/data/pricing.js.
//
// NO NUMBERS ARE INVENTED. There is no conversion statistic in this post,
// because LOOM has not measured one — the "what it costs you" section states
// what the answer depends on instead of fabricating an average.
// ————————————————————————————————————————————

export const post = {
  slug: 'arabic-website-typography',
  title: 'Why Your Arabic Website Is Losing You Customers',
  description:
    'Arabic on the web breaks in specific, fixable ways — the wrong fallback font, tracking that severs the joins, Latin line height, and layouts mirrored instead of built. Here is what to check on your own site.',
  publishedAt: '2026-08-15',
  updatedAt: '2026-08-15',
  author: { name: 'LOOM Studio', role: 'Amman × Sarajevo' },
  tags: ['Arabic', 'Web & App', 'Typography'],
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
        'Most Arabic websites in Jordan are not badly designed. They are well-designed English websites with Arabic poured into them, and the difference is visible to every Arabic reader within about one second — before they have read a word, and long before they decide whether to trust you. The failures are not matters of taste. They are a short list of specific, mechanical breakages, and every one of them can be checked on your own site in the next ten minutes.',
    },
    {
      type: 'h2',
      text: 'Why does the Arabic on my site look like a different brand?',
    },
    {
      type: 'p',
      text:
        'Because it almost certainly is a different typeface. Most brand fonts — including the display and text faces used across this very site — carry no Arabic glyphs at all. When the browser meets an Arabic character in a font that has none, it silently substitutes whatever Arabic font the device happens to have. So your English is locked to your brand, and your Arabic is rendered in SF Arabic on an iPhone, in Segoe UI or Tahoma on Windows, and in Noto Sans Arabic on most Android phones. Three devices, three different Arabic voices, none of them yours.',
    },
    {
      type: 'p',
      text:
        'The honest fix has two levels. The cheap one is to choose that fallback deliberately instead of letting the browser choose it — name a system Arabic stack in your CSS so the substitution is a decision with a known result on each platform, and so it never degrades to empty boxes. The real one is to license or commission an Arabic face that belongs with your Latin one, and to pair them properly: matched weight, matched optical size, matched colour on the page. That is a design project, not a CSS line, and it should be priced as one.',
    },
    {
      type: 'p',
      text:
        'We say this having made the cheap choice ourselves. Arabic passages on this site fall to a named system stack because our own display face has no Arabic cut — stated here rather than quietly omitted, because an agency that hides its own compromises is not a useful source on anybody else’s.',
    },
    {
      type: 'h2',
      text: 'Why do the letters look broken or separated?',
    },
    {
      type: 'p',
      text:
        'Almost always because something is adding letter-spacing. Arabic is a joining script: most letters change shape depending on whether they sit at the start, the middle or the end of a word, and they connect. Tracking is a Latin refinement — it makes a headline breathe — and applied to Arabic it forces gaps into joins that are supposed to be continuous. The word stops reading as a word and starts reading as a row of parts.',
    },
    {
      type: 'p',
      text:
        'This happens by accident far more often than by intent. A shared heading class carries letter-spacing: 0.08em and text-transform: uppercase, both perfectly sensible for the English, and both get applied to the Arabic heading too. The uppercase does nothing at all — Arabic has no capitals — while the tracking quietly damages every headline on the Arabic side of the site. The rule is simple and absolute: never track Arabic. Set letter-spacing to zero wherever Arabic can appear, and get your emphasis from weight, size and colour instead, since case is not available to you.',
    },
    {
      type: 'h2',
      text: 'Why does Arabic look cramped at the same size as the English?',
    },
    {
      type: 'p',
      text:
        'Because it is. Arabic sits differently in the line: no uppercase to establish a tall band, marks and dots above and below the baseline, and descenders that reach further down than most Latin faces do. Set at the size and leading you tuned for English, the dots under one line meet the letters of the line above, and the whole paragraph reads dense and tiring even to a reader who could not tell you why.',
    },
    {
      type: 'p',
      text:
        'Set Arabic slightly larger than the equivalent Latin text and considerably looser. On this site the Arabic passages run at a line height in the region of 1.8 to 1.95, against roughly 1.75 for the English prose you are reading now, and drop back a little on small screens where the measure is narrower. Those are our numbers for our faces, not a universal constant — the correct value depends on the Arabic face you end up using and how deep its descenders are. The method is what transfers: tune Arabic leading against Arabic text on a real phone, never by scaling the English value.',
    },
    {
      type: 'h2',
      text: 'Should the whole page be dir="rtl"?',
    },
    {
      type: 'p',
      text:
        'The page, yes. A two-word Arabic fragment inside an English row, no — and this is where a lot of well-intentioned Arabic support makes things worse. Setting dir="rtl" and text-align: right on a short label sitting in an otherwise left-to-right layout does not make it more correct; it throws the phrase to the far edge of its container, away from the English it belongs beside, and breaks the row it was part of. The Unicode bidirectional algorithm already shapes and orders inline Arabic correctly on its own. It needs no help for a label, a name or a price.',
    },
    {
      type: 'p',
      text:
        'What genuinely needs a real dir="rtl" is a block: a paragraph, a list, a form, a column, a page. That is the line worth drawing — direction is a property of a block of content, not of every string that happens to contain Arabic characters. Getting this backwards is the most common self-inflicted wound on bilingual sites, because it looks like diligence.',
    },
    {
      type: 'h2',
      text: 'What breaks when a layout is mirrored instead of built right-to-left?',
    },
    {
      type: 'p',
      text:
        'The things that should not have moved. A mirrored layout is a flipped screenshot: everything reverses, including the things that are not directional at all. Done properly, the flip is selective and the CSS does the work for you.',
    },
    {
      type: 'h3',
      text: 'Use logical properties, not left and right',
    },
    {
      type: 'p',
      text:
        'margin-inline-start, padding-inline-start, border-inline-start and inset-inline follow the text direction automatically, which means one stylesheet serves both directions and the RTL version cannot drift out of sync with the LTR one. A codebase built on margin-left needs a second, mirrored stylesheet, and a second stylesheet is a second thing to forget to update.',
    },
    {
      type: 'h3',
      text: 'Flip what points, keep what does not',
    },
    {
      type: 'p',
      text:
        'A "next" chevron, a back arrow, a progress bar and a breadcrumb separator all point along the reading direction and must flip. A logo, a clock face, a play button, a checkmark and a photograph do not point along the reading direction and must not. Blanket transform: scaleX(-1) on an icon set flips all of them, which is how a site ends up with a backwards logo and a play button aiming at the wrong wall.',
    },
    {
      type: 'h3',
      text: 'Watch the numbers, and especially the phone number',
    },
    {
      type: 'p',
      text:
        'Digits run left-to-right even inside a right-to-left line, and the bidi algorithm handles that correctly on its own. Where it gets uncomfortable is punctuation: characters like +, - and parentheses are directionally neutral, so a phone number written as +962 with dashes can display with its pieces in an order you did not intend, depending on what surrounds it. Check every phone number, price and date on the Arabic side visually, on a real device, and if one is reordering, isolate it rather than reformatting the whole line.',
    },
    {
      type: 'h2',
      text: 'Is translated copy the same as Arabic copy?',
    },
    {
      type: 'p',
      text:
        'No, and this is the failure that costs the most while showing up in no audit tool. A translated headline reads as translated to every Jordanian who sees it — the rhythm is English, the sentence is a sentence nobody would say, and the effect is not "this company is international," it is "this company did not think we were worth writing for." Arabic copy that will be read in Arabic should be written in Arabic first, with the English following it, rather than one being run through the other. The two are not the same sentence in two alphabets.',
    },
    {
      type: 'p',
      text:
        'That is a position, not a neutral observation, and it has a cost: writing twice is more work than translating once, and it is priced as writing work. It is also the single change most likely to be noticed by an actual customer, which is why it belongs above almost everything else on this list.',
    },
    {
      type: 'h2',
      text: 'What about Arabic set inside images and video?',
    },
    {
      type: 'p',
      text:
        'Check the joins, every time. Some design and video tools shape Arabic correctly and some do not; the ones that do not render the letters unjoined, or in reverse order, and the result is confidently exported into a banner, a menu image or a reel where nobody catches it because the person approving it does not read Arabic. There is a fast test for whether a design tool has handled Arabic properly: paste the same string into a browser and compare the two shapes side by side.',
    },
    {
      type: 'p',
      text:
        'There is a separate reason to keep Arabic out of images wherever the layout allows: text baked into a picture cannot be read by a search engine, an AI answer engine, a screen reader, or a customer trying to copy your address into a maps app. If it is a sentence a customer might act on, it should be real text.',
    },
    {
      type: 'h2',
      text: 'What is this actually costing me?',
    },
    {
      type: 'p',
      text:
        'Nobody can honestly hand you a number for that, and an agency that quotes one has invented it. What the cost depends on is knowable, though, and it is worth working through for your own business: what share of your customers read Arabic by preference rather than by ability; whether the Arabic version is the default for a visitor arriving from an Arabic query or something they have to go and find; whether the broken part sits on a page that only informs, or on the checkout, the booking form or the phone number; and whether a first-time visitor has any other signal of your credibility to fall back on when the type looks wrong. A restaurant with a strong Instagram survives an ugly Arabic menu page. A new clinic asking a stranger for a deposit does not.',
    },
    {
      type: 'p',
      text:
        'The reason to fix it is not that a specific percentage is leaking. It is that Arabic typography is one of the very few quality signals a visitor can evaluate instantly, before they know anything else about you — and in this market they are evaluating it whether or not anyone on your side is.',
    },
    {
      type: 'h2',
      text: 'A ten-minute self-check',
    },
    {
      type: 'p',
      text:
        'Open your own site in Arabic on your phone, and then on a Windows machine if you can find one, and go through these in order.',
    },
    {
      type: 'ul',
      items: [
        'Does the Arabic look like the same brand as the English, or like a system default? Compare the two on the same screen.',
        'Are there empty boxes or misshapen glyphs anywhere? That is a missing font, not a bad translation.',
        'Zoom into a heading. Are the letters joined, or separated by small gaps? Gaps mean letter-spacing is being applied to Arabic.',
        'Do the dots below one line touch the line above it? That is Latin line height on Arabic text.',
        'Is the whole page right-to-left, or has a single Arabic label been shoved to the far edge of a row it belongs in the middle of?',
        'Check every arrow, chevron and icon. Is anything flipped that should not be — a logo, a play button, a clock?',
        'Read your phone number, your prices and your dates out loud from the Arabic page. Are the digits and the + in the order you wrote them?',
        'Read one Arabic paragraph aloud. Does it sound like a sentence a Jordanian would say, or like English wearing Arabic letters?',
        'Try to select and copy the Arabic in your banners and menu images. If you cannot, that text is invisible to search engines and screen readers.',
      ],
    },
    {
      type: 'p',
      text:
        'Most of that list is fixable inside an existing site without a rebuild — fonts, spacing, direction and icon flipping are stylesheet work. Copy written properly in Arabic is not, and neither is a site whose layout was mirrored rather than built. If the check turns up more of the second kind than the first, you are looking at a rebuild, and it is worth knowing that before you pay someone to patch it twice.',
    },
    {
      type: 'p',
      lang: 'ar',
      dir: 'rtl',
      text:
        'لماذا يبدو الموقع العربي مكسورًا؟ الأسباب الشائعة أربعة: خط لا يحتوي على حروف عربية فيستبدله المتصفح بخط النظام، وتباعد بين الأحرف يقطع اتصالها، وارتفاع سطر مضبوط على الإنجليزية فتتزاحم النقاط تحت السطر الذي فوقها، وتخطيط تم عكسه بدل أن يُبنى من اليمين إلى اليسار. الحل ليس ترجمة أفضل، بل نص عربي مكتوب بالعربية أولًا، وتنضيد مضبوط على العربية نفسها.',
    },
    {
      type: 'p',
      spans: [
        'If you want the check done properly rather than by eye, describe the site and we will tell you which of the two kinds of problem you have — and if it is the second kind, ',
        { text: 'what a rebuild starts at', href: '/pricing' },
        ' and what ',
        { text: 'the work we have already shipped', href: '/work' },
        ' in both languages looks like. Either way you get a straight answer and a fixed price in writing before anything starts.',
      ],
    },
  ],
}
