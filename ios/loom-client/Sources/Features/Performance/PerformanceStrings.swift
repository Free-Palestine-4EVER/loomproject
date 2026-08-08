// PerformanceStrings.swift — Performance feature's own strings. See
// Core/I18n/L10n.swift header for the pattern every feature follows.
//
// Privacy note (CONTRACT.md): this screen may show ONLY
// conversationsDelivered, billedJod, perConversationJod and byDay counts.
// Never add a string here that implies spend, CPC, margin or the creative
// library — if a copy idea needs one of those words, it does not belong in
// this app.
extension L10n {
    enum Performance {
        /// Stat card: the headline number for the selected month.
        static let conversationsDelivered = L10nString(
            en: "Conversations delivered",
            ar: "المحادثات المُنجزة"
        )
        /// Stat card: what the client owes for those conversations.
        static let costThisMonth = L10nString(
            en: "What this month costs you",
            ar: "تكلفة هذا الشهر"
        )
        /// Stat card: the per-conversation rate.
        static let perConversation = L10nString(
            en: "Per conversation",
            ar: "لكل محادثة"
        )
        /// Section header above the by-day chart.
        static let dailyChartTitle = L10nString(
            en: "Conversations by day",
            ar: "المحادثات يوميًا"
        )
        /// Shown instead of the chart when the selected month has delivered
        /// nothing yet — an honest zero, not a blank area.
        static let noConversationsYet = L10nString(
            en: "No conversations delivered yet this month.",
            ar: "لم يتم تسليم أي محادثات بعد هذا الشهر."
        )
        /// Empty state: the client has no months at all yet.
        static let emptyTitle = L10nString(
            en: "Nothing to show yet",
            ar: "لا يوجد ما نعرضه بعد"
        )
        static let emptyMessage = L10nString(
            en: "Your performance will appear here once LOOM starts delivering for you.",
            ar: "سيظهر أداؤك هنا فور أن يبدأ LOOM بالتسليم لك."
        )
        /// Month picker affordance (a Menu button label prefix / accessibility
        /// label — the button's visible text is the formatted month itself).
        static let monthPickerLabel = L10nString(en: "Month", ar: "الشهر")

        /// VoiceOver label for one bar in the by-day chart. `date` and `count`
        /// arrive pre-formatted (LoomNumber/DateFormatter) so this stays a
        /// pure sentence template. A `static func` rather than a stored
        /// closure — under `SWIFT_STRICT_CONCURRENCY: complete` a `static
        /// let` closure trips the "not concurrency-safe" Sendable check that
        /// a plain function does not.
        static func dayAccessibilityLabel(date: String, count: String) -> L10nString {
            L10nString(
                en: "\(date): \(count) conversations",
                ar: "\(date): \(count) محادثة"
            )
        }
    }
}
