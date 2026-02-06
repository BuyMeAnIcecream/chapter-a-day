# Chapter a Day - iOS Client

Native iOS app built with SwiftUI for the Chapter a Day application.

## Requirements

- iOS 17.0+
- Xcode 15.0+
- Swift 5.9+

## Setup

1. Open `ChapterADay.xcodeproj` in Xcode
2. Configure API base URL:
   - For Simulator: Defaults to `http://localhost:4000`
   - For Device: Set `API_BASE_URL` environment variable in Xcode scheme, or update `APIClient.swift` with your server's IP address
3. Build and run

## Configuration

### API Base URL

The app uses the following priority for API base URL:

1. `API_BASE_URL` environment variable (set in Xcode scheme)
2. Simulator: `http://localhost:4000`
3. Device: `http://192.168.1.68:4000` (update in `APIClient.swift`)

To configure for your network:
- Edit `ios/ChapterADay/Services/APIClient.swift`
- Update the `baseURL` computed property
- Or set `API_BASE_URL` environment variable in Xcode scheme settings

## Features

- **Authentication**: Login and registration
- **Daily Chapters**: View today's chapter with progress tracking
- **Comments**: Read and post comments on chapters
- **Nested Replies**: Reply to comments with threaded discussions
- **Secure Storage**: JWT tokens stored in Keychain
- **Pull to Refresh**: Refresh chapter and comments
- **Dark Mode**: Automatic support via SwiftUI

## Architecture

- **Models**: Codable structs matching API responses
- **Services**: API client, authentication, and keychain services
- **ViewModels**: @Observable classes for state management
- **Views**: SwiftUI views for UI

## Project Structure

```
ChapterADay/
├── Models/          # Data models
├── Services/        # API and authentication services
├── ViewModels/      # Observable view models
├── Views/          # SwiftUI views
├── Utilities/      # Helper extensions
└── Resources/      # Info.plist and assets
```

## Development

The app connects to the same backend API as the web client. Make sure the server is running and accessible from your device/simulator.

### Running on Physical Device

1. Ensure your device and computer are on the same WiFi network
2. Update the API base URL in `APIClient.swift` with your computer's local IP
3. Build and run on device

### Running on Simulator

1. Ensure server is running on `localhost:4000`
2. Build and run in simulator
3. Default configuration should work automatically

## Notes

- The app uses HTTP (not HTTPS) for development. For production, update `Info.plist` and use HTTPS endpoints.
- Token validation happens on app launch - invalid tokens are automatically cleared.
- Comments support nested replies up to 3 levels deep.
