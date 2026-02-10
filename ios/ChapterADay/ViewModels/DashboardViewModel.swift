//
//  DashboardViewModel.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import Foundation

@Observable
class DashboardViewModel {
    var today: TodayResponse?
    var comments: [Comment] = []
    var version: String?
    var loading = false
    var error: String?
    var commentsLoading = false
    var commentsError: String?
    var newComment = ""
    var replyingTo: String?
    var replyContent: [String: String] = [:]
    
    private let apiClient = APIClient.shared
    private(set) var token: String?
    
    init(token: String? = nil) {
        self.token = token
    }
    
    func setToken(_ token: String?) {
        self.token = token
    }
    
    func loadToday() async {
        loading = true
        error = nil
        
        defer {
            loading = false
        }
        
        do {
            today = try await apiClient.request(
                endpoint: "/api/today",
                token: token  // Optional: API uses optionalAuthMiddleware
            )
            version = (try? await apiClient.fetchVersion())?.version

            // Load comments for the chapter
            if let chapterId = today?.chapter.id {
                await loadComments(chapterId: chapterId)
            }
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch _ {
            error = "Failed to load today's chapter"
        }
    }
    
    func loadComments(chapterId: String) async {
        commentsLoading = true
        commentsError = nil
        
        defer {
            commentsLoading = false
        }
        
        do {
            let response: CommentsResponse = try await apiClient.request(
                endpoint: "/api/chapters/\(chapterId)/comments",
                token: nil  // Comments are public
            )
            comments = response.comments
        } catch let apiError as APIError {
            commentsError = apiError.errorDescription
        } catch _ {
            commentsError = "Failed to load comments"
        }
    }
    
    func submitComment(parentId: String? = nil) async {
        guard let token = token else { return }
        guard let chapterId = today?.chapter.id else { return }
        
        let content = parentId != nil ? replyContent[parentId!] ?? "" : newComment
        
        guard !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }
        
        do {
            let request = CreateCommentRequest(content: content, parentId: parentId)
            let _: Comment = try await apiClient.request(
                endpoint: "/api/chapters/\(chapterId)/comments",
                method: "POST",
                body: request,
                token: token  // Required for posting
            )
            
            // Reload comments
            await loadComments(chapterId: chapterId)
            
            // Clear input
            if parentId != nil {
                replyContent[parentId!] = ""
                replyingTo = nil
            } else {
                newComment = ""
            }
        } catch let apiError as APIError {
            commentsError = apiError.errorDescription
        } catch _ {
            commentsError = "Failed to post comment"
        }
    }
    
    func deleteComment(_ commentId: String) async {
        guard let token = token else { return }
        do {
            let _: EmptyResponse = try await apiClient.request(
                endpoint: "/api/comments/\(commentId)",
                method: "DELETE",
                token: token
            )
            
            // Reload comments
            if let chapterId = today?.chapter.id {
                await loadComments(chapterId: chapterId)
            }
        } catch let apiError as APIError {
            commentsError = apiError.errorDescription
        } catch _ {
            commentsError = "Failed to delete comment"
        }
    }
    
    func refresh() async {
        await loadToday()
    }
}
