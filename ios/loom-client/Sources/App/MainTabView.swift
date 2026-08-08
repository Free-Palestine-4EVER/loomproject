// MainTabView.swift — the six-tab shell. References each feature's root view
// by its final type name (MonthRootView, PerformanceRootView, …) — those
// types already exist as placeholders seeded by the scaffold owner in each
// Sources/Features/<Name>/ folder; feature agents replace their body, not
// this file, so this file never needs to change.
import SwiftUI

struct MainTabView: View {
    @Environment(LanguageManager.self) private var languageManager

    var body: some View {
        // Classic `TabView` + `.tabItem` — iOS 17's `Tab(_:systemImage:content:)`
        // builder needs iOS 18, and the deployment target here is 17.
        TabView {
            MonthRootView()
                .tabItem {
                    Label(L10n.Tabs.month.string(for: languageManager.language), systemImage: "square.grid.2x2")
                }
            PerformanceRootView()
                .tabItem {
                    Label(L10n.Tabs.performance.string(for: languageManager.language), systemImage: "chart.line.uptrend.xyaxis")
                }
            InvoicesRootView()
                .tabItem {
                    Label(L10n.Tabs.invoices.string(for: languageManager.language), systemImage: "doc.text")
                }
            RequestsRootView()
                .tabItem {
                    Label(L10n.Tabs.requests.string(for: languageManager.language), systemImage: "bubble.left.and.bubble.right")
                }
            SettingsRootView()
                .tabItem {
                    Label(L10n.Tabs.settings.string(for: languageManager.language), systemImage: "gearshape")
                }
        }
        .tint(LoomColor.magenta)
    }
}
