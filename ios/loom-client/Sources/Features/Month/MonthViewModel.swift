// MonthViewModel.swift — owns all state for the Month screen: which months
// exist, which one is selected, that month's posts, and the decide-a-post
// flow (including how a post reads once its decision is only queued, not yet
// synced). Talks to the engine exclusively through `APIClient` — never
// URLSession, never a hardcoded URL, per CONTRACT.md's one networking seam.
import Foundation

/// How a post reads in the review UI right now, merging the server's
/// `Post.decision` with anything still sitting in the offline
/// `DecisionQueue`. A queued decision counts as "reviewed" from the client's
/// point of view — they made the call, it just hasn't reached LOOM yet — but
/// must stay visibly marked as not-yet-sent (contract: "never silently
/// lost").
enum PostReviewState: Equatable {
    case notReviewed
    case queued(verdict: Post.Verdict, note: String?)
    case decided(verdict: Post.Verdict, note: String?, at: Date)

    var isReviewed: Bool {
        if case .notReviewed = self { return false }
        return true
    }

    var verdict: Post.Verdict? {
        switch self {
        case .notReviewed: nil
        case .queued(let verdict, _), .decided(let verdict, _, _): verdict
        }
    }

    var isQueued: Bool {
        if case .queued = self { return true }
        return false
    }
}

@MainActor
@Observable
final class MonthViewModel {
    private(set) var months: [MonthSummary] = []
    var selectedMonth: String?

    private(set) var posts: [Post] = []

    private(set) var isLoadingMonths = false
    private(set) var isLoadingPosts = false

    private(set) var monthsError: APIError?
    private(set) var postsError: APIError?

    private(set) var isMonthsStale = false
    private(set) var isPostsStale = false
    private(set) var monthsCachedAt: Date?
    private(set) var postsCachedAt: Date?

    /// Post ids currently mid-flight on `decide(...)`, so the detail screen
    /// can disable its buttons and show a spinner instead of allowing a
    /// second tap to fire a duplicate request.
    private(set) var sendingPostIds: Set<String> = []
    /// Surfaced when `decide(...)` fails for a reason other than
    /// connectivity (connectivity failures are handled by queuing, silently
    /// from this property's point of view — see `reviewState(for:)`).
    var decideError: (postId: String, error: APIError)?

    private let api: APIClient

    init(api: APIClient = .shared) {
        self.api = api
    }

    /// Live view of the offline queue — reading it here (an `@Observable`
    /// property) is what makes SwiftUI re-render grid badges the instant a
    /// decision queues or flushes, with no polling.
    var decisionQueue: DecisionQueue { api.decisionQueue }

    var currentSummary: MonthSummary? {
        months.first { $0.month == selectedMonth }
    }

    var reviewedCount: Int {
        posts.reduce(into: 0) { count, post in
            if reviewState(for: post).isReviewed { count += 1 }
        }
    }

    var totalCount: Int { posts.count }

    var fractionReviewed: Double {
        guard totalCount > 0 else { return 0 }
        return Double(reviewedCount) / Double(totalCount)
    }

    /// How `post` currently reads, merging server state with the offline
    /// queue. See `PostReviewState` doc.
    func reviewState(for post: Post) -> PostReviewState {
        if let pending = decisionQueue.pending.first(where: { $0.postId == post.id }) {
            return .queued(verdict: pending.verdict, note: pending.note)
        }
        if let decision = post.decision {
            return .decided(verdict: decision.verdict, note: decision.note, at: decision.at)
        }
        return .notReviewed
    }

    func isSending(_ post: Post) -> Bool {
        sendingPostIds.contains(post.id)
    }

    // MARK: - Loading

    /// Call once at launch. Loads the month list, then that month's posts.
    func loadInitial() async {
        await loadMonths()
        await loadPosts()
    }

    /// Pull-to-refresh: re-fetches both the month list and the current
    /// month's posts.
    func refresh() async {
        await loadMonths()
        await loadPosts()
    }

    func loadMonths() async {
        isLoadingMonths = true
        defer { isLoadingMonths = false }
        do {
            let cached = try await api.fetchMonths()
            months = cached.value.sorted { $0.month > $1.month }
            isMonthsStale = cached.isStale
            monthsCachedAt = cached.cachedAt
            monthsError = nil
            if selectedMonth == nil || !months.contains(where: { $0.month == selectedMonth }) {
                selectedMonth = months.first?.month
            }
        } catch let error as APIError {
            monthsError = error
        } catch {
            monthsError = .network(error.localizedDescription)
        }
    }

    /// Switch which month is on screen and load its posts.
    func selectMonth(_ month: String) async {
        guard month != selectedMonth else { return }
        selectedMonth = month
        posts = []
        await loadPosts()
    }

    func loadPosts() async {
        guard let month = selectedMonth else {
            posts = []
            return
        }
        isLoadingPosts = true
        defer { isLoadingPosts = false }
        do {
            let cached = try await api.fetchPosts(month: month)
            posts = cached.value.sorted { $0.slot < $1.slot }
            isPostsStale = cached.isStale
            postsCachedAt = cached.cachedAt
            postsError = nil
        } catch let error as APIError {
            postsError = error
        } catch {
            postsError = .network(error.localizedDescription)
        }
    }

    // MARK: - Deciding

    /// Post the client's call on `post`. On a connectivity failure this
    /// still returns normally — `APIClient.decide` has already queued it —
    /// so the caller never needs to branch on that case; `decideError` is
    /// only set for a real (non-connectivity) failure, e.g. an expired
    /// session or a server error.
    func decide(post: Post, verdict: Post.Verdict, note: String?) async {
        sendingPostIds.insert(post.id)
        defer { sendingPostIds.remove(post.id) }
        do {
            let outcome = try await api.decide(postId: post.id, verdict: verdict, note: note)
            if case .sent(let updated) = outcome, let idx = posts.firstIndex(where: { $0.id == updated.id }) {
                posts[idx] = updated
            }
            if decideError?.postId == post.id { decideError = nil }
        } catch let error as APIError {
            decideError = (post.id, error)
        } catch {
            decideError = (post.id, .network(error.localizedDescription))
        }
    }

    func post(withId id: String) -> Post? {
        posts.first { $0.id == id }
    }
}
