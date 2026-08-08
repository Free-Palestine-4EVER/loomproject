// SettingsStrings.swift — Settings feature's own strings. See
// Core/I18n/L10n.swift header for the pattern every feature follows.
extension L10n {
    enum Settings {
        // MARK: Account
        static let sectionAccount = L10nString(en: "Account", ar: "الحساب")
        static func signedInAs(_ name: String) -> L10nString {
            L10nString(en: "Signed in as \(name)", ar: "تم تسجيل الدخول باسم \(name)")
        }
        static let accountUnavailableTitle = L10nString(
            en: "Account details unavailable",
            ar: "تفاصيل الحساب غير متاحة"
        )
        static let accountUnavailableMessage = L10nString(
            en: "We'll show your account details once you're back online.",
            ar: "سنعرض تفاصيل حسابك حالما تعود للاتصال بالإنترنت."
        )

        // MARK: Language
        static let sectionLanguage = L10nString(en: "Language", ar: "اللغة")

        // MARK: Notifications
        static let sectionNotifications = L10nString(en: "Notifications", ar: "الإشعارات")
        static let notificationsToggleLabel = L10nString(
            en: "Reminders on this device",
            ar: "تذكيرات على هذا الجهاز"
        )
        static let notificationsToggleDescription = L10nString(
            en: "Local alerts when there's something to review. This is a device setting only — LOOM never knows whether it's on.",
            ar: "تنبيهات محلية عند وجود ما تراجعه. هذا إعداد على جهازك فقط — لا تعرف LOOM أبدًا ما إذا كان مفعّلاً."
        )
        static let notificationsDeniedMessage = L10nString(
            en: "Notifications for LOOM are turned off in iOS Settings.",
            ar: "الإشعارات الخاصة بتطبيق LOOM مُعطّلة من إعدادات iOS."
        )
        static let openSettingsButton = L10nString(en: "Open Settings", ar: "فتح الإعدادات")
        static let checkingNotifications = L10nString(
            en: "Checking notification settings…",
            ar: "جارٍ التحقق من إعدادات الإشعارات…"
        )

        // MARK: Privacy — the honest "what LOOM can see" note
        static let sectionPrivacy = L10nString(en: "What LOOM Can See", ar: "ما الذي تراه LOOM")
        static let privacyNoteBody = L10nString(
            en: "LOOM can see your business name and contact handle, the months and posts we prepare for you, your approvals and notes, your invoices, and the requests you send us. LOOM never shares your content with any other client, and this app never shows you how a post was made or what it cost us.",
            ar: "تستطيع LOOM رؤية اسم عملك ومعرّف التواصل الخاص بك، والأشهر والمنشورات التي نجهّزها لك، وموافقاتك وملاحظاتك، وفواتيرك، والطلبات التي ترسلها لنا. لا تشارك LOOM محتواك مع أي عميل آخر أبدًا، ولا يعرض هذا التطبيق كيف صُنع أي منشور أو كم كلّفنا."
        )

        // MARK: Sign out
        static let signOutButton = L10nString(en: "Sign Out", ar: "تسجيل الخروج")
        static let signOutConfirmTitle = L10nString(
            en: "Sign out of LOOM?",
            ar: "هل تريد تسجيل الخروج من LOOM؟"
        )
        static let signOutConfirmMessage = L10nString(
            en: "You can sign back in anytime with your handle.",
            ar: "يمكنك تسجيل الدخول مرة أخرى في أي وقت باستخدام معرّفك."
        )
    }
}
