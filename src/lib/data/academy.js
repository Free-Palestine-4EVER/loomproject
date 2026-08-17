/**
 * LOOM ACADEMY — أكاديمية LOOM
 * The school. FIRST CLIENT (أول عميل) is Program 01 inside it.
 *
 * ── WHY THE SHELF AND THE PRODUCT ARE SEPARATE ────────────────────────────
 * This started as a single course page and was restructured at the client's
 * call: "this isn't a course, make it an academy". That is not a rename — it
 * changes what the page is. A course page sells one thing and is finished the
 * day that thing stops being new. An academy is a place LOOM teaches from, and
 * a program is what is open in it right now, so a second program is an entry
 * in PROGRAMS rather than a second page and a second design.
 *
 * ACADEMY is the institution: name, stance, what it is for.
 * PROGRAM is what you can enrol in today. Everything below it — modules,
 * outcomes, bonuses, FAQ, price — belongs to the PROGRAM, not to the academy,
 * and is named that way so a second program does not have to fight the first
 * one for a variable name.
 *
 * NOTHING HERE INVENTS A PROGRAM THAT DOES NOT EXIST. There is one, it is
 * real, and the page says so. A shelf padded with "coming soon" tiles for
 * courses nobody has recorded reads as vapour and costs more trust than the
 * empty space costs.
 *
 * ── WHY THIS FILE IS BILINGUAL AND NOTHING ELSE ON THE SITE IS ─────────────
 * The course is TAUGHT IN ARABIC (spoken). Its buyer is an Arabic speaker in
 * Amman, Riyadh, Dubai or Cairo who wants to make money building websites.
 * The rest of loomstudio-jo.com sells agency work to companies and is English
 * throughout; this one page sells a course to individuals and would lose most
 * of its market in English. So every string here carries `{ en, ar }` and
 * /course renders one or the other from a single toggle.
 *
 * The Arabic is written, not translated. Where a literal rendering of the
 * English would read like a machine ("احجز مقعدك الآن"), the Arabic says the
 * thing the way a Jordanian would say it out loud. The two columns are not
 * word-for-word and are not meant to be.
 *
 * FONTS: Clash Display and Satoshi carry no Arabic glyphs. `:lang(ar)` falls
 * to the system Arabic stack — the same stack and the same reasoning as
 * journal/[slug]/post-page.css, which solved this first. Do not set an Arabic
 * headline in Clash; it renders as Latin fallback tofu at 96px.
 *
 * PRICE lives here and nowhere else. It appears in the hero, the offer card,
 * the FAQ and the JSON-LD; all four read PRICE.
 */

/* ── the academy ────────────────────────────────────────────────────────── */

export const ACADEMY = {
  name: { en: 'LOOM ACADEMY', ar: 'أكاديمية LOOM' },
  line: {
    en: 'The studio teaches what it builds with.',
    ar: 'الاستوديو بيعلّم بنفس الأدوات اللي بيشتغل فيها.',
  },
  intro: {
    en:
      'LOOM builds websites, apps and campaigns for companies across Jordan, the Gulf and '
      + 'Bosnia. The academy is the same craft, handed over instead of delivered — the tools we '
      + 'use on paid work, the way we actually use them, taught in Arabic by the people doing it.',
    ar:
      'LOOM بتبني مواقع وتطبيقات وحملات لشركات بالأردن والخليج والبوسنة. الأكاديمية هي نفس '
      + 'الحرفة، بس منسلّمهالك بدل ما نسلّم الشغل — نفس الأدوات اللي منستخدمها بشغل مدفوع، '
      + 'وبنفس الطريقة اللي منستخدمها فيها، مشروحة بالعربي من ناس عم يشتغلوا فيها.',
  },
}

/* ── the program that is open ───────────────────────────────────────────── */

