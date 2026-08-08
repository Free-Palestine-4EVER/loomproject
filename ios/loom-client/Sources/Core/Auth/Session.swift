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
    ///
    /// A fresh install has no saved token, which used to mean the real
    /// Auth screen — asking for a handle and a 6-digit code LOOM has to send
    /// by hand — as the very first thing anyone sees, with no backend
    /// deployed anywhere to answer either request. That is the "offline/
    /// error screen as the front door" failure this app shipped with once
    /// already. Instead, a fresh install auto-provisions `SeedData`'s demo
    /// identity so the client shell opens straight into a full month, same
    /// as `APIClient`'s per-endpoint seed fallback does for content. It is
    /// saved through the normal `KeychainTokenStore` path, so it behaves
    /// exactly like a real session in every other way — including that a
    /// REAL backend appearing at `APIClient`'s `baseURL` rejects this token
    /// with 401 on the next `fetchMe()`, which the branch below already
    /// treats as "sign out, show the real Auth screen". No flag to flip.
    func restore() async {
        defer { isRestoring = false }
        guard let saved = KeychainTokenStore.load() else {
            await provisionDemoSession()
            return
        }
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

    private func provisionDemoSession() async {
        let demoToken = SeedData.demoToken
        KeychainTokenStore.save(demoToken)
        token = demoToken
        api.authToken = demoToken
        // `fetchMe()` cannot actually fail here — it has its own seed
        // fallback (`SeedData.client`) for exactly this "no backend"
        // case — but `client` still needs setting defensively so a future
        // change to that fallback can never re-open the empty-Account-
        // section state `SettingsRootView` treats as real.
        client = (try? await api.fetchMe()) ?? SeedData.client
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
