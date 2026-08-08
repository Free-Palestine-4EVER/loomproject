// PerformanceRootView.swift — CONTRACT.md §Screens 3: conversations
// delivered this month, an honest by-day chart, and what it costs the
// client. No vanity metrics, no invented insight — the three numbers shown
// here (conversationsDelivered, billedJod, perConversationJod) are exactly
// the fields `APIClient.fetchPerformance(month:)` is allowed to return per
// the privacy rule; do not add anything else to this screen.
import SwiftUI

struct PerformanceRootView: View {
    @Environment(LanguageManager.self) private var languageManager
    @State private var viewModel = PerformanceViewModel()

    private var language: Language { languageManager.language }

    var body: some View {
        NavigationStack {
            content
                .loomBackdrop()
                .navigationTitle(L10n.Tabs.performance.string(for: language))
        }
        .task {
            // Guards against re-fetching every time the tab is revisited —
            // only the very first appearance (state still `.loading`) fires
            // the initial load; refresh from here on is pull-to-refresh or
            // the error state's retry button.
            if case .loading = viewModel.state {
                await viewModel.load()
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.state {
        case .loading:
            LoadingState(caption: Text(L10n.Common.loading.string(for: language)))

        case .empty:
            EmptyState(
                systemImage: "chart.line.uptrend.xyaxis",
                title: Text(L10n.Performance.emptyTitle.string(for: language)),
                message: Text(L10n.Performance.emptyMessage.string(for: language)),
                imageName: "EmptyWoven"
            )

        case .error(let apiError):
            ErrorState(
                message: Text(apiError.userMessage.string(for: language)),
                retryTitle: Text(L10n.Common.retry.string(for: language)),
                onRetry: { Task { await viewModel.load() } },
                imageName: "ErrorWoven"
            )

        case .loaded(let months, let selectedMonth, let performance, let isStale):
            loadedBody(months: months, selectedMonth: selectedMonth, performance: performance, isStale: isStale)
        }
    }

    private func loadedBody(
        months: [MonthSummary],
        selectedMonth: String,
        performance: PerformanceSummary,
        isStale: Bool
    ) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: LoomSpacing.lg) {
                if isStale {
                    staleBanner
                }
                monthPicker(months: months, selectedMonth: selectedMonth)
                statCards(performance: performance)
                chartSection(performance: performance)
            }
            .padding(LoomSpacing.md)
        }
        .scrollBounceBehavior(.basedOnSize)
        .refreshable {
            await viewModel.load(month: selectedMonth)
        }
    }

    // MARK: - Offline banner

    private var staleBanner: some View {
        HStack(spacing: LoomSpacing.xs) {
            Image(systemName: "wifi.slash")
                .foregroundStyle(LoomColor.gold)
            Loc(L10n.Common.showingLastUpdate)
                .font(LoomFont.body(size: 13))
                .foregroundStyle(LoomColor.inkDim)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, LoomSpacing.sm)
        .padding(.vertical, LoomSpacing.xs)
        .background(LoomColor.bg3)
        .clipShape(RoundedRectangle(cornerRadius: LoomRadius.small, style: .continuous))
    }

    // MARK: - Month picker

    private func monthPicker(months: [MonthSummary], selectedMonth: String) -> some View {
        Menu {
            ForEach(months.sorted { $0.month > $1.month }) { month in
                Button {
                    Task { await viewModel.select(month: month.month) }
                } label: {
                    let label = MonthLabel.format(month.month, language: language)
                    if month.month == selectedMonth {
                        Label(label, systemImage: "checkmark")
                    } else {
                        Text(label)
                    }
                }
            }
        } label: {
            HStack(spacing: LoomSpacing.xxs) {
                Text(MonthLabel.format(selectedMonth, language: language))
                    .font(LoomFont.display(MonthLabel.format(selectedMonth, language: language), size: 20, weight: .semibold))
                Image(systemName: "chevron.down")
                    .font(.system(size: 13, weight: .semibold))
            }
            .foregroundStyle(LoomColor.ink)
        }
        // Only one month on record: nothing to pick, so no affordance to tap.
        .disabled(months.count <= 1)
        .accessibilityLabel(Text(L10n.Performance.monthPickerLabel.string(for: language)))
    }

    // MARK: - Stat cards

    private func statCards(performance: PerformanceSummary) -> some View {
        VStack(spacing: LoomSpacing.sm) {
            statCard(
                title: L10n.Performance.conversationsDelivered,
                value: LoomNumber.count(performance.conversationsDelivered, language: language),
                tint: LoomColor.cyan
            )
            HStack(spacing: LoomSpacing.sm) {
                statCard(
                    title: L10n.Performance.costThisMonth,
                    value: LoomNumber.currency(performance.billedJod, language: language),
                    tint: LoomColor.gold
                )
                statCard(
                    title: L10n.Performance.perConversation,
                    value: LoomNumber.currency(performance.perConversationJod, language: language),
                    tint: LoomColor.magenta
                )
            }
        }
    }

    private func statCard(title: L10nString, value: String, tint: Color) -> some View {
        LoomCard(glow: tint) {
            VStack(alignment: .leading, spacing: LoomSpacing.xxs) {
                Rectangle()
                    .fill(tint)
                    .frame(width: 22, height: 3)
                    .clipShape(Capsule())
                Loc(title)
                    .font(LoomFont.body(size: 13))
                    .foregroundStyle(LoomColor.inkDim)
                    .fixedSize(horizontal: false, vertical: true)
                Text(value)
                    .font(LoomFont.body(size: 22, weight: .bold))
                    .foregroundStyle(LoomColor.ink)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Chart

    private func chartSection(performance: PerformanceSummary) -> some View {
        VStack(alignment: .leading, spacing: LoomSpacing.sm) {
            SectionKicker(Text(L10n.Performance.dailyChartTitle.string(for: language)))
            LoomCard {
                DailyConversationsChart(days: performance.byDay, language: language)
            }
        }
    }
}
