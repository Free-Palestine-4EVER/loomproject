// PostDetailView.swift — the big view behind a grid tap: full image (or a
// swipeable carousel), both captions, hashtags, and the approve / ask-for-a-
// change flow. Reads the post fresh out of `viewModel` by id on every render
// rather than holding a snapshot, so a decision made here (or synced from the
// queue while this screen is open) is reflected immediately.
import SwiftUI

struct PostDetailView: View {
    let postId: String
    let viewModel: MonthViewModel

    @Environment(LanguageManager.self) private var languageManager
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isComposingNote = false
    @State private var noteText = ""
    @State private var showsNoteRequired = false

    var body: some View {
        Group {
            if let post = viewModel.post(withId: postId) {
                content(for: post)
            } else {
                // The post disappeared from the loaded set (e.g. a switched
                // month) — a quiet empty state rather than a crash or a blank
                // screen.
                EmptyState(
                    systemImage: "square.grid.2x2",
                    title: Text(L10n.Month.noPostsTitle.string(for: languageManager.language))
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(LoomColor.bg)
            }
        }
        .loomBackdrop()
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private func content(for post: Post) -> some View {
        let reviewState = viewModel.reviewState(for: post)

        ScrollView {
            VStack(alignment: .leading, spacing: LoomSpacing.lg) {
                media(for: post)
                    .overlay(
                        RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous)
                            .strokeBorder(LoomColor.line, lineWidth: 1)
                    )

                statusRow(post: post, reviewState: reviewState)

                captions(post: post)

                if !post.hashtags.isEmpty {
                    hashtagsSection(post.hashtags)
                }

                actionSection(post: post, reviewState: reviewState)
            }
            .padding(LoomSpacing.md)
        }
        .scrollBounceBehavior(.basedOnSize)
    }

    // MARK: - Media

    @ViewBuilder
    private func media(for post: Post) -> some View {
        if let slides = post.carousel?.slides, !slides.isEmpty {
            PostCarouselView(slides: slides)
        } else if let urlString = post.image, let url = URL(string: urlString) {
            SinglePostImage(url: url)
        } else {
            RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous)
                .fill(LoomColor.bg3)
                .aspectRatio(1, contentMode: .fit)
                .overlay(
                    Image(systemName: "photo")
                        .font(.system(size: 36, weight: .light))
                        .foregroundStyle(LoomColor.inkFaint)
                )
        }
    }

    // MARK: - Status

