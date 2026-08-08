// LoomProgress.swift — the "4 of 24 reviewed" bar. Direction-agnostic: it
// fills from the semantic leading edge, so it mirrors correctly under RTL
// without any caller-side flipping.
import SwiftUI

struct LoomProgress: View {
    /// 0...1
    let fraction: Double
    /// `nil` (the default) fills with the site's own thread gradient —
    /// magenta → violet → cyan, `.progress` in styles.css. Pass an explicit
    /// tint only where a single flat color is the deliberate choice.
    var tint: Color? = nil

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(LoomColor.bg3)
                Group {
                    if let tint {
                        Capsule().fill(tint)
                    } else {
                        Capsule().fill(LoomColor.threadGradient)
                    }
                }
                .frame(width: proxy.size.width * clampedFraction)
            }
        }
        .frame(height: 6)
        .clipShape(Capsule())
        .animation(reduceMotion ? nil : .easeOut(duration: 0.35), value: fraction)
    }

    private var clampedFraction: CGFloat {
        CGFloat(min(max(fraction, 0), 1))
    }
}
