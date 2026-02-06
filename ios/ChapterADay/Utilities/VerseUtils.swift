//
//  VerseUtils.swift
//  ChapterADay
//
//  Created on 2026-01-27.
//

import Foundation

enum CommentSegment {
    case text(String)
    case verseReference(verseNumber: Int, text: String)
}

enum VerseUtils {

    /// Extract verse text from chapter content by verse number.
    /// Chapter content format: "1 Text\n2 Text\n3 Text..."
    static func getVerseText(content: String, verseNumber: Int) -> String? {
        guard !content.isEmpty else { return nil }

        let lines = content.components(separatedBy: .newlines)
        let pattern = #"^(\d+)\s+(.+)$"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }

        for line in lines {
            let range = NSRange(line.startIndex..., in: line)
            guard let match = regex.firstMatch(in: line, range: range),
                  let verseNumRange = Range(match.range(at: 1), in: line),
                  let verseTextRange = Range(match.range(at: 2), in: line) else { continue }

            let verseNum = Int(line[verseNumRange]) ?? 0
            let verseText = String(line[verseTextRange]).trimmingCharacters(in: .whitespaces)

            if verseNum == verseNumber {
                return "\(verseNumber) \(verseText)"
            }
        }
        return nil
    }

    /// Parse comment text for verse references using #number syntax.
    static func parseVerseReferences(text: String) -> [(verse: Int, start: Int, end: Int)] {
        var references: [(verse: Int, start: Int, end: Int)] = []
        let pattern = #"#(\d+)"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }

        let range = NSRange(text.startIndex..., in: text)
        regex.enumerateMatches(in: text, range: range) { match, _, _ in
            guard let match,
                  let verseRange = Range(match.range(at: 1), in: text),
                  let fullRange = Range(match.range, in: text) else { return }
            let verseNum = Int(text[verseRange]) ?? 0
            references.append((verse: verseNum, start: text.distance(from: text.startIndex, to: fullRange.lowerBound), end: text.distance(from: text.startIndex, to: fullRange.upperBound)))
        }
        return references
    }

    /// Split comment text into segments (text and verse references).
    static func splitCommentContent(text: String) -> [CommentSegment] {
        let references = parseVerseReferences(text: text)
        guard !references.isEmpty else { return [.text(text)] }

        var segments: [CommentSegment] = []
        var lastIndex = text.startIndex

        for ref in references {
            let startIdx = text.index(text.startIndex, offsetBy: ref.start)
            let endIdx = text.index(text.startIndex, offsetBy: ref.end)

            if startIdx > lastIndex {
                let textSegment = String(text[lastIndex..<startIdx])
                if !textSegment.isEmpty {
                    segments.append(.text(textSegment))
                }
            }

            segments.append(.verseReference(verseNumber: ref.verse, text: String(text[startIdx..<endIdx])))
            lastIndex = endIdx
        }

        if lastIndex < text.endIndex {
            let textSegment = String(text[lastIndex...])
            if !textSegment.isEmpty {
                segments.append(.text(textSegment))
            }
        }

        return segments
    }
}
