// SettingsRootView.swift — contract §Screens 6: language (takes effect
// immediately, including layout direction), a local-only notifications
// toggle, sign out with confirmation, and an honest "what LOOM can see"
// note. Keeps the type name `SettingsRootView` — MainTabView.swift
// references it directly.
//
// States: `isCheckingPermission` is a real loading state (the one-time async
// read of the OS notification authorization at launch); a nil `session.
// client` (authenticated but offline before the first successful `me`
// fetch) is a real empty state for the Account section; a denied OS
// notification permission is a real error state, surfaced with Core's
// `ErrorState` and an actionable "Open Settings" retry.
import SwiftUI
import UserNotifications
#if canImport(UIKit)
import UIKit
#endif

struct SettingsRootView: View {
    @Environment(LanguageManager.self) private var languageManager
    @Environment(Session.self) private var session
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private enum NotificationsPermissionState: Equatable {
        case authorized
        case denied
        case notDetermined
    }

    @State private var isCheckingPermission = true
    @State private var permissionState: NotificationsPermissionState = .notDetermined
    @State private var notificationsOn = false
    @State private var showSignOutConfirm = false
    @State private var isSigningOut = false

    var body: some View {
        NavigationStack {
            Group {
                if isCheckingPermission {
                    LoadingState(caption: Text(L10n.Settings.checkingNotifications.string(for: languageManager.language)))
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: LoomSpacing.lg) {
                            accountSection
                            languageSection
                            notificationsSection
                            privacySection
                            signOutSection
                        }
                        .padding(LoomSpacing.md)
                    }
                }
            }
            .loomBackdrop()
            .navigationTitle(L10n.Tabs.settings.string(for: languageManager.language))
        }
        .task { await loadNotificationPermission() }
        .confirmationDialog(
            Text(L10n.Settings.signOutConfirmTitle.string(for: languageManager.language)),
            isPresented: $showSignOutConfirm,
            titleVisibility: .visible
        ) {
            Button(role: .destructive) {
                Task { await performSignOut() }
            } label: {
                Text(L10n.Settings.signOutButton.string(for: languageManager.language))
            }
            Button(role: .cancel) {
            } label: {
                Text(L10n.Common.cancel.string(for: languageManager.language))
            }
        } message: {
            Text(L10n.Settings.signOutConfirmMessage.string(for: languageManager.language))
        }
    }

    // MARK: - Account

    @ViewBuilder
    private var accountSection: some View {
        sectionHeader(L10n.Settings.sectionAccount)
        LoomCard {
            if let client = session.client {
                Text(L10n.Settings.signedInAs(client.displayName(for: languageManager.language)).string(for: languageManager.language))
                    .font(LoomFont.body(size: 15, weight: .medium))
                    .foregroundStyle(LoomColor.ink)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                EmptyState(
                    systemImage: "person.crop.circle",
                    title: Text(L10n.Settings.accountUnavailableTitle.string(for: languageManager.language)),
                    message: Text(L10n.Settings.accountUnavailableMessage.string(for: languageManager.language))
                )
            }
        }
    }

    // MARK: - Language

    @ViewBuilder
    private var languageSection: some View {
        sectionHeader(L10n.Settings.sectionLanguage)
        LoomCard {
            Picker(selection: languageBinding) {
                ForEach(Language.allCases, id: \.self) { language in
                    Text(language.displayName).tag(language)
                }
            } label: {
                EmptyView()
            }
            .pickerStyle(.segmented)
        }
    }

    /// Routes through `LanguageManager.setLanguage(_:)` (not a direct
    /// property set) per that type's own doc comment distinguishing an
    /// explicit user choice from other persistence paths. RootView already
    /// re-derives `layoutDirection`/`locale` from `languageManager.language`
    /// at the root, so the switch — including RTL — takes effect immediately
    /// with no further plumbing here.
    private var languageBinding: Binding<Language> {
        Binding(
            get: { languageManager.language },
            set: { languageManager.setLanguage($0) }
        )
    }

    // MARK: - Notifications

    @ViewBuilder
    private var notificationsSection: some View {
        sectionHeader(L10n.Settings.sectionNotifications)
        LoomCard {
            VStack(alignment: .leading, spacing: LoomSpacing.sm) {
                Toggle(isOn: notificationsBinding) {
                    VStack(alignment: .leading, spacing: LoomSpacing.xxs) {
                        Text(L10n.Settings.notificationsToggleLabel.string(for: languageManager.language))
                            .font(LoomFont.body(size: 15, weight: .medium))
                            .foregroundStyle(LoomColor.ink)
                        Text(L10n.Settings.notificationsToggleDescription.string(for: languageManager.language))
                            .font(LoomFont.body(size: 13))
                            .foregroundStyle(LoomColor.inkDim)
                    }
                }
                .tint(LoomColor.magenta)

                if permissionState == .denied {
                    ErrorState(
                        message: Text(L10n.Settings.notificationsDeniedMessage.string(for: languageManager.language)),
                        retryTitle: Text(L10n.Settings.openSettingsButton.string(for: languageManager.language)),
                        onRetry: openSystemSettings
                    )
                }
            }
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: permissionState)
    }

    private var notificationsBinding: Binding<Bool> {
        Binding(
            get: { notificationsOn },
            set: { newValue in
                if newValue {
                    Task { await requestEnableNotifications() }
                } else {
                    notificationsOn = false
                    LocalNotificationsPreference.setEnabled(false)
                }
            }
        )
    }

    /// One-time read at launch. Never requests — that only happens from an
    /// explicit toggle-on, so the OS prompt is always a direct result of the
    /// client's own tap, never a surprise on screen appear.
    private func loadNotificationPermission() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            permissionState = .authorized
            notificationsOn = LocalNotificationsPreference.isEnabled
        case .denied:
            permissionState = .denied
            notificationsOn = false
            LocalNotificationsPreference.setEnabled(false)
        case .notDetermined:
            permissionState = .notDetermined
            notificationsOn = false
        @unknown default:
            permissionState = .notDetermined
            notificationsOn = false
        }
        isCheckingPermission = false
    }

    private func requestEnableNotifications() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            permissionState = .authorized
            notificationsOn = true
            LocalNotificationsPreference.setEnabled(true)
        case .denied:
            // Already denied at the OS level from a previous session — we
            // cannot re-prompt; guide the client to Settings instead of
            // silently doing nothing.
            permissionState = .denied
            notificationsOn = false
            LocalNotificationsPreference.setEnabled(false)
        case .notDetermined:
            do {
                let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
                permissionState = granted ? .authorized : .denied
                notificationsOn = granted
                LocalNotificationsPreference.setEnabled(granted)
            } catch {
                permissionState = .denied
                notificationsOn = false
                LocalNotificationsPreference.setEnabled(false)
            }
        @unknown default:
            notificationsOn = false
        }
    }

    private func openSystemSettings() {
        #if canImport(UIKit)
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
        #endif
    }

    // MARK: - Privacy note

    @ViewBuilder
    private var privacySection: some View {
        sectionHeader(L10n.Settings.sectionPrivacy)
        LoomCard(glow: LoomColor.cyan) {
            HStack(alignment: .top, spacing: LoomSpacing.sm) {
                Image(systemName: "eye")
                    .font(.system(size: 18, weight: .regular))
                    .foregroundStyle(LoomColor.cyan)
                Text(L10n.Settings.privacyNoteBody.string(for: languageManager.language))
                    .font(LoomFont.body(size: 14))
                    .foregroundStyle(LoomColor.inkDim)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    // MARK: - Sign out

    @ViewBuilder
    private var signOutSection: some View {
        LoomButton(style: .destructive, action: { showSignOutConfirm = true }) {
            if isSigningOut {
                ProgressView()
                    .tint(LoomColor.ink)
            } else {
                Text(L10n.Settings.signOutButton.string(for: languageManager.language))
            }
        }
        .disabled(isSigningOut)
    }

    private func performSignOut() async {
        isSigningOut = true
        // Session.logout() never throws — it clears local state even if the
        // engine call fails offline, and RootView switches to AuthRootView
        // the instant `isAuthenticated` flips false.
        await session.logout()
        isSigningOut = false
    }

    // MARK: - Shared

    @ViewBuilder
    private func sectionHeader(_ string: L10nString) -> some View {
        SectionKicker(Text(string.string(for: languageManager.language)))
    }
}
