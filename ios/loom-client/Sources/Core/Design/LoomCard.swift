// LoomCard.swift — the one surface component. Wrap any block of content in
// this instead of hand-rolling background/border/radius per screen.
//
// Depth comes from two layers, never a drop shadow (contract: "depth from
// layered surfaces and thread-fine 1px lines, not drop shadows"): a hairline
// top highlight that reads as a catch of light on a raised felt surface, and
// an optional soft corner `glow` — a bleed of brand color pinned to one
// corner, the same trick the site's `.app-card::after` uses instead of a
// colored box.
import SwiftUI

struct LoomCard<Content: View>: View {
    var padding: CGFloat = LoomSpacing.md
    var fill: Color = LoomColor.bg2
    /// A faint corner bleed of brand color. `nil` (the default) keeps the
    /// card perfectly plain — reserve this for the one or two cards per
    /// screen that should read as the important ones.
    var glow: Color? = nil
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .background(fill)
            .background(alignment: .topTrailing) {
                if let glow {
                    RadialGradient(
                        colors: [glow.opacity(0.16), glow.opacity(0)],
                        center: .topTrailing, startRadius: 0, endRadius: 140
                    )
                }
            }
            .overlay(alignment: .top) {
                LinearGradient(
                    colors: [LoomColor.ink.opacity(0.07), LoomColor.ink.opacity(0)],
                    startPoint: .top, endPoint: .bottom
                )
                .frame(height: 22)
                .allowsHitTesting(false)
            }
            .overlay(
                RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous)
                    .strokeBorder(LoomColor.line, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous))
    }
}
