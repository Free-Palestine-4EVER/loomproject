// PerformanceViewModel.swift — loads the months list + the performance
// summary for a selected month through APIClient (the one transport seam).
// Leans entirely on APIClient's own cache-fallback: `cachedGet` already
// returns a stale `Cached<T>` instead of throwing whenever a prior fetch was
// cached, so `.error` below is reachable only on a genuine first-ever load
// with no connectivity and nothing cached yet — exactly the case where an
// honest error state (not a blank screen) is the right thing to show.
import Foundation

@MainActor
@Observable
final class PerformanceViewModel {
    enum LoadState {
        case loading
        case loaded(months: [MonthSummary], selectedMonth: String, performance: PerformanceSummary, isStale: Bool)
        /// The client has no months at all yet — nothing to show, not a failure.
        case empty
        case error(APIError)
    }

    private(set) var state: LoadState = .loading
    private let api: APIClient

    init(api: APIClient = .shared) {
        self.api = api
    }

    /// Loads months + performance. `month` pins a specific month (used by the
    /// picker); omit to pick the most recent month available (months sort
    /// lexically since the engine's format is "YYYY-MM").
    func load(month: String? = nil) async {
        state = .loading
        do {
            let monthsResult = try await api.fetchMonths()
            let months = monthsResult.value
            guard let target = month ?? months.map(\.month).max() else {
                state = .empty
                return
            }
            let perfResult = try await api.fetchPerformance(month: target)
            state = .loaded(
                months: months,
                selectedMonth: target,
                performance: perfResult.value,
                isStale: monthsResult.isStale || perfResult.isStale
            )
        } catch let error as APIError {
            state = .error(error)
        } catch {
            state = .error(.network(error.localizedDescription))
        }
    }

    func select(month: String) async {
        await load(month: month)
    }
}
