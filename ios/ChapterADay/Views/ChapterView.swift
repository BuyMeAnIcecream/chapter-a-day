//
//  ChapterView.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import SwiftUI

struct ChapterView: View {
    let chapter: Chapter
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("\(chapter.book) \(chapter.chapterNumber)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.bottom, 8)
                
                Text(formatContent(chapter.content))
                    .font(.body)
                    .lineSpacing(8)
            }
            .padding()
        }
    }
    
    private func formatContent(_ content: String) -> String {
        // The content comes as "1 Text\n2 Text\n3 Text..."
        // We can add some formatting if needed
        return content
    }
}

#Preview {
    ChapterView(chapter: Chapter(
        id: "1",
        book: "Matthew",
        chapterNumber: 1,
        content: "1 The book of the generation of Jesus Christ...\n2 Abraham begat Isaac..."
    ))
}
