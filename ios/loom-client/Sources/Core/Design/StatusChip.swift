// StatusChip.swift — a small pill for any status word (post status, invoice
// status, request status…). Deliberately generic: it takes already-localized
// text and a tint, so it works for every feature's own status enum without
// Core/Design needing to know what those enums are.
import SwiftUI

struct StatusChip: View {
    let text: Text
    let tint: Color

    init(_ text: Text, tint: Color) {
        self.text = text
        self.tint = tint
    }

    var body: some View {
        text
            .font(LoomFont.body(size: 12, weight: .bold))
            .tracking(0.2)
            .foregroundStyle(tint)
            .padding(.horizontal, LoomSpacing.sm)
            .padding(.vertical, LoomSpacing.xxs)
            .background(
                // A soft top-to-bottom fade rather than a flat fill — same
                // "raised felt" read as LoomCard's highlight, at chip scale.
                LinearGradient(
                    colors: [tint.opacity(0.22), tint.opacity(0.12)],
                    startPoint: .top, endPoint: .bottom
                )
            )
            .clipShape(Capsule())
            .overlay(Capsule().strokeBorder(tint.opacity(0.4), lineWidth: 1))
    }
}

/// Standard tint bank so every feature's status chips read as one family
/// instead of each picking its own ad hoc colors.
enum LoomStatusTint {
    static let neutral = LoomColor.inkDim
    static let pending = LoomColor.gold
    static let positive = LoomColor.cyan
    static let negative = Color.red.opacity(0.8)
    static let accent = LoomColor.magenta
}
