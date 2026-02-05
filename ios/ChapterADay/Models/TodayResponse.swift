//
//  TodayResponse.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import Foundation

struct TodayResponse: Codable {
    let date: String
    let progress: ProgressInfo
    let chapter: Chapter
    
    struct ProgressInfo: Codable {
        let currentChapterIndex: Int
        let totalChapters: Int
    }
}
