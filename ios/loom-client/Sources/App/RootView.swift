// RootView.swift — session-gated routing + the root layout direction. This
// is the ONE place `layoutDirection` is set (contract: "environment(\.
// layoutDirection, .rightToLeft) at the root") — nothing downstream should
// set it again.
import SwiftUI

struct RootView: View {
    @Environment(Session.self) private var session
    @Environment(LanguageManager.self) private var languageManager
    @Environment(NetworkMonitor.self) private var networkMonitor

    var body: some View {
        Group {
            if session.isRestoring {
                LoadingState(caption: Text(L10n.Common.loading.string(for: languageManager.language)))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(LoomColor.bg)
            } else if session.isAuthenticated {
                MainTabView()
            } else {
                AuthRootView()
            }
        }
        .environment(\.layoutDirection, languageManager.language.layoutDirection)
        .environment(\.locale, languageManager.language.locale)
        .preferredColorScheme(.dark)
        .tint(LoomColor.magenta)
        .task {
            #if DEBUG
            LoomFontAssertion.verifyRegistration()
            #endif
            APIClient.shared.attachDecisionQueue()
            let decisionQueue = APIClient.shared.decisionQueue
            networkMonitor.onBecameOnline = {
                Task { await decisionQueue.flush() }
            }
            networkMonitor.start()
            await session.restore()
        }
    }
}
