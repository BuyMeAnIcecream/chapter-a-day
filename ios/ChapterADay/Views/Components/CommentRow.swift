//
//  CommentRow.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import SwiftUI

struct CommentRow: View {
    let comment: Comment
    let chapterContent: String
    let book: String
    let chapterNumber: Int
    let currentUsername: String?
    let depth: Int
    let canDelete: Bool
    let onVerseTap: (Int, String?, String, Int) -> Void
    let onReply: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(comment.user.username)
                            .font(.headline)
                            .fontWeight(.semibold)

                        Text(comment.formattedDate)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    CommentContent(
                        content: comment.content,
                        chapterContent: chapterContent,
                        book: book,
                        chapterNumber: chapterNumber,
                        onVerseTap: onVerseTap
                    )
                    .font(.body)
                }

                Spacer()

                if canDelete {
                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .padding(.leading, CGFloat(depth * 16))

            if depth < 3 {
                Button(action: onReply) {
                    Text("Reply")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
                .padding(.leading, CGFloat(depth * 16))
            }

            if let replies = comment.replies, !replies.isEmpty {
                ForEach(replies) { reply in
                    CommentRow(
                        comment: reply,
                        chapterContent: chapterContent,
                        book: book,
                        chapterNumber: chapterNumber,
                        currentUsername: currentUsername,
                        depth: depth + 1,
                        canDelete: currentUsername != nil && currentUsername == reply.user.username,
                        onVerseTap: onVerseTap,
                        onReply: { },
                        onDelete: { }
                    )
                    .id(reply.id)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    CommentRow(
        comment: Comment(
            id: "1",
            content: "This is a test comment about #11",
            createdAt: "2026-01-23T12:00:00Z",
            updatedAt: "2026-01-23T12:00:00Z",
            user: User(id: "1", username: "testuser"),
            parentId: nil,
            replies: nil
        ),
        chapterContent: "1 In the beginning\n11 For so God loved the world",
        book: "John",
        chapterNumber: 3,
        currentUsername: "testuser",
        depth: 0,
        canDelete: true,
        onVerseTap: { _, _, _, _ in },
        onReply: { },
        onDelete: { }
    )
    .padding()
}
