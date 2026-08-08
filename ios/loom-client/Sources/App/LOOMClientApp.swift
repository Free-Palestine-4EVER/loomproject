// LOOMClientApp.swift — entry point. Owns the app-wide observable state
// (Session, LanguageManager, NetworkMonitor) and hands it down via the new
// `.environment(_:)` (Observation) API — features read it with
// `@Environment(Session.self)` etc., never by constructing their own.
import SwiftUI

@main
struct LOOMClientApp: App {
    @State private var session = Session()
    @State private var languageManager = LanguageManager()
    @State private var networkMonitor = NetworkMonitor()

    init() {
        LoomChrome.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(languageManager)
                .environment(networkMonitor)
        }
    }
}
