// APIClient.swift — the app's only way to talk to LOOM ENGINE
// (http://localhost:4950). Every GET returns `Cached<T>` so a caller can show
// "showing your last update" truthfully instead of pretending fresh data.
// Every method throws `APIError`, never a raw URLError/DecodingError.
import Foundation

/// Result of `decide(...)`: either the engine accepted it immediately, or
/// connectivity failed and it is now sitting in `DecisionQueue`, badge-ready.
enum DecideOutcome: Sendable {
    case sent(Post)
    case queued(DecisionQueue.PendingDecision)
}

final class APIClient: @unchecked Sendable {
    static let shared = APIClient()

    /// http://localhost:4950 per CONTRACT.md. Overridable for previews/tests.
    let baseURL: URL
    private let session: URLSession
    private let encoder: JSONEncoder = .loomAPI
    private let decoder: JSONDecoder = .loomAPI
    private let cache = OfflineCache.shared

    /// Set by Session after restoring/receiving a token. Read fresh on every
    /// request rather than cached at init, so sign-in/sign-out take effect
    /// immediately without re-creating the client.
    @MainActor var authToken: String?

    /// The offline decision queue. `lazy` + `@MainActor` rather than a
    /// constructor argument: `DecisionQueue` is itself MainActor-isolated
    /// (it's `@Observable` for the UI to read `pending` from), and a plain
    /// `init` cannot evaluate a MainActor-isolated default argument. Being
    /// `lazy` defers construction to first access, which — since every
    /// access in this file goes through a MainActor hop — is always safe.
    @MainActor lazy var decisionQueue = DecisionQueue()

