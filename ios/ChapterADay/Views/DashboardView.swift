//
//  DashboardView.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import SwiftUI

struct DashboardView: View {
    @State private var viewModel: DashboardViewModel
    @State private var showLoginSheet = false
    @State private var scrollToCommentId: String?
    @State private var refreshTrigger = UUID()
    @State private var versePopover: (number: Int, text: String?, book: String, chapterNumber: Int)?
    @State private var showInfoPopover = false
    let token: String?
    let username: String?
    let onLogout: () -> Void
    let onAuthSuccess: (AuthResponse) -> Void

    init(token: String?, username: String?, onLogout: @escaping () -> Void, onAuthSuccess: @escaping (AuthResponse) -> Void) {
        self._viewModel = State(initialValue: DashboardViewModel(token: token))
        self.token = token
        self.username = username
        self.onLogout = onLogout
        self.onAuthSuccess = onAuthSuccess
    }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 24) {
                    if viewModel.loading {
                        ProgressView()
                            .padding()
                    } else if let error = viewModel.error {
                        VStack(spacing: 16) {
                            Text(error)
                                .foregroundColor(.red)
                                .padding()

                            Button("Retry") {
                                Task {
                                    await viewModel.loadToday()
                                }
                            }
                            .buttonStyle(.bordered)
                        }
                    } else if let today = viewModel.today {
                        // Progress indicator
                        VStack(spacing: 8) {
                            Text("Day \(today.progress.currentChapterIndex) of \(today.progress.totalChapters)")
                                .font(.headline)

                            ProgressView(value: Double(today.progress.currentChapterIndex), total: Double(today.progress.totalChapters))
                                .progressViewStyle(.linear)
                        }
                        .padding()

                        // Chapter content
                        ChapterView(chapter: today.chapter)

                        Divider()

                        // Comments section
                        CommentsView(
                            viewModel: viewModel,
                            currentUsername: username,
                            isLoggedIn: token != nil,
                            onLoginRequired: { showLoginSheet = true },
                            scrollToCommentId: $scrollToCommentId,
                            onVerseTap: { versePopover = ($0, $1, $2, $3) }
                        )
                    }
                }
            }
            .onChange(of: scrollToCommentId) { _, newId in
                if let id = newId {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            proxy.scrollTo(id, anchor: .center)
                        }
                        scrollToCommentId = nil
                    }
                }
            }
            }
            .refreshable {
                await viewModel.refresh()
                refreshTrigger = UUID()
            }
            .navigationTitle("Today's Chapter")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 12) {
                        InfoButtonView(version: viewModel.version, onTap: { showInfoPopover = true })
                        if let token {
                            NotificationBellView(token: token, refreshTrigger: refreshTrigger) { commentId in
                                scrollToCommentId = commentId
                            }
                        }
                        if token != nil {
                            Menu {
                                Button("Logout", role: .destructive, action: onLogout)
                            } label: {
                                Image(systemName: "person.circle")
                                    .font(.system(size: 28))
                                    .frame(minWidth: 44, minHeight: 44)
                                    .contentShape(Rectangle())
                            }
                        } else {
                            Button("Log in") {
                                showLoginSheet = true
                            }
                            .font(.body)
                            .frame(minHeight: 44)
                        }
                    }
                }
            }
            .task {
                await viewModel.loadToday()
            }
            .onChange(of: token) { _, newToken in
                viewModel.setToken(newToken)
            }
            .sheet(isPresented: $showLoginSheet) {
                LoginView { auth in
                    onAuthSuccess(auth)
                    showLoginSheet = false
                }
            }
            .overlay {
                if let verse = versePopover {
                    VersePopoverOverlay(
                        verseNumber: verse.number,
                        verseText: verse.text,
                        book: verse.book,
                        chapterNumber: verse.chapterNumber,
                        onDismiss: { versePopover = nil }
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .overlay {
                if showInfoPopover {
                    InfoPopoverOverlay(
                        version: viewModel.version,
                        onDismiss: { showInfoPopover = false }
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
    }
}

#Preview {
    DashboardView(
        token: "test",
        username: "testuser",
        onLogout: { },
        onAuthSuccess: { _ in }
    )
}
