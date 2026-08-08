// Session.swift — the observable source of truth for "are we signed in".
// RootView switches between the Auth feature and the main tab shell purely
// off `isAuthenticated`. A saved token keeps the user signed in across
// launches even offline; only an explicit 401 from the engine signs them out.
import Foundation

@MainActor
@Observable
final class Session {
    private(set) var client: ClientProfile?
    private(set) var token: String?
    /// True while `restore()` hasn't finished yet — RootView shows a brief
    /// loading state instead of flashing the Auth screen for an already
    /// signed-in user.
    private(set) var isRestoring = true

    var isAuthenticated: Bool { token != nil }

    private let api: APIClient

    init(api: APIClient = .shared) {
        self.api = api
    }

    /// Call once at launch (RootView's `.task`).
    func restore() async {
        defer { isRestoring = false }
        guard let saved = KeychainTokenStore.load() else { return }
        token = saved
        api.authToken = saved
        do {
            client = try await api.fetchMe()
        } catch let error as APIError {
            if case .unauthorized = error {
                await logout()
            }
            // Any other error (offline, server hiccup): stay signed in with
            // the token we have — Features/Month etc. fall back to their own
            // cached data.
        } catch {
            // Non-APIError should not happen, but never sign someone out for
            // an error we don't recognize.
        }
    }

    /// Called by Features/Auth after a successful `verifyCode`.
    func login(token: String, client: ClientProfile) {
        KeychainTokenStore.save(token)
        self.token = token
        self.client = client
        api.authToken = token
    }

    func logout() async {
        try? await api.logout()
        KeychainTokenStore.clear()
        api.authToken = nil
        token = nil
        client = nil
    }
}
