//
//  NotificationBellView.swift
//  ChapterADay
//
//  Created on 2026-01-27.
//

import SwiftUI

struct NotificationBellView: View {
    let token: String
    var refreshTrigger: UUID? = nil
    var onNavigateToComment: ((String) -> Void)? = nil
    @State private var notifications: [AppNotification] = []
    @State private var unreadCount = 0
    @State private var showNotifications = false
    @State private var loading = true
    @State private var pendingScrollToCommentId: String?

    private let apiClient = APIClient.shared

    var body: some View {
        Button {
            showNotifications = true
        } label: {
            ZStack(alignment: .topTrailing) {
                Image("HornIcon")
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 24, height: 24)

                if unreadCount > 0 {
                    Text(unreadCount > 99 ? "99+" : "\(unreadCount)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color.red)
                        .clipShape(Capsule())
                        .offset(x: 8, y: -8)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Notifications")
        .accessibilityHint(unreadCount > 0 ? "\(unreadCount) unread" : "No unread notifications")
        .sheet(isPresented: $showNotifications) {
            NotificationSheetView(
                notifications: $notifications,
                unreadCount: $unreadCount,
                loading: $loading,
                token: token,
                onDismiss: { showNotifications = false },
                onNotificationTap: { commentId in
                    pendingScrollToCommentId = commentId
                    showNotifications = false
                }
            )
        }
        .task {
            await loadNotifications()
        }
        .onChange(of: showNotifications) { _, isShowing in
            if isShowing {
                Task { await loadNotifications() }
            } else if let commentId = pendingScrollToCommentId {
                onNavigateToComment?(commentId)
                pendingScrollToCommentId = nil
            }
        }
        .onChange(of: refreshTrigger) { _, _ in
            Task { await loadNotifications() }
        }
    }

    private func loadNotifications() async {
        loading = true
        defer { loading = false }
        do {
            let response = try await apiClient.fetchNotifications(token: token)
            notifications = response.notifications
            unreadCount = response.unreadCount
        } catch {
            print("Failed to load notifications: \(error)")
        }
    }
}