export const PROGRAM = {
  code: 'PROGRAM 01',
  codeAr: 'البرنامج الأول',
  status: { en: 'Enrolling now', ar: 'التسجيل مفتوح' },
  name: { en: 'FIRST CLIENT', ar: 'أول عميل' },
  tagline: {
    en: 'Build websites with AI. Then sell them.',
    ar: 'ابْنِ مواقع بالذكاء الاصطناعي. وبيعها.',
  },
  promise: {
    en: 'From zero to your first paying client.',
    ar: 'من الصفر… لأول عميل بيدفعلك.',
  },
  sub: {
    en:
      'A practical program, taught in Arabic, on the two halves nobody teaches together: '
      + 'building a real website with AI even if you have never written code, and the part '
      + 'that actually pays — finding the business that needs one, saying the right thing to '
      + 'the owner, pricing it, and getting the money into your account.',
    ar:
      'برنامج عملي بالعربي، بيجمع النصّين اللي دايماً بينباعوا منفصلين: كيف تبني موقع حقيقي '
      + 'بالذكاء الاصطناعي حتى لو عمرك ما كتبت سطر كود، والنص التاني — اللي هو مصدر '
      + 'المصاري فعلياً — كيف تلاقي المحل اللي محتاج موقع، كيف تحكي مع صاحبه، كيف تسعّر، '
      + 'وكيف توصلك المصاري.',
  },
  language: {
    en: 'Taught in Arabic · Templates and prompts in English',
    ar: 'الشرح كامل بالعربي · القوالب والبرومبتات بالإنجليزي',
  },
}

/* PRICE — one place. `launch` is the founding-member price the first cohort
   pays; `full` is where it lands after. Both in USD because Whop settles in
   USD and a JOD figure on the page would be a second number to keep true. */
export const PRICE = {
  launch: 97,
  full: 149,
  currency: 'USD',
  note: {
    en: 'One-time. Lifetime access, including every future lesson.',
    ar: 'دفعة وحدة. وصول مدى الحياة، وكل درس جديد بينضاف إلك مجاناً.',
  },
}

/* ── art slots ──────────────────────────────────────────────────────────────
   Two pieces of commissioned art this page wants and does not have yet. Both
   are null until the file exists, and the page renders correctly without
   either — the hero art is a decorative absolutely-positioned layer, so its
   arrival changes no layout, and the share card falls back to the site's own
   og.jpg.

   HERO_ART wants the site's textile world, not a stock classroom: a felted
   wool desk scene, laptop and yarn, shot as macro craft photography on the
   pink ground. See the asset brief for the exact prompts.

   OG_IMAGE matters more than it looks. Every sale in the first launch arrives
   from a link pasted into WhatsApp or an Instagram story, and that link's
   preview card IS the first impression — currently it is the studio's generic
   banner, which says nothing about an academy. */
export const HERO_ART = '/img/academy/hero.webp'
export const OG_IMAGE = '/img/academy/og.jpg'

/* THE WHOP LINK. Empty until the product exists.
   The page reads this: with a URL it renders a Buy button; without one it
   renders the waitlist instead and says so honestly. A "Buy now" pointing at
   a 404 is worse than no button — paste the Whop checkout URL here and the
   page becomes a store in one commit. */
export const WHOP_URL = ''

/* ── who it is for ──────────────────────────────────────────────────────── */

export const FOR_WHO = [
  {
    en: 'You want a real income online and you are tired of watching tutorials that end before the money part.',
    ar: 'بدك دخل حقيقي من النت، وزهقت من فيديوهات بتخلص قبل ما توصل لجزء المصاري.',
  },
  {
    en: 'You cannot code — and after this program you still will not need to.',
    ar: 'ما بتعرف برمجة — وبعد البرنامج كمان مش رح تحتاج تتعلمها.',
  },
  {
    en: 'You already build a bit, but every conversation with a client ends at “I’ll get back to you”.',
    ar: 'بتعرف تبني شوي، بس كل حكي مع زبون بيخلص بـ«رح أرجعلك».',
  },
  {
    en: 'You have a job and want a second income you can run at night, from a laptop, from anywhere.',
    ar: 'عندك شغل وبدك دخل تاني تشتغله بالليل، من لابتوب، من أي مكان.',
  },
]

export const NOT_FOR_WHO = [
  {
    en: 'Anyone looking for passive income with no work in it. You will be talking to strangers in week two.',
    ar: 'اللي بدور على دخل بدون شغل. من الأسبوع التاني رح تكون عم تحكي مع ناس ما بتعرفهم.',
  },
  {
    en: 'Senior developers. You already have the build half; you would be paying for the sales half only.',
    ar: 'المبرمج المحترف. عندك نص البناء أصلاً، رح تكون عم تدفع بس مقابل نص البيع.',
  },
]

/* ── the outcome, stated as things you will own ─────────────────────────── */

