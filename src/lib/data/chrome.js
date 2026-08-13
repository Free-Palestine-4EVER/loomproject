// The site chrome's own bilingual copy — nav, drawer, footer, hero, the
// persistent CTAs, and the contact wizard's step furniture. Same shape and
// same rule as `machine.js`, which is the house precedent this file extends
// to the rest of the shell (see that file's own header comment):
//
//   Arabic is written natively, not translated from the English line: same
//   voice and same dryness, different phrasing. Never run these through a
//   translator "to sync them up" — they are two originals, not a source and
//   a copy.
//
// SCOPE — this is Wave A/B's chrome pass, not a full-site translation. It
// covers exactly what PORTING.md's staged i18n plan calls "everything a
// visitor meets before scrolling": the nav, the mobile drawer, the hero, the
// footer, the persistent CTAs (StartProject / WhatsAppFab / MobileChrome's
// pill), and the contact wizard's STEP labels and buttons. It does NOT cover
// the wizard's form field labels/placeholders, or any section body copy
// (Proof, Work, Solutions, Pricing, TheMachine, FAQ, case studies, …) — all
// of that still renders from the untouched, English-only `$data/*` files
// and is later waves' work (see the plan doc). Brand names (LOOM, WhatsApp,
// MCP) and client names are never translated, matching machine.js's own
// convention and the plan's §1c call.

// ── nav / drawer — keyed by href so it can be looked up straight off
// nav-links.js's own LINKS array without a second, parallel list to keep in
// sync. '#top' is Home; every other key is a route path. ────────────────────
export const NAV_LABELS = {
  '#top': { en: 'Home', ar: 'الرئيسية' },
  '/work': { en: 'Work', ar: 'أعمالنا' },
  '/solutions': { en: 'Solutions', ar: 'الحلول' },
  '/pricing': { en: 'Pricing', ar: 'الأسعار' },
  // Same word machine.js's own UI already uses for "the machine" character —
  // one Arabic name for the product, not two.
  '/machine': { en: 'Machine', ar: 'الآلة' },
  '/ai-search': { en: 'AI Search', ar: 'بحث الذكاء الاصطناعي' },
  '/ai-workshops': { en: 'AI Workshops', ar: 'ورش الذكاء الاصطناعي' },
  '/apps': { en: 'Apps', ar: 'التطبيقات' },
  // MCP is a protocol name (Model Context Protocol) — proper noun, stays
  // Latin in both locales, same call as LOOM/brand names.
  '/mcp': { en: 'MCP', ar: 'MCP' },
  '/type': { en: 'Typeface', ar: 'الخط' },
  '/faq': { en: 'FAQ', ar: 'الأسئلة الشائعة' },
  '/contact': { en: 'Contact', ar: 'تواصل معنا' },
}

export const NAV_UI = {
  primaryNav: { en: 'Primary', ar: 'التنقل الرئيسي' },
  browseByIndustry: { en: 'Browse by industry', ar: 'تصفّح حسب القطاع' },
  // "the loom already knows yours" — النول (loom) is the real Arabic word
  // for a weaving loom, so this keeps the brand's central image without
  // reaching for the English pun that carries it there.
  dropLede: {
    en: 'Thirty industries — the loom already knows yours.',
    ar: 'ثلاثون قطاعاً — والنول يعرف قطاعك مسبقاً.',
  },
  getStarted: { en: 'Get started', ar: 'ابدأ الآن' },
  openMenu: { en: 'Open menu', ar: 'فتح القائمة' },
  closeMenu: { en: 'Close menu', ar: 'إغلاق القائمة' },
  mainMenu: { en: 'Main menu', ar: 'القائمة الرئيسية' },
  menuKicker: { en: 'Menu', ar: 'القائمة' },
  ammanJordan: { en: 'Amman, Jordan', ar: 'عمّان، الأردن' },
  mainNav: { en: 'Main', ar: 'الأقسام الرئيسية' },
  more: { en: 'Also here', ar: 'المزيد' },
  moreNav: { en: 'More', ar: 'المزيد' },
  startWeaving: { en: 'Start weaving', ar: 'ابدأ بالنسج' },
}

// ── hero ─────────────────────────────────────────────────────────────────
export const HERO_UI = {
  // The eyebrow is BRAND.positioning + a location line in the English
  // original; written as one Arabic phrase rather than assembled from
  // BRAND.positioning (that data file stays English-only this wave).
  eyebrow: { en: 'AI-native creative agency — Amman, Jordan', ar: 'وكالة إبداعية بالذكاء الاصطناعي — عمّان، الأردن' },
  // Three lines, matching the three <span class="hero-line"> the markup
  // stages independently — kept as three short entries rather than one
  // string so Hero.svelte can keep its per-line markup untouched.
  h1Line1: { en: 'We weave brands', ar: 'ننسج العلامات' },
  h1Line2Accent: { en: 'on the edge', ar: 'على حافة' },
  h1Line3: { en: 'of creativity', ar: 'الإبداع' },
  sub: {
    en: 'One studio for the whole build: the brand, the website, the campaign that sells it, and the AI that keeps it running while you sleep.',
    ar: 'استوديو واحد لكل شيء: الهوية، الموقع، الحملة التي تبيعه، والذكاء الاصطناعي الذي يُبقي كل شيء يعمل وأنت نائم.',
  },
  ctaStart: { en: 'Start weaving', ar: 'ابدأ بالنسج' },
  ctaWork: { en: 'See the work', ar: 'شاهد أعمالنا' },
  scroll: { en: 'Scroll', ar: 'مرّر للأسفل' },
}