    @ViewBuilder
    private func statusRow(post: Post, reviewState: PostReviewState) -> some View {
        let chip = MonthStatusPresentation.chip(for: post, state: reviewState)
        VStack(alignment: .leading, spacing: LoomSpacing.xs) {
            HStack(spacing: LoomSpacing.xs) {
                StatusChip(Text(chip.text.string(for: languageManager.language)), tint: chip.tint)
                if reviewState.isQueued {
                    StatusChip(
                        Text(L10n.Common.notYetSent.string(for: languageManager.language)),
                        tint: LoomColor.gold
                    )
                }
                Spacer()
            }
            .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: reviewState)

            if case .decided(_, let note, let at) = reviewState {
                Text("\(L10n.Month.decidedOn.string(for: languageManager.language)): \(LoomNumber.date(at, language: languageManager.language))")
                    .font(LoomFont.body(size: 12))
                    .foregroundStyle(LoomColor.inkFaint)
                if let note, !note.isEmpty {
                    noteBlock(label: L10n.Month.yourNote, text: note)
                }
            } else if case .queued(_, let note) = reviewState, let note, !note.isEmpty {
                noteBlock(label: L10n.Month.yourNote, text: note)
            }
        }
    }

    private func noteBlock(label: L10nString, text: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.string(for: languageManager.language))
                .font(LoomFont.body(size: 12, weight: .semibold))
                .foregroundStyle(LoomColor.inkDim)
            Text(text)
                .font(LoomFont.body(size: 14))
                .foregroundStyle(LoomColor.ink)
        }
    }

    // MARK: - Captions

    private func captions(post: Post) -> some View {
        VStack(alignment: .leading, spacing: LoomSpacing.md) {
            captionBlock(label: L10n.Month.captionEnglish, text: post.captionEn, isArabic: false)
            captionBlock(label: L10n.Month.captionArabic, text: post.captionAr, isArabic: true)
        }
    }

    private func captionBlock(label: L10nString, text: String, isArabic: Bool) -> some View {
        LoomCard {
            VStack(alignment: .leading, spacing: LoomSpacing.xs) {
                Text(label.string(for: languageManager.language))
                    .font(LoomFont.body(size: 12, weight: .semibold))
                    .foregroundStyle(LoomColor.inkDim)
                // Deliberately NOT setting `.environment(\.layoutDirection)`
                // here — RootView.swift is explicit that layout direction is
                // set in exactly one place. `.trailing`/`.leading` below are
                // resolved against the app's root direction, so in the
                // language that matches this caption's own script the
                // alignment lands correctly; in the other language it stays
                // fully readable (SwiftUI shapes Arabic glyphs correctly
                // regardless of alignment) just with the block anchored to
                // the "wrong" edge — a cosmetic trade-off, not a
                // comprehension one.
                Text(text)
                    .font(LoomFont.body(size: 15))
                    .foregroundStyle(LoomColor.ink)
                    .multilineTextAlignment(isArabic ? .trailing : .leading)
                    .frame(maxWidth: .infinity, alignment: isArabic ? .trailing : .leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func hashtagsSection(_ hashtags: [String]) -> some View {
        VStack(alignment: .leading, spacing: LoomSpacing.xs) {
            Text(L10n.Month.hashtags.string(for: languageManager.language))
                .font(LoomFont.body(size: 12, weight: .semibold))
                .foregroundStyle(LoomColor.inkDim)
            FlowLayoutText(hashtags: hashtags)
        }
    }

    // MARK: - Actions

    @ViewBuilder
    private func actionSection(post: Post, reviewState: PostReviewState) -> some View {
        if !MonthStatusPresentation.canDecide(post) {
            Text(L10n.Month.alreadyPostedNote.string(for: languageManager.language))
                .font(LoomFont.body(size: 13))
                .foregroundStyle(LoomColor.inkFaint)
                .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            VStack(spacing: LoomSpacing.sm) {
                if let failure = viewModel.decideError, failure.postId == post.id {
                    Text(failure.error.userMessage.string(for: languageManager.language))
                        .font(LoomFont.body(size: 13))
                        .foregroundStyle(LoomStatusTint.negative)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if isComposingNote {
                    noteComposer(post: post)
                } else if reviewState.verdict == .yes {
                    approvedConfirmation(post: post, reviewState: reviewState)
                        .transition(reduceMotion ? .opacity : .scale(scale: 0.94).combined(with: .opacity))
                } else {
                    HStack(spacing: LoomSpacing.sm) {
                        LoomButton(style: .secondary, action: {
                            noteText = ""
                            showsNoteRequired = false
                            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
                                isComposingNote = true
                            }
                        }) {
                            Text(L10n.Month.askForChange.string(for: languageManager.language))
                        }
                        .disabled(viewModel.isSending(post))

                        LoomButton(style: .primary, action: {
                            Task { await viewModel.decide(post: post, verdict: .yes, note: nil) }
                        }) {
                            if viewModel.isSending(post) {
                                ProgressView().tint(LoomColor.bg)
                            } else {
                                Text(L10n.Month.approve.string(for: languageManager.language))
                            }
                        }
                        .disabled(viewModel.isSending(post))
                        .transition(reduceMotion ? .opacity : .scale(scale: 0.94).combined(with: .opacity))
                    }
                }
            }
            .animation(reduceMotion ? nil : .spring(response: 0.45, dampingFraction: 0.78), value: reviewState.verdict)
            .sensoryFeedback(.success, trigger: reviewState) { old, new in
                old.verdict != .yes && new.verdict == .yes
            }
        }
    }

    /// The one memorable moment the contract asks for on this screen: once a
    /// post reads as approved (server-confirmed or still queued offline —
    /// `reviewState` already merges both, per `MonthViewModel`), the two
    /// action buttons resolve into a single calm confirmation instead of
    /// leaving a now-redundant "Approve" sitting there to be tapped again.
    /// "Ask for a change" stays reachable, so approving is never a one-way
    /// door — the client can still open the note composer and override it.
    private func approvedConfirmation(post: Post, reviewState: PostReviewState) -> some View {
        HStack(spacing: LoomSpacing.sm) {
            ZStack {
                Circle().fill(LoomColor.threadGradient)
                Image(systemName: "checkmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(LoomColor.bg)
            }
            .frame(width: 34, height: 34)

            VStack(alignment: .leading, spacing: 2) {
                Text(L10n.Month.statusApproved.string(for: languageManager.language))
                    .font(LoomFont.body(size: 15, weight: .semibold))
                    .foregroundStyle(LoomColor.ink)
                if reviewState.isQueued {
                    Text(L10n.Common.notYetSent.string(for: languageManager.language))
                        .font(LoomFont.body(size: 12, weight: .medium))
                        .foregroundStyle(LoomColor.gold)
                }
            }

            Spacer(minLength: LoomSpacing.sm)

            Button(action: {
                noteText = ""
                showsNoteRequired = false
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
                    isComposingNote = true
                }
            }) {
                Text(L10n.Month.askForChange.string(for: languageManager.language))
                    .font(LoomFont.body(size: 13, weight: .semibold))
                    .foregroundStyle(LoomColor.inkDim)
            }
            .disabled(viewModel.isSending(post))
        }
        .padding(LoomSpacing.sm + 2)
        .background(LoomColor.bg2)
        .overlay(
            RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous)
                .strokeBorder(LoomColor.cyan.opacity(0.28), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous))
    }

    private func noteComposer(post: Post) -> some View {
        VStack(alignment: .leading, spacing: LoomSpacing.xs) {
            TextEditor(text: $noteText)
                .font(LoomFont.body(size: 15))
                .foregroundStyle(LoomColor.ink)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 90, maxHeight: 160)
                .padding(LoomSpacing.xs)
                .background(LoomColor.bg2)
                .overlay(
                    RoundedRectangle(cornerRadius: LoomRadius.small, style: .continuous)
                        .strokeBorder(showsNoteRequired ? LoomStatusTint.negative : LoomColor.line, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: LoomRadius.small, style: .continuous))
                .overlay(alignment: .topLeading) {
                    if noteText.isEmpty {
                        Text(L10n.Month.noteFieldPlaceholder.string(for: languageManager.language))
                            .font(LoomFont.body(size: 15))
                            .foregroundStyle(LoomColor.inkFaint)
                            .padding(.horizontal, LoomSpacing.xs + 4)
                            .padding(.vertical, LoomSpacing.xs + 8)
                            .allowsHitTesting(false)
                    }
                }

            if showsNoteRequired {
                Text(L10n.Month.noteRequiredMessage.string(for: languageManager.language))
                    .font(LoomFont.body(size: 12))
                    .foregroundStyle(LoomStatusTint.negative)
            }

            HStack(spacing: LoomSpacing.sm) {
                LoomButton(style: .secondary, action: {
                    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
                        isComposingNote = false
                    }
                }) {
                    Text(L10n.Month.cancel.string(for: languageManager.language))
                }
                .disabled(viewModel.isSending(post))

                LoomButton(style: .primary, action: {
                    let trimmed = noteText.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !trimmed.isEmpty else {
                        showsNoteRequired = true
                        return
                    }
                    Task {
                        await viewModel.decide(post: post, verdict: .no, note: trimmed)
                        isComposingNote = false
                    }
                }) {
                    if viewModel.isSending(post) {
                        ProgressView().tint(LoomColor.bg)
                    } else {
                        Text(L10n.Month.sendRequest.string(for: languageManager.language))
                    }
                }
                .disabled(viewModel.isSending(post))
            }
        }
    }
}

