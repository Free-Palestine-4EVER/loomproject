// LoomFont.swift — THE TYPEFACE TRAP, solved once, here.
//
// LOOM Bloom is 67 Latin glyphs. It draws no Arabic, and no `→ … × ·`. Its .otf
// files live in Resources/Fonts and are registered via UIAppFonts in
// project.yml (see LoomFontAssertion below for the debug-time proof they
// actually loaded).
//
// The rule: LOOM Bloom is for short Latin display text only — screen titles,
// numerals, the wordmark. Arabic ALWAYS renders in the system face (SF
// Arabic), which is excellent and is what every other string in the app uses
// too.
//
// A feature agent cannot violate this because there is no API that takes a
// "family" and a "size" — every entry point takes the literal `String` you
// are about to display, inspects its Unicode script, and returns a `Font`
// that is already correct. There is no way to ask for Bloom on Arabic text;
// the only inputs that route to Bloom are ones this file itself decided are
// safe. Do not add an overload that takes a font name — that reopens the trap.
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

enum LoomFont {

    /// PostScript names as embedded in the .otf files (verified with
    /// fontTools — these are exact, not filename guesses).
    enum Family: String, CaseIterable {
        case regular = "LOOM Bloom"
        case rose = "LOOM Bloom Rose"
        case daisy = "LOOM Bloom Daisy"
        case tulip = "LOOM Bloom Tulip"
        case ivy = "LOOM Bloom Ivy"
    }

    /// Display type: screen titles, the wordmark, hero numerals. Picks LOOM
    /// Bloom automatically for pure-Latin `text` and falls back to the system
    /// face the instant `text` contains any Arabic-script scalar — including
    /// Arabic-Indic digits (٠١٢٣), which live in the same Unicode block.
    static func display(_ text: String, size: CGFloat, weight: Font.Weight = .regular, cut: Family = .regular) -> Font {
        guard !text.containsArabicScript else {
            return .system(size: size, weight: weight, design: .default)
        }
        return .custom(cut.rawValue, size: size).weight(weight)
    }

    /// Body/UI type: labels, captions, buttons, everything that isn't a
    /// display headline. ALWAYS the system face, regardless of script — this
    /// is what keeps AR and EN metrically consistent and never touches Bloom,
    /// per the contract ("never for body copy").
    static func body(size: CGFloat = 17, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
}

extension StringProtocol {
    /// True if any scalar in `self` falls in an Arabic Unicode block
    /// (Arabic, Arabic Supplement, Arabic Extended-A, Arabic Presentation
    /// Forms A/B — the last two cover ligated/positional forms). Arabic-Indic
    /// digits (U+0660–U+0669) live inside the base Arabic block, so a purely
    /// numeric Arabic-locale string is caught too.
    var containsArabicScript: Bool {
        let ranges: [ClosedRange<UInt32>] = [
            0x0600...0x06FF,
            0x0750...0x077F,
            0x08A0...0x08FF,
            0xFB50...0xFDFF,
            0xFE70...0xFEFF,
        ]
        return unicodeScalars.contains { scalar in
            ranges.contains { $0.contains(scalar.value) }
        }
    }
}

#if DEBUG
/// Call once at app launch. A silently-missing font is the classic iOS
/// failure mode — this turns it into a loud assert instead of tofu boxes.
enum LoomFontAssertion {
    @MainActor
    static func verifyRegistration() {
        #if canImport(UIKit)
        let registered = Set(UIFont.familyNames)
        for family in LoomFont.Family.allCases {
            assert(
                registered.contains(family.rawValue),
                "LOOM Bloom family '\(family.rawValue)' did not register at runtime. " +
                "Check Resources/Fonts and UIAppFonts in project.yml, then run xcodegen generate."
            )
        }
        #endif
    }
}
#endif