export const OUTCOMES = [
  {
    n: '01',
    en: 'A finished, live website you built yourself — the one we build together on camera, published on a real domain.',
    ar: 'موقع كامل ومنشور على الإنترنت بنيته بإيدك — نفس الموقع اللي منبنيه سوا قدامك، على دومين حقيقي.',
  },
  {
    n: '02',
    en: 'A lead list of real businesses near you that need a website, scored, with the owner’s number next to each one.',
    ar: 'قائمة محلات حقيقية جنبك محتاجة موقع، مرتّبة حسب الأولوية، ورقم صاحب كل محل جنبها.',
  },
  {
    n: '03',
    en: 'The exact words: first message, first call, the price answer, the four objections, the close.',
    ar: 'الكلام الحرفي: أول رسالة، أول مكالمة، جواب سؤال «قديش»، الأربع اعتراضات، والإغلاق.',
  },
  {
    n: '04',
    en: 'A price list you can defend, a one-page contract, and a way to get paid that works from Jordan.',
    ar: 'تسعيرة بتقدر تدافع عنها، عقد من صفحة وحدة، وطريقة قبض بتشتغل من الأردن.',
  },
  {
    n: '05',
    en: 'A repeatable week: how many businesses to contact, what to send, what to build, so month two is not luck.',
    ar: 'روتين أسبوعي بيتكرر: كم محل تتواصل معه، شو تبعتلهم، شو تبني — عشان الشهر التاني ما يكون حظ.',
  },
]

/* ── the curriculum ─────────────────────────────────────────────────────────
   Nine modules, 54 lessons, about eight hours of video.

   THE ORDER IS THE ARGUMENT. Most courses of this kind teach the whole build
   first and bolt “and here’s how to sell it” onto the end, where the student
   never reaches it. This one puts the EYE (finding who needs a site) at module
   two, before a single line is built, because the student who has a list of
   twelve real businesses in their notes app builds differently — they are
   building for someone. The mouth (module six) comes the moment there is
   something to show, not after everything is perfect. */

