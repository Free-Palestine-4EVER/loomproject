// NumberFormatting.swift — Arabic-Indic numerals in Arabic, Latin numerals in
// English, and JOD currency in both. Route every number through here; never
// interpolate a raw Int/Double into an L10nString.
import Foundation

enum LoomNumber {
    /// An integer as digits in the given language ("24" or "٢٤").
    static func string(_ value: Int, language: Language) -> String {
        format(value, language: language, fractionDigits: 0)
    }

    /// A count formatted for reading in a sentence, same rule as `string`.
    static func count(_ value: Int, language: Language) -> String {
        string(value, language: language)
    }

    /// JOD currency: "12.50 JOD" in English, "١٢.٥٠ دينار" in Arabic — always
    /// 2 decimal places, per the contract's money convention.
    static func currency(_ value: Double, language: Language) -> String {
        let amount = format(value, language: language, fractionDigits: 2)
        switch language {
        case .en: return "\(amount) JOD"
        case .ar: return "\(amount) دينار"
        }
    }

    /// A date formatted per-language (numerals follow the same rule).
    static func date(_ date: Date, language: Language, style: DateFormatter.Style = .medium) -> String {
        let formatter = DateFormatter()
        formatter.locale = language.locale
        formatter.dateStyle = style
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    private static func format(_ value: Double, language: Language, fractionDigits: Int) -> String {
        let formatter = NumberFormatter()
        formatter.locale = language.locale
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = fractionDigits
        formatter.maximumFractionDigits = fractionDigits
        // `NumberFormatter` with an ar_JO locale already emits Arabic-Indic
        // digits (٠١٢٣...); en_US emits Latin digits. No manual digit-mapping
        // needed as long as `Language.locale` stays authoritative.
        return formatter.string(from: NSNumber(value: value)) ?? String(format: "%.\(fractionDigits)f", value)
    }

    private static func format(_ value: Int, language: Language, fractionDigits: Int) -> String {
        format(Double(value), language: language, fractionDigits: fractionDigits)
    }
}
