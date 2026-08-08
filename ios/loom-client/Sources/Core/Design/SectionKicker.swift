// SectionKicker.swift — a small tracked-caps label with a trailing hairline,
// mirroring the site's `.kicker` (styles.css). Use above a screen section
// instead of a plain uppercase gray heading. Deliberately generic like
// StatusChip: takes already-localized `Text`, knows nothing about any
// feature's own strings.
import SwiftUI

struct SectionKicker: View {
    let text: Text

    init(_ text: Text) {
        self.text = text
    }

    var body: some View {
        HStack(spacing: LoomSpacing.xs) {
            text
                .font(LoomFont.body(size: 12, weight: .bold))
                .tracking(1.6)
                .textCase(.uppercase)
                .foregroundStyle(LoomColor.inkFaint)
                .fixedSize(horizontal: false, vertical: true)
            Rectangle()
                .fill(LoomColor.line)
                .frame(height: 1)
        }
    }
}