export const MODULES = [
  {
    id: 'map',
    n: '01',
    title: { en: 'The Map', ar: 'الخريطة' },
    hours: 0.75,
    blurb: {
      en:
        'What you are actually selling, why this window is open right now, and what a realistic '
        + 'first, third and twelfth month look like. We set the number you are chasing before we '
        + 'touch a tool.',
      ar:
        'شو اللي عم تبيعه فعلياً، ليش هالفرصة مفتوحة هلأ بالذات، وشو شكل أول شهر وثالث شهر '
        + 'وسنة كاملة بشكل واقعي. منحدد الرقم اللي عم تركض وراه قبل ما نفتح أي برنامج.',
    },
    lessons: [
      { en: 'What a small business is actually buying (it is not a website)', ar: 'شو بيشتري صاحب المحل فعلياً — وهو مش موقع' },
      { en: 'Why this window is open, and roughly how long it stays open', ar: 'ليش هالفرصة مفتوحة هلأ، وقدّيش متوقع تضل مفتوحة' },
      { en: 'The three business models: one-off, retainer, and the rented site', ar: 'ثلاث طرق تشتغل فيها: مشروع لمرة، اشتراك شهري، وتأجير الموقع' },
      { en: 'Real numbers: what to charge in Jordan, the Gulf, and to clients abroad', ar: 'أرقام حقيقية: قديش تاخد بالأردن، بالخليج، ومن زبون برّا' },
      { en: 'Your 90-day target, written down before we start', ar: 'هدف الـ90 يوم، مكتوب قبل ما نبدأ' },
    ],
  },
  {
    id: 'eye',
    n: '02',
    title: { en: 'The Eye', ar: 'العين' },
    hours: 1.1,
    blurb: {
      en:
        'The skill that separates people who earn from people who learn: seeing the business that '
        + 'is losing money because of how it looks online. We hunt on Google Maps and Instagram, '
        + 'live, and you finish this module with a scored list of real names and real numbers.',
      ar:
        'المهارة اللي بتفرق بين اللي بيكسب واللي بس بيتعلم: إنك تشوف المحل اللي عم يخسر مصاري '
        + 'بسبب شكله أونلاين. منصطاد سوا على خرائط جوجل وانستغرام، مباشر، وبتخلّص هالوحدة '
        + 'ومعك قائمة أسماء وأرقام حقيقية مرتّبة.',
    },
    lessons: [
      { en: 'The four tells of a business that needs you', ar: 'أربع علامات بتقول إن هالمحل محتاجك' },
      { en: 'Hunting on Google Maps: the no-website filter, live', ar: 'الصيد على خرائط جوجل: فلتر «ما عنده موقع»، مباشر' },
      { en: 'Hunting on Instagram: the link-in-bio that goes nowhere', ar: 'الصيد على انستغرام: اللينك بالبايو اللي ما بيوصل لإشي' },
      { en: 'The niches that pay best here — and the two that never pay', ar: 'المجالات اللي بتدفع أحسن عنا — واثنين ما بيدفعوا أبداً' },
      { en: 'Scoring a lead 1–10 so you stop chasing the wrong ones', ar: 'كيف تعطي كل عميل محتمل علامة من 10 عشان توقف تركض ورا الغلط' },
      { en: 'Finding the actual decision maker, not the page admin', ar: 'كيف توصل لصاحب القرار مش لمين بيدير الصفحة' },
      { en: 'Build your first 30-name list (do this before the next module)', ar: 'اعمل أول قائمة من 30 اسم — قبل ما تكمّل للوحدة الجاي' },
    ],
  },
  {
    id: 'toolkit',
    n: '03',
    title: { en: 'The Toolkit', ar: 'العدّة' },
    hours: 1.0,
    blurb: {
      en:
        'Everything on your machine, set up once, on camera, from a clean laptop. The exact tools '
        + 'LOOM uses on paid client work — no toy builders you outgrow in a month.',
      ar:
        'كل شي على جهازك، بتنصّبه مرة وحدة، قدامك بالفيديو، من لابتوب فاضي. نفس الأدوات '
        + 'اللي منستخدمها بـLOOM بشغل زبائن مدفوع — مش برامج بتكبر عليها بعد شهر.',
    },
    lessons: [
      { en: 'The stack, and why each piece is in it', ar: 'الأدوات، وليش كل واحدة منها موجودة' },
      { en: 'Installing everything on a clean laptop (Mac and Windows)', ar: 'تنصيب كل شي على لابتوب جديد (ماك وويندوز)' },
      { en: 'Claude Code from zero: your first working page in 10 minutes', ar: 'Claude Code من الصفر: أول صفحة شغالة خلال 10 دقايق' },
      { en: 'How to talk to the AI so it builds what you meant', ar: 'كيف تحكي مع الذكاء الاصطناعي عشان يطلعلك اللي ببالك' },
      { en: 'The prompt pack — 40 prompts you will reuse on every project', ar: 'حزمة البرومبتات — 40 برومبت رح تستخدمهم بكل مشروع' },
      { en: 'When the AI breaks something: reading an error without panicking', ar: 'لما يخرب إشي: كيف تقرأ الخطأ بدون ما تنهار' },
      { en: 'Domains, hosting and going live — the cheap correct way', ar: 'الدومين والاستضافة والنشر — الطريقة الرخيصة والصح' },
      { en: 'Free tools that look expensive: images, icons, fonts, mockups', ar: 'أدوات مجانية بتطلع شغلك غالي: صور، أيقونات، خطوط، موك-أب' },
    ],
  },
  {
    id: 'build',
    n: '04',
    title: { en: 'The Build', ar: 'البناء' },
    hours: 2.0,
    blurb: {
      en:
        'The spine of the program. One real business, one complete website, start to published, '
        + 'nothing cut. You build it alongside me at the same pace, and it becomes the first piece '
        + 'in your portfolio.',
      ar:
        'عمود البرنامج. محل حقيقي واحد، موقع كامل، من أول لحظة لحد النشر، بدون ما نقص إشي. '
        + 'بتبنيه معي بنفس السرعة، وبيصير أول شغلة بمعرضك.',
    },
    lessons: [
      { en: 'Choosing the business and gathering what you need in 20 minutes', ar: 'كيف تختار المحل وتجمع كل اللي بدك إياه بـ20 دقيقة' },
      { en: 'The one-page plan every site starts from', ar: 'خطة الصفحة الوحدة اللي بيبلّش منها كل موقع' },
      { en: 'Structure: the six sections that sell, in the order that sells', ar: 'الهيكل: ست أقسام بتبيع، بالترتيب اللي بيبيع' },
      { en: 'Writing the words (the AI drafts, you decide)', ar: 'كتابة الكلام (الذكاء الاصطناعي بيكتب، وإنت بتقرر)' },
      { en: 'The hero section — the four seconds that decide everything', ar: 'قسم البداية — أربع ثواني بتقرر كل شي' },
      { en: 'Images that do not look free', ar: 'صور ما بتحسّها مجانية' },
      { en: 'Making it work on a phone (this is where most beginners lose the client)', ar: 'كيف يزبط على الموبايل (هون بيخسر معظم المبتدئين الزبون)' },
      { en: 'Arabic sites done right: RTL, fonts, and the mistakes everyone makes', ar: 'المواقع العربية صح: الاتجاه، الخطوط، والأخطاء اللي بيقع فيها الكل' },
      { en: 'The contact form, WhatsApp button, and Google Maps embed', ar: 'فورم التواصل، زر الواتساب، وخريطة جوجل' },
      { en: 'Publishing it, and the 12-point check before you send the link', ar: 'النشر، و12 نقطة بتفحصهم قبل ما تبعت اللينك' },
    ],
  },
  {
    id: 'polish',
    n: '05',
    title: { en: 'The Polish', ar: 'اللمسة' },
    hours: 0.9,
    blurb: {
      en:
        'The difference between a $200 site and a $2,000 site is not more pages. It is a handful '
        + 'of decisions about type, spacing, motion and speed. This module is those decisions.',
      ar:
        'الفرق بين موقع بـ200 دولار وموقع بـ2000 دولار مش عدد الصفحات. كم قرار بالخط '
        + 'والمسافات والحركة والسرعة. هاي الوحدة هي هالقرارات.',
    },
    lessons: [
      { en: 'Type and spacing: the two settings that make a site look expensive', ar: 'الخط والمسافات: إعدادين بيخلوا الموقع يبيّن غالي' },
      { en: 'Choosing colour when the client has no brand', ar: 'كيف تختار الألوان لما الزبون ما عنده هوية' },
      { en: 'Motion that adds value, and motion that screams template', ar: 'حركة بتزيد القيمة، وحركة بتفضح إنه قالب جاهز' },
      { en: 'Speed: why a slow site loses the client’s customers', ar: 'السرعة: ليش الموقع البطيء بيخسّر الزبون زباينه' },
      { en: 'Getting found on Google — the 20% that does 80% of the work', ar: 'الظهور على جوجل — الـ20% اللي بتعمل 80% من الشغل' },
      { en: 'Showing up in AI answers (ChatGPT, Gemini) — the new front door', ar: 'الظهور بإجابات الذكاء الاصطناعي — الباب الجديد للزبائن' },
    ],
  },
  {
    id: 'mouth',
    n: '06',
    title: { en: 'The Mouth', ar: 'اللسان' },
    hours: 1.2,
    blurb: {
      en:
        'The module people buy this program for. Word for word: what you send first, what you say '
        + 'on the call, what you answer when he asks the price, and what you do with each of the '
        + 'four things he will say to avoid deciding.',
      ar:
        'الوحدة اللي بينشرى البرنامج عشانها. كلمة بكلمة: شو بتبعت أول رسالة، شو بتحكي '
        + 'بالمكالمة، شو بتجاوب لما يسألك «قديش»، وشو بتعمل مع كل وحدة من الأربع جمل '
        + 'اللي بيقولها عشان يهرب من القرار.',
    },
    lessons: [
      { en: 'The mindset shift: you are not asking for work, you are reporting a problem', ar: 'تغيير العقلية: إنت مش عم تتسوّل شغل، إنت عم تبلّغ عن مشكلة' },
      { en: 'The first message — the version that gets answered', ar: 'أول رسالة — النسخة اللي بينردّوا عليها' },
      { en: 'Walking into the shop: the 60-second in-person opener', ar: 'لما تفوت عالمحل: افتتاحية 60 ثانية وجهاً لوجه' },
      { en: 'The demo trick: build first, ask second', ar: 'حيلة النموذج: ابنِ أولاً، واطلب ثانياً' },
      { en: 'The discovery call, question by question', ar: 'مكالمة الاستكشاف، سؤال بسؤال' },
      { en: '“How much?” — the answer that does not kill the deal', ar: '«قديش بدها؟» — الجواب اللي ما بيقتل الصفقة' },
      { en: 'The four objections: too expensive, I have Instagram, my nephew does it, let me think', ar: 'الأربع اعتراضات: غالي، عندي انستغرام، ابن أختي بيعملها، خليني أفكر' },
      { en: 'Closing without begging, and following up without annoying', ar: 'الإغلاق بدون تسوّل، والمتابعة بدون إزعاج' },
    ],
  },
  {
    id: 'paper',
    n: '07',
    title: { en: 'The Paper', ar: 'الورق' },
    hours: 0.7,
    blurb: {
      en:
        'Quote, deposit, contract, delivery, payment. The boring module that decides whether you '
        + 'get paid twice or spend six weeks chasing one transfer.',
      ar:
        'العرض، العربون، العقد، التسليم، الدفع. الوحدة المملة اللي بتقرر إذا رح تقبض مرتين '
        + 'ولا تضل ست أسابيع تركض ورا حوالة وحدة.',
    },
    lessons: [
      { en: 'The one-page proposal that closes (template included)', ar: 'عرض السعر من صفحة وحدة اللي بيقفل الصفقة (القالب مرفق)' },
      { en: 'Always take a deposit — how to ask so it sounds normal', ar: 'خُد عربون دايماً — كيف تطلبه بحيث يبيّن إشي طبيعي' },
      { en: 'The short contract, in Arabic and English (template included)', ar: 'العقد المختصر، بالعربي والإنجليزي (القالب مرفق)' },
      { en: 'Getting paid from Jordan: CliQ, bank, Wise, and clients abroad', ar: 'كيف تقبض من الأردن: كليك، بنك، Wise، وزبائن برّا' },
      { en: 'Handover: what you give the client, and what you keep', ar: 'التسليم: شو بتعطي الزبون، وشو بتضل محتفظ فيه' },
    ],
  },
  {
    id: 'machine',
    n: '08',
    title: { en: 'The Machine', ar: 'المكنة' },
    hours: 0.9,
    blurb: {
      en:
        'One client is a job. A system that produces clients is a business. This is the weekly '
        + 'routine, the recurring revenue, and the referral loop that makes month six easier than '
        + 'month two instead of harder.',
      ar:
        'زبون واحد = شغلة. نظام بينتج زبائن = بزنس. هون الروتين الأسبوعي، والدخل المتكرر، '
        + 'ودورة الترشيحات اللي بتخلي الشهر السادس أسهل من الشهر التاني مش أصعب.',
    },
    lessons: [
      { en: 'The weekly routine: 10 contacts, 2 demos, 1 build', ar: 'الروتين الأسبوعي: 10 تواصلات، نموذجين، بناء واحد' },
      { en: 'Turning a one-off into a monthly retainer', ar: 'كيف تحوّل مشروع لمرة وحدة لاشتراك شهري' },
      { en: 'The five upsells every client eventually buys', ar: 'خمس خدمات إضافية كل زبون بيشتريها بالنهاية' },
      { en: 'Asking for the referral (and why most people ask wrong)', ar: 'كيف تطلب ترشيح (وليش معظم الناس بيطلبوها غلط)' },
      { en: 'Your portfolio and your own site: proof that sells while you sleep', ar: 'معرض أعمالك وموقعك الشخصي: دليل بيبيع عنك وإنت نايم' },
      { en: 'When to raise your prices, and by how much', ar: 'إمتى ترفع أسعارك، وقدّيش' },
    ],
  },
  {
    id: 'ladder',
    n: '09',
    title: { en: 'The Ladder', ar: 'السلّم' },
    hours: 0.6,
    blurb: {
      en:
        'What happens after the first ten clients: subcontracting, hiring, saying no, and the '
        + 'jump from freelancer to studio — told through how LOOM actually did it.',
      ar:
        'شو بيصير بعد أول عشر زبائن: التعاقد من الباطن، التوظيف، كيف تقول لأ، والقفزة من '
        + 'فريلانسر لاستوديو — محكيّة من خلال كيف LOOM عملتها فعلياً.',
    },
    lessons: [
      { en: 'The ceiling you hit at around ten clients, and how to break it', ar: 'السقف اللي بتوصله عند عشر زبائن، وكيف تكسره' },
      { en: 'Handing work to someone else without losing the quality', ar: 'كيف تسلّم شغل لحدا تاني بدون ما تخسر الجودة' },
      { en: 'The clients to say no to — every one of them costs you two good ones', ar: 'الزبائن اللي بترفضهم — كل واحد فيهم بيكلفك اثنين منيحين' },
      { en: 'From freelancer to studio: what actually changed for LOOM', ar: 'من فريلانسر لاستوديو: شو اللي تغيّر فعلياً عند LOOM' },
    ],
  },
]

