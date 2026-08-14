// ————————————————————————————————————————————
// /journal/website-cost-jordan-ar  —  DRAFT, NOT WIRED IN. DO NOT PUBLISH.
//
// كم تكلفة تصميم موقع الكتروني في الأردن — the Arabic counterpart to
// website-cost-jordan.js. Written NATIVELY in Arabic for this post, not
// translated from the English one — the structure, the questions answered
// and the order they're answered in are different on purpose. An English
// searcher asks "what does a website cost"; a reader in Amman searching this
// exact Arabic phrase has usually already collected two or three wildly
// different quotes from Instagram/Facebook freelancers and is trying to
// understand why they don't agree — so this post opens there instead of
// opening on a price ladder.
//
// SOURCING — every JOD figure below comes from ONE of two files, nowhere
// else:
//   - $data/pricing.js  → the four one-off floors (500 / 1,200 / 2,500 /
//     3,900 JOD), The Machine's floor (89 JOD/month), the entry offer
//     (49 JOD / 100 photos)
//   - static/llms.txt    → confirms the same Machine figure and the
//     Arabic+English production claim
// No statistic, case study, testimonial or client name appears anywhere in
// this file beyond what's already public in $data/site.js (none was needed
// for this topic). Nothing here is invented.
//
// STATUS — DRAFT. This file is deliberately NOT imported by
// $data/posts/index.js, so it does NOT appear in /journal, the sitemap, or
// anywhere else on the live site. It is awaiting two reads before it can be
// wired in and published:
//   1. A native Jordanian Arabic speaker — for register, dialect-adjacent
//      word choice, and anything that reads machine-flavoured to the exact
//      audience this is written for (per content-agent.md: "Machine-flavoured
//      Arabic is instantly recognisable to exactly the audience it targets
//      and it costs more credibility than the post earns").
//   2. Mo.
// Do not add this post to posts/index.js until both of those have happened.
//
// RTL — this post is pure Arabic body copy, but the current post template
// (src/routes/journal/[slug]/+page.svelte) has NO per-post `dir`/`lang`
// mechanism and the site ships no Arabic-shaping webfont: styles.css's
// --font-system stack and the Clash Display / Satoshi / LOOM Bloom families
// declared there are Latin-only. Every existing Arabic passage on the site
// (machine/+page.svelte, machine-offer.css) is a short inline fragment
// wrapped by hand in lang="ar" (and dir="rtl" only where it's a full
// paragraph), sitting inside an otherwise-LTR English page — there is no
// precedent anywhere in this repo for a FULL PAGE of Arabic body copy in a
// right-to-left reading direction. Shipping this post as-is would render
// Arabic text left-aligned, LTR-flowing, in a Latin display face with
// Latin-tuned line-height — legible in a pinch but visibly wrong to a native
// reader before they've read a word of it. That is a build task, not a
// copy task, and it is out of scope for this draft. What it needs before
// publish:
//   - `dir="rtl"` and `lang="ar"` on the post's root container (conditional
//     on the post, e.g. a `lang: 'ar'` field on the post object read by
//     [slug]/+page.svelte)
//   - right-aligned text, mirrored layout for the hero/meta row and the
//     prev/next nav (logical CSS properties — margin-inline-start etc. —
//     rather than left/right, so English posts aren't affected)
//   - an Arabic-capable font in the stack (Clash Display/Satoshi have no
//     Arabic glyphs; system Arabic fallback works but wasn't chosen on
//     purpose) and a taller line-height for Arabic body text, which needs
//     more vertical room than Latin at the same point size
// This is a finding for the technical agent / TASKS.md, not something to
// half-fix inside a content draft.
// ————————————————————————————————————————————

