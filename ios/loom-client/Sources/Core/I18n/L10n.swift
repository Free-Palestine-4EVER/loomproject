// L10n.swift — the whole bilingual system in one small mechanism.
//
// A string is an `L10nString`: an EN/AR pair, written together so a
// translation can never drift out of sync with its source. There is no
// central strings dictionary and no string keys to look up — that means no
// shared file for every feature agent to edit (and conflict on). Instead:
//
//   HOW TO ADD YOUR OWN STRINGS (feature agents)
//   ----------------------------------------------------------------
//   Create `Sources/Features/<YourFeature>/<YourFeature>Strings.swift` and
//   extend the `L10n` namespace with your own nested enum:
//
//     extension L10n {
//         enum Month {
//             static let title = L10nString(en: "This Month", ar: "هذا الشهر")
//             static let reviewedCount = { (done: Int, total: Int) in
//                 L10nString(en: "\(done) of \(total) reviewed",
//                             ar: "تمت مراجعة \(done) من \(total)")
//             }
//         }
//     }
//
//   Then use it in a view with `Loc(L10n.Month.title)` — never a bare
//   `Text("...")`. This is file-scoped per feature, so two agents adding
//   strings the same day never touch the same file.
//
// Arabic-Indic numerals and JOD/دينار formatting live in
// NumberFormatting.swift, not here — don't hand-format numbers into an
// L10nString.
import SwiftUI

/// A string that exists in both languages at once.
struct L10nString: Sendable {
    let en: String
    let ar: String

    func resolved(for language: Language) -> String {
        switch language {
        case .en: en
        case .ar: ar
        }
    }
}

/// Root namespace. Core owns `L10n.Common`; every feature adds its own
/// nested enum in its own file (see header comment above).
enum L10n {}

/// Renders an `L10nString` as `Text` in the active language, read from the
/// environment — this is the ONLY sanctioned way to put a string on screen.
/// `LayoutDirection` is inherited from the app root (set once in
/// `RootView`); this view does not re-set it, so nesting stays cheap.
struct Loc: View {
    @Environment(LanguageManager.self) private var languageManager
    private let string: L10nString

    init(_ string: L10nString) {
        self.string = string
    }

    var body: some View {
        Text(string.resolved(for: languageManager.language))
    }
}

extension L10nString {
    /// Escape hatch for call sites that need a raw `String` (e.g. building an
    /// accessibility label or a navigation title) rather than a `Text`.
    func string(for language: Language) -> String {
        resolved(for: language)
    }
}
