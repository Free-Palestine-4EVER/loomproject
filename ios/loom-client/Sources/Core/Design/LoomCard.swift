// LoomCard.swift — the one surface component. Wrap any block of content in
// this instead of hand-rolling background/border/radius per screen.
import SwiftUI

struct LoomCard<Content: View>: View {
    var padding: CGFloat = LoomSpacing.md
    var fill: Color = LoomColor.bg2
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .background(fill)
            .overlay(
                RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous)
                    .strokeBorder(LoomColor.line, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous))
    }
}
