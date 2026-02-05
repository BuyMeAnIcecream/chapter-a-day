//
//  KeychainService.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import Foundation
import Security

enum KeychainService {
    private static let tokenKey = "com.chapteraday.token"
    private static let usernameKey = "com.chapteraday.username"
    private static let service = "com.chapteraday"
    
    static func saveToken(_ token: String) -> Bool {
        return save(key: tokenKey, value: token)
    }
    
    static func getToken() -> String? {
        return get(key: tokenKey)
    }
    
    static func saveUsername(_ username: String) -> Bool {
        return save(key: usernameKey, value: username)
    }
    
    static func getUsername() -> String? {
        return get(key: usernameKey)
    }
    
    static func clearAll() {
        delete(key: tokenKey)
        delete(key: usernameKey)
    }
    
    private static func save(key: String, value: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        // Delete existing item first
        SecItemDelete(query as CFDictionary)
        
        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    private static func get(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return value
    }
    
    private static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}
