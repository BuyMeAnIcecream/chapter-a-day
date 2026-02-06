//
//  AuthService.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import Foundation

class AuthService {
    static let shared = AuthService()
    private let apiClient = APIClient.shared
    
    private init() {}
    
    func register(username: String, password: String) async throws -> AuthResponse {
        let request = RegisterRequest(username: username, password: password)
        return try await apiClient.request(
            endpoint: "/api/register",
            method: "POST",
            body: request
        )
    }
    
    func login(username: String, password: String) async throws -> AuthResponse {
        let request = LoginRequest(username: username, password: password)
        return try await apiClient.request(
            endpoint: "/api/login",
            method: "POST",
            body: request
        )
    }
    
    func getCurrentUser(token: String) async throws -> User {
        struct UserResponse: Codable {
            let user: User
        }
        let response: UserResponse = try await apiClient.request(
            endpoint: "/api/me",
            token: token
        )
        return response.user
    }
    
    func saveAuth(_ auth: AuthResponse) {
        _ = KeychainService.saveToken(auth.token)
        _ = KeychainService.saveUsername(auth.user.username)
    }
    
    func clearAuth() {
        KeychainService.clearAll()
    }
    
    func getStoredToken() -> String? {
        return KeychainService.getToken()
    }
    
    func getStoredUsername() -> String? {
        return KeychainService.getUsername()
    }
}
