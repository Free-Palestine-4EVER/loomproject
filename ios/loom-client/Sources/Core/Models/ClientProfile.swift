// ClientProfile.swift — the "client-safe client" returned by
// POST /api/client/auth/verify and GET /api/client/me. CONTRACT.md does not
// enumerate its exact fields the way it does for posts/invoices/performance,
// so this decodes defensively: every field but `id` is optional, so a client
// record with a slightly different shape than expected still decodes instead
// of taking the whole app offline. It still only carries identity fields —
// nothing from the privacy list belongs here regardless of what the engine
// sends; if a forbidden field ever appeared in this payload it would simply
// be ignored, since Codable only reads keys this struct declares.
import Foundation

struct ClientProfile: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let name: String?
    let nameAr: String?
    let handle: String?
    let city: String?
    let category: String?

    /// The name to show for the active language, falling back to whichever
    /// name exists if the language-specific one is missing.
    func displayName(for language: Language) -> String {
        switch language {
        case .ar: nameAr ?? name ?? handle ?? id
        case .en: name ?? nameAr ?? handle ?? id
        }
    }
}
