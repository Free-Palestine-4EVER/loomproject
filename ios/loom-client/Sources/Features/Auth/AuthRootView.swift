// AuthRootView.swift — the real screen (contract §Screens 1): handle entry
// -> "LOOM will send your code" -> 6-digit entry -> signed in, with a kind
// wrong-code state and a kind locked-out state. No password anywhere.
//
// Keeps the type name `AuthRootView` — RootView.swift references it
// directly. On success the flow calls `Session.login(token:client:)` via
// `AuthFlowModel.submitCode`; RootView switches to MainTabView the instant
// `session.isAuthenticated` flips true, so this view never navigates itself.
import SwiftUI

struct AuthRootView: View {
    @Environment(LanguageManager.self) private var languageManager
    @Environment(Session.self) private var session
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var model = AuthFlowModel()
    @FocusState private var handleFieldFocused: Bool
    @FocusState private var codeFieldFocused: Bool

    private var language: Language { languageManager.language }

    var body: some View {
        ScrollView {
            VStack(spacing: LoomSpacing.xxl) {
                header
                content
                    .animation(reduceMotion ? nil : .easeInOut(duration: 0.32), value: model.step)
            }
            .padding(LoomSpacing.lg)
            .padding(.top, LoomSpacing.xxl)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .loomBackdrop()
        .onAppear {
            if model.step == .handle { handleFieldFocused = true }
        }
        .onChange(of: model.step) { _, newStep in
            switch newStep {
            case .handle: handleFieldFocused = true
            case .code: codeFieldFocused = true
            case .lockedOut: break
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: LoomSpacing.sm) {
            let wordmark = L10n.Auth.wordmark.string(for: language)
            ZStack {
                // A soft bloom behind the mark, echoing the site's own hero
                // glow — a warm hint of light rather than a hard badge.
                Circle()
                    .fill(LoomColor.threadGradient)
                    .frame(width: 64, height: 64)
                    .blur(radius: 26)
                    .opacity(0.5)
                // The real woven brand mark (Assets.xcassets/BrandMark) —
                // the same threaded "H" the site and app icon use — sitting
                // above the wordmark rather than a text-only lockup.
                Image("BrandMark")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 44, height: 44)
                    .accessibilityHidden(true)
            }
            Text(wordmark)
                .font(LoomFont.display(wordmark, size: 30, weight: .bold))
                .foregroundStyle(LoomColor.ink)
            Capsule()
                .fill(LoomColor.threadGradient)
                .frame(width: 40, height: 3)
        }
        .padding(.top, LoomSpacing.lg)
    }

    // MARK: - Step switch

    @ViewBuilder
    private var content: some View {
        switch model.step {
        case .handle:
            handleStep
                .transition(stepTransition)
        case .code:
            codeStep
                .transition(stepTransition)
        case .lockedOut:
            lockedOutStep
                .transition(stepTransition)
        }
    }

    private var stepTransition: AnyTransition {
        // `.leading`/`.trailing` are layout-direction aware, so this mirrors
        // correctly under RTL without any caller-side flipping.
        reduceMotion ? .opacity : .opacity.combined(with: .move(edge: .trailing))
    }

    // MARK: - Handle step

    private var handleStep: some View {
        VStack(alignment: .leading, spacing: LoomSpacing.lg) {
            VStack(alignment: .leading, spacing: LoomSpacing.xs) {
                Loc(L10n.Auth.handleTitle)
                    .font(LoomFont.body(size: 22, weight: .bold))
                    .foregroundStyle(LoomColor.ink)
                Loc(L10n.Auth.handleSubtitle)
                    .font(LoomFont.body(size: 15))
                    .foregroundStyle(LoomColor.inkDim)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(alignment: .leading, spacing: LoomSpacing.xs) {
                Loc(L10n.Auth.handleFieldLabel)
                    .font(LoomFont.body(size: 13, weight: .medium))
                    .foregroundStyle(LoomColor.inkFaint)
                LoomCard {
                    TextField(L10n.Auth.handlePlaceholder.string(for: language), text: $model.handle)
                        .font(LoomFont.body(size: 17))
                        .foregroundStyle(LoomColor.ink)
                        .tint(LoomColor.magenta)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.go)
                        .focused($handleFieldFocused)
                        .disabled(model.isSubmittingHandle)
                        .accessibilityLabel(L10n.Auth.handleFieldLabel.string(for: language))
                        .onSubmit { Task { await model.submitHandle() } }
                }
            }

            if let handleError = model.handleError {
                inlineNotice(handleError)
            }

            LoomButton(action: { Task { await model.submitHandle() } }) {
                if model.isSubmittingHandle {
                    ProgressView().tint(LoomColor.bg)
                } else {
                    Loc(L10n.Auth.sendCode)
                }
            }
            .disabled(!model.canSubmitHandle)
        }
    }

    // MARK: - Code step

    private var codeStep: some View {
        VStack(alignment: .leading, spacing: LoomSpacing.lg) {
            VStack(alignment: .leading, spacing: LoomSpacing.xs) {
                Loc(L10n.Auth.codeTitle)
                    .font(LoomFont.body(size: 22, weight: .bold))
                    .foregroundStyle(LoomColor.ink)
                Text(L10n.Auth.codeSubtitle(handle: model.sentToHandle).string(for: language))
                    .font(LoomFont.body(size: 15))
                    .foregroundStyle(LoomColor.inkDim)
                    .fixedSize(horizontal: false, vertical: true)
            }

            LoomCard(glow: LoomColor.magenta) {
                TextField(L10n.Auth.codePlaceholder.string(for: language), text: codeBinding)
                    .font(.system(size: 28, weight: .bold, design: .monospaced))
                    .tracking(10)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(LoomColor.ink)
                    .tint(LoomColor.magenta)
                    .keyboardType(.numberPad)
                    .focused($codeFieldFocused)
                    .disabled(model.isSubmittingCode)
                    .frame(maxWidth: .infinity)
                    .accessibilityLabel(L10n.Auth.codeFieldLabel.string(for: language))
                    .onChange(of: model.code) { _, newValue in
                        guard newValue.count == 6 else { return }
                        Task { await model.submitCode(session: session) }
                    }
            }

            if let codeError = model.codeError {
                inlineNotice(codeError)
            }

            LoomButton(action: { Task { await model.submitCode(session: session) } }) {
                if model.isSubmittingCode {
                    ProgressView().tint(LoomColor.bg)
                } else {
                    Loc(L10n.Auth.verify)
                }
            }
            .disabled(!model.canSubmitCode)

            HStack {
                resendControl
                Spacer()
                Button {
                    model.backToHandle()
                } label: {
                    Loc(L10n.Auth.changeHandle)
                        .font(LoomFont.body(size: 13, weight: .medium))
                        .foregroundStyle(LoomColor.inkDim)
                }
            }
        }
    }

    private var resendControl: some View {
        // `.periodic` just re-evaluates this closure once a second to keep
        // the countdown text current — it carries no animation of its own,
        // so it needs no Reduce Motion gate.
        TimelineView(.periodic(from: .now, by: 1)) { _ in
            Button {
                Task { await model.resendCode() }
            } label: {
                if model.isResending {
                    Loc(L10n.Auth.resending)
                } else if model.resendSecondsRemaining > 0 {
                    let secondsText = LoomNumber.string(model.resendSecondsRemaining, language: language)
                    Text(L10n.Auth.resendCountdown(secondsText: secondsText).string(for: language))
                } else {
                    Loc(L10n.Auth.resend)
                }
            }
            .font(LoomFont.body(size: 13, weight: .medium))
            .foregroundStyle(model.canResend ? LoomColor.cyan : LoomColor.inkFaint)
            .disabled(!model.canResend)
        }
    }

    /// Filters keyboard input to digits only, capped at 6, and normalizes
    /// Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits an Arabic
    /// keyboard's number pad may produce down to the ASCII digits
    /// `APIClient.verifyCode` sends. `model.code` itself always stays ASCII.
    ///
    /// The code's *display* is deliberately left in ASCII regardless of
    /// language rather than run through `LoomNumber` — a one-time OTP is a
    /// literal token a human at LOOM reads out, not a displayed quantity,
    /// and reformatting it risks the one field where an exact match matters
    /// most. `LoomNumber` is used correctly a few lines up, for the resend
    /// countdown, which is a genuine displayed quantity.
    private var codeBinding: Binding<String> {
        Binding(
            get: { model.code },
            set: { model.code = Self.asciiDigits(from: $0) }
        )
    }

    private static func asciiDigits(from raw: String) -> String {
        var result = ""
        for scalar in raw.unicodeScalars {
            guard let digit = asciiDigit(for: scalar) else { continue }
            result.append(digit)
            if result.count == 6 { break }
        }
        return result
    }

    private static func asciiDigit(for scalar: Unicode.Scalar) -> Character? {
        switch scalar.value {
        case 0x30...0x39:
            return Character(scalar)
        case 0x0660...0x0669:
            return Character(UnicodeScalar(0x30 + (scalar.value - 0x0660))!)
        case 0x06F0...0x06F9:
            return Character(UnicodeScalar(0x30 + (scalar.value - 0x06F0))!)
        default:
            return nil
        }
    }

    // MARK: - Locked-out step

    private var lockedOutStep: some View {
        VStack(spacing: LoomSpacing.lg) {
            EmptyState(
                systemImage: "clock.badge.exclamationmark",
                title: Text(L10n.Auth.lockedOutTitle.string(for: language)),
                message: Text(L10n.Auth.lockedOutMessage.string(for: language))
            )
            LoomButton(style: .secondary, action: { model.backToHandle() }) {
                Loc(L10n.Auth.lockedOutAction)
            }
        }
    }

    // MARK: - Shared

    private func inlineNotice(_ message: L10nString) -> some View {
        HStack(alignment: .top, spacing: LoomSpacing.xs) {
            Image(systemName: "exclamationmark.circle")
                .foregroundStyle(LoomColor.gold)
            Loc(message)
                .font(LoomFont.body(size: 13))
                .foregroundStyle(LoomColor.inkDim)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
