// DecisionQueue.swift — decisions (approve/reject a post) taken while
// offline. Contract: "a queued decision must be visibly marked as
// not-yet-sent, never silently lost." `APIClient.decide` enqueues here
// automatically on a connectivity failure; the Month feature reads `pending`
// to badge those posts and calls `flush()` (or just relies on
// `NetworkMonitor.onBecameOnline`, wired in RootView) to retry.
import Foundation

@MainActor
@Observable
final class DecisionQueue {
    struct PendingDecision: Codable, Identifiable, Sendable, Hashable {
        let id: String
        let postId: String
        let verdict: Post.Verdict
        let note: String?
        let queuedAt: Date
    }

    private(set) var pending: [PendingDecision] = []

    private let fileURL: URL
    /// Injected so this file doesn't import APIClient directly and create a
    /// circular dependency; APIClient wires this closure at launch.
    var sendHandler: (@Sendable (PendingDecision) async throws -> Post)?

    init() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        let directory = base.appendingPathComponent("LOOMClient", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        fileURL = directory.appendingPathComponent("pending-decisions.json")
        guard let data = try? Data(contentsOf: fileURL),
              let items = try? JSONDecoder.loomAPI.decode([PendingDecision].self, from: data) else {
            return
        }
        pending = items
    }

    func isPending(postId: String) -> Bool {
        pending.contains { $0.postId == postId }
    }

    @discardableResult
    func enqueue(postId: String, verdict: Post.Verdict, note: String?) -> PendingDecision {
        let item = PendingDecision(
            id: UUID().uuidString,
            postId: postId,
            verdict: verdict,
            note: note,
            queuedAt: Date()
        )
        // A later decision on the same post replaces the earlier queued one.
        pending.removeAll { $0.postId == postId }
        pending.append(item)
        persist()
        return item
    }

    /// Attempts to send every queued decision. Items that fail again (still
    /// offline) stay queued; items the server accepts are removed. Never
    /// throws — callers just re-check `pending` afterward.
    func flush() async {
        guard let sendHandler, !pending.isEmpty else { return }
        var stillPending: [PendingDecision] = []
        for item in pending {
            do {
                _ = try await sendHandler(item)
            } catch {
                stillPending.append(item)
            }
        }
        pending = stillPending
        persist()
    }

    private func persist() {
        guard let data = try? JSONEncoder.loomAPI.encode(pending) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}