/* ── module emblems ─────────────────────────────────────────────────────────
   Each module gets a felted-wool medallion, generated to the recipe the rest
   of the site's icons use: round badge shot flat from above, cream felted face
   with visible fibre, thick braided cord rim in the module's own colour, and a
   glyph built from chunky braided yarn in the four brand colours interlacing
   over and under so each stroke changes colour along its length.

   A SET, NOT A `emblem: true` FLAG PER MODULE, and not a path guessed from the
   id — same reasoning as Pic.svelte's two manifests: a source is only emitted
   for a file that actually exists, because the alternative costs a 404 per
   miss, per page load, per visitor. Nine missing emblems would be nine failed
   requests on every view of this page.

   To light one up: generate `static/img/academy/emblem-<id>.webp`, run
   `node scripts/responsive.mjs`, add the id below. Nothing else.

   ALL NINE EXIST (17 Aug 2026). Eight were generated on Higgsfield's web
   Unlimited toggle — the MCP reports `unlim.available: false` and refuses
   nano_banana_pro outright, so the browser is the only free route — and the
   ninth, `eye`, was already in the site: /img/wool/icons/eye.webp is exactly
   the glyph module 02 needed, so it was copied rather than regenerated.
   `ladder` and `polish` are second takes: the first ladder read as a braided
   bar because the motif was described as diagonal, and the first sparkle sat
   too small in the face to survive being painted at 52px. */
