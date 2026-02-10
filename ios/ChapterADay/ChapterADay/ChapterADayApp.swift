//
//  ChapterADayApp.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import SwiftUI

@main
struct ChapterADayApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

private struct RootView: View {
    @State private var token: String?
    @State private var username: String?
    @State private var isCheckingAuth = true

    private let authService = AuthService.shared

    var body: some View {
        Group {
            if isCheckingAuth {
                ProgressView("Loading...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                DashboardView(
                    token: token,
                    username: username,
                    onLogout: { handleLogout() },
                    onAuthSuccess: { auth in handleAuthSuccess(auth) }
                )
            }
        }
        .task {
            await checkStoredAuth()
        }
    }

    private func checkStoredAuth() async {
        if let storedToken = authService.getStoredToken(),
           let storedUsername = authService.getStoredUsername() {
            do {
                _ = try await authService.getCurrentUser(token: storedToken)
                token = storedToken
                username = storedUsername
            } catch _ {
                authService.clearAuth()
            }
        }
        isCheckingAuth = false
    }

    private func handleAuthSuccess(_ auth: AuthResponse) {
        authService.saveAuth(auth)
        token = auth.token
        username = auth.user.username
    }

    private func handleLogout() {
        authService.clearAuth()
        token = nil
        username = nil
    }
}
