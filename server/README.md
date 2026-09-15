# Chapter a Day - Server

Express API server for the Chapter a Day application.

## Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database:
```bash
# Create database (adjust connection details as needed)
createdb chapteraday

# Or using psql:
psql -U postgres
CREATE DATABASE chapteraday;
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and update DATABASE_URL with your PostgreSQL credentials
```

Example DATABASE_URL:
```
DATABASE_URL="postgresql://username:password@localhost:5432/chapteraday?schema=public"
PORT=4000
JWT_SECRET=your-secret-key-here
```

4. Run migrations:
```bash
npx prisma migrate dev
```

5. Seed the database:
```bash
npm run seed
```

6. (Optional) Import chapter content from PDF:
```bash
# Place your PDF file at: book/study-bible.pdf
# The script will extract chapters from pages 3076-3943
npm run import:pdf
```

**Note:** The PDF import script (`scripts/import-pdf.ts`) extracts chapter content from a PDF file. The script includes:

1. **Link-based extraction (framework)**: Attempts to use PDF hyperlinks to navigate the structure (TOC → Book → Chapter → Verses → Content). However, `pdf-parse` link extraction may require a browser environment or different PDF library, so this currently falls back to text-based extraction.

2. **Text-based extraction (active)**: Extracts text and uses pattern matching to:
   - Skip navigation/index pages
   - Detect book boundaries
   - Detect chapter boundaries using verse patterns
   - Extract chapter content

The script will automatically try link-based extraction first, then fall back to text-based extraction.

**Troubleshooting:**
- If chapters are not detected correctly, you may need to adjust the chapter detection patterns in `scripts/import-pdf.ts` to match your PDF's format.
- For link-based extraction to work, you may need to use a different PDF library (like `pdfjs-dist` in a browser environment) or manually map the link structure.

7. Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:4000` (or the PORT specified in .env).

## API Endpoints

Authenticated endpoints expect `Authorization: Bearer <token>`. Tokens are JWTs returned by register/login and expire after 7 days.

### Authentication
- `POST /api/register` - Register a new user
  - Body: `{ username: string, password: string }`
  - Returns: `{ token: string, user: { id, username } }`
  - `409` if the username is taken

- `POST /api/login` - Login user
  - Body: `{ username: string, password: string }`
  - Returns: `{ token: string, user: { id, username } }`

- `GET /api/me` - Get current user (requires auth)
  - Returns: `{ user: { id, username, createdAt } }`

### Chapters
- `GET /api/today` - Get today's chapter (auth optional)
  - Everyone gets the same chapter, based on days since 2026-01-01 in Pacific time
  - If authenticated, also records delivery in the user's progress
  - Returns: `{ date, progress: { currentChapterIndex, totalChapters }, chapter: { id, book, chapterNumber, content } }`

- `GET /api/progress` - Get user's reading progress (requires auth)
  - Returns: `{ progress, totalChapters }`

### Comments
- `POST /api/chapters/:chapterId/comments` - Create a comment or reply (requires auth)
  - Body: `{ content: string, parentId?: string }`
  - Returns: `{ id, content, createdAt, updatedAt, user: { id, username }, parentId }`
  - Replying to another user's comment creates a notification for them

- `GET /api/chapters/:chapterId/comments` - Get all comments for a chapter (public)
  - Returns: `{ comments: Comment[] }` (nested structure with replies)

- `DELETE /api/comments/:commentId` - Delete own comment and its replies (requires auth)
  - Returns: `{ success: true }`

### Notifications
- `GET /api/notifications` - Get the 50 most recent notifications (requires auth)
  - Returns: `{ notifications: Notification[], unreadCount }` (`unreadCount` covers all unread notifications, not just the 50 returned)

- `PUT /api/notifications/:notificationId/read` - Mark one notification as read (requires auth)
  - Returns: `{ success: true }`

- `PUT /api/notifications/read-all` - Mark all notifications as read (requires auth)
  - Returns: `{ success: true }`

### App
- `GET /api/version` - Get the app version (public)
  - Returns: `{ version }`, read from `server/package.json`. Bump it with `npm version <patch|minor|major> --no-git-tag-version`.

## Database Management

- **View database**: `npx prisma studio`
- **Reset database**: `npx prisma migrate reset`
- **Create migration**: `npx prisma migrate dev --name migration_name`
- **Apply migrations**: `npx prisma migrate deploy` (for production)

In production (Docker and Railway), `scripts/start.sh` runs migrations, seeds an empty database, and starts the server. Startup stops if migrations fail.

## Testing

### Test Database Setup

Tests use a **separate test database** to avoid interfering with development data.

**First-time setup:**
```bash
# Option 1: Use the setup script (recommended)
./scripts/setup-test-db.sh

# Option 2: Manual setup
npm run test:db:create    # Create test database
npm run test:db:migrate   # Run migrations on test database

# Option 3: Reset test database (drops and recreates)
npm run test:db:reset
```

**Configure test database (optional):**
```bash
# Only needed if the auto-detected URL below is wrong
echo 'TEST_DATABASE_URL="postgresql://user@localhost:5432/chapteraday_test?schema=public"' > .env.test
```

The test setup will automatically:
- Use `TEST_DATABASE_URL` if set in `.env.test`
- Otherwise, append `_test` to your database name from `DATABASE_URL`
- Default: `chapteraday_test` database

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Switching Between Dev and Test

**Development mode** (uses `chapteraday` database):
```bash
npm run dev
# Uses DATABASE_URL from .env
```

**Test mode** (uses `chapteraday_test` database):
```bash
npm test
# Automatically uses test database
```

**Manual database switching:**
```bash
# Use dev database
DATABASE_URL="postgresql://user@localhost:5432/chapteraday?schema=public" npm run dev

# Use test database
TEST_DATABASE_URL="postgresql://user@localhost:5432/chapteraday_test?schema=public" npm test
```

### Test Coverage
- Comment CRUD operations
- Nested comment structure
- Permission checks (delete own comments only)
- Error handling and validation
- Notification unread counts and mark-as-read
- Version endpoint

All tests use a test database and are isolated with proper setup/teardown. The test database is cleaned before each test.

## Database Schema

### User
- `id` (String, CUID)
- `username` (String, unique)
- `passwordHash` (String)
- `createdAt` (DateTime)

### Progress
- `id` (String, CUID)
- `userId` (String, unique foreign key)
- `currentChapterIndex` (Int)
- `lastDeliveredDate` (DateTime?)

### Chapter
- `id` (String, CUID)
- `sequence` (Int, unique)
- `book` (String)
- `chapterNumber` (Int)
- `content` (String)

### Comment
- `id` (String, CUID)
- `content` (String)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `userId` (String, foreign key)
- `chapterId` (String, foreign key)
- `parentId` (String?, foreign key to Comment for replies)

### Notification
- `id` (String, CUID)
- `userId` (String, foreign key: the user being notified)
- `commentId` (String, foreign key: the reply)
- `parentCommentId` (String: the comment that was replied to)
- `read` (Boolean)
- `createdAt` (DateTime)

### AppConfig
- `key` (String, primary key)
- `value` (String)
- `updatedAt` (DateTime)

Currently unused; the app version now comes from `package.json`.
