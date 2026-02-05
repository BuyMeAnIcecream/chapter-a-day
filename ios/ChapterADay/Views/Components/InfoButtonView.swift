//
//  InfoButtonView.swift
//  ChapterADay
//
//  Created on 2026-01-27.
//

import SwiftUI

struct InfoButtonView: View {
    let version: String?
    var onTap: () -> Void = {}

    var body: some View {
        Button(action: onTap) {
            Image("InfoIcon")
                .renderingMode(.template)
                .resizable()
                .scaledToFit()
                .frame(width: 28, height: 28)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Info")
    }
}

/// Popover overlay for info, matching the verse popover style.
struct InfoPopoverOverlay: View {
    let version: String?
    let onDismiss: () -> Void

    var body: some View {
        Color.black.opacity(0.2)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .ignoresSafeArea()
            .onTapGesture {
                onDismiss()
            }
            .overlay(alignment: .topTrailing) {
                InfoPopoverCard(version: version, onDismiss: onDismiss)
                    .padding(.top, 56)
                    .padding(.trailing, 16)
            }
    }
}

struct InfoPopoverCard: View {
    let version: String?
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("About")
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
            if let version {
                Text("Version \(version)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Text("Developed by Christ's silliest goose Anton Starodub")
                .font(.footnote)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("Get in touch:")
                    .font(.footnote)
                Link("anton.starodub@protonmail.com", destination: URL(string: "mailto:anton.starodub@protonmail.com")!)
                    .font(.footnote)
            }
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

#Preview {
    InfoButtonView(version: "1.1.1")
}
