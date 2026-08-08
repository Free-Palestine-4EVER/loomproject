// LoomBackdrop.swift — the app's atmospheric canvas: the dark base plus a
// soft magenta/violet glow bleeding in from two corners, the same language
// as the site's hero vignette and marquee glow. Every screen root paints
// this instead of a flat `LoomColor.bg.ignoresSafeArea()` so no screen reads
// flatter than its neighbours. Pure gradients, no image asset, no drop
// shadow — depth from layered light, per the contract.
import SwiftUI

struct LoomBackdrop: View {
    var body: some View {
        ZStack {
            LoomColor.bg
            RadialGradient(
                colors: [LoomColor.magenta.opacity(0.09), LoomColor.magenta.opacity(0)],
                center: .topLeading, startRadius: 0, endRadius: 480
            )
            RadialGradient(
                colors: [LoomColor.violet.opacity(0.11), LoomColor.violet.opacity(0)],
                center: .bottomTrailing, startRadius: 0, endRadius: 560
            )
        }
        .ignoresSafeArea()
    }
}

extension View {
    /// Swap a flat background for the studio's atmosphere. Semantically a
    /// drop-in replacement for `.background(LoomColor.bg.ignoresSafeArea())`.
    func loomBackdrop() -> some View {
        background(LoomBackdrop())
    }
}
