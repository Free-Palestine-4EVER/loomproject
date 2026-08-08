// EmptyState.swift, ErrorState.swift, LoadingState.swift — the three states
// every list/detail screen needs besides its happy path. Kept in one file
// because they share a layout skeleton; split further if a feature needs to.
import SwiftUI

struct EmptyState: View {
    let systemImage: String
    let title: Text
    let message: Text?

    init(systemImage: String, title: Text, message: Text? = nil) {
        self.systemImage = systemImage
        self.title = title
        self.message = message
    }

    var body: some View {
        VStack(spacing: LoomSpacing.sm) {
            Image(systemName: systemImage)
                .font(.system(size: 34, weight: .light))
                .foregroundStyle(LoomColor.inkFaint)
            title
                .font(LoomFont.body(size: 17, weight: .semibold))
                .foregroundStyle(LoomColor.ink)
            if let message {
                message
                    .font(LoomFont.body(size: 14))
                    .foregroundStyle(LoomColor.inkDim)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(LoomSpacing.xl)
        .frame(maxWidth: .infinity)
    }
}

struct ErrorState: View {
    let message: Text
    let retryTitle: Text
    let onRetry: (() -> Void)?

    init(message: Text, retryTitle: Text, onRetry: (() -> Void)? = nil) {
        self.message = message
        self.retryTitle = retryTitle
        self.onRetry = onRetry
    }

    var body: some View {
        VStack(spacing: LoomSpacing.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 30, weight: .light))
                .foregroundStyle(LoomColor.gold)
            message
                .font(LoomFont.body(size: 15))
                .foregroundStyle(LoomColor.inkDim)
                .multilineTextAlignment(.center)
            if let onRetry {
                LoomButton(style: .secondary, action: onRetry) { retryTitle }
                    .fixedSize(horizontal: true, vertical: false)
            }
        }
        .padding(LoomSpacing.xl)
        .frame(maxWidth: .infinity)
    }
}

struct LoadingState: View {
    let caption: Text?

    init(caption: Text? = nil) {
        self.caption = caption
    }

    var body: some View {
        VStack(spacing: LoomSpacing.sm) {
            ProgressView()
                .tint(LoomColor.magenta)
            if let caption {
                caption
                    .font(LoomFont.body(size: 13))
                    .foregroundStyle(LoomColor.inkDim)
            }
        }
        .padding(LoomSpacing.xl)
        .frame(maxWidth: .infinity)
    }
}
