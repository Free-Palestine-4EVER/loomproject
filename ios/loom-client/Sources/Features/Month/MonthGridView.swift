// MonthGridView.swift — the client's own grid: every post in the selected
// month, in slot order, each cell carrying its review status. Tapping a cell
// pushes the post detail via a value-based NavigationLink so the pushed
// screen always reads live state from `viewModel` rather than a stale copy.
//
// Reads as an editorial spread, not a table: the first post in the month
// leads full-width as a feature (real imagery at real size, its own caption
// line), the rest fall into a tighter grid below it, and every cell arrives
// with a small staggered lift rather than popping in as a block.
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

struct MonthGridView: View {
    let viewModel: MonthViewModel
    @Environment(LanguageManager.self) private var languageManager
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let columns = [
        GridItem(.adaptive(minimum: 108, maximum: 160), spacing: LoomSpacing.xs)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: LoomSpacing.sm) {
            if let hero = viewModel.posts.first {
                NavigationLink(value: hero.id) {
                    FeaturedPostCard(
                        post: hero,
                        reviewState: viewModel.reviewState(for: hero)
                    )
                }
                .buttonStyle(FeaturePressStyle())
                .staggeredAppear(index: 0, reduceMotion: reduceMotion)
            }

            let rest = Array(viewModel.posts.dropFirst().enumerated())
            if !rest.isEmpty {
                LazyVGrid(columns: columns, spacing: LoomSpacing.xs) {
                    ForEach(rest, id: \.element.id) { offset, post in
                        NavigationLink(value: post.id) {
                            MonthGridCell(
                                post: post,
                                reviewState: viewModel.reviewState(for: post)
                            )
                        }
                        .buttonStyle(.plain)
                        .staggeredAppear(index: offset + 1, reduceMotion: reduceMotion)
                    }
                }
            }
        }
    }
}

// MARK: - Featured lead card

/// The month's opening spread: the first post at full bleed width, its
/// caption set as a real headline rather than a caption. This is the first
/// thing the client's eye lands on after the review ring, so it carries the
/// most typographic weight of anything in the grid.
private struct FeaturedPostCard: View {
    let post: Post
    let reviewState: PostReviewState
    @Environment(LanguageManager.self) private var languageManager
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let chip = MonthStatusPresentation.chip(for: post, state: reviewState)
        let headline = languageManager.language.isRTL ? post.captionAr : post.captionEn

        ZStack(alignment: .bottomLeading) {
            PostThumbnail(urlString: post.image, cornerRadius: LoomRadius.standard)
                .aspectRatio(4 / 3, contentMode: .fit)

            LinearGradient(
                colors: [Color.black.opacity(0.78), Color.black.opacity(0.05)],
                startPoint: .bottom, endPoint: .top
            )
            .clipShape(RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous))
            .allowsHitTesting(false)

            VStack(alignment: .leading, spacing: LoomSpacing.xs) {
                HStack(spacing: LoomSpacing.xxs) {
                    StatusChip(Text(chip.text.string(for: languageManager.language)), tint: chip.tint)
                    if let badge = MonthStatusPresentation.kindBadge(for: post) {
                        HStack(spacing: 3) {
                            Image(systemName: badge.systemImage)
                            Text(badge.label.string(for: languageManager.language))
                        }
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(LoomColor.ink.opacity(0.85))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(.ultraThinMaterial, in: Capsule())
                    }
                    Spacer(minLength: 0)
                    if reviewState.verdict == .yes {
                        approvedMark
                    }
                }

                if !headline.isEmpty {
                    Text(headline)
                        .font(LoomFont.display(headline, size: 21, weight: .semibold))
                        .foregroundStyle(LoomColor.ink)
                        .lineLimit(2)
                        .multilineTextAlignment(languageManager.language.isRTL ? .trailing : .leading)
                        .frame(maxWidth: .infinity, alignment: languageManager.language.isRTL ? .trailing : .leading)
                }
            }
            .padding(LoomSpacing.md)
        }
        .overlay(
            RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous)
                .strokeBorder(reviewState.verdict == .yes ? LoomColor.cyan.opacity(0.45) : LoomColor.line, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous))
    }

    private var approvedMark: some View {
        ZStack {
            Circle().fill(LoomColor.threadGradient)
            Image(systemName: "checkmark")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(LoomColor.bg)
        }
        .frame(width: 26, height: 26)
        .accessibilityHidden(true)
    }
}

/// A slightly firmer press response than `.plain` for the one card in the
/// grid that deserves to feel substantial when touched.
private struct FeaturePressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Grid cell

private struct MonthGridCell: View {
    let post: Post
    let reviewState: PostReviewState
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(LanguageManager.self) private var languageManager
    @State private var isPressed = false

    var body: some View {
        let chip = MonthStatusPresentation.chip(for: post, state: reviewState)

        ZStack(alignment: .topTrailing) {
            PostThumbnail(urlString: post.image, cornerRadius: LoomRadius.small)
                .aspectRatio(1, contentMode: .fit)

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
        // asks for on this screen specifically. A soft haptic tick fires the
        // instant the finger lands, before the navigation even resolves —
        // physical feedback should never wait on a network or a push
        // transition.
        .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
            if pressing && !isPressed {
                #if canImport(UIKit)
                UIImpactFeedbackGenerator(style: .soft).impactOccurred()
                #endif
            }
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
}

// MARK: - Shared thumbnail

/// The AsyncImage loading/success/failure ladder, shared by the featured
/// card and every grid cell so the two never drift on how a slow network or
/// a missing image reads.
private struct PostThumbnail: View {
    let urlString: String?
    let cornerRadius: CGFloat

    var body: some View {
        Group {
            if let urlString, let url = URL(string: urlString) {
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
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }
}

// MARK: - Staggered entrance

/// A small lift-and-fade on first appearance, staggered by grid position, so
/// the month's spread arrives as one considered motion instead of popping in
/// as a flat block. Capped at 12 steps so a long month doesn't leave the
/// last row visibly waiting its turn.
private struct StaggeredAppear: ViewModifier {
    let index: Int
    let reduceMotion: Bool
    @State private var appeared = false

    func body(content: Content) -> some View {
        content
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 14)
            .onAppear {
                guard !appeared else { return }
                if reduceMotion {
                    appeared = true
                    return
                }
                withAnimation(.spring(response: 0.5, dampingFraction: 0.82).delay(Double(min(index, 12)) * 0.045)) {
                    appeared = true
                }
            }
    }
}

private extension View {
    func staggeredAppear(index: Int, reduceMotion: Bool) -> some View {
        modifier(StaggeredAppear(index: index, reduceMotion: reduceMotion))
    }
}
