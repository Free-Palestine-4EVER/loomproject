// RequestsRootView.swift — contract §Screens 5: "a plain thread to LOOM."
// Real screen replacing the scaffold owner's placeholder. Type name kept as
// `RequestsRootView` — MainTabView.swift references it directly and was not
// touched. Backed by `RequestsViewModel`, which wraps
// `APIClient.shared.fetchRequests()` / `submitRequest(text:)`.
//
// Offline behavior: `fetchRequests()` already falls back to the on-disk
// cache (contract: "open to the last cached month" applied here to the
// thread) and `RequestsViewModel.isStale` drives the "showing your last
// update" banner. Sending while offline never loses the message — it goes
// into `RequestsSendQueue` (this feature's own local addition, since Core
// only has an offline queue for post decisions) and shows a clear
// queued/failed state until it goes through.
import SwiftUI

struct RequestsRootView: View {
    @Environment(LanguageManager.self) private var languageManager
    @Environment(NetworkMonitor.self) private var networkMonitor
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var viewModel = RequestsViewModel()

    var body: some View {
        NavigationStack {
            content
                .loomBackdrop()
                .navigationTitle(L10n.Tabs.requests.string(for: languageManager.language))
                .safeAreaInset(edge: .bottom) {
                    RequestsComposer(text: $viewModel.composerText, language: languageManager.language) {
                        Task { await viewModel.send() }
                    }
                }
        }
        .task { await viewModel.load() }
        .onChange(of: networkMonitor.isOnline) { _, isOnline in
            guard isOnline else { return }
            Task { await viewModel.flushPending() }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading where !viewModel.hasContent:
            LoadingState(caption: Text(L10n.Common.loading.string(for: languageManager.language)))

        case .error(let message) where !viewModel.hasContent:
            ErrorState(
                message: Text(message.string(for: languageManager.language)),
                retryTitle: Text(L10n.Common.retry.string(for: languageManager.language)),
                onRetry: { Task { await viewModel.load() } },
                imageName: "ErrorWoven"
            )

        default:
            if viewModel.hasContent {
                thread
            } else {
                EmptyState(
                    systemImage: "bubble.left.and.bubble.right",
                    title: Text(L10n.Requests.emptyTitle.string(for: languageManager.language)),
                    message: Text(L10n.Requests.emptyMessage.string(for: languageManager.language)),
                    imageName: "EmptyWoven"
                )
            }
        }
    }

    private var thread: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: LoomSpacing.md) {
                if viewModel.isStale {
                    Text(L10n.Common.showingLastUpdate.string(for: languageManager.language))
                        .font(LoomFont.body(size: 12, weight: .semibold))
                        .foregroundStyle(LoomColor.inkFaint)
                        .frame(maxWidth: .infinity)
                        .padding(.top, LoomSpacing.xs)
                }
                // `rows` is newest-first (useful for callers elsewhere); a
                // chat reads top-to-bottom oldest-first, so flip only here.
                ForEach(viewModel.rows.reversed()) { row in
                    RequestsThreadRow(row: row, language: languageManager.language) {
                        if case .pending(let send) = row {
                            Task { await viewModel.retry(send.id) }
                        }
                    }
                }
            }
            .padding(LoomSpacing.md)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: viewModel.rows.count)
        }
        .scrollDismissesKeyboard(.interactively)
    }
}
