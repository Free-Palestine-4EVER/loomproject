// Invoice.swift — GET /api/client/invoices -> [client-safe invoice]:
// { id, month, lines: [{label, qty, unitJod, totalJod}], totalJod, status,
// issuedAt }.
import Foundation

struct Invoice: Codable, Identifiable, Sendable, Hashable {
    enum Status: String, Codable, Sendable, Hashable {
        case draft
        case sent
        case paid
        case unknown

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = Status(rawValue: raw) ?? .unknown
        }
    }

    struct Line: Codable, Sendable, Hashable {
        let label: String
        let qty: Double
        let unitJod: Double
        let totalJod: Double
    }

    let id: String
    let month: String
    let lines: [Line]
    let totalJod: Double
    let status: Status
    let issuedAt: Date
}
