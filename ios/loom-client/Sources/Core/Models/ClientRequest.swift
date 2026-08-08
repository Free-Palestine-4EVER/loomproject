// ClientRequest.swift — GET/POST /api/client/requests -> [{ id, text, at,
// from, status }]. Named `ClientRequest` (not `Request`) to avoid colliding
// with Foundation/URLRequest-shaped confusion in feature code.
import Foundation

struct ClientRequest: Codable, Identifiable, Sendable, Hashable {
    enum From: String, Codable, Sendable, Hashable {
        case client
        case loom
        case unknown

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = From(rawValue: raw) ?? .unknown
        }
    }

    enum Status: String, Codable, Sendable, Hashable {
        case open
        case answered
        case closed
        case unknown

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = Status(rawValue: raw) ?? .unknown
        }
    }

    let id: String
    let text: String
    let at: Date
    let from: From
    let status: Status
}

/// POST /api/client/requests body.
struct NewClientRequest: Encodable, Sendable {
    let text: String
}