export const post = {
  slug: 'website-cost-jordan-ar',
  title: 'كم تكلفة تصميم موقع الكتروني في الأردن؟',
  description:
    'ليش عرضين لتصميم نفس الموقع بيختلفوا من 150 دينار إلى آلاف؟ الفرق الحقيقي بين "موقع" و"قالب"، وأسعار LOOM الفعلية كنقطة بداية.',
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
  readMinutes: 6,
  body: [
    {
      type: 'p',
      text:
        'أي صاحب محل أو عيادة أو مطعم في عمّان جرّب يسأل عن سعر موقع الكتروني، رجع بعروض متباعدة جدًا عن بعض: عرض بـ150 دينار من صفحة على فيسبوك، وعرض بآلاف الدنانير من مكتب تصميم. الاثنان يسمّون نفسهما "تصميم موقع"، لكنهما ليسا نفس المنتج. قبل ما نحكي أرقام، لازم نفهم ليش الفجوة هاي موجودة أصلًا — وبعدها نحط الأرقام الحقيقية.',
    },
    {
      type: 'h2',
      text: 'ليش العروض الرخيصة موجودة، وشو الفرق الفعلي',
    },
    {
      type: 'p',
      text:
        'العرض الرخيص جدًا عادة قالب جاهز (تمبلت) معدّل بالألوان والشعار، بمحتوى عربي إما منسوخ أو مترجم من الإنجليزي بسرعة. هذا مو احتيال بالضرورة — هو منتج مختلف، وسعره منطقي لحجمه. المشكلة تصير لما صاحب العمل يقارنه بعرض موقع مبني من الصفر، ويحس إنه "مغبون" بالسعر الثاني. الفرق الحقيقي بين الاثنين هو هذا: موقع مبني بدون قالب تحته، بمحتوى عربي مكتوب أصلًا بالعربي — مو مترجم عن الإنجليزي — ومجرّب فعليًا على موبايلات حقيقية قبل ما يسلَّم.',
    },
    {
      type: 'h2',
      text: 'أول سؤال قبل السعر: أي نوع موقع فعلًا بدك',
    },
    {
      type: 'p',
      text:
        '"موقع الكتروني" كلمة توصف أربع منتجات مختلفة تمامًا، وسعرها يختلف لهذا السبب بالضبط لا لسبب آخر: موقع تعريفي لعرض العمل والتواصل، متجر فيه قاعدة بيانات وسلة شراء ودفع، تطبيق موبايل لنظامي iOS وAndroid، أو برنامج داخلي مخصص لإدارة العمل. الخطوة الأولى قبل أي عرض سعر جدّي هي تحديد أي واحد من هذول الأربعة هو المطلوب فعلًا — لأن مقارنة سعر متجر بسعر موقع تعريفي هي نفسها مقارنة سعر شقة بسعر غرفة.',
    },
    {
      type: 'h2',
      text: 'الأسعار الفعلية عند LOOM',
    },
    {
      type: 'p',
      text:
        'هاي أرقام LOOM المنشورة، وهي حد أدنى وليست عرض سعر نهائي — كل مشروع يحصل على سعر ثابت مكتوب قبل ما يبدأ العمل فيه:',
    },
    {
      type: 'ul',
      items: [
        'موقع تعريفي — يبدأ من 500 دينار، دفعة واحدة. موقع مصمم فعليًا (بدون قالب جاهز)، بالعربي والإنجليزي، على دومين خاص فيك، وتمتلكه بالكامل بعد التسليم.',
        'متجر أو منصة — يبدأ من 1,200 دينار، دفعة واحدة. أي شيء فيه قاعدة بيانات خلفه: متجر الكتروني، نظام حجز، كتالوج فيه سلة دفع.',
        'تطبيق موبايل — يبدأ من 2,500 دينار، دفعة واحدة. لنظامي iOS وAndroid من نفس الكود، مصمم ومرسل للمتجرين.',
        'برمجيات مخصصة — يبدأ من 3,900 دينار، دفعة واحدة. الأداة الداخلية التي لا أحد يبيعها جاهزة: لوحة تحكم، أداة تسعير تفاعلية، وكيل ذكاء اصطناعي مربوط بطريقة عمل الفريق الحالية.',
      ],
    },
    {
      type: 'p',
      text:
        'الفرق بين الرقمين — 500 دينار للموقع، و1,200 للمتجر — هو تقريبًا سعر قاعدة البيانات والسلة ولوحة تحكم يقدر صاحب العمل يشغّلها بنفسه، مو الموقع نفسه "مضاعف". نفس المنطق ينطبق كل خطوة للي بعدها.',
    },
    {
      type: 'h2',
      text: 'شو يرفع السعر عن الحد الأدنى',
    },
    {
      type: 'p',
      text:
        'أكتر شي بيرفع السعر مو "التفاوض" — هو ثلاث نقاط فعلية. الأولى: كم لغة، ومكتوبة كيف. المحتوى العربي المكتوب من الصفر — مو المترجم عن نص إنجليزي جاهز خلال دقايق بأداة ترجمة — عمل كتابة حقيقي، ومحسوب كعمل كتابة. أغلب أصحاب الأعمال في عمّان عندهم فعلًا محتوى عربي جاهز على السوشال ميديا، بس مو مكتوب بأسلوب موقع، وهذا الفرق بيأخذ وقت. الثانية: قد إيش المحتوى جاهز أصلًا — صور منتجات احترافية، قائمة أسعار، نصوص عن الخدمات — مقابل ما في شي جاهز إطلاقًا. الثالثة: قد إيش الموقع "عميق" فعليًا، يعني كم صفحة وكم عملية (حجز، فلترة منتجات، نظام ولاء) لازم تُبنى قبل ما يُحدَّد سعر نهائي.',
    },
    {
      type: 'h2',
      text: 'بعد الموقع: المحتوى الشهري',
    },
    {
      type: 'p',
      text:
        'الموقع مو آخر مصروف — موقع جميل بدون تحديث بيصير صفحة منسية بعد شهرين. LOOM عندها اشتراك محتوى شهري اسمه "المصنع" (The Machine)، يبدأ من 89 دينار بالشهر: عشرين صورة وفيديوهان بالشهر، مكتوبة ومصممة ومجدولة بالعربي والإنجليزي، ويراجعها إنسان قبل ما تُنشر — بدون التزام أو مدة دنيا. لخطوة أول أصغر، في عرض ثابت بـ49 دينار: مية صورة احترافية جاهزة لمنتجاتك أو محلك أو قائمة الطعام، تمتلكها وتستخدمها بأي مكان — وهي عادة أرخص من يوم تصوير واحد بستوديو بيعطيك اثنتي عشرة صورة بس.',
    },
    {
      type: 'h2',
      text: 'كيف تحصل على سعر ثابت فعلي',
    },
    {
      type: 'p',
      text:
        'أي رقم فوق مو عرض سعر نهائي، ومعاملته كأنه كذلك يكون غير دقيق. السعر الحقيقي يحتاج وصف المشروع الفعلي — كم صفحة، هل في عملية دفع، كم لغة، شو المحتوى الجاهز، وموعد التسليم المطلوب — وبعدها الحصول على سعر ثابت مكتوب قبل ما يبدأ أي عمل. هذا هو المعيار اللي يستاهل تحاسب أي مكتب عليه، في عمّان أو بأي مكان: رقم مكتوب تقدر تحاسبهم عليه، مو سعر بالساعة يخلي جلسة تحديد النطاق أول فاتورة.',
    },
    {
      type: 'p',
      text:
        'إذا بدك رقم حقيقي لمشروعك — موقع، متجر، تطبيق، أو شي ما له اسم بعد — اوصفه واحصل على سعر ثابت مكتوب قبل ما يبدأ أي شي.',
    },
  ],
}
