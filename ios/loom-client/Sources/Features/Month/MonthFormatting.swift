// MonthFormatting.swift — turns the engine's "yyyy-MM" month key into a
// human month/year heading ("August 2026" / "أغسطس ٢٠٢٦"). Core/I18n has no
// API for this shape (it formats `Date`, not a bare "yyyy-MM" key), so this
// lives here as a Month-feature-owned helper rather than touching Core, per
// CONTRACT.md's per-folder ownership.
//
// Numerals still follow the app-wide rule: `Language.locale` carries
// `@numbers=arab` for Arabic, and `DateFormatter` honours that automatically,
// so no manual digit-mapping is needed here.
import Foundation

enum MonthFormatting {
    /// `"2026-08"` -> `"August 2026"` (or the Arabic equivalent). Falls back
    /// to the raw key if the engine ever sends a shape this can't parse —
    /// never crashes on an unexpected month string.
    static func title(for month: String, language: Language) -> String {
        let parts = month.split(separator: "-")
        guard parts.count == 2, let year = Int(parts[0]), let monthNumber = Int(parts[1]) else {
            return month
        }
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = language.locale
        var components = DateComponents()
        components.year = year
        components.month = monthNumber
        components.day = 1
        guard let date = calendar.date(from: components) else { return month }

        let formatter = DateFormatter()
        formatter.locale = language.locale
        formatter.calendar = calendar
        formatter.setLocalizedDateFormatFromTemplate("MMMM yyyy")
        return formatter.string(from: date)
    }
}
