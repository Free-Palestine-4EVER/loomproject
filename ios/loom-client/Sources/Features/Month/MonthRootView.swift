// MonthRootView.swift — the core screen (CONTRACT.md §Screens 2): the
// client's own grid for the month, a "N of M reviewed" progress bar, a month
// switcher when more than one month exists, and every list/detail screen's
// required loading/empty/error states. Type name kept as `MonthRootView` —
// Sources/App/MainTabView.swift references it directly and must not change.
import SwiftUI

struct MonthRootView: View {
    @Environment(LanguageManager.self) private var languageManager
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var viewModel = MonthViewModel()

    var body: some View {
        NavigationStack {
            content
                .loomBackdrop()
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    if viewModel.months.count > 1 {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            monthMenu
                        }
                    }
                }
                .navigationDestination(for: String.self) { postId in
                    PostDetailView(postId: postId, viewModel: viewModel)
                }
        }
        .task {
            if viewModel.months.isEmpty {
                await viewModel.loadInitial()
            }
        }
    }

    private var title: String {
        guard let month = viewModel.selectedMonth else {
            return L10n.Tabs.month.string(for: languageManager.language)
        }
        return MonthFormatting.title(for: month, language: languageManager.language)
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoadingMonths && viewModel.months.isEmpty {
            LoadingState(caption: Text(L10n.Month.loadingMonths.string(for: languageManager.language)))
        } else if let error = viewModel.monthsError, viewModel.months.isEmpty {
            ErrorState(
                message: Text(error.userMessage.string(for: languageManager.language)),
                retryTitle: Text(L10n.Common.retry.string(for: languageManager.language)),
                onRetry: { Task { await viewModel.loadInitial() } },
                imageName: "ErrorWoven"
            )
        } else if viewModel.months.isEmpty {
            EmptyState(
                systemImage: "square.grid.2x2",
                title: Text(L10n.Month.noMonthsTitle.string(for: languageManager.language)),
                message: Text(L10n.Month.noMonthsMessage.string(for: languageManager.language)),
                imageName: "EmptyWoven"
            )
        } else {
            monthContent
        }
    }

    private var monthContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: LoomSpacing.md) {
                if viewModel.isMonthsStale || viewModel.isPostsStale {
                    staleBanner
                }

                if viewModel.totalCount > 0 {
                    progressSection
                }

                postsContent
            }
            .padding(.horizontal, LoomSpacing.md)
            .padding(.top, LoomSpacing.xs)
            .padding(.bottom, LoomSpacing.xl)
        }
        .refreshable {
            await viewModel.refresh()
        }
    }

    private var staleBanner: some View {
        HStack(spacing: LoomSpacing.xs) {
            Image(systemName: "wifi.slash")
                .foregroundStyle(LoomColor.gold)
            Text(L10n.Common.showingLastUpdate.string(for: languageManager.language))
                .font(LoomFont.body(size: 13, weight: .medium))
                .foregroundStyle(LoomColor.inkDim)
            Spacer(minLength: 0)
        }
        .padding(LoomSpacing.sm)
        .background(LoomColor.bg2)
        .clipShape(RoundedRectangle(cornerRadius: LoomRadius.small, style: .continuous))
    }

    /// The month's own hero: a stitched review ring (thread gradient, same
    /// one `.progress` uses on the site) plus the count and progress copy.
    /// This is the first thing the client's eye lands on, so it carries a
    /// `glow` where the rest of the screen's cards stay plain.
    private var progressSection: some View {
        LoomCard(padding: LoomSpacing.md, glow: LoomColor.magenta) {
            HStack(spacing: LoomSpacing.md) {
                reviewRing
                VStack(alignment: .leading, spacing: 3) {
                    Group {
                        if viewModel.reviewedCount == viewModel.totalCount {
                            Text(L10n.Month.allReviewed.string(for: languageManager.language))
                        } else {
                            Text(L10n.Month.reviewedProgressText(
                                done: viewModel.reviewedCount,
                                total: viewModel.totalCount,
                                language: languageManager.language
                            ))
                        }
                    }
                    .font(LoomFont.body(size: 15, weight: .semibold))
                    .foregroundStyle(LoomColor.ink)
                    .fixedSize(horizontal: false, vertical: true)

                    LoomProgress(fraction: viewModel.fractionReviewed)
                        .frame(height: 5)
                }
            }
        }
    }

    private var reviewRing: some View {
        ZStack {
            Circle()
                .stroke(LoomColor.bg3, lineWidth: 5)
            Circle()
                .trim(from: 0, to: max(viewModel.fractionReviewed, 0.001))
                .stroke(LoomColor.threadGradient, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(reduceMotion ? nil : .easeOut(duration: 0.4), value: viewModel.fractionReviewed)
            Text(LoomNumber.string(viewModel.reviewedCount, language: languageManager.language))
                .font(LoomFont.body(size: 15, weight: .bold))
                .foregroundStyle(LoomColor.ink)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
        }
        .frame(width: 46, height: 46)
        .accessibilityHidden(true)
    }

    @ViewBuilder
    private var postsContent: some View {
        if viewModel.isLoadingPosts && viewModel.posts.isEmpty {
            LoadingState(caption: Text(L10n.Month.loadingPosts.string(for: languageManager.language)))
                .frame(maxWidth: .infinity)
        } else if let error = viewModel.postsError, viewModel.posts.isEmpty {
            ErrorState(
                message: Text(error.userMessage.string(for: languageManager.language)),
                retryTitle: Text(L10n.Common.retry.string(for: languageManager.language)),
                onRetry: { Task { await viewModel.loadPosts() } },
                imageName: "ErrorWoven"
            )
            .frame(maxWidth: .infinity)
        } else if viewModel.posts.isEmpty {
            EmptyState(
                systemImage: "square.grid.2x2",
                title: Text(L10n.Month.noPostsTitle.string(for: languageManager.language)),
                message: Text(L10n.Month.noPostsMessage.string(for: languageManager.language)),
                imageName: "EmptyWoven"
            )
            .frame(maxWidth: .infinity)
        } else {
            MonthGridView(viewModel: viewModel)
        }
    }

    private var monthMenu: some View {
        Menu {
            ForEach(viewModel.months) { summary in
                Button {
                    Task { await viewModel.selectMonth(summary.month) }
                } label: {
                    let label = MonthFormatting.title(for: summary.month, language: languageManager.language)
                    if summary.month == viewModel.selectedMonth {
                        Label(label, systemImage: "checkmark")
                    } else {
                        Text(label)
                    }
                }
            }
        } label: {
            Label(
                L10n.Month.changeMonth.string(for: languageManager.language),
                systemImage: "calendar"
            )
            .labelStyle(.iconOnly)
            .foregroundStyle(LoomColor.ink)
        }
        .accessibilityLabel(Text(L10n.Month.changeMonth.string(for: languageManager.language)))
    }
}
