// InvoicesRootView.swift — contract §Screens 4: months, lines, totals,
// status; the 100-conversation floor line must read as an understandable
// charge, not a mystery. Backed by `APIClient.shared.fetchInvoices()`, which
// already returns `Cached<[Invoice]>` — a connectivity failure with no prior
// cache is the only case that reaches the error state below; everything else
// degrades to "showing your last update" rather than a blank screen.
import SwiftUI

/// Drives the list screen's loading/empty/error/loaded states. `@Observable`
/// + `@MainActor` so `InvoicesRootView` can read it directly with `@State`,
/// matching the pattern `DecisionQueue`/`Session` use elsewhere in Core.
@MainActor
@Observable
final class InvoicesViewModel {
    enum Content: Equatable {
        case loading
        case loaded
        case empty
        case error
    }

    private(set) var content: Content = .loading
    private(set) var invoices: [Invoice] = []
    private(set) var isStale = false
    private(set) var cachedAt: Date?
    private(set) var lastError: APIError?

    func load() async {
        do {
            let cached = try await APIClient.shared.fetchInvoices()
            invoices = cached.value.sorted { $0.month > $1.month }
            isStale = cached.isStale
            cachedAt = cached.cachedAt
            lastError = nil
            content = invoices.isEmpty ? .empty : .loaded
        } catch {
            lastError = (error as? APIError) ?? .network(error.localizedDescription)
            // Only replace the screen with an error wall if there is truly
            // nothing to show. If invoices are already on screen (from an
            // earlier successful load), a background refresh failure stays
            // quiet rather than yanking the client's data away.
            if invoices.isEmpty {
                content = .error
            }
        }
    }
}

struct InvoicesRootView: View {
    @Environment(LanguageManager.self) private var languageManager
    @State private var viewModel = InvoicesViewModel()

    private var language: Language { languageManager.language }

    var body: some View {
        NavigationStack {
            content
                .loomBackdrop()
                .navigationTitle(L10n.Tabs.invoices.string(for: language))
                .navigationDestination(for: Invoice.self) { invoice in
                    InvoiceDetailView(invoice: invoice)
                }
                .task { await viewModel.load() }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.content {
        case .loading:
            LoadingState(caption: Text(L10n.Invoices.loadingCaption.string(for: language)))
        case .error:
            ErrorState(
                message: Text((viewModel.lastError?.userMessage ?? L10n.Invoices.loadFailedMessage).string(for: language)),
                retryTitle: Text(L10n.Common.retry.string(for: language)),
                onRetry: { Task { await viewModel.load() } },
                imageName: "ErrorWoven"
            )
        case .empty:
            EmptyState(
                systemImage: "doc.text",
                title: Text(L10n.Invoices.emptyTitle.string(for: language)),
                message: Text(L10n.Invoices.emptyMessage.string(for: language)),
                imageName: "EmptyWoven"
            )
        case .loaded:
            list
        }
    }

    private var list: some View {
        ScrollView {
            LazyVStack(spacing: LoomSpacing.sm) {
                if viewModel.isStale {
                    staleBanner
                }
                ForEach(viewModel.invoices) { invoice in
                    NavigationLink(value: invoice) {
                        InvoiceRow(invoice: invoice, language: language)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(LoomSpacing.md)
        }
        .refreshable { await viewModel.load() }
    }

    private var staleBanner: some View {
        HStack(spacing: LoomSpacing.xs) {
            Image(systemName: "wifi.slash")
                .foregroundStyle(LoomColor.gold)
            Text(staleCaption)
                .font(LoomFont.body(size: 13))
                .foregroundStyle(LoomColor.inkDim)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(LoomSpacing.sm)
        .background(LoomColor.bg2)
        .clipShape(RoundedRectangle(cornerRadius: LoomRadius.small, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private var staleCaption: String {
        guard let cachedAt = viewModel.cachedAt else {
            return L10n.Common.showingLastUpdate.string(for: language)
        }
        let formatted = LoomNumber.date(cachedAt, language: language)
        return L10n.Invoices.staleUpdatedAt(formatted).string(for: language)
    }
}

/// One row in the list: month, issued date, status, total. Kept private —
/// nothing outside this screen needs it.
private struct InvoiceRow: View {
    let invoice: Invoice
    let language: Language

    var body: some View {
        LoomCard {
            HStack(alignment: .top, spacing: LoomSpacing.md) {
                VStack(alignment: .leading, spacing: LoomSpacing.xxs) {
                    Text(monthTitle)
                        .font(LoomFont.display(monthTitle, size: 19, weight: .semibold))
                        .foregroundStyle(LoomColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(issuedLine)
                        .font(LoomFont.body(size: 12))
                        .foregroundStyle(LoomColor.inkDim)
                    StatusChip(Text(invoice.status.localizedText(language: language)), tint: invoice.status.tint)
                }
                Spacer(minLength: LoomSpacing.sm)
                VStack(alignment: .trailing, spacing: LoomSpacing.xxs) {
                    Text(totalText)
                        .font(LoomFont.display(totalText, size: 19, weight: .semibold))
                        .foregroundStyle(LoomColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    // "chevron.forward" (not "chevron.right"): this is one of
                    // Apple's semantic-direction SF Symbols and mirrors on its
                    // own under a right-to-left layout direction — no manual
                    // isRTL branch needed here.
                    Image(systemName: "chevron.forward")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(LoomColor.inkFaint)
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var monthTitle: String {
        InvoicesMonthFormatting.display(invoice.month, language: language)
    }

    private var issuedLine: String {
        L10n.Invoices.issuedLabel.string(for: language) + " " + LoomNumber.date(invoice.issuedAt, language: language)
    }

    private var totalText: String {
        LoomNumber.currency(invoice.totalJod, language: language)
    }
}
