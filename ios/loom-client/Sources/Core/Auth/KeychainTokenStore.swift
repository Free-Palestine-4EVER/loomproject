// KeychainTokenStore.swift — the Bearer token, persisted in the Keychain
// (never UserDefaults — it's a credential). One generic-password item under a
// fixed service/account; overwritten on save, deleted on logout.
import Foundation
import Security

enum KeychainTokenStore {
    private static let service = "com.loom.client.auth"
    private static let account = "bearer-token"

    static func save(_ token: String) {
        let data = Data(token.utf8)
        var query = baseQuery()
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock

        let status = SecItemAdd(query as CFDictionary, nil)
        if status == errSecDuplicateItem {
            let searchQuery = baseQuery()
            let update: [String: Any] = [kSecValueData as String: data]
            SecItemUpdate(searchQuery as CFDictionary, update as CFDictionary)
        }
    }

    static func load() -> String? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func clear() {
        SecItemDelete(baseQuery() as CFDictionary)
    }

    private static func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}
