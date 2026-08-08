// Language.swift — the two supported languages and the app's single source
// of truth for which one is active. Arabic is the default when the phone's
// locale is Arabic (contract); a user pick in Settings overrides that and
// persists.
import SwiftUI

enum Language: String, CaseIterable, Sendable, Codable {
    case en
    case ar

    var isRTL: Bool { self == .ar }
    var layoutDirection: LayoutDirection { isRTL ? .rightToLeft : .leftToRight }
    /// `@numbers=arab` forces Arabic-Indic digits (٠١٢٣) explicitly rather
    /// than relying on ar_JO's default numbering system, which ICU does not
    /// guarantee stays Arabic-Indic across OS versions/regions.
    var locale: Locale { Locale(identifier: self == .ar ? "ar_JO@numbers=arab" : "en_US") }

    var displayName: String {
        switch self {
        case .en: "English"
        case .ar: "العربية"
        }
    }
}

/// Owns the active `Language`, persisted across launches. Instantiate once in
/// `LOOMClientApp` and pass down via `.environment(languageManager)`; read it
/// anywhere with `@Environment(LanguageManager.self)`.
@MainActor
@Observable
final class LanguageManager {
    private static let overrideKey = "loom.client.language.override"

    var language: Language {
        didSet {
            guard oldValue != language else { return }
            UserDefaults.standard.set(language.rawValue, forKey: Self.overrideKey)
        }
    }

    init() {
        if let raw = UserDefaults.standard.string(forKey: Self.overrideKey),
           let stored = Language(rawValue: raw) {
            language = stored
        } else {
            language = Self.deviceDefault()
        }
    }

    /// Explicit user choice from Settings. Distinguish from the `didSet`
    /// persistence path only in intent — both persist; this exists so
    /// Settings' call site reads clearly.
    func setLanguage(_ language: Language) {
        self.language = language
    }

    private static func deviceDefault() -> Language {
        let preferred = Locale.preferredLanguages.first ?? "en"
        return preferred.hasPrefix("ar") ? .ar : .en
    }
}
