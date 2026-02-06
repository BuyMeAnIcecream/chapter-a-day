//
//  Extensions.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import Foundation

extension Encodable {
    func encode() throws -> Data {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(self)
    }
}
