// MonthSummary.swift — GET /api/client/months -> [{ month, total, pending,
// approved, rejected }].
import Foundation

struct MonthSummary: Codable, Identifiable, Sendable, Hashable {
    let month: String
    let total: Int
    let pending: Int
    let approved: Int
    let rejected: Int

    var id: String { month }

    var reviewedCount: Int { approved + rejected }
    var fractionReviewed: Double {
        guard total > 0 else { return 0 }
        return Double(reviewedCount) / Double(total)
    }
}
