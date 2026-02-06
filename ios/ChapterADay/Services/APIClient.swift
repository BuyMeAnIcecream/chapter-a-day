//
//  APIClient.swift
//  ChapterADay
//
//  Created on 2026-01-23.
//

import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case noData
    case decodingError
    case networkError(Error)
    case serverError(Int, String?)
    case unauthorized
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .decodingError:
            return "Failed to decode response"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .serverError(let code, let message):
            return message ?? "Server error (\(code))"
        case .unauthorized:
            return "Unauthorized. Please log in again."
        case .unknown:
            return "An unknown error occurred"
        }
    }
}

class APIClient {
    static let shared = APIClient()
    
    private var baseURL: String {
        // Check for environment variable first
        if let url = ProcessInfo.processInfo.environment["API_BASE_URL"] {
            return url
        }
        
        // Default to localhost for simulator, or use network IP for device
        #if targetEnvironment(simulator)
        return "http://localhost:4000"
        #else
        // For physical device, use network IP
        // This should be configured via Info.plist or environment variable
        return "http://192.168.1.68:4000"
        #endif
    }
    
    private let session: URLSession
    
    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Encodable? = nil,
        token: String? = nil
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            do {
                request.httpBody = try JSONEncoder().encode(body)
            } catch {
                throw APIError.decodingError
            }
        }
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown
            }
            
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let errorMessage = try? JSONDecoder().decode([String: String].self, from: data)
                throw APIError.serverError(httpResponse.statusCode, errorMessage?["error"])
            }
            
            if T.self == EmptyResponse.self {
                return EmptyResponse() as! T
            }
            
            do {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                return try decoder.decode(T.self, from: data)
            } catch {
                print("Decoding error: \(error)")
                throw APIError.decodingError
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
}

struct EmptyResponse: Codable {}

struct RegisterRequest: Codable {
    let username: String
    let password: String
}

struct LoginRequest: Codable {
    let username: String
    let password: String
}

struct CreateCommentRequest: Codable {
    let content: String
    let parentId: String?
}

// MARK: - Version
extension APIClient {
    func fetchVersion() async throws -> VersionResponse {
        try await request(endpoint: "/api/version")
    }
}

struct VersionResponse: Codable {
    let version: String
}

// MARK: - Notifications
extension APIClient {
    func fetchNotifications(token: String) async throws -> NotificationsResponse {
        try await request(endpoint: "/api/notifications", token: token)
    }

    func markNotificationRead(notificationId: String, token: String) async throws {
        let _: EmptyResponse = try await request(
            endpoint: "/api/notifications/\(notificationId)/read",
            method: "PUT",
            token: token
        )
    }

    func markAllNotificationsRead(token: String) async throws {
        let _: EmptyResponse = try await request(
            endpoint: "/api/notifications/read-all",
            method: "PUT",
            token: token
        )
    }
}
