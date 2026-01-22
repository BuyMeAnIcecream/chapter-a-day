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

6. Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:4000` (or the PORT specified in .env).

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
  - Body: `{ email: string, password: string }`
  - Returns: `{ token: string, user: { id, email } }`

- `POST /api/login` - Login user
  - Body: `{ email: string, password: string }`
  - Returns: `{ token: string, user: { id, email } }`

- `GET /api/me` - Get current user (requires auth)
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ user: { id, email, createdAt } }`

### Chapters
- `GET /api/today` - Get today's chapter (requires auth)
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ date, progress, chapter: { id, book, chapterNumber, content } }`

- `GET /api/progress` - Get user's reading progress (requires auth)
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ progress, totalChapters }`

### Comments
- `POST /api/chapters/:chapterId/comments` - Create a comment or reply (requires auth)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ content: string, parentId?: string }`
  - Returns: `{ id, content, createdAt, updatedAt, user: { id, email }, parentId }`

- `GET /api/chapters/:chapterId/comments` - Get all comments for a chapter (requires auth)
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ comments: Comment[] }` (nested structure with replies)

- `DELETE /api/comments/:commentId` - Delete own comment (requires auth)
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ success: true }`

## Database Management

- **View database**: `npx prisma studio`
- **Reset database**: `npx prisma migrate reset`
- **Create migration**: `npx prisma migrate dev --name migration_name`
- **Apply migrations**: `npx prisma migrate deploy` (for production)

## Testing

Run tests with Jest:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Test Coverage
- Authentication endpoints
- Chapter delivery logic
- Comment CRUD operations
- Nested comment structure
- Permission checks (delete own comments only)
- Error handling and validation

All tests use a test database and are isolated with proper setup/teardown.

## Database Schema

### User
- `id` (String, CUID)
- `email` (String, unique)
- `passwordHash` (String)
- `createdAt` (DateTime)

### Progress
- `id` (String, CUID)
- `userId` (String, foreign key)
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
