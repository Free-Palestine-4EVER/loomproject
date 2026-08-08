// NetworkMonitor.swift — reachability, used to auto-retry the offline
// decision queue the moment connectivity returns. System framework only
// (Network.framework), no dependency.
import Foundation
import Network

@MainActor
@Observable
final class NetworkMonitor {
    private(set) var isOnline: Bool = true

    /// Fires each time the path flips from offline -> online, so
    /// `DecisionQueue` can flush without every feature wiring its own
    /// polling. `@MainActor`-isolated (not just `@Sendable`) so it can
    /// capture other MainActor-isolated state (like `DecisionQueue`) without
    /// tripping Swift 6 Sendable checks.
    var onBecameOnline: (@MainActor @Sendable () -> Void)?

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.loom.client.netmonitor")

    func start() {
        monitor.pathUpdateHandler = { [weak self] path in
            let online = path.status == .satisfied
            Task { @MainActor in
                guard let self else { return }
                let wasOffline = !self.isOnline
                self.isOnline = online
                if wasOffline && online {
                    self.onBecameOnline?()
                }
            }
        }
        monitor.start(queue: queue)
    }

    func stop() {
        monitor.cancel()
    }
}
