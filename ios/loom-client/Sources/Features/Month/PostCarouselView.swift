// PostCarouselView.swift — swipeable carousel slides for a carousel post.
// Page dots plus a text "Slide 2 of 5" label, since dots alone are both hard
// to see at small sizes and invisible to VoiceOver/Dynamic Type users.
import SwiftUI

struct PostCarouselView: View {
    let slides: [String]
    @Environment(LanguageManager.self) private var languageManager
    @State private var index = 0

    var body: some View {
        VStack(spacing: LoomSpacing.xs) {
            TabView(selection: $index) {
                ForEach(Array(slides.enumerated()), id: \.offset) { offset, urlString in
                    slide(urlString)
                        .tag(offset)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .indexViewStyle(.page(backgroundDisplayMode: .always))
            .aspectRatio(1, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: LoomRadius.standard, style: .continuous))

            if slides.count > 1 {
                HStack(spacing: 4) {
                    Image(systemName: "square.on.square")
                        .font(.system(size: 10, weight: .semibold))
                    Text(L10n.Month.slideProgressText(index: index + 1, total: slides.count, language: languageManager.language))
                        .font(LoomFont.body(size: 12, weight: .medium))
                }
                .foregroundStyle(LoomColor.inkFaint)
            }
        }
    }

    @ViewBuilder
    private func slide(_ urlString: String) -> some View {
        if let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    ZStack {
                        LoomColor.bg3
                        ProgressView().tint(LoomColor.inkFaint)
                    }
                case .success(let image):
                    image.resizable().scaledToFit()
                case .failure:
                    ZStack {
                        LoomColor.bg3
                        Image(systemName: "photo")
                            .font(.system(size: 28, weight: .light))
                            .foregroundStyle(LoomColor.inkFaint)
                    }
                @unknown default:
                    LoomColor.bg3
                }
            }
        } else {
            LoomColor.bg3
        }
    }
}