// footer sitemap column titles — nav-links.js's FOOT_COLS keeps 'Explore'/
// 'Craft' as its own English titles; keyed the same way NAV_LABELS keys off
// href, this keys off the title string itself since that's FOOT_COLS' own
// stable identifier.
export const FOOT_COL_TITLES = {
  Explore: { en: 'Explore', ar: 'اكتشف' },
  Craft: { en: 'Craft', ar: 'الحِرفة' },
}

// ── footer ───────────────────────────────────────────────────────────────
export const FOOTER_UI = {
  // "ننسج العلامات على حافة الإبداع" echoes the hero's own two lines rather
  // than restating BRAND.tagline verbatim — same voice, same brevity.
  tagLine1: { en: 'The AI-native creative agency.', ar: 'وكالة إبداعية، والذكاء الاصطناعي في نسيجها.' },
  tagLine2: { en: 'We weave brands on the edge of creativity.', ar: 'ننسج علامات تقف على حافة الإبداع.' },
  cities: { en: 'Amman × Sarajevo', ar: 'عمّان × سراييفو' },
  startProject: { en: 'Start a project', ar: 'ابدأ مشروعك' },
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
  email: { en: 'Email', ar: 'البريد الإلكتروني' },
  hours: { en: 'Amman · Sarajevo — GMT+3 / GMT+2', ar: 'عمّان · سراييفو — GMT+3 / GMT+2' },
  getStarted: { en: 'Get started', ar: 'ابدأ الآن' },
  shareStudio: { en: 'Share the studio', ar: 'شارك الاستوديو' },
  shareWhatsapp: { en: 'Share on WhatsApp', ar: 'مشاركة عبر واتساب' },
  shareLinkedin: { en: 'Share on LinkedIn', ar: 'مشاركة عبر لينكدإن' },
  shareX: { en: 'Share on X', ar: 'مشاركة عبر X' },
  shareFacebook: { en: 'Share on Facebook', ar: 'مشاركة عبر فيسبوك' },
  copyLink: { en: 'Copy link', ar: 'نسخ الرابط' },
  linkCopied: { en: 'Link copied', ar: 'تم نسخ الرابط' },
  copiedSay: { en: 'Copied', ar: 'تم النسخ' },
  rights: { en: 'All rights reserved.', ar: 'جميع الحقوق محفوظة.' },
  edgeIntentional: { en: 'The edge is intentional.', ar: 'الحافة مقصودة.' },
  backToTop: { en: 'Back to top', ar: 'العودة إلى الأعلى' },
}

// ── persistent CTAs — StartProject.svelte, MobileChrome.svelte's pill,
// WhatsAppFab.svelte ─────────────────────────────────────────────────────
export const CTA_UI = {
  startProject: { en: 'Start a project', ar: 'ابدأ مشروعك' },
  whatsappUs: { en: 'WhatsApp us', ar: 'راسلنا واتساب' },
  chatWhatsapp: { en: 'Chat with LOOM on WhatsApp', ar: 'تواصل مع LOOM عبر واتساب' },
}

export const WHATSAPP_PROMPTS = [
  { en: 'Message us', ar: 'راسلنا' },
  { en: 'Any questions?', ar: 'عندك سؤال؟' },
  { en: 'We reply fast', ar: 'نرد بسرعة' },
  { en: 'Say hi 👋', ar: 'قل مرحباً 👋' },
]

// ── contact wizard — step rail + pane headings + button chrome only (form
// field labels/placeholders are next-wave work; see this file's header) ───
export const WIZARD_UI = {
  steps: [
    { en: 'Start', ar: 'البداية' },
    { en: 'Needs', ar: 'الاحتياجات' },
    { en: 'Details', ar: 'التفاصيل' },
    { en: 'Send', ar: 'الإرسال' },
  ],
  stepsAriaLabel: { en: 'Inquiry steps', ar: 'خطوات الطلب' },
  q0: { en: 'What brings you to the loom?', ar: 'ما الذي يجلبك إلى النول؟' },
  q1: { en: 'What do you need exactly?', ar: 'ما الذي تحتاجه بالتحديد؟' },
  q1sub: {
    en: "Pick everything that applies — we'll shape it with you.",
    ar: 'اختر كل ما ينطبق — وسنشكّله معك.',
  },
  q2: { en: 'Almost there — the essentials.', ar: 'اقتربنا — بقيت التفاصيل الأساسية.' },
  q3: { en: 'Your brief, woven. Send it your way.', ar: 'ملخصك، منسوجاً. أرسله بالطريقة التي تناسبك.' },
  back: { en: 'Back', ar: 'رجوع' },
  next: { en: 'Next', ar: 'التالي' },
  review: { en: 'Review', ar: 'مراجعة' },
  backArrow: { en: '← Back', ar: '← رجوع' },
  editDetailsArrow: { en: '← Edit details', ar: '← تعديل التفاصيل' },
  sendWhatsapp: { en: 'Send via WhatsApp', ar: 'إرسال عبر واتساب' },
  sendEmail: { en: 'Send as email', ar: 'إرسال بالبريد الإلكتروني' },
  briefAriaLabel: { en: 'Your inquiry summary', ar: 'ملخص طلبك' },
}

// ── the switcher itself — Nav.svelte (desktop bar + drawer) ───────────────
export const SWITCHER_UI = {
  en: { short: 'EN', label: { en: 'English', ar: 'English' }, switchTo: { en: 'Switch to English', ar: 'التبديل إلى الإنجليزية' } },
  ar: { short: 'عربي', label: { en: 'Arabic', ar: 'عربي' }, switchTo: { en: 'Switch to Arabic', ar: 'التبديل إلى العربية' } },
}
