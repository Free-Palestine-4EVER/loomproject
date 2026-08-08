// RequestsStrings.swift — Requests feature's own strings. See
// Core/I18n/L10n.swift header for the pattern every feature follows.
extension L10n {
    enum Requests {
        // MARK: Empty / loading / error

        static let emptyTitle = L10nString(
            en: "No requests yet",
            ar: "لا توجد طلبات بعد"
        )
        static let emptyMessage = L10nString(
            en: "Ask LOOM for a change or send a note — it starts here.",
            ar: "اطلب من LOOM تعديلاً أو أرسل ملاحظة — ابدأ من هنا."
        )

        // MARK: Composer

        static let composerPlaceholder = L10nString(
            en: "Message LOOM…",
            ar: "راسل LOOM…"
        )
        static let send = L10nString(en: "Send", ar: "إرسال")
        static let sendAccessibilityLabel = L10nString(en: "Send message", ar: "إرسال الرسالة")

        // MARK: Sender label (shown above LOOM's replies only — the client's
        // own messages are implied by bubble alignment, no label needed)

        static let loomSenderLabel = L10nString(en: "LOOM", ar: "LOOM")

        // MARK: Per-message status chips (server-confirmed messages)

        static let statusOpen = L10nString(en: "Open", ar: "مفتوح")
        static let statusAnswered = L10nString(en: "Answered", ar: "تم الرد")
        static let statusClosed = L10nString(en: "Closed", ar: "مغلق")

        // MARK: Local optimistic-send states (not yet confirmed by the server)

        static let sending = L10nString(en: "Sending…", ar: "جارٍ الإرسال…")
        static let queuedNote = L10nString(
            en: "Not yet sent — will send automatically when you're back online.",
            ar: "لم تُرسل بعد — ستُرسل تلقائيًا عند عودة الاتصال."
        )
        static let failedNote = L10nString(
            en: "Couldn't send.",
            ar: "تعذّر الإرسال."
        )
    }
}
