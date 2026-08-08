// LoomButton.swift — the app's one button component. Two styles cover every
// screen: `.primary` (filled, magenta) for the one action that matters, and
// `.secondary` (outlined) for everything else. Label text goes through
// Core/I18n (`Loc`) at the call site — this view takes plain SwiftUI content.
import SwiftUI

struct LoomButton<Label: View>: View {
    enum Style: Equatable {
        case primary
        case secondary
        case destructive
    }

    let style: Style
    let action: () -> Void
    @ViewBuilder let label: Label

    @Environment(\.isEnabled) private var isEnabled

    init(style: Style = .primary, action: @escaping () -> Void, @ViewBuilder label: () -> Label) {
        self.style = style
        self.action = action
        self.label = label()
    }

    var body: some View {
        Button(action: action) {
            label
                .font(LoomFont.body(size: 16, weight: .semibold))
                .tracking(0.2)
                .frame(maxWidth: .infinity)
                .padding(.vertical, LoomSpacing.sm + 2)
                .foregroundStyle(foreground)
                .background(background)
                .overlay(alignment: .top) {
                    // The site's buttons carry no top highlight, but its cards
                    // and the app's own LoomCard do — this keeps a filled
                    // LoomButton reading like it belongs to the same raised,
                    // felted surface family rather than a flat UIKit control.
                    if style != .destructive {
                        LinearGradient(
                            colors: [Color.white.opacity(0.14), Color.white.opacity(0)],
                            startPoint: .top, endPoint: .bottom
                        )
                        .frame(height: 14)
                        .allowsHitTesting(false)
                    }
                }
                .overlay(border)
                .clipShape(RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous))
        }
        .buttonStyle(LoomPressStyle())
        .opacity(isEnabled ? 1 : 0.45)
    }

    private var foreground: Color {
        switch style {
        case .primary: LoomColor.bg
        case .secondary: LoomColor.ink
        case .destructive: LoomColor.ink
        }
    }

    @ViewBuilder private var background: some View {
        switch style {
        case .primary:
            LinearGradient(colors: [LoomColor.magenta, LoomColor.magentaDeep], startPoint: .top, endPoint: .bottom)
        case .secondary:
            LoomColor.bg3
        case .destructive:
            Color.clear
        }
    }

    @ViewBuilder private var border: some View {
        switch style {
        case .primary:
            EmptyView()
        case .secondary:
            RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous)
                .strokeBorder(LoomColor.line, lineWidth: 1)
        case .destructive:
            RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous)
                .strokeBorder(Color.red.opacity(0.5), lineWidth: 1)
        }
    }
}

/// Purposeful, minimal press feedback — a slight scale + fade, nothing that
/// bounces for its own sake (contract: "motion is purposeful and few").
private struct LoomPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

extension LoomButton where Label == Text {
    init(_ titleKey: String, style: Style = .primary, action: @escaping () -> Void) {
        self.init(style: style, action: action) { Text(titleKey) }
    }
}
