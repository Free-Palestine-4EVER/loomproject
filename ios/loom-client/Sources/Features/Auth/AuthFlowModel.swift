// AuthFlowModel.swift — the state machine behind AuthRootView. Owns the
// handle -> code -> signed-in flow, including the two failure states the
// contract calls out by name: a wrong code, and being locked out.
//
// A note on a Core/Net gap this model works around rather than papers over:
// `APIClient.send(...)` maps EVERY HTTP 401 — including
// `/api/client/auth/verify`'s wrong-code and locked-out responses, both
// specced in CONTRACT.md as `401 { error }` — to the single generic
// `APIError.unauthorized` case, discarding the server's `error` message body
// in that branch (see Core/Net/APIClient.swift's `send`, the
// `if http.statusCode == 401 { throw APIError.unauthorized }` line). That
// collapsing is presumably meant for the "your session expired" case
// elsewhere in the app, but it means this feature cannot tell "wrong code"
// apart from "locked out" using the server's own wording, and
// Sources/Core/Net is out of this feature's ownership to fix.
//
// Rather than reach around that seam with a hand-rolled URLSession call
// (explicitly against this app's networking rule), this model approximates
// the contract's own stated server behaviour on the client side: it counts
// consecutive wrong attempts against the same 5-per-window ceiling
// CONTRACT.md gives the server, and tracks when the current code was issued
// against the same 10-minute lifetime. That lets the UI still show three
// distinct, honest, kind states instead of collapsing all of them into
// "something went wrong" — see the "could not verify" note in the final
// report: the real fix belongs in Core/Net (surface the server's `error`
// message on 401 too, or give verify's 401 a distinct case), and this is a
// deliberate, flagged workaround, not a claim that the two are equivalent.
import Foundation

enum AuthStep: Equatable {
    case handle
    case code
    case lockedOut
}

@MainActor
@Observable
final class AuthFlowModel {
    private static let maxAttempts = 5
    private static let codeLifetime: TimeInterval = 10 * 60
    private static let resendCooldown: TimeInterval = 20

    var handle: String = ""
    var code: String = ""
    private(set) var step: AuthStep = .handle

    var isSubmittingHandle = false
    var isSubmittingCode = false
    var isResending = false

    var handleError: L10nString?
    var codeError: L10nString?

    /// The handle a code was actually requested for — kept separate from
    /// `handle` so editing the text field after a code was sent doesn't
    /// retroactively change what the code screen says it was sent to.
    private(set) var sentToHandle: String = ""

    private var codeIssuedAt: Date?
    private var resendAvailableAt: Date?
    private var wrongAttempts = 0

    private let api: APIClient

    init(api: APIClient = .shared) {
        self.api = api
    }

    var canSubmitHandle: Bool {
        !normalizedHandle.isEmpty && !isSubmittingHandle
    }

    var canSubmitCode: Bool {
        code.count == 6 && !isSubmittingCode
    }

    var canResend: Bool {
        !isResending && !isSubmittingCode && resendSecondsRemaining == 0
    }

    var resendSecondsRemaining: Int {
        guard let resendAvailableAt else { return 0 }
        return max(0, Int(resendAvailableAt.timeIntervalSinceNow.rounded(.up)))
    }

    private var normalizedHandle: String {
        handle.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Handle step

    func submitHandle() async {
        guard canSubmitHandle else { return }
        isSubmittingHandle = true
        handleError = nil
        defer { isSubmittingHandle = false }
        do {
            _ = try await api.requestCode(handle: normalizedHandle)
            sentToHandle = normalizedHandle
            armCodeWindow()
            step = .code
        } catch let error as APIError {
            handleError = error.userMessage
        } catch {
            handleError = L10n.Common.somethingWentWrong
        }
    }

    // MARK: - Code step

    func resendCode() async {
        guard canResend else { return }
        isResending = true
        defer { isResending = false }
        do {
            _ = try await api.requestCode(handle: sentToHandle)
            armCodeWindow()
        } catch let error as APIError {
            codeError = error.userMessage
        } catch {
            codeError = L10n.Common.somethingWentWrong
        }
    }

    func submitCode(session: Session) async {
        guard canSubmitCode else { return }
        isSubmittingCode = true
        codeError = nil
        defer { isSubmittingCode = false }
        do {
            let response = try await api.verifyCode(handle: sentToHandle, code: code)
            session.login(token: response.token, client: response.client)
        } catch let error as APIError {
            handleVerifyFailure(error)
        } catch {
            code = ""
            codeError = L10n.Common.somethingWentWrong
        }
    }

    /// Used by both "Use a different handle" (from the code step) and
    /// "Start over" (from the locked-out step) — both mean the same thing:
    /// abandon the current code attempt and return to the top of the flow.
    func backToHandle() {
        step = .handle
        code = ""
        codeError = nil
        wrongAttempts = 0
        codeIssuedAt = nil
        resendAvailableAt = nil
    }

    private func armCodeWindow() {
        codeIssuedAt = Date()
        resendAvailableAt = Date().addingTimeInterval(Self.resendCooldown)
        wrongAttempts = 0
        code = ""
        codeError = nil
    }

    private func handleVerifyFailure(_ error: APIError) {
        code = ""
        guard case .unauthorized = error else {
            // A real server/offline error, not a rejected code — show it as
            // given rather than guessing at expiry/lockout.
            codeError = error.userMessage
            return
        }
        if let codeIssuedAt, Date().timeIntervalSince(codeIssuedAt) > Self.codeLifetime {
            codeError = L10n.Auth.codeExpired
            return
        }
        wrongAttempts += 1
        if wrongAttempts >= Self.maxAttempts {
            codeError = nil
            step = .lockedOut
        } else {
            codeError = L10n.Auth.codeWrong
        }
    }
}
