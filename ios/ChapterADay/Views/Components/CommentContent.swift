//
//  CommentContent.swift
//  ChapterADay
//
//  Created on 2026-01-27.
//

import SwiftUI

struct CommentContent: View {
    let content: String
    let chapterContent: String
    let book: String
    let chapterNumber: Int
    let onVerseTap: (Int, String?, String, Int) -> Void

    var body: some View {
        FlowLayout(spacing: 0) {
            ForEach(Array(VerseUtils.splitCommentContent(text: content).enumerated()), id: \.offset) { _, segment in
                switch segment {
                case .text(let text):
                    Text(text)
                case .verseReference(let verseNumber, _):
                    Button {
                        let verseText = VerseUtils.getVerseText(content: chapterContent, verseNumber: verseNumber)
                        onVerseTap(verseNumber, verseText, book, chapterNumber)
                    } label: {
                        Text("#\(verseNumber)")
                            .foregroundColor(.blue)
                            .underline()
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

/// Flow layout for inline text with tappable verse references - wraps to new lines when needed.
struct FlowLayout: Layout {
    var spacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x, y: bounds.minY + result.positions[index].y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var lineHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += lineHeight + spacing
                lineHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }

        return (CGSize(width: maxWidth, height: y + lineHeight), positions)
    }
}

struct VersePopoverOverlay: View {
    let verseNumber: Int
    let verseText: String?
    let book: String
    let chapterNumber: Int
    let onDismiss: () -> Void

    var body: some View {
        Color.black.opacity(0.2)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .ignoresSafeArea()
            .onTapGesture {
                onDismiss()
            }
            .overlay {
                VersePopoverCard(
                    verseNumber: verseNumber,
                    verseText: verseText,
                    book: book,
                    chapterNumber: chapterNumber,
                    onDismiss: onDismiss
                )
            }
    }
}

struct VersePopoverCard: View {
    let verseNumber: Int
    let verseText: String?
    let book: String
    let chapterNumber: Int
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("\(book) \(chapterNumber):\(verseNumber)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Spacer()
                Button {
                    onDismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
            }
            ScrollView {
                Text(verseText ?? "Verse \(verseNumber) not found")
                    .font(.footnote)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxHeight: 120)
        }
        .padding(12)
        .frame(maxWidth: 280)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
        .contentShape(Rectangle())
        .onTapGesture {
            // Consume tap so it doesn't dismiss when tapping the card
        }
    }
}
