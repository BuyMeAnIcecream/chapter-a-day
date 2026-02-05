//
//  CommentsView.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import SwiftUI

struct CommentsView: View {
    @Bindable var viewModel: DashboardViewModel
    let currentUsername: String?
    let isLoggedIn: Bool
    let onLoginRequired: () -> Void
    @Binding var scrollToCommentId: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Comments")
                .font(.headline)
                .padding(.horizontal)

            if viewModel.commentsLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if let error = viewModel.commentsError {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.horizontal)
            } else if viewModel.comments.isEmpty {
                Text("No comments yet. Be the first to comment!")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(viewModel.comments) { comment in
                        CommentRow(
                            comment: comment,
                            currentUsername: currentUsername,
                            depth: 0,
                            canDelete: isLoggedIn && currentUsername == comment.user.username,
                            onReply: {
                                viewModel.replyingTo = comment.id
                            },
                            onDelete: {
                                Task {
                                    await viewModel.deleteComment(comment.id)
                                }
                            }
                        )
                        .id(comment.id)
                    }
                }
                .padding(.horizontal)
            }

            // Reply input
            if let replyingTo = viewModel.replyingTo {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Replying to comment")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    HStack {
                        TextField("Write a reply...", text: Binding(
                            get: { viewModel.replyContent[replyingTo] ?? "" },
                            set: { viewModel.replyContent[replyingTo] = $0 }
                        ), axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(3...6)

                        Button("Post") {
                            if !isLoggedIn {
                                onLoginRequired()
                                return
                            }
                            Task {
                                await viewModel.submitComment(parentId: replyingTo)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(viewModel.replyContent[replyingTo]?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
                    }

                    Button("Cancel") {
                        viewModel.replyingTo = nil
                        viewModel.replyContent[replyingTo] = ""
                    }
                    .font(.caption)
                    .foregroundColor(.blue)
                }
                .padding(.horizontal)
            }

            // New comment input
            HStack {
                TextField("Write a comment...", text: $viewModel.newComment, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(3...6)

                Button("Post") {
                    if !isLoggedIn {
                        onLoginRequired()
                        return
                    }
                    Task {
                        await viewModel.submitComment()
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(.horizontal)
        }
    }
}

#Preview {
    CommentsView(
        viewModel: DashboardViewModel(token: "test"),
        currentUsername: "testuser",
        isLoggedIn: true,
        onLoginRequired: { },
        scrollToCommentId: .constant(nil)
    )
}
