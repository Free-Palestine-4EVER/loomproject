// RequestsThreadRow.swift — one bubble in the thread. Outgoing (client)
// messages align trailing, incoming (LOOM) messages align leading — both
// semantic SwiftUI alignments, so RTL mirrors correctly for free from the
// root's `layoutDirection` environment (contract: "every screen" mirrors
// under RTL). `Spacer(minLength:)` caps bubble width relative to the
// available space rather than a fixed point size, so Dynamic Type just wraps
// to more lines instead of breaking the layout.
import SwiftUI

struct RequestsThreadRow: View {
    let row: RequestsRow
    let language: Language
    let onRetry: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            if isOutgoing {
                Spacer(minLength: LoomSpacing.xxl)
                bubble
            } else {
                bubble
                Spacer(minLength: LoomSpacing.xxl)
            }
        }
    }

    private var isOutgoing: Bool {
        switch row {
        case .confirmed(let request): request.from == .client
        case .pending: true
        }
    }

    @ViewBuilder
    private var bubble: some View {
        switch row {
        case .confirmed(let request):
            content(
                text: request.text,
                at: request.at,
                statusChip: statusChip(for: request.status),
                footnote: nil,
                footnoteTint: nil,
                showRetry: false
            )
        case .pending(let send):
            content(
                text: send.text,
                at: send.queuedAt,
                statusChip: nil,
                footnote: footnote(for: send.state),
                footnoteTint: footnoteTint(for: send.state),
                showRetry: send.state != .sending
            )
        }
    }

    @ViewBuilder
    private func content(
        text: String,
        at date: Date,
        statusChip: (L10nString, Color)?,
        footnote: L10nString?,
        footnoteTint: Color?,
        showRetry: Bool
    ) -> some View {
        VStack(alignment: isOutgoing ? .trailing : .leading, spacing: LoomSpacing.xxs) {
            if !isOutgoing {
                Loc(L10n.Requests.loomSenderLabel)
                    .font(LoomFont.body(size: 12, weight: .semibold))
                    .foregroundStyle(LoomColor.inkFaint)
            }

            Text(text)
                .font(LoomFont.body(size: 16))
                .foregroundStyle(isOutgoing ? LoomColor.bg : LoomColor.ink)
                .multilineTextAlignment(isOutgoing ? .trailing : .leading)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, LoomSpacing.sm + 2)
                .padding(.vertical, LoomSpacing.sm)
                .background {
                    if isOutgoing {
                        LinearGradient(colors: [LoomColor.magenta, LoomColor.magentaDeep], startPoint: .topLeading, endPoint: .bottomTrailing)
                    } else {
                        LoomColor.bg2
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous)
                        .strokeBorder(isOutgoing ? Color.clear : LoomColor.line, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous))

            HStack(spacing: LoomSpacing.xs) {
                if let statusChip {
                    StatusChip(Text(statusChip.0.string(for: language)), tint: statusChip.1)
                }
                Text(LoomNumber.date(date, language: language, style: .short))
                    .font(LoomFont.body(size: 11))
                    .foregroundStyle(LoomColor.inkFaint)
            }

            if let footnote, let footnoteTint {
                HStack(spacing: LoomSpacing.xs) {
                    Text(footnote.string(for: language))
                        .font(LoomFont.body(size: 12))
                        .foregroundStyle(footnoteTint)
                    if showRetry {
                        Button(action: onRetry) {
                            Text(L10n.Common.retry.string(for: language))
                                .font(LoomFont.body(size: 12, weight: .semibold))
                                .foregroundStyle(LoomColor.cyan)
                        }
                    }
                }
                .padding(.top, 1)
            }
        }
    }

    private func statusChip(for status: ClientRequest.Status) -> (L10nString, Color)? {
        switch status {
        case .open: (L10n.Requests.statusOpen, LoomStatusTint.pending)
        case .answered: (L10n.Requests.statusAnswered, LoomStatusTint.positive)
        case .closed: (L10n.Requests.statusClosed, LoomStatusTint.neutral)
        case .unknown: nil
        }
    }

    private func footnote(for state: RequestsSendQueue.PendingSend.State) -> L10nString? {
        switch state {
        case .sending: L10n.Requests.sending
        case .queued: L10n.Requests.queuedNote
        case .failed: L10n.Requests.failedNote
        }
    }

    private func footnoteTint(for state: RequestsSendQueue.PendingSend.State) -> Color? {
        switch state {
        case .sending: LoomColor.inkFaint
        case .queued: LoomColor.gold
        case .failed: Color.red.opacity(0.85)
        }
    }
}
