// MonthStrings.swift — Month feature's own strings. See
// Core/I18n/L10n.swift header for the pattern every feature follows.
//
// `reviewedProgressText` / `slideProgressText` intentionally return a plain
// `String`, not an `L10nString`: they embed a formatted number, and
// NumberFormatting.swift is explicit that a raw Int must never be
// interpolated straight into an `L10nString` (that would always render
// Western digits, even in Arabic). Route the number through `LoomNumber`
// first, exactly like `LoomNumber.currency`/`LoomNumber.date` already do for
// composed, number-bearing sentences, then wrap the result in `Text(...)`
// at the call site instead of `Loc(...)`.
import Foundation

extension L10n {
    enum Month {
        // MARK: Top of screen

        static let noMonthsTitle = L10nString(
            en: "No months yet",
            ar: "لا توجد أشهر بعد"
        )
        static let noMonthsMessage = L10nString(
            en: "When LOOM starts your first month, it will show up here.",
            ar: "عندما تبدأ LOOM شهرك الأول، سيظهر هنا."
        )
        static let loadingMonths = L10nString(en: "Loading your month…", ar: "جارٍ تحميل شهرك…")
        static let loadingPosts = L10nString(en: "Loading posts…", ar: "جارٍ تحميل المنشورات…")
        static let couldNotLoadMonths = L10nString(
            en: "We couldn't load your months.",
            ar: "تعذّر تحميل أشهرك."
        )
        static let couldNotLoadPosts = L10nString(
            en: "We couldn't load this month's posts.",
            ar: "تعذّر تحميل منشورات هذا الشهر."
        )
        static let noPostsTitle = L10nString(en: "Nothing here yet", ar: "لا شيء هنا بعد")
        static let noPostsMessage = L10nString(
            en: "LOOM hasn't added posts to this month yet. Check back soon.",
            ar: "لم تُضِف LOOM منشورات لهذا الشهر بعد. تحقق مرة أخرى قريبًا."
        )
        static let changeMonth = L10nString(en: "Change month", ar: "تغيير الشهر")

        /// "4 of 24 reviewed" — see file header for why this isn't an
        /// `L10nString`.
        static func reviewedProgressText(done: Int, total: Int, language: Language) -> String {
            let doneStr = LoomNumber.string(done, language: language)
            let totalStr = LoomNumber.string(total, language: language)
            switch language {
            case .en: return "\(doneStr) of \(totalStr) reviewed"
            case .ar: return "تمت مراجعة \(doneStr) من \(totalStr)"
            }
        }

        static let allReviewed = L10nString(
            en: "You're all caught up on this month.",
            ar: "لقد راجعت كل شيء في هذا الشهر."
        )

        // MARK: Grid cell / status

        static let statusPendingReview = L10nString(en: "Pending your review", ar: "بانتظار مراجعتك")
        static let statusApproved = L10nString(en: "Approved", ar: "تمت الموافقة")
        static let statusChangeRequested = L10nString(en: "Change requested", ar: "طُلب تعديل")
        static let statusScheduled = L10nString(en: "Scheduled", ar: "مُجدوَل")
        static let statusPosted = L10nString(en: "Posted", ar: "تم النشر")
        static let statusInProgress = L10nString(en: "In progress", ar: "قيد الإعداد")
        static let notYetSent = L10n.Common.notYetSent

        static let kindCarousel = L10nString(en: "Carousel", ar: "منشور متعدد الصور")
        static let kindReel = L10nString(en: "Reel", ar: "ريل")

        // MARK: Post detail

        static let captionEnglish = L10nString(en: "English caption", ar: "التعليق بالإنجليزية")
        static let captionArabic = L10nString(en: "Arabic caption", ar: "التعليق بالعربية")
        static let hashtags = L10nString(en: "Hashtags", ar: "الوسوم")
        static let approve = L10nString(en: "Approve", ar: "الموافقة")
        static let askForChange = L10nString(en: "Ask for a change", ar: "اطلب تعديلًا")
        static let cancel = L10n.Common.cancel
        static let sendRequest = L10nString(en: "Send", ar: "إرسال")
        static let noteFieldPlaceholder = L10nString(
            en: "Tell LOOM what to change…",
            ar: "أخبر LOOM بما تريد تغييره…"
        )
        static let noteRequiredMessage = L10nString(
            en: "Add a short note so LOOM knows what to change.",
            ar: "أضف ملاحظة قصيرة ليعرف فريق LOOM ما الذي يجب تغييره."
        )
        static let yourNote = L10nString(en: "Your note", ar: "ملاحظتك")
        static let decisionSendFailed = L10nString(
            en: "This didn't send. It will stay marked as not sent until you're back online.",
            ar: "لم يتم الإرسال. سيبقى مُعلّمًا كغير مُرسل حتى تعود إلى الاتصال."
        )
        static let alreadyPostedNote = L10nString(
            en: "This post already went out, so it's no longer open for review.",
            ar: "تم نشر هذا المنشور بالفعل، لذا لم يعد مفتوحًا للمراجعة."
        )
        static let decidedOn = L10nString(en: "Decided", ar: "تم القرار")

        /// "Slide 2 of 5" for carousel paging — see file header.
        static func slideProgressText(index: Int, total: Int, language: Language) -> String {
            let indexStr = LoomNumber.string(index, language: language)
            let totalStr = LoomNumber.string(total, language: language)
            switch language {
            case .en: return "Slide \(indexStr) of \(totalStr)"
            case .ar: return "الشريحة \(indexStr) من \(totalStr)"
            }
        }
    }
}
