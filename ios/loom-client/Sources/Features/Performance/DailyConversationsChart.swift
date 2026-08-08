// DailyConversationsChart.swift — the "honest by-day chart" from CONTRACT.md
// §Screens 3. One series, one colour: meaning is carried by bar height + the
// value axis, never by colour alone, so this reads fine for colour-blind
// users without any extra work. The headline number is also shown as plain
// text in the stat card above the chart (PerformanceRootView) — the chart
// illustrates that number, it is never the only place it appears.
import SwiftUI
import Charts

/// One parsed, plottable day. `PerformanceSummary.DayCount.date` is a plain
/// "YYYY-MM-DD" string from the engine; this type is the local, chart-only
/// conversion to `Date` so Swift Charts can format axis labels using the
/// active locale (set once, at the app root, in RootView) instead of us
/// hand-rolling digit substitution here.
private struct DayPoint: Identifiable {
    let id: String
    let date: Date
    let count: Int
}

struct DailyConversationsChart: View {
    let days: [PerformanceSummary.DayCount]
    let language: Language

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private static let isoParser: DateFormatter = {
        // Fixed parsing locale/timezone — this reads the engine's wire
        // format, not anything locale-dependent. Display formatting below
        // uses the environment locale instead.
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private var points: [DayPoint] {
        days.compactMap { day in
            guard let date = Self.isoParser.date(from: day.date) else { return nil }
            return DayPoint(id: day.date, date: date, count: day.count)
        }
    }

    private var maxCount: Int {
        points.map(\.count).max() ?? 0
    }

    var body: some View {
        if points.isEmpty {
            // Every date string failed to parse — treat like no data rather
            // than render an empty plot area with no explanation.
            noDataNote
        } else {
            Chart(points) { point in
                BarMark(
                    x: .value("Day", point.date, unit: .day),
                    y: .value("Conversations", point.count)
                )
                .foregroundStyle(LoomColor.magenta.gradient)
                .cornerRadius(3)
                .accessibilityLabel(accessibilityLabel(for: point))
            }
            // Time reads left-to-right on this chart regardless of interface
            // direction — the same convention Apple's own charts use, so
            // "day 1 → day 31" never appears to run backwards under Arabic.
            // Everything else on the screen still mirrors normally.
            .environment(\.layoutDirection, .leftToRight)
            .chartYScale(domain: 0...max(maxCount, 4))
            .chartXAxis {
                AxisMarks(values: .stride(by: .day, count: strideCount)) { _ in
                    AxisGridLine().foregroundStyle(LoomColor.line)
                    AxisValueLabel(format: .dateTime.day(), centered: true)
                        .foregroundStyle(LoomColor.inkFaint)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading, values: .automatic(desiredCount: 3)) { value in
                    AxisGridLine().foregroundStyle(LoomColor.line)
                    AxisValueLabel {
                        if let count = value.as(Int.self) {
                            Text(LoomNumber.string(count, language: language))
                                .foregroundStyle(LoomColor.inkFaint)
                        }
                    }
                }
            }
            .frame(height: 180)
            .font(LoomFont.body(size: 11))
            // Switching months redraws the bars; Reduce Motion turns that
            // into a hard cut instead of an interpolated animation.
            .animation(reduceMotion ? nil : .easeInOut(duration: 0.3), value: points.map(\.count))
        }
    }

    /// Roughly one label per week — dense enough to orient, sparse enough
    /// not to collide at 28–31 days.
    private var strideCount: Int {
        max(points.count / 5, 1)
    }

    private func accessibilityLabel(for point: DayPoint) -> Text {
        let dateText = LoomNumber.date(point.date, language: language, style: .medium)
        let countText = LoomNumber.count(point.count, language: language)
        return Text(L10n.Performance.dayAccessibilityLabel(date: dateText, count: countText).resolved(for: language))
    }

    private var noDataNote: some View {
        Text(L10n.Performance.noConversationsYet.resolved(for: language))
            .font(LoomFont.body(size: 14))
            .foregroundStyle(LoomColor.inkDim)
            .frame(maxWidth: .infinity, minHeight: 120)
            .multilineTextAlignment(.center)
    }
}
