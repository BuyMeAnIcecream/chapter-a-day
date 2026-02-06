//
//  AuthResponse.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import Foundation

struct AuthResponse: Codable {
    let token: String
    let user: User
}
