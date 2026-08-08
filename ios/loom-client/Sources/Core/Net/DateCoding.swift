// DateCoding.swift — the JSON coders shared by APIClient, OfflineCache and
// DecisionQueue. `SPEC.md`: "All dates are ISO-8601 strings, UTC." Node's
// `Date#toISOString()` always includes milliseconds
// ("2026-08-08T10:00:00.000Z"), which Foundation's plain `.iso8601` strategy
// cannot parse — it throws on the fractional seconds. This strategy tries
// with-fractional-seconds first and falls back to without, so a fixture or
// hand-written date without milliseconds still decodes too.
import Foundation

private let isoWithFractional: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
}()

private let isoPlain: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter
}()

enum LoomDateCoding {
    static let encode: (Date, Encoder) throws -> Void = { date, encoder in
        var container = encoder.singleValueContainer()
        try container.encode(isoWithFractional.string(from: date))
    }

    static let decode: (Decoder) throws -> Date = { decoder in
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        if let date = isoWithFractional.date(from: raw) ?? isoPlain.date(from: raw) {
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
