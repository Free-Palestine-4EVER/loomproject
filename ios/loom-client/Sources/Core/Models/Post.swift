// Post.swift — mirrors the client-safe post shape EXACTLY as enumerated in
// CONTRACT.md: { id, month, slot, kind, status, captionEn, captionAr,
// hashtags, image, carousel: { slides }, scheduledAt, postedAt, decision }.
// Never add a field here that isn't in that list — the privacy rule is
// enforced on the engine, but a client-side model that mirrors more than the
// contract allows is how a leaked field goes unnoticed.
import Foundation

struct Post: Codable, Identifiable, Sendable, Hashable {
    enum Kind: String, Codable, Sendable, Hashable {
        case single
        case carousel
        case reel
    }

    enum Status: String, Codable, Sendable, Hashable {
        case draft
        case qa
        case approved
        case rejected
        case scheduled
        case posted
        /// Defensive fallback — the engine adding a status value must never
        /// crash the client's decode.
        case unknown

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = Status(rawValue: raw) ?? .unknown
        }
    }

    enum Verdict: String, Codable, Sendable, Hashable {
        case yes
        case no
    }

    struct Decision: Codable, Sendable, Hashable {
        let verdict: Verdict
        let note: String?
        let at: Date
    }

    struct Carousel: Codable, Sendable, Hashable {
        let slides: [String]
    }

    let id: String
    let month: String
    let slot: Int
    let kind: Kind
    let status: Status
    let captionEn: String
    let captionAr: String
    let hashtags: [String]
    let image: String?
    let carousel: Carousel?
    let scheduledAt: Date?
    let postedAt: Date?
    let decision: Decision?
}
