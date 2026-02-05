//
//  LoginViewModel.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import Foundation

enum AuthMode {
    case login
    case register
}

@Observable
class LoginViewModel {
    var mode: AuthMode = .login
    var username = ""
    var password = ""
    var error: String?
    var isLoading = false
    
    private let authService = AuthService.shared
    
    func submit() async -> AuthResponse? {
        guard !username.isEmpty, !password.isEmpty else {
            error = "Please enter username and password"
            return nil
        }
        
        guard username.count >= 3 else {
            error = "Username must be at least 3 characters"
            return nil
        }
        
        guard password.count >= 6 else {
            error = "Password must be at least 6 characters"
            return nil
        }
        
        isLoading = true
        error = nil
        
        defer {
            isLoading = false
        }
        
        do {
            let response: AuthResponse
            if mode == .login {
                response = try await authService.login(username: username, password: password)
            } else {
                response = try await authService.register(username: username, password: password)
            }
            
            authService.saveAuth(response)
            return response
        } catch let apiError as APIError {
            error = apiError.errorDescription
            return nil
        } catch _ {
            error = "Authentication failed. Please try again."
            return nil
        }
    }
    
    func toggleMode() {
        mode = mode == .login ? .register : .login
        error = nil
    }
}
