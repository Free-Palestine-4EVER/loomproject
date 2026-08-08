// SeedData.swift — the app's front door when there is no reachable backend
// (true for every build tonight: nothing is deployed yet, see
// ../../../../LOOM-SESSION-HISTORY.md). Every `APIClient` GET falls back to
// this the moment a connectivity error hits with nothing already cached on
// disk, so the very first launch on a fresh install renders a full, realistic
// studio month instead of an empty/error screen. `Session` auto-provisions a
// demo identity from `SeedData.client` the same way, so there is no login
// wall in front of it either.
//
// The instant a real backend answers at `APIClient`'s `baseURL`, every one of
// these fetches succeeds over the network again and this file is never
// consulted — `cachedGet` only reaches its seed fallback on a connectivity
// failure. Nothing here needs to be turned off by hand.
import Foundation

enum SeedData {
    /// Written to Keychain by `Session` on a first launch with no saved
    /// token, so `restore()` has something to hand `APIClient.authToken`.
    /// Meaningless to a real backend — a real server rejects it with 401,
    /// which `Session.restore()` already treats as "sign out and show the
    /// real login", so a live deployment self-heals past this token with no
    /// special-casing anywhere.
    static let demoToken = "loom-demo-seed-token"

    static let currentMonth = "2026-08"
    static let previousMonth = "2026-07"

    // MARK: - Client

    static let client = ClientProfile(
        id: "seed-client-benetton-amman",
        name: "United Colors of Benetton — Amman",
        nameAr: "يونايتد كلورز أوف بينيتون — عمّان",
        handle: "@benetton.amman",
        city: "Amman",
        category: "Fashion & Retail"
    )

    // MARK: - Months

    static let months: [MonthSummary] = [
        MonthSummary(month: currentMonth, total: 18, pending: 6, approved: 9, rejected: 3),
        MonthSummary(month: previousMonth, total: 22, pending: 0, approved: 19, rejected: 3),
    ]

    // MARK: - Posts

    static func posts(for month: String) -> [Post] {
        switch month {
        case currentMonth: currentMonthPosts
        case previousMonth: previousMonthPosts
        default: []
        }
    }

    /// A stable, real, freely-licensed photo per slot — served over the
    /// open internet (not the unreachable local engine), so `AsyncImage`
    /// renders a genuine photograph in the grid instead of the placeholder
    /// icon on any device that has ordinary connectivity.
    private static func photo(_ seed: String) -> String {
        "https://picsum.photos/seed/\(seed)/900/900"
    }

