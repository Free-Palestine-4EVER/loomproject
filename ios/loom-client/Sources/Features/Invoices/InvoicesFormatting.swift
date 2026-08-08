// InvoicesFormatting.swift — small formatting helpers Core/I18n doesn't
// provide (a "YYYY-MM" month key -> localized "Month YYYY" string, and a
// trimmed decimal for a line's `qty`, which is a count, not currency), plus
// this feature's presentation of `Invoice.Status` (localized text + tint).
// Kept private to this feature agent's own folder per CONTRACT.md's
// "implement it INSIDE YOUR OWN FOLDER as a private extension" allowance —
// namespaced with an `Invoices` prefix so it can never collide with another
// feature folder's identically-purposed helper in this single-target app.
import SwiftUI

enum InvoicesMonthFormatting {
    /// `"2026-08"` (engine/SPEC.md: "Month keys are `2026-08`") -> a
    /// human month+year in the active language, e.g. "August 2026" /
    /// "أغسطس ٢٠٢٦". Falls back to the raw key if it isn't parseable, so a
    /// malformed value degrades to something readable instead of vanishing.
    static func display(_ monthKey: String, language: Language) -> String {
        let parts = monthKey.split(separator: "-")
        guard parts.count == 2,
              let year = Int(parts[0]),
              let month = Int(parts[1]) else {
            return monthKey
        }
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = 1
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? .current
        guard let date = calendar.date(from: components) else { return monthKey }

        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.locale = language.locale
        formatter.setLocalizedDateFormatFromTemplate("MMMM yyyy")
        return formatter.string(from: date)
    }
}

enum InvoicesQuantityFormatting {
    /// A line's `qty` is a count (conversations, posts…), not money — no
    /// fixed 2 decimals like `LoomNumber.currency`. Whole numbers print with
    /// no fraction; anything else keeps up to 2, trimmed. Digits still follow
    /// the active language (Arabic-Indic in Arabic) via `language.locale`,
    /// same rule as `LoomNumber`.
    static func string(_ value: Double, language: Language) -> String {
        let formatter = NumberFormatter()
        formatter.locale = language.locale
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value))
            ?? String(format: "%.0f", value)
    }
}

/// This feature's presentation of the Core `Invoice.Status` enum — an
/// extension, not a change to `Sources/Core/Models/Invoice.swift`, which this
/// agent does not own. `StatusChip` (Core/Design) is deliberately generic and
/// takes already-localized text plus a tint, so this is the one place that
/// maps the four statuses to both.
extension Invoice.Status {
    func localizedText(language: Language) -> String {
        switch self {
        case .draft: L10n.Invoices.statusDraft.string(for: language)
        case .sent: L10n.Invoices.statusSent.string(for: language)
        case .paid: L10n.Invoices.statusPaid.string(for: language)
        case .unknown: L10n.Invoices.statusUnknown.string(for: language)
        }
    }

    var tint: Color {
        switch self {
        case .draft: LoomStatusTint.neutral
        case .sent: LoomStatusTint.pending
        case .paid: LoomStatusTint.positive
        case .unknown: LoomStatusTint.neutral
        }
    }
}
