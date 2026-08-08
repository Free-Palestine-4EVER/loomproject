// InvoicesStrings.swift — Invoices feature's own strings. See
// Core/I18n/L10n.swift header for the pattern every feature follows.
extension L10n {
    enum Invoices {
        // MARK: List screen

        static let emptyTitle = L10nString(en: "No invoices yet", ar: "لا توجد فواتير بعد")
        static let emptyMessage = L10nString(
            en: "Your invoices will appear here once LOOM issues one.",
            ar: "ستظهر فواتيرك هنا بمجرد أن يصدرها لووم."
        )
        static let loadingCaption = L10nString(en: "Loading invoices…", ar: "جارٍ تحميل الفواتير…")

        /// Stale-cache banner, with the cached-at time already formatted by the
        /// caller. Explicit `@Sendable` closure type (see Core/Net/DateCoding.swift
        /// for the same pattern) — a bare inferred closure type here is not
        /// concurrency-safe for a `static let` under Swift 6 strict checking.
        static let staleUpdatedAt: @Sendable (String) -> L10nString = { formattedDate in
            L10nString(
                en: "Showing your update from \(formattedDate)",
                ar: "نعرض تحديثك من \(formattedDate)"
            )
        }

        // MARK: Row / detail shared

        static let issuedLabel = L10nString(en: "Issued", ar: "تاريخ الإصدار")
        static let totalLabel = L10nString(en: "Total", ar: "الإجمالي")

        static let statusDraft = L10nString(en: "Draft", ar: "مسودة")
        static let statusSent = L10nString(en: "Sent", ar: "مُرسلة")
        static let statusPaid = L10nString(en: "Paid", ar: "مدفوعة")
        static let statusUnknown = L10nString(en: "Pending", ar: "قيد الإصدار")

        // MARK: Detail screen — line items table

        static let lineItemsTitle = L10nString(en: "Charges", ar: "البنود")
        static let columnItem = L10nString(en: "Item", ar: "البند")
        static let columnQty = L10nString(en: "Qty", ar: "الكمية")
        static let columnUnit = L10nString(en: "Unit", ar: "سعر الوحدة")
        static let columnLineTotal = L10nString(en: "Total", ar: "الإجمالي")

        /// Shown under any line that hits LOOM's monthly conversation floor
        /// (SPEC: CONVERSATION_MINIMUM = 100), so that line reads as an
        /// understandable charge rather than a mystery number.
        static let floorNoteTitle = L10nString(
            en: "LOOM's monthly minimum",
            ar: "الحد الأدنى الشهري من لووم"
        )
        static let floorNoteMessage = L10nString(
            en: "LOOM bills a minimum of 100 conversations each month, even in months that deliver fewer. This line is that minimum, not an extra charge.",
            ar: "يحتسب لووم حدًا أدنى قدره ١٠٠ محادثة كل شهر، حتى في الأشهر التي يكون فيها العدد الفعلي أقل. هذا البند هو ذلك الحد الأدنى، وليس رسومًا إضافية."
        )

        // MARK: Errors

        static let loadFailedMessage = L10nString(
            en: "We couldn't load your invoices.",
            ar: "تعذّر تحميل فواتيرك."
        )
    }
}