    private static let captionPairs: [(en: String, ar: String, tags: [String])] = [
        ("New season, same thread — the Amman flagship restock lands Thursday.",
         "موسم جديد، نفس الخيط — إعادة تعبئة فرع عمّان الرئيسي تصل الخميس.",
         ["#Benetton", "#UnitedColors", "#Amman"]),
        ("Colour is not decoration. It's the whole sentence.",
         "اللون ليس زخرفة. إنه الجملة كاملة.",
         ["#UnitedColors", "#Style"]),
        ("Behind the rail: how the Amman team builds a window in under an hour.",
         "خلف الرف: كيف يبني فريق عمّان واجهة العرض في أقل من ساعة.",
         ["#BTS", "#Amman", "#VisualMerchandising"]),
        ("Knitwear that remembers the shape of the person who wears it.",
         "ملابس محبوكة تتذكر شكل من يرتديها.",
         ["#Knitwear", "#Craft"]),
        ("Three ways to wear the archive jacket this week.",
         "ثلاث طرق لارتداء جاكيت الأرشيف هذا الأسبوع.",
         ["#StyleGuide", "#UnitedColors"]),
        ("The wall of jumpers is back — and it's louder than last year.",
         "جدار السترات الصوفية عاد — وهو أعلى صوتًا من العام الماضي.",
         ["#Benetton", "#Colour"]),
        ("A short film on how one thread becomes a hundred colours.",
         "فيلم قصير عن كيف يتحول خيط واحد إلى مئة لون.",
         ["#Craft", "#UnitedColors"]),
        ("Amman's weekend look, styled three ways.",
         "إطلالة نهاية الأسبوع في عمّان، بثلاثة أساليب.",
         ["#Amman", "#WeekendStyle"]),
        ("Every colourway, laid out like a paint chart.",
         "كل تدرّج لوني، مرتب مثل لوحة الألوان.",
         ["#Colour", "#UnitedColors"]),
        ("The staff picks their favourite piece from the new drop.",
         "فريق المتجر يختار قطعته المفضلة من التشكيلة الجديدة.",
         ["#StaffPicks", "#Amman"]),
        ("Layering season starts now — three pieces, one look.",
         "موسم الطبقات يبدأ الآن — ثلاث قطع، إطلالة واحدة.",
         ["#Layering", "#Benetton"]),
        ("A close look at the stitch that holds the whole collection together.",
         "نظرة قريبة على الغرزة التي تجمع المجموعة كلها.",
         ["#Craft", "#Detail"]),
        ("Sunset at the flagship — same colours, different light.",
         "غروب عند الفرع الرئيسي — نفس الألوان، ضوء مختلف.",
         ["#Amman", "#Golden Hour"]),
        ("The kids' line gets its own colour story this season.",
         "تشكيلة الأطفال تحصل على قصة ألوان خاصة بها هذا الموسم.",
         ["#Kids", "#UnitedColors"]),
        ("Ask us anything — Friday's live Q&A from the Amman store.",
         "اسألونا أي شيء — بث مباشر للأسئلة والأجوبة الجمعة من متجر عمّان.",
         ["#Live", "#Amman"]),
        ("How the archive colours came back for 2026.",
         "كيف عادت ألوان الأرشيف لعام ٢٠٢٦.",
         ["#Archive", "#UnitedColors"]),
        ("One jumper, five ways to style it before the week is out.",
         "سترة واحدة، خمس طرق لتنسيقها قبل نهاية الأسبوع.",
         ["#StyleGuide"]),
        ("The window that stopped Rainbow Street for a photo.",
         "الواجهة التي أوقفت شارع الرينبو من أجل صورة.",
         ["#Amman", "#VisualMerchandising"]),
        ("A quiet Tuesday, a loud colour block.",
         "ثلاثاء هادئ، تنسيق ألوان صاخب.",
         ["#Colour", "#Style"]),
        ("Closing out the season with the colour that started it.",
         "نختم الموسم باللون الذي بدأه.",
         ["#UnitedColors", "#Season"]),
        ("New arrivals, shot on film for the first time.",
         "وصل حديثًا، مصوّر على فيلم لأول مرة.",
         ["#NewArrivals", "#Film"]),
        ("The Sarajevo studio's moodboard for next month's Amman drop.",
         "لوحة الإلهام من استوديو سراييفو لإطلاق عمّان الشهر القادم.",
         ["#BTS", "#LOOM"]),
    ]

    private static func makeMonth(
        _ month: String,
        counts: [Post.Status],
        startDay: Int = 1
    ) -> [Post] {
        counts.enumerated().map { index, status in
            let pair = captionPairs[index % captionPairs.count]
            let day = startDay + (index * 26 / max(counts.count, 1))
            let dateComponents = "\(month)-\(String(format: "%02d", min(max(day, 1), 28)))T09:00:00.000Z"
            let date = ISO8601DateFormatter.loomParse(dateComponents)
            let kind: Post.Kind = index % 5 == 0 ? .carousel : (index % 7 == 0 ? .reel : .single)
            let carousel: Post.Carousel? = kind == .carousel
                ? Post.Carousel(slides: (0..<3).map { photo("\(month)-\(index)-slide\($0)") })
                : nil
            let decision: Post.Decision? = switch status {
            case .approved: Post.Decision(verdict: .yes, note: nil, at: date ?? Date())
            case .rejected: Post.Decision(verdict: .no, note: index % 2 == 0 ? "Let's use a brighter crop." : nil, at: date ?? Date())
            default: nil
            }
            return Post(
                id: "seed-\(month)-\(index + 1)",
                month: month,
                slot: index + 1,
                kind: kind,
                status: status,
                captionEn: pair.en,
                captionAr: pair.ar,
                hashtags: pair.tags,
                image: photo("\(month)-\(index)"),
                carousel: carousel,
                scheduledAt: date,
                postedAt: status == .posted ? date : nil,
                decision: decision
            )
        }
    }

    private static let currentMonthPosts: [Post] = makeMonth(
        currentMonth,
        counts: [
            .approved, .approved, .rejected, .qa, .approved, .qa,
            .approved, .rejected, .qa, .approved, .approved, .qa,
            .rejected, .approved, .qa, .approved, .scheduled, .approved,
        ]
    )

