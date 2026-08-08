// RequestsSendQueue.swift — feature-local addition, not part of Core.
//
// Core/Net's `DecisionQueue` already gives post decisions an offline queue,
// but there is no equivalent for `POST /api/client/requests` — CONTRACT.md's
// build line only asks for "optimistic send with a clear failed/queued
// state" here, and the task instructions for this folder say to implement
// anything Core doesn't provide as a private addition inside this feature's
// own folder rather than editing Core. This mirrors `DecisionQueue`'s shape
// (disk persistence under Application Support, an injected send handler so
// this file never imports APIClient directly) but is scoped entirely to
// Requests.
import Foundation

@MainActor
@Observable
final class RequestsSendQueue {
    struct PendingSend: Codable, Identifiable, Sendable, Hashable {
        enum State: String, Codable, Sendable {
            /// In flight right now — shown immediately (optimistic send).
            case sending
            /// The last attempt failed because the device was offline.
            /// Auto-retried the moment `NetworkMonitor` reports connectivity
            /// again — never silently lost, per the contract's offline rule
            /// for decisions, applied here to requests too.
            case queued
            /// The last attempt failed for a non-connectivity reason (e.g. a
            /// server error). Needs an explicit tap to retry rather than
            /// auto-retrying, since silently retrying a rejected request
            /// could resend something the client meant to edit.
            case failed
        }

        let id: String
        let text: String
        let queuedAt: Date
        var state: State
    }

    private(set) var pending: [PendingSend] = []

    private let fileURL: URL
    /// Injected by `RequestsViewModel` so this file doesn't import
    /// `APIClient` directly.
    var sendHandler: (@Sendable (PendingSend) async throws -> ClientRequest)?

    init() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        let directory = base.appendingPathComponent("LOOMClient", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        fileURL = directory.appendingPathComponent("pending-requests.json")

        guard let data = try? Data(contentsOf: fileURL),
              let items = try? JSONDecoder.loomAPI.decode([PendingSend].self, from: data) else {
            return
        }
        // Anything still marked `.sending` on disk means the app was killed
        // mid-flight last session — surface it as `.failed` (with a retry
        // affordance) rather than silently re-showing a spinner that will
        // never resolve.
        pending = items.map { item in
            var item = item
            if item.state == .sending { item.state = .failed }
            return item
        }
        persist()
    }

    @discardableResult
    func enqueue(text: String) -> PendingSend {
        let item = PendingSend(id: UUID().uuidString, text: text, queuedAt: Date(), state: .sending)
        pending.append(item)
        persist()
        return item
    }

    func markSending(_ id: String) {
        guard let index = pending.firstIndex(where: { $0.id == id }) else { return }
        pending[index].state = .sending
        persist()
    }

    func markFailed(_ id: String, offline: Bool) {
        guard let index = pending.firstIndex(where: { $0.id == id }) else { return }
        pending[index].state = offline ? .queued : .failed
        persist()
    }

    func remove(_ id: String) {
        pending.removeAll { $0.id == id }
        persist()
    }

    /// Retries every `.queued` item (never `.failed` ones — those wait for
    /// an explicit tap). Returns the messages that made it through so the
    /// caller can merge them into its confirmed list immediately, without
    /// waiting for the next full reload.
    @discardableResult
    func flushQueued() async -> [ClientRequest] {
        guard let sendHandler else { return [] }
        let toRetry = pending.filter { $0.state == .queued }
        guard !toRetry.isEmpty else { return [] }

        var sent: [ClientRequest] = []
        for item in toRetry {
            markSending(item.id)
            do {
                let created = try await sendHandler(item)
                sent.append(created)
                remove(item.id)
            } catch let error as APIError {
                markFailed(item.id, offline: error.isConnectivity)
            } catch {
                markFailed(item.id, offline: false)
            }
        }
        return sent
    }

    private func persist() {
        guard let data = try? JSONEncoder.loomAPI.encode(pending) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}