export const EMBLEMS = new Set([
  'map', 'eye', 'toolkit', 'build', 'polish', 'mouth', 'paper', 'machine', 'ladder',
])
export const emblemFor = (id) => (EMBLEMS.has(id) ? `/img/academy/emblem-${id}.webp` : null)

/* ── the extras that raise perceived value without more filming ─────────── */

export const BONUSES = [
  {
    title: { en: 'The Prompt Pack', ar: 'حزمة البرومبتات' },
    body: {
      en: '40 copy-paste prompts for building, writing, fixing and shipping a site.',
      ar: '40 برومبت جاهز للنسخ — للبناء والكتابة والتصليح والنشر.',
    },
  },
  {
    title: { en: 'The Scripts', ar: 'نصوص الكلام' },
    body: {
      en: 'Every message and call script from module six, in Arabic and English, ready to send.',
      ar: 'كل رسالة وكل سيناريو مكالمة من الوحدة السادسة، بالعربي والإنجليزي، جاهزين للإرسال.',
    },
  },
  {
    title: { en: 'Contract & Proposal', ar: 'العقد وعرض السعر' },
    body: {
      en: 'A one-page proposal and a short bilingual contract you can use on the first job.',
      ar: 'عرض سعر من صفحة وحدة وعقد مختصر بلغتين، بتستخدمهم من أول شغلة.',
    },
  },
  {
    title: { en: 'The Price List', ar: 'قائمة الأسعار' },
    body: {
      en: 'What to charge for each type of site and add-on, in JOD, SAR, AED and USD.',
      ar: 'قديش تاخد على كل نوع موقع وكل إضافة — بالدينار والريال والدرهم والدولار.',
    },
  },
  {
    title: { en: 'The Private Community', ar: 'المجتمع الخاص' },
    body: {
      en: 'Where you post the site before you send it and get told what is wrong with it.',
      ar: 'محل تنزّل فيه الموقع قبل ما تبعته، وحدا يقلك شو غلط فيه.',
    },
  },
  {
    title: { en: 'Lifetime updates', ar: 'تحديثات مدى الحياة' },
    body: {
      en: 'The tools change every few months. New lessons land in the same program, free.',
      ar: 'الأدوات بتتغير كل كم شهر. الدروس الجديدة بتنزل بنفس البرنامج، مجاناً.',
    },
  },
]

