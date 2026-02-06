//
//  Comment.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import Foundation

struct Comment: Codable, Identifiable {
    let id: String
    let content: String
    let createdAt: String
    let updatedAt: String
    let user: User
    let parentId: String?
    var replies: [Comment]?
    
    var createdAtDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: createdAt) ?? ISO8601DateFormatter().date(from: createdAt)
    }
    
    var formattedDate: String {
        guard let date = createdAtDate else { return createdAt }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct CommentsResponse: Codable {
    let comments: [Comment]
}
