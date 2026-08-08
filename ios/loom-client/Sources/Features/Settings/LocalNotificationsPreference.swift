// LocalNotificationsPreference.swift — a Settings-feature-only, on-device
// preference for whether the client wants local reminders. Deliberately NOT
// in Core/Net or Core/Auth: it is never synced to the engine and no other
// feature reads it — the contract's "notifications toggle (local only)"
// means exactly that, a device setting, not a server-known value. This is
// the "implement it inside your own folder" escape hatch from the task brief
// — nothing here is shared outside Features/Settings.
import Foundation

enum LocalNotificationsPreference {
    private static let key = "loom.client.settings.notificationsEnabled"

    /// The client's last explicit choice. Does NOT reflect the current OS
    /// authorization status — `SettingsRootView` reconciles the two at
    /// launch and after every permission request, since iOS Settings can
    /// revoke authorization behind the app's back at any time.
    static var isEnabled: Bool {
        UserDefaults.standard.bool(forKey: key)
    }

    static func setEnabled(_ enabled: Bool) {
        UserDefaults.standard.set(enabled, forKey: key)
    }
}