/// A single hero image with its own loading/failure phases — the detail
/// screen must never show a blank box while the network is slow or down.
private struct SinglePostImage: View {
    let url: URL

    var body: some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .empty:
                ZStack {
                    LoomColor.bg3
                    ProgressView().tint(LoomColor.inkFaint)
                }
                .aspectRatio(1, contentMode: .fit)
            case .success(let image):
                image.resizable().scaledToFit()
            case .failure:
                ZStack {
                    LoomColor.bg3
                    VStack(spacing: LoomSpacing.xs) {
                        Image(systemName: "photo")
                            .font(.system(size: 30, weight: .light))
                        Image(systemName: "exclamationmark.arrow.triangle.2.circlepath")
                            .font(.system(size: 14))
                    }
                    .foregroundStyle(LoomColor.inkFaint)
                }
                .aspectRatio(1, contentMode: .fit)
            @unknown default:
                LoomColor.bg3.aspectRatio(1, contentMode: .fit)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous))
    }
}

/// Simple wrapping hashtag list. `LazyVGrid`/`Layout` would need a custom
/// `Layout` type for true flow-wrap; at hashtag-string lengths a plain
/// wrapping `Text` (joined with spaces) reads identically and respects
/// Dynamic Type without any bespoke geometry code.
private struct FlowLayoutText: View {
    let hashtags: [String]

    var body: some View {
        Text(hashtags.map { $0.hasPrefix("#") ? $0 : "#\($0)" }.joined(separator: "  "))
            .font(LoomFont.body(size: 13))
            .foregroundStyle(LoomColor.cyan)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
