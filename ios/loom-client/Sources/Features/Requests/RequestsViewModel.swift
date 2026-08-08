// RequestsViewModel.swift — loads the thread, merges it with locally
// pending/failed sends, and drives optimistic sending. `RequestsRootView`
// is a thin renderer over this.
import Foundation

/// A single row in the rendered thread: either a server-confirmed message or
/// a local optimistic send still in flight/queued/failed. Kept as one
/// discriminated union so the list can sort and render both kinds together
/// without the view knowing the difference.
enum RequestsRow: Identifiable, Sendable {
    case confirmed(ClientRequest)
    case pending(RequestsSendQueue.PendingSend)

    var id: String {
        switch self {
        case .confirmed(let request): "confirmed-\(request.id)"
        case .pending(let send): "pending-\(send.id)"
        }
    }

    var at: Date {
        switch self {
        case .confirmed(let request): request.at
        case .pending(let send): send.queuedAt
        }
    }
}

@MainActor
@Observable
final class RequestsViewModel {
    enum LoadState: Equatable {
        case loading
        case loaded
        case error(message: L10nString)

        static func == (lhs: LoadState, rhs: LoadState) -> Bool {
            switch (lhs, rhs) {
            case (.loading, .loading), (.loaded, .loaded): true
            case (.error, .error): true
            default: false
            }
        }
    }

    private(set) var loadState: LoadState = .loading
    private(set) var confirmed: [ClientRequest] = []
    /// True when `confirmed` came from disk (offline fallback) rather than a
    /// fresh network response — drives the "showing your last update" banner.
    private(set) var isStale = false

    var composerText: String = ""

    private let api: APIClient
    private let sendQueue: RequestsSendQueue

    init(api: APIClient = .shared, sendQueue: RequestsSendQueue = RequestsSendQueue()) {
        self.api = api
        self.sendQueue = sendQueue
        sendQueue.sendHandler = { [api] pending in
            try await api.submitRequest(text: pending.text)
        }
    }

    /// Newest first, server messages and local pending sends interleaved by
    /// time — this is what makes it read as one continuous thread rather
    /// than "your drafts" bolted onto "the real messages".
    var rows: [RequestsRow] {
        let confirmedRows = confirmed.map(RequestsRow.confirmed)
        let pendingRows = sendQueue.pending.map(RequestsRow.pending)
        return (confirmedRows + pendingRows).sorted { $0.at > $1.at }
    }

    var hasContent: Bool { !rows.isEmpty }

    func load() async {
        if confirmed.isEmpty {
            loadState = .loading
        }
        do {
            let cached = try await api.fetchRequests()
            confirmed = cached.value
            isStale = cached.isStale
            loadState = .loaded
        } catch let error as APIError {
            if confirmed.isEmpty {
                loadState = .error(message: error.userMessage)
            } else {
                // We already have something on screen (from an earlier
                // successful load this session) — keep showing it rather
                // than replacing a working screen with an error wall.
                loadState = .loaded
            }
        } catch {
            loadState = .error(message: L10n.Common.somethingWentWrong)
        }
    }

    /// Clears the composer immediately and shows the message in the thread
    /// right away (optimistic), then reconciles with the server in the
    /// background. Never throws — failure surfaces as a row state instead.
    func send() async {
        let text = composerText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        composerText = ""

        let item = sendQueue.enqueue(text: text)
        do {
            let created = try await api.submitRequest(text: text)
            sendQueue.remove(item.id)
            confirmed.append(created)
        } catch let error as APIError {
            sendQueue.markFailed(item.id, offline: error.isConnectivity)
        } catch {
            sendQueue.markFailed(item.id, offline: false)
        }
    }

    /// Manual retry for a `.failed` row, tapped by the client. Works for a
    /// `.queued` row too (auto-retry via `flushPending()` is the normal path
    /// for those, but a tap should never be a no-op).
    func retry(_ pendingId: String) async {
        guard let item = sendQueue.pending.first(where: { $0.id == pendingId }) else { return }
        sendQueue.markSending(pendingId)
        do {
            let created = try await api.submitRequest(text: item.text)
            sendQueue.remove(pendingId)
            confirmed.append(created)
        } catch let error as APIError {
            sendQueue.markFailed(pendingId, offline: error.isConnectivity)
        } catch {
            sendQueue.markFailed(pendingId, offline: false)
        }
    }

    /// Called when `NetworkMonitor` reports connectivity returned. Retries
    /// every `.queued` row automatically; `.failed` rows still wait for an
    /// explicit tap.
    func flushPending() async {
        let sent = await sendQueue.flushQueued()
        guard !sent.isEmpty else { return }
        confirmed.append(contentsOf: sent)
    }
}
