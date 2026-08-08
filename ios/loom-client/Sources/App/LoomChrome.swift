// LoomChrome.swift — replaces the stock UIKit chrome (grey nav bars, default
// tab bar, system blue) with the studio's dark/thread palette, once,
// globally, at launch. Deliberately stays script-agnostic: it recolors and
// reweights the SYSTEM font rather than substituting LOOM Bloom, because a
// nav title is exactly as often Arabic ("الأداء") as it is English, and
// Bloom draws no Arabic glyph at all — see Core/Design/LoomFont.swift, the
// one place that font ever gets chosen.
import SwiftUI
#if canImport(UIKit)
import UIKit

enum LoomChrome {
    @MainActor
    static func configure() {
        let bar = UINavigationBarAppearance()
        bar.configureWithOpaqueBackground()
        bar.backgroundColor = UIColor(LoomColor.bg)
        // A thread-fine line, not the default drop shadow — matches the
        // hairlines LoomCard and every divider in the app already use.
        bar.shadowColor = UIColor(LoomColor.line)
        bar.titleTextAttributes = [
            .foregroundColor: UIColor(LoomColor.ink),
            .font: UIFont.systemFont(ofSize: 17, weight: .semibold),
        ]
        bar.largeTitleTextAttributes = [
            .foregroundColor: UIColor(LoomColor.ink),
            .font: UIFont.systemFont(ofSize: 32, weight: .bold),
        ]
        let navProxy = UINavigationBar.appearance()
        navProxy.standardAppearance = bar
        navProxy.scrollEdgeAppearance = bar
        navProxy.compactAppearance = bar
        navProxy.tintColor = UIColor(LoomColor.magenta)

        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = UIColor(LoomColor.bg2)
        tab.shadowColor = UIColor(LoomColor.line)

        let item = UITabBarItemAppearance()
        item.normal.iconColor = UIColor(LoomColor.inkFaint)
        item.normal.titleTextAttributes = [
            .foregroundColor: UIColor(LoomColor.inkFaint),
            .font: UIFont.systemFont(ofSize: 11, weight: .medium),
        ]
        item.selected.iconColor = UIColor(LoomColor.magenta)
        item.selected.titleTextAttributes = [
            .foregroundColor: UIColor(LoomColor.magenta),
            .font: UIFont.systemFont(ofSize: 11, weight: .semibold),
        ]
        tab.stackedLayoutAppearance = item
        tab.inlineLayoutAppearance = item
        tab.compactInlineLayoutAppearance = item

        let tabProxy = UITabBar.appearance()
        tabProxy.standardAppearance = tab
        tabProxy.scrollEdgeAppearance = tab
    }
}
#else
enum LoomChrome {
    static func configure() {}
}
#endif
