// LoomBackdrop.swift — the app's atmospheric canvas: the dark base, a tiled
// woven-thread texture at whisper opacity, plus a soft magenta/violet glow
// bleeding in from two corners — the same language as the site's hero
// vignette, marquee glow and its textile motifs (`--yarn-*`, the loom-shaft
// climb). Every screen root paints this instead of a flat
// `LoomColor.bg.ignoresSafeArea()` so no screen reads flatter than its
// neighbours.
//
// `WeaveTexture` shipped in Assets.xcassets from the first night but was
// never once referenced by any Swift file — exactly the "capability built,
// never connected" failure this app has shipped twice before (see this
// package's CLAUDE.md). Wiring it here, in the one view every screen already
// calls through `.loomBackdrop()`, is what actually connects it everywhere
// at once instead of one more orphaned call site.
import SwiftUI

struct LoomBackdrop: View {
    var body: some View {
        ZStack {
            LoomColor.bg
            Image("WeaveTexture")
                .resizable(resizingMode: .tile)
                .opacity(0.05)
                .blendMode(.plusLighter)
                .accessibilityHidden(true)
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
