// MonthStatusPresentation.swift — the one place that turns a `Post` +
// `PostReviewState` into what the grid cell and the detail screen actually
// show (label + tint). Shared so the two views can never drift apart on what
// "approved" or "pending" looks like.
import SwiftUI

enum MonthStatusPresentation {
    struct Chip {
        let text: L10nString
        let tint: Color
    }

    static func chip(for post: Post, state: PostReviewState) -> Chip {
        switch state {
        case .decided(let verdict, _, _), .queued(let verdict, _):
            switch verdict {
            case .yes: return Chip(text: L10n.Month.statusApproved, tint: LoomStatusTint.positive)
            case .no: return Chip(text: L10n.Month.statusChangeRequested, tint: LoomStatusTint.negative)
            }
        case .notReviewed:
            switch post.status {
            case .posted:
                return Chip(text: L10n.Month.statusPosted, tint: LoomStatusTint.neutral)
            case .scheduled:
                return Chip(text: L10n.Month.statusScheduled, tint: LoomStatusTint.accent)
            case .approved:
                // Defensive: server-side status says approved even though no
                // `decision` object came through on this payload. Show the
                // same chip a real decision would.
                return Chip(text: L10n.Month.statusApproved, tint: LoomStatusTint.positive)
            case .rejected:
                return Chip(text: L10n.Month.statusChangeRequested, tint: LoomStatusTint.negative)
            case .draft, .qa, .unknown:
                return Chip(text: L10n.Month.statusPendingReview, tint: LoomStatusTint.pending)
            }
        }
    }

    /// Whether the client can still act on this post. Once it has actually
    /// gone out, review is closed.
    static func canDecide(_ post: Post) -> Bool {
        post.status != .posted
    }

    static func kindBadge(for post: Post) -> (systemImage: String, label: L10nString)? {
        switch post.kind {
        case .carousel: (systemImage: "square.on.square", label: L10n.Month.kindCarousel)
        case .reel: (systemImage: "play.fill", label: L10n.Month.kindReel)
        case .single: nil
        }
    }
}
