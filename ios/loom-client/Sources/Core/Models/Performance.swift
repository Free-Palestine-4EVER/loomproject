// Performance.swift — GET /api/client/performance?month= -> { month,
// conversationsDelivered, billedJod, perConversationJod, byDay: [{date,
// count}] }. This is the highest-risk leak surface per the contract — do NOT
// add spend/CPC/margin/creative fields here even if the engine's internal
// record has them next to these.
import Foundation

struct PerformanceSummary: Codable, Sendable, Hashable {
    struct DayCount: Codable, Sendable, Hashable, Identifiable {
        let date: String
        let count: Int
        var id: String { date }
    }

    let month: String
    let conversationsDelivered: Int
    let billedJod: Double
    let perConversationJod: Double
    let byDay: [DayCount]
}
