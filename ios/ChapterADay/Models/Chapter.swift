//
//  Chapter.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import Foundation

struct Chapter: Codable, Identifiable {
    let id: String
    let book: String
    let chapterNumber: Int
    let content: String
}
