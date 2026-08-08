// Copy + numbers for LOOM's two productised offerings — THE MACHINE (content
// subscription) and BY RESULT (results-priced ads). Presented on the long
// page by TheMachine.jsx and ByResult.jsx.
//
// Every JOD figure below is an internal assumption (see engine/SPEC.md's
// pricing constants), never a quoted fact — components must render it as
// "from X JOD", never as X JOD on its own. The "fifth furniture client"
// example under BY_RESULT is illustrative, not a real client count; it says
// so in its own copy.

export const THE_MACHINE = {
  nameEn: 'The Machine',
  nameAr: 'المصنع',
  h2: 'Twenty posts. Four reels. No agency retainer.',
  ledeEn: 'LOOM built a machine that writes, designs and schedules a month of content — in Arabic and English — while one editor checks every piece before it ships. What an agency staffs a team to do, the machine does alone, for a fraction of the retainer.',
  bullets: [
    { en: '20 posts a month', ar: '٢٠ منشورًا في الشهر' },
    { en: '4 reels a month', ar: '٤ ريلز في الشهر' },
    { en: 'Arabic and English, every piece', ar: 'بالعربية والإنجليزية لكل قطعة' },
    { en: 'A human checks every post before it ships', ar: 'إنسان يراجع كل منشور قبل نشره' },
  ],
  priceFromJod: 89,
  priceNote: 'Starting point — the exact quote depends on the brand.',
  monthGrid: { posts: 20, reels: 4 },
  ctaLabel: 'Put the machine on my brand',
  arabicPitch:
    'ما تدفعه الوكالة رواتبَ لفريقٍ كامل — كاتب، ومصمم، ومن يجدول المنشورات — تُنجزه آلة LOOM وحدها. عشرون منشورًا وأربعة ريلز كل شهر، بالعربية والإنجليزية معًا، يراجعها إنسان واحد قبل أن تُنشر. النتيجة سعر يبدأ من ربع سعر السوق تقريبًا، وجودة لا تقل عن وكالة كاملة الطاقم — غالبًا أعلى، لأن الآلة لا تنسى موعدًا ولا تأخذ إجازة.',
}

export const BY_RESULT = {
  nameEn: 'By Result',
  nameAr: 'بالنتيجة',
  h2: 'You pay for customers. Not for ad management.',
  ledeEn: 'BY RESULT bills per WhatsApp conversation the ad actually opens — nothing for reach, nothing for clicks that go nowhere. And because LOOM runs whole categories, not one account in isolation, a new client starts on the creative that already won inside that category.',
  bullets: [
    { en: 'Billed per WhatsApp conversation', ar: 'الاحتساب لكل محادثة واتساب' },
    { en: 'Nothing for reach, impressions or clicks', ar: 'لا شيء مقابل الوصول أو النقرات' },
    { en: 'One category creative library, shared forward', ar: 'مكتبة إعلانات واحدة لكل فئة، تنتقل للعميل التالي' },
  ],
  priceFromJod: 1.75,
  priceUnit: 'per conversation',
  priceNote: 'Starting point — cost per conversation falls as a category is learned.',
  example: {
    labelEn: 'How the category library works — an illustrative example',
    labelAr: 'مثال توضيحي',
    en: 'Say you’re the fifth furniture retailer to join. You don’t start blank — you start on the ad that already won for the other four.',
  },
  ctaLabel: 'Put my category to work',
  arabicPitch:
    '«بالنتيجة» تُحاسِبك على كل محادثة واتساب حقيقية يفتحها الإعلان — لا شيء مقابل الوصول، ولا شيء مقابل نقرة لا تقود إلى شيء. ولأن LOOM تدير فئة كاملة لا حسابًا واحدًا بمعزل عن غيره، فإن الإعلان الذي أثبت نفسه سابقًا في فئتك هو ما يبدأ عليه حسابك. لنفترض أنك خامس متجر أثاث ينضم إلينا: لن تبدأ من صفر، بل من الإعلان الذي فاز فعلاً مع الأربعة الذين سبقوك.',
}
