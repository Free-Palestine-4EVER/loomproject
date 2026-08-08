// L10nCommon.swift — strings shared across the whole app shell (Core/App),
// not owned by any one feature. Feature-specific strings do NOT belong here —
// see the header of L10n.swift for where those go.
extension L10n {
    enum Common {
        static let ok = L10nString(en: "OK", ar: "حسنًا")
        static let cancel = L10nString(en: "Cancel", ar: "إلغاء")
        static let retry = L10nString(en: "Retry", ar: "إعادة المحاولة")
        static let done = L10nString(en: "Done", ar: "تم")
        static let loading = L10nString(en: "Loading…", ar: "جارٍ التحميل…")
        static let somethingWentWrong = L10nString(
            en: "Something went wrong.",
            ar: "حدث خطأ ما."
        )
        static let offlineTitle = L10nString(
            en: "You're offline",
            ar: "أنت غير متصل"
        )
        static let showingLastUpdate = L10nString(
            en: "Showing your last update",
            ar: "نعرض آخر تحديث لديك"
        )
        static let notYetSent = L10nString(en: "Not yet sent", ar: "لم يُرسل بعد")
    }

    /// The app shell's tab titles — owned here (not per-feature) because the
    /// tab bar itself lives in Sources/App, which the scaffold owns.
    enum Tabs {
        static let month = L10nString(en: "This Month", ar: "هذا الشهر")
        static let performance = L10nString(en: "Performance", ar: "الأداء")
        static let invoices = L10nString(en: "Invoices", ar: "الفواتير")
        static let requests = L10nString(en: "Requests", ar: "الطلبات")
        static let settings = L10nString(en: "Settings", ar: "الإعدادات")
    }
}