    private static let previousMonthPosts: [Post] = makeMonth(
        previousMonth,
        counts: Array(repeating: Post.Status.approved, count: 15)
            + Array(repeating: Post.Status.rejected, count: 3)
            + Array(repeating: Post.Status.posted, count: 4),
        startDay: 1
    )

    // MARK: - Performance

    static func performance(for month: String) -> PerformanceSummary {
        let daysInMonth = 28
        let base = month == currentMonth ? 6 : 9
        var running = 0
        var byDay: [PerformanceSummary.DayCount] = []
        for day in 1...daysInMonth {
            // A gentle upward trend with weekday texture, not a flat line —
            // the point of this chart is to read as a real curve.
            let weekday = day % 7
            let weekendLift = (weekday == 5 || weekday == 6) ? 3 : 0
            let trend = Int(Double(day) * 0.35)
            let noise = (day * 37) % 5
            let count = base + trend + weekendLift + noise
            running += count
            byDay.append(PerformanceSummary.DayCount(date: "\(month)-\(String(format: "%02d", day))", count: count))
        }
        let perConversation = 2.75
        return PerformanceSummary(
            month: month,
            conversationsDelivered: running,
            billedJod: (Double(max(running, 100)) * perConversation).rounded(),
            perConversationJod: perConversation,
            byDay: byDay
        )
    }

    // MARK: - Invoices

    static let invoices: [Invoice] = [
        Invoice(
            id: "seed-invoice-\(previousMonth)",
            month: previousMonth,
            lines: [
                Invoice.Line(label: "Conversations delivered — minimum floor", qty: 100, unitJod: 2.75, totalJod: 275),
                Invoice.Line(label: "Content production — 22 posts", qty: 22, unitJod: 12, totalJod: 264),
                Invoice.Line(label: "Ad management fee", qty: 1, unitJod: 150, totalJod: 150),
            ],
            totalJod: 689,
            status: .paid,
            issuedAt: ISO8601DateFormatter.loomParse("\(previousMonth)-30T12:00:00.000Z") ?? Date()
        ),
        Invoice(
            id: "seed-invoice-\(currentMonth)",
            month: currentMonth,
            lines: [
                Invoice.Line(label: "Conversations delivered — minimum floor", qty: 100, unitJod: 2.75, totalJod: 275),
                Invoice.Line(label: "Content production — 18 posts", qty: 18, unitJod: 12, totalJod: 216),
                Invoice.Line(label: "Ad management fee", qty: 1, unitJod: 150, totalJod: 150),
            ],
            totalJod: 641,
            status: .sent,
            issuedAt: ISO8601DateFormatter.loomParse("\(currentMonth)-01T12:00:00.000Z") ?? Date()
        ),
    ]

    // MARK: - Requests thread

    static let requests: [ClientRequest] = [
        ClientRequest(
            id: "seed-req-1",
            text: "Can we get the archive-colour jacket into next week's carousel?",
            at: ISO8601DateFormatter.loomParse("\(currentMonth)-03T08:12:00.000Z") ?? Date(),
            from: .client,
            status: .answered
        ),
        ClientRequest(
            id: "seed-req-2",
            text: "Done — slot 5 this week is the archive jacket, three looks.",
            at: ISO8601DateFormatter.loomParse("\(currentMonth)-03T10:40:00.000Z") ?? Date(),
            from: .loom,
            status: .closed
        ),
        ClientRequest(
            id: "seed-req-3",
            text: "The kids' line launch — can we push a Reel for it this month?",
            at: ISO8601DateFormatter.loomParse("\(currentMonth)-06T14:05:00.000Z") ?? Date(),
            from: .client,
            status: .open
        ),
    ]
}

/// Small, file-local helper — `SeedData`'s dates are hand-written ISO-8601
/// strings, decoded with the exact same tolerant strategy `DateCoding.swift`
/// gives every real API response, so a seeded `Post`/`Invoice`/`ClientRequest`
/// is byte-for-byte the same `Date` shape a real payload would produce.
private extension ISO8601DateFormatter {
    static func loomParse(_ string: String) -> Date? {
        let withFractional = ISO8601DateFormatter()
        withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFractional.date(from: string) { return date }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return plain.date(from: string)
    }
}
