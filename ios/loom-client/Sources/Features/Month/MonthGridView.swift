// MonthGridView.swift — the client's own grid: every post in the selected
// month, in slot order, each cell carrying its review status. Tapping a cell
// pushes the post detail via a value-based NavigationLink so the pushed
// screen always reads live state from `viewModel` rather than a stale copy.
import SwiftUI

struct MonthGridView: View {
    let viewModel: MonthViewModel
    @Environment(LanguageManager.self) private var languageManager

    private let columns = [
        GridItem(.adaptive(minimum: 108, maximum: 160), spacing: LoomSpacing.xs)
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: LoomSpacing.xs) {
            ForEach(viewModel.posts) { post in
                NavigationLink(value: post.id) {
                    MonthGridCell(
                        post: post,
                        reviewState: viewModel.reviewState(for: post)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

private struct MonthGridCell: View {
    let post: Post
    let reviewState: PostReviewState
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(LanguageManager.self) private var languageManager
    @State private var isPressed = false

    var body: some View {
        let chip = MonthStatusPresentation.chip(for: post, state: reviewState)

        ZStack(alignment: .topTrailing) {
            thumbnail
                .aspectRatio(1, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: LoomRadius.small, style: .continuous))

            // A bottom scrim so the status chip and "not yet sent" pill
            // always sit on legible ground, whatever the photo underneath —
            // the same move the site's `.case-veil` makes over a case-study
            // thumbnail, instead of leaning on a material blur alone.
            LinearGradient(
                colors: [Color.black.opacity(0.55), Color.black.opacity(0)],
                startPoint: .bottom, endPoint: .center
            )
            .aspectRatio(1, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: LoomRadius.small, style: .continuous))
            .allowsHitTesting(false)

            if let badge = MonthStatusPresentation.kindBadge(for: post) {
                Image(systemName: badge.systemImage)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(LoomColor.ink)
                    .padding(6)
                    .background(.ultraThinMaterial, in: Circle())
                    .padding(6)
                    .accessibilityLabel(Text(badge.label.string(for: languageManager.language)))
            }

            VStack {
                Spacer()
                HStack(spacing: 4) {
                    // `StatusChip`'s own `Text` sets its font internally
                    // (Core/Design/StatusChip.swift), so a `.font()` here
                    // would have no effect — `.lineLimit`/`.minimumScaleFactor`
                    // (View-level modifiers, applied to the chip itself
                    // rather than baked into its `Text` argument) are what
                    // keep a long localized status word (e.g. "Change
                    // requested" / "طُلب تعديل") from overflowing this narrow
                    // grid cell.
                    StatusChip(Text(chip.text.string(for: languageManager.language)), tint: chip.tint)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Spacer(minLength: 0)
                }
                if reviewState.isQueued {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.circle")
                            .font(.system(size: 10, weight: .semibold))
                        Text(L10n.Common.notYetSent.string(for: languageManager.language))
                            .font(LoomFont.body(size: 10, weight: .semibold))
                            .lineLimit(1)
                    }
                    .foregroundStyle(LoomColor.gold)
                    .padding(.horizontal, LoomSpacing.xxs)
                    .padding(.vertical, 3)
                    .background(LoomColor.bg.opacity(0.85))
                    .clipShape(Capsule())
                }
            }
            .padding(6)
            .frame(maxWidth: .infinity, alignment: .leading)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: reviewState)
        }
        .overlay(alignment: .topLeading) {
            if reviewState.verdict == .yes {
                approvedMark.padding(6)
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: LoomRadius.small, style: .continuous)
                .strokeBorder(reviewState.verdict == .yes ? LoomColor.cyan.opacity(0.5) : LoomColor.line, lineWidth: 1)
        )
        .scaleEffect(isPressed && !reduceMotion ? 0.96 : 1)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: isPressed)
        // `NavigationLink` swallows normal press-state feedback under
        // `.buttonStyle(.plain)` — this reads the same interaction via
        // `.onLongPressGesture`'s `pressing:` callback (0 min duration, so
        // it never delays the real tap) purely to drive the thumbnail's own
        // tactile scale-down, the "considered" felt-card touch the contract
        // asks for on this screen specifically.
        .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
        .accessibilityElement(children: .combine)
    }

    private var approvedMark: some View {
        ZStack {
            Circle()
                .fill(LoomColor.threadGradient)
            Image(systemName: "checkmark")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(LoomColor.bg)
        }
        .frame(width: 22, height: 22)
        .accessibilityHidden(true)
    }

    @ViewBuilder
    private var thumbnail: some View {
        if let urlString = post.image, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    ZStack {
                        LoomColor.bg3
                        ProgressView().tint(LoomColor.inkFaint)
                    }
                case .success(let image):
                    image.resizable().scaledToFill()
                case .failure:
                    ZStack {
                        LoomColor.bg3
                        Image(systemName: "photo")
                            .foregroundStyle(LoomColor.inkFaint)
                    }
                @unknown default:
                    LoomColor.bg3
                }
            }
        } else {
            ZStack {
                LoomColor.bg3
                Image(systemName: "photo")
                    .foregroundStyle(LoomColor.inkFaint)
            }
        }
    }
}
