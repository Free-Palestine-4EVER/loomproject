// OfflineCache.swift — the disk cache that lets the app "open to the last
// cached month" (contract) instead of a spinner or an error wall. Keyed by a
// plain string (e.g. "months", "posts_2026-08"); APIClient decides the keys,
// this just persists Codable payloads with a timestamp.
import Foundation

/// A cached value plus staleness metadata, returned by every APIClient GET so
/// callers can render a "showing your last update" state truthfully.
struct Cached<Value: Sendable>: Sendable {
    let value: Value
    /// True when `value` came from disk because the network call failed —
    /// false when it is a fresh network response.
    let isStale: Bool
    let cachedAt: Date?
}

actor OfflineCache {
    static let shared = OfflineCache()

    private let directory: URL
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    private struct Envelope<T: Codable>: Codable {
        let cachedAt: Date
        let payload: T
    }

    init() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        directory = base.appendingPathComponent("LOOMClient/cache", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        encoder = .loomAPI
        decoder = .loomAPI
    }

    private func fileURL(for key: String) -> URL {
        let safeName = key.replacingOccurrences(of: "/", with: "_")
        return directory.appendingPathComponent("\(safeName).json")
    }

    func save<T: Codable>(_ value: T, for key: String) {
        let envelope = Envelope(cachedAt: Date(), payload: value)
        guard let data = try? encoder.encode(envelope) else { return }
        try? data.write(to: fileURL(for: key), options: .atomic)
    }

    func load<T: Codable>(_ type: T.Type, for key: String) -> (value: T, cachedAt: Date)? {
        guard let data = try? Data(contentsOf: fileURL(for: key)),
              let envelope = try? decoder.decode(Envelope<T>.self, from: data) else {
            return nil
        }
        return (envelope.payload, envelope.cachedAt)
    }

    func clear(for key: String) {
        try? FileManager.default.removeItem(at: fileURL(for: key))
    }

    func clearAll() {
        try? FileManager.default.removeItem(at: directory)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }
}
