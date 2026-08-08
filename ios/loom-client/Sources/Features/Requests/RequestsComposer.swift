// RequestsComposer.swift — the message-entry bar pinned to the bottom of
// the thread. A multiline field + one send button, nothing more, per the
// contract's "plain thread to LOOM".
import SwiftUI

struct RequestsComposer: View {
    @Binding var text: String
    let language: Language
    let onSend: () -> Void

    private var trimmedIsEmpty: Bool {
        text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: LoomSpacing.xs) {
            TextField(
                L10n.Requests.composerPlaceholder.string(for: language),
                text: $text,
                axis: .vertical
            )
            .font(LoomFont.body(size: 16))
            .foregroundStyle(LoomColor.ink)
            .tint(LoomColor.magenta)
            .lineLimit(1...6)
            .padding(.horizontal, LoomSpacing.sm)
            .padding(.vertical, LoomSpacing.sm)
            .background(LoomColor.bg2)
            .overlay(
                RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous)
                    .strokeBorder(LoomColor.line, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous))

            Button(action: onSend) {
                Image(systemName: "arrow.up")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(LoomColor.bg)
                    .frame(width: 36, height: 36)
                    .background(trimmedIsEmpty ? LoomColor.magenta.opacity(0.4) : LoomColor.magenta)
                    .clipShape(Circle())
            }
            .disabled(trimmedIsEmpty)
            .accessibilityLabel(L10n.Requests.sendAccessibilityLabel.string(for: language))
        }
        .padding(.horizontal, LoomSpacing.md)
        .padding(.vertical, LoomSpacing.sm)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Rectangle().fill(LoomColor.line).frame(height: 1)
        }
    }
}