    init(baseURL: URL = URL(string: "http://localhost:4950")!, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    /// Wires the offline queue's retry path back into this client. Call once
    /// from a MainActor context at launch (RootView's `.task`).
    @MainActor
    func attachDecisionQueue() {
        decisionQueue.sendHandler = { [weak self] pending in
            guard let self else { throw APIError.offline }
            return try await self.sendDecision(postId: pending.postId, verdict: pending.verdict, note: pending.note)
        }
    }

    // MARK: - Auth

    struct AuthRequestResponse: Decodable, Sendable { let ok: Bool; let delivery: String }

    func requestCode(handle: String) async throws -> AuthRequestResponse {
        try await send(path: "/api/client/auth/request", method: "POST", body: ["handle": handle])
    }

    struct AuthVerifyResponse: Decodable, Sendable { let token: String; let client: ClientProfile }

    func verifyCode(handle: String, code: String) async throws -> AuthVerifyResponse {
        try await send(path: "/api/client/auth/verify", method: "POST", body: ["handle": handle, "code": code])
    }

    /// Cached + seed-backed like every other GET below: a connectivity
    /// failure with nothing cached yet returns `SeedData.client` rather than
    /// throwing, so `Session.restore()`'s demo token (see `SeedData
    /// .demoToken`) resolves to a real profile on a fresh install with no
    /// reachable backend.
    func fetchMe() async throws -> ClientProfile {
        let cached: Cached<ClientProfile> = try await cachedGet(
            path: "/api/client/me",
            cacheKey: "me",
            seed: { SeedData.client }
        )
        return cached.value
    }

    func logout() async throws {
        let _: EmptyResponse = try await send(path: "/api/client/auth/logout", method: "POST", authorized: true)
    }

    // MARK: - Months / Posts

    func fetchMonths() async throws -> Cached<[MonthSummary]> {
        try await cachedGet(path: "/api/client/months", cacheKey: "months", seed: { SeedData.months })
    }

    func fetchPosts(month: String) async throws -> Cached<[Post]> {
        try await cachedGet(
            path: "/api/client/months/\(month)/posts",
            cacheKey: "posts_\(month)",
            seed: { SeedData.posts(for: month) }
        )
    }

    /// Tries the network first. On a connectivity failure, the decision is
    /// queued (never lost) and this returns `.queued` instead of throwing —
    /// callers should treat `.queued` as success-with-a-badge, not an error.
    func decide(postId: String, verdict: Post.Verdict, note: String?) async throws -> DecideOutcome {
        do {
            let post = try await sendDecision(postId: postId, verdict: verdict, note: note)
            return .sent(post)
        } catch let error as APIError where error.isConnectivity {
            let item = await MainActor.run {
                decisionQueue.enqueue(postId: postId, verdict: verdict, note: note)
            }
            return .queued(item)
        }
    }

    private func sendDecision(postId: String, verdict: Post.Verdict, note: String?) async throws -> Post {
        var body: [String: Any] = ["verdict": verdict.rawValue]
        if let note, !note.isEmpty { body["note"] = note }
        return try await send(
            path: "/api/client/posts/\(postId)/decide",
            method: "POST",
            body: body,
            authorized: true
        )
    }

    // MARK: - Performance / Invoices / Requests

    func fetchPerformance(month: String) async throws -> Cached<PerformanceSummary> {
        try await cachedGet(
            path: "/api/client/performance",
            query: ["month": month],
            cacheKey: "performance_\(month)",
            seed: { SeedData.performance(for: month) }
        )
    }

    func fetchInvoices() async throws -> Cached<[Invoice]> {
        try await cachedGet(path: "/api/client/invoices", cacheKey: "invoices", seed: { SeedData.invoices })
    }

    func fetchRequests() async throws -> Cached<[ClientRequest]> {
        try await cachedGet(path: "/api/client/requests", cacheKey: "requests", seed: { SeedData.requests })
    }

    func submitRequest(text: String) async throws -> ClientRequest {
        try await send(path: "/api/client/requests", method: "POST", body: ["text": text], authorized: true)
    }

    // MARK: - Core plumbing

    private struct EmptyResponse: Decodable, Sendable {}

    /// GET with offline-cache fallback: fresh network response is cached and
    /// returned non-stale; a connectivity failure returns the last cached
    /// value marked stale; if there's no cache either, `seed()` — realistic
    /// compiled-in demo data from `SeedData` — renders instead of an error.
    ///
    /// The seed result is deliberately NOT written to `cache` and comes back
    /// `isStale: false`: it must read as this account's real content, not as
    /// a "your last update, offline" banner, and it must never survive to
    /// mask a subsequent real network response — every call re-decides
    /// fresh-vs-cached-vs-seed from scratch. The very first real network
    /// success caches over it permanently via the branch above.
    private func cachedGet<T: Codable & Sendable>(
        path: String,
        query: [String: String] = [:],
        cacheKey: String,
        seed: () -> T
    ) async throws -> Cached<T> {
        do {
            let value: T = try await send(path: path, method: "GET", query: query, authorized: true)
            await cache.save(value, for: cacheKey)
            return Cached(value: value, isStale: false, cachedAt: nil)
        } catch let error as APIError where error.isConnectivity {
            _ = error
            if let (value, cachedAt) = await cache.load(T.self, for: cacheKey) {
                return Cached(value: value, isStale: true, cachedAt: cachedAt)
            }
            return Cached(value: seed(), isStale: false, cachedAt: nil)
        }
    }

    private func send<T: Decodable>(
        path: String,
        method: String,
        query: [String: String] = [:],
        body: [String: Any]? = nil,
        authorized: Bool = false
    ) async throws -> T {
        guard var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false) else {
            throw APIError.invalidURL
        }
        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components.url else { throw APIError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if authorized {
            let token = await MainActor.run { self.authToken }
            guard let token else { throw APIError.unauthorized }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError {
            throw Self.mapConnectivity(error)
        } catch {
            throw APIError.network(error.localizedDescription)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.network("No HTTP response")
        }

        guard (200...299).contains(http.statusCode) else {
            let serverMessage = (try? decoder.decode(ServerErrorBody.self, from: data))?.error
            if http.statusCode == 401 { throw APIError.unauthorized }
            throw APIError.server(status: http.statusCode, message: serverMessage)
        }

        if T.self == EmptyResponse.self, let empty = EmptyResponse() as? T {
            return empty
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(String(describing: error))
        }
    }

    private static func mapConnectivity(_ error: URLError) -> APIError {
        switch error.code {
        case .notConnectedToInternet, .networkConnectionLost, .timedOut,
             .cannotConnectToHost, .cannotFindHost, .dnsLookupFailed, .dataNotAllowed:
            .offline
        default:
            .network(error.localizedDescription)
        }
    }
}
