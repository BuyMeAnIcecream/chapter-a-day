//
//  Notification.swift
//  ChapterADay
//
//  Created on 2026-01-27.
//

import Foundation

struct AppNotification: Codable, Identifiable {
    let id: String
    let commentId: String
    let parentCommentId: String
    let read: Bool
    let createdAt: String
    let comment: NotificationComment
    let parentComment: ParentComment

    var createdAtDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: createdAt) ?? ISO8601DateFormatter().date(from: createdAt)
    }
}

struct NotificationComment: Codable {
    let id: String
    let content: String
    let user: NotificationUser
    let chapter: NotificationChapter
}

struct NotificationUser: Codable {
    let username: String
}

struct NotificationChapter: Codable {
    let book: String
    let chapterNumber: Int
}

struct ParentComment: Codable {
    let id: String
    let content: String
}

struct NotificationsResponse: Codable {
    let notifications: [AppNotification]
    let unreadCount: Int
}
