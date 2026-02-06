//
//  NotificationSheetView.swift
//  ChapterADay
//
//  Created on 2026-01-27.
//

import SwiftUI

struct NotificationSheetView: View {
    @Binding var notifications: [AppNotification]
    @Binding var unreadCount: Int
    @Binding var loading: Bool
    let token: String
    let onDismiss: () -> Void
    let onNotificationTap: (String) -> Void

    private let apiClient = APIClient.shared

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if notifications.isEmpty {
                    ContentUnavailableView(
                        "No notifications",
                        systemImage: "bell.slash",
                        description: Text("You'll see replies to your comments here.")
                    )
                } else {
                    List {
                        if unreadCount > 0 {
                            Section {
                                Button("Mark all as read") {
                                    Task { await markAllAsRead() }
                                }
                            }
                        }

                        ForEach(notifications.prefix(20)) { notification in
                            NotificationRowView(
                                notification: notification,
                                onTap: {
                                    if !notification.read {
                                        Task { await markAsRead(notification.id) }
                                    }
                                    onNotificationTap(notification.commentId)
                                }
                            )
                        }
                    }
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        onDismiss()
                    }
                }
            }
        }
    }

    private func markAsRead(_ id: String) async {
        do {
            try await apiClient.markNotificationRead(notificationId: id, token: token)
            await MainActor.run {
                if let index = notifications.firstIndex(where: { $0.id == id }) {
                    let n = notifications[index]
                    notifications[index] = AppNotification(
                        id: n.id,
                        commentId: n.commentId,
                        parentCommentId: n.parentCommentId,
                        read: true,
                        createdAt: n.createdAt,
                        comment: n.comment,
                        parentComment: n.parentComment
                    )
                    unreadCount = max(0, unreadCount - 1)
                }
            }
        } catch {
            print("Failed to mark as read: \(error)")
        }
    }

    private func markAllAsRead() async {
        do {
            try await apiClient.markAllNotificationsRead(token: token)
            await MainActor.run {
                notifications = notifications.map { n in
                    AppNotification(
                        id: n.id,
                        commentId: n.commentId,
                        parentCommentId: n.parentCommentId,
                        read: true,
                        createdAt: n.createdAt,
                        comment: n.comment,
                        parentComment: n.parentComment
                    )
                }
                unreadCount = 0
            }
        } catch {
            print("Failed to mark all as read: \(error)")
        }
    }
}

struct NotificationRowView: View {
    let notification: AppNotification
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(notification.comment.user.username)
                        .fontWeight(.semibold)
                    Spacer()
                    Text(formatTimeAgo(notification.createdAt))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Text("replied to your comment on \(notification.comment.chapter.book) \(notification.comment.chapter.chapterNumber)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Text(truncate(notification.comment.content, maxLength: 100))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            .padding(.vertical, 4)
            .opacity(notification.read ? 0.8 : 1)
        }
        .buttonStyle(.plain)
    }

    private func formatTimeAgo(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) ?? ISO8601DateFormatter().date(from: dateString) else {
            return dateString
        }
        let diff = Date().timeIntervalSince(date)
        if diff < 60 { return "just now" }
        if diff < 3600 { return "\(Int(diff / 60))m ago" }
        if diff < 86400 { return "\(Int(diff / 3600))h ago" }
        if diff < 604800 { return "\(Int(diff / 86400))d ago" }
        let df = DateFormatter()
        df.dateStyle = .short
        return df.string(from: date)
    }

    private func truncate(_ text: String, maxLength: Int) -> String {
        if text.count <= maxLength { return text }
        return String(text.prefix(maxLength)) + "..."
    }
}
