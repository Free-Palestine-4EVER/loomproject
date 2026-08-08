// APIError.swift — the one error type every Core/Net call throws. Feature
// agents switch on this instead of inspecting URLError/DecodingError
// directly, and get a ready-made bilingual message via `userMessage`.
import Foundation

enum APIError: Error, Sendable {
    case invalidURL
    case offline
    case network(String)
    case decoding(String)
    /// Server responded with a non-2xx status. `message` is the server's
    /// `{ error }` body field when present.
    case server(status: Int, message: String?)
    case unauthorized

    /// A ready-to-show bilingual message. Feature agents should prefer this
    /// over building their own copy per error case.
    var userMessage: L10nString {
        switch self {
        case .offline:
            L10nString(
                en: "You're offline. We'll show your last update.",
                ar: "أنت غير متصل. سنعرض آخر تحديث لديك."
            )
        case .unauthorized:
            L10nString(
                en: "Your session expired. Please sign in again.",
                ar: "انتهت صلاحية جلستك. الرجاء تسجيل الدخول مرة أخرى."
            )
        case .server(_, let message?) where !message.isEmpty:
            L10nString(en: message, ar: message)
        default:
            L10n.Common.somethingWentWrong
        }
    }

    /// True for connectivity failures specifically (as opposed to a server
    /// error response) — this is what decides whether a decision queues
    /// offline instead of failing outright.
    var isConnectivity: Bool {
        switch self {
        case .offline, .network: true
        default: false
        }
    }
}

struct ServerErrorBody: Decodable, Sendable {
    let error: String?
}
