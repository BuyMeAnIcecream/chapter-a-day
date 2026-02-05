//
//  Progress.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import Foundation

struct Progress: Codable {
    let currentChapterIndex: Int
    let lastDeliveredDate: String?
    let totalChapters: Int?
    
    var lastDeliveredDateValue: Date? {
        guard let dateString = lastDeliveredDate else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: dateString) ?? ISO8601DateFormatter().date(from: dateString)
    }
}

struct ProgressResponse: Codable {
    let progress: Progress?
    let totalChapters: Int
}
