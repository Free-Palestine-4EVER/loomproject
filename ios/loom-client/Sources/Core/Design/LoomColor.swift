// LoomColor.swift — the palette, lifted verbatim from the site's src/styles.css
// tokens. Dark by design; there is no light variant. Feature agents: build UI
// from these tokens only, never a literal hex.
import SwiftUI

enum LoomColor {
    /// Base background, the darkest layer (page canvas).
    static let bg = Color(hex: 0x0D0716)
    /// Second background layer (cards on top of bg).
    static let bg2 = Color(hex: 0x120A1F)
    /// Third background layer (cards on top of bg2, e.g. nested surfaces).
    static let bg3 = Color(hex: 0x1A1029)

    /// Primary text.
    static let ink = Color(hex: 0xF2F0F7)
    /// Secondary text — captions, metadata.
    static let inkDim = Color(hex: 0xA89FC0)
    /// Tertiary text — placeholders, disabled labels.
    static let inkFaint = Color(hex: 0x857C9E)

    /// Brand accents.
    static let magenta = Color(hex: 0xF21C8C)
    static let violet = Color(hex: 0x7B2FBE)
    static let gold = Color(hex: 0xFFC740)
    static let cyan = Color(hex: 0x59E6FF)

    /// Hairline borders / dividers. rgba(242,240,247,0.10) in the site's CSS.
    static let line = Color(hex: 0xF2F0F7).opacity(0.10)

    // MARK: Semantic aliases — prefer these in feature code over raw tokens.

    static let background = bg
    static let surface = bg2
    static let surfaceRaised = bg3
    static let textPrimary = ink
    static let textSecondary = inkDim
    static let textFaint = inkFaint
    static let accent = magenta
    static let positive = cyan
    static let attention = gold
    static let border = line
}

private extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: 1)
    }
}