/* ── objections, answered on the page instead of in the DMs ─────────────── */

export const FAQ = [
  {
    q: { en: 'Do I need to know how to code?', ar: 'لازم أعرف برمجة؟' },
    a: {
      en:
        'No. The whole method is built for someone who has never written code. You will read code '
        + 'the way you read a receipt — enough to know what it says, never enough to write it from '
        + 'scratch. That is the point of the tools we use.',
      ar:
        'لأ. الطريقة كلها مبنية لحدا عمره ما كتب كود. رح تقرأ الكود متل ما بتقرأ فاتورة — '
        + 'بتفهم شو مكتوب، بدون ما تحتاج تكتبه من الصفر. وهاد بالضبط سبب استخدامنا لهالأدوات.',
    },
  },
  {
    q: { en: 'Is the program in Arabic?', ar: 'البرنامج بالعربي؟' },
    a: {
      en:
        'Yes — every lesson is spoken in Arabic. The templates, prompts and contract come in both '
        + 'Arabic and English, because that is what you will actually send to clients.',
      ar:
        'إي — كل درس محكي بالعربي. القوالب والبرومبتات والعقد بتيجي بالعربي والإنجليزي، '
        + 'لأنه هاد اللي فعلياً رح تبعته للزبون.',
    },
  },
  {
    q: { en: 'How long does it take to finish?', ar: 'قديش بدها وقت أخلّصه؟' },
    a: {
      en:
        'About eight hours of video. Most people finish in two to three weeks doing an hour a day, '
        + 'and land the first client while still going through module six rather than after it.',
      ar:
        'حوالي ثمان ساعات فيديو. معظم الناس بتخلّص بأسبوعين لثلاثة بمعدل ساعة باليوم، وبتوصل '
        + 'لأول زبون وهي لسا بالوحدة السادسة مش بعدها.',
    },
  },
  {
    q: { en: 'Will this work in my country?', ar: 'بتزبط ببلدي؟' },
    a: {
      en:
        'The building half works anywhere. The selling half is written for Jordan, Saudi, the UAE '
        + 'and Egypt — the payment lesson names the methods that actually work in each, and the '
        + 'price list is in four currencies. If you are somewhere else, everything transfers except '
        + 'the bank details.',
      ar:
        'نص البناء بيزبط بأي مكان. نص البيع مكتوب للأردن والسعودية والإمارات ومصر — درس الدفع '
        + 'بيسمّي الطرق اللي فعلاً بتشتغل بكل بلد، وقائمة الأسعار بأربع عملات. إذا إنت ببلد '
        + 'تاني، كل شي بينطبق ما عدا تفاصيل البنك.',
    },
  },
  {
    q: { en: 'What if I do not get a client?', ar: 'وإذا ما جبت زبون؟' },
    a: {
      en:
        'Then you post your work in the community and we look at what you actually sent and what '
        + 'you actually said. Nine times out of ten it is the message, not the website. There is no '
        + 'guarantee here that depends on other people’s decisions — what is guaranteed is that you '
        + 'will never be guessing about what to do next.',
      ar:
        'بتنزّل شغلك بالمجتمع ومنشوف سوا شو بعتّ فعلياً وشو حكيت فعلياً. تسعة من عشرة المشكلة '
        + 'بالرسالة مش بالموقع. ما في هون ضمانة معلّقة على قرارات ناس تانيين — الضمانة الوحيدة '
        + 'إنك عمرك ما رح تكون حزّور شو الخطوة الجاي.',
    },
  },
  {
    q: { en: 'Is this the same thing LOOM does for its own clients?', ar: 'هاد نفس اللي LOOM بتعمله لزباينها؟' },
    a: {
      en:
        'Yes. Same tools, same workflow, same checks before a link goes out. The site you are '
        + 'reading this on was built with them.',
      ar:
        'إي. نفس الأدوات، نفس طريقة الشغل، نفس الفحوصات قبل ما ينبعت أي لينك. الموقع اللي '
        + 'عم تقرأ عليه هلأ مبني فيهم.',
    },
  },
]

/* ── derived totals: never typed twice ──────────────────────────────────── */

export const LESSON_COUNT = MODULES.reduce((n, m) => n + m.lessons.length, 0)
export const MODULE_COUNT = MODULES.length
export const TOTAL_HOURS = Math.round(MODULES.reduce((n, m) => n + m.hours, 0))
