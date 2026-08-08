// AuthStrings.swift — Auth feature's own strings. See Core/I18n/L10n.swift
// header for the pattern every feature follows. Parameterized strings take
// an already-formatted number *string* (produced by LoomNumber at the call
// site) rather than a raw Int, per NumberFormatting.swift's "never
// hand-format numbers into an L10nString" rule.
extension L10n {
    enum Auth {
        /// The wordmark is pure Latin by design, in both languages — brand
        /// names stay Latin inline in Arabic copy (see AuthFlowModel's own
        /// note on why the OTP code itself is treated the same way).
        static let wordmark = L10nString(en: "LOOM", ar: "LOOM")

        // MARK: Handle step

        static let handleTitle = L10nString(en: "Sign in", ar: "تسجيل الدخول")
        static let handleSubtitle = L10nString(
            en: "Enter your Instagram handle, email, or phone — whichever LOOM already has for you.",
            ar: "أدخل معرّف إنستغرام أو بريدك الإلكتروني أو رقم هاتفك — نفس ما لدى LOOM عنك."
        )
        static let handleFieldLabel = L10nString(en: "Handle, email, or phone", ar: "المعرّف أو البريد أو الهاتف")
        static let handlePlaceholder = L10nString(
            en: "@yourbusiness, email, or phone",
            ar: "المعرّف، البريد الإلكتروني، أو رقم الهاتف"
        )
        static let sendCode = L10nString(en: "Send my code", ar: "أرسل الرمز")

        // MARK: Code step

        static let codeTitle = L10nString(en: "LOOM will send your code", ar: "سترسل LOOM رمزك")
        static func codeSubtitle(handle: String) -> L10nString {
            L10nString(
                en: "No automatic SMS — someone at LOOM sends your 6-digit code to \(handle) directly.",
                ar: "بلا رسائل نصية آلية — سيرسل لك أحد فريق LOOM رمزًا من ٦ أرقام إلى \(handle) مباشرة."
            )
        }
        static let codeFieldLabel = L10nString(en: "6-digit code", ar: "رمز من ٦ أرقام")
        static let codePlaceholder = L10nString(en: "000000", ar: "000000")
        static let verify = L10nString(en: "Verify & continue", ar: "تحقّق وتابع")
        static let changeHandle = L10nString(en: "Use a different handle", ar: "استخدم معرّفًا آخر")
        static let resend = L10nString(en: "Resend code", ar: "إعادة إرسال الرمز")
        static let resending = L10nString(en: "Sending…", ar: "جارٍ الإرسال…")
        static func resendCountdown(secondsText: String) -> L10nString {
            L10nString(en: "Resend in \(secondsText)s", ar: "إعادة الإرسال بعد \(secondsText)ث")
        }

        static let codeWrong = L10nString(
            en: "That code didn't match. Double-check it and try again.",
            ar: "الرمز غير مطابق. تحقّق منه وحاول مرة أخرى."
        )
        static let codeExpired = L10nString(
            en: "That code has expired. Request a new one below.",
            ar: "انتهت صلاحية هذا الرمز. اطلب رمزًا جديدًا أدناه."
        )

        // MARK: Locked-out step

        static let lockedOutTitle = L10nString(en: "Let's slow down for a moment", ar: "لنتمهّل قليلاً")
        static let lockedOutMessage = L10nString(
            en: "For your account's safety, code attempts are paused for about 15 minutes. Come back after that and request a fresh code — your month will be right here waiting.",
            ar: "لحماية حسابك، أوقفنا محاولات إدخال الرمز مؤقتًا لحوالي ١٥ دقيقة. عد بعدها واطلب رمزًا جديدًا — شهرك سيكون بانتظارك هنا تمامًا."
        )
        static let lockedOutAction = L10nString(en: "Start over", ar: "البدء من جديد")
    }
}
