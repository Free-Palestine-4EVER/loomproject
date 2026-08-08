// LoomProgress.swift — the "4 of 24 reviewed" bar. Direction-agnostic: it
// fills from the semantic leading edge, so it mirrors correctly under RTL
// without any caller-side flipping.
import SwiftUI

struct LoomProgress: View {
    /// 0...1
    let fraction: Double
    var tint: Color = LoomColor.magenta

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(LoomColor.bg3)
                Capsule()
                    .fill(tint)
                    .frame(width: proxy.size.width * clampedFraction)
            }
        }
        .frame(height: 6)
        .clipShape(Capsule())
        .animation(.easeOut(duration: 0.35), value: fraction)
    }

    private var clampedFraction: CGFloat {
        CGFloat(min(max(fraction, 0), 1))
    }
}
