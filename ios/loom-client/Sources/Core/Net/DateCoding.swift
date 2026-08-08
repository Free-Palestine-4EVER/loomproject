// DateCoding.swift — the JSON coders shared by APIClient, OfflineCache and
// DecisionQueue. `SPEC.md`: "All dates are ISO-8601 strings, UTC." Node's
// `Date#toISOString()` always includes milliseconds
// ("2026-08-08T10:00:00.000Z"), which Foundation's plain `.iso8601` strategy
// cannot parse — it throws on the fractional seconds. This strategy tries
// with-fractional-seconds first and falls back to without, so a fixture or
// hand-written date without milliseconds still decodes too.
//
// `ISO8601DateFormatter` is not `Sendable`, so formatters are created fresh
// inside each closure invocation rather than hoisted to shared `static let`s
// — that keeps this file free of any global mutable state under Swift 6's
// strict concurrency checking, at the cost of allocating a formatter per
// call (fine at this app's scale).
import Foundation

enum LoomDateCoding {
    static let encode: @Sendable (Date, Encoder) throws -> Void = { date, encoder in
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var container = encoder.singleValueContainer()
        try container.encode(formatter.string(from: date))
    }

    static let decode: @Sendable (Decoder) throws -> Date = { decoder in
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)

        let withFractional = ISO8601DateFormatter()
        withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFractional.date(from: raw) {
            return date
        }

        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        if let date = plain.date(from: raw) {
            return date
        }

        throw DecodingError.dataCorruptedError(
            in: container,
            debugDescription: "Expected ISO-8601 date, got \(raw)"
        )
    }
}

extension JSONEncoder {
    static var loomAPI: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom(LoomDateCoding.encode)
        return encoder
    }
}

extension JSONDecoder {
    static var loomAPI: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom(LoomDateCoding.decode)
        return decoder
    }
}
