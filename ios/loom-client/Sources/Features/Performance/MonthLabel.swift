// MonthLabel.swift — formats the engine's "YYYY-MM" month key into a
// localized "August 2026" / "أغسطس ٢٠٢٦" string for the month picker. Local
// to this feature (Core/I18n has no month-only formatter) per AGENTS.md:
// features implement small Core-shaped gaps as private helpers in their own
// folder rather than editing Core.
import Foundation

enum MonthLabel {
    private static let parser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "yyyy-MM"
        return formatter
    }()

    /// `"2026-08"` -> `"August 2026"` (en) / `"أغسطس ٢٠٢٦"` (ar). Falls back
    /// to the raw key if the engine ever sends an unexpected shape — this is
    /// a display nicety, not something that should ever crash a screen.
    static func format(_ month: String, language: Language) -> String {
        guard let date = parser.date(from: month) else { return month }
        let formatter = DateFormatter()
        formatter.locale = language.locale
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.setLocalizedDateFormatFromTemplate("MMMM yyyy")
        return formatter.string(from: date)
    }
}
