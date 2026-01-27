# Chapter a Day

A daily Bible reading app that delivers one chapter per day from the New Testament, with a community commenting system.

## Features

- **Daily Chapter Delivery**: Automatically delivers the next chapter each day
- **User Authentication**: Secure registration and login with JWT tokens
- **Progress Tracking**: Tracks reading progress through all chapters
- **Community Comments**: Users can comment on chapters and reply to other comments
- **Nested Replies**: Support for threaded conversations

## Tech Stack

### Backend
- **Node.js** with **Express**
- **PostgreSQL** database
- **Prisma** ORM
- **JWT** authentication
- **bcrypt** for password hashing

### Frontend
- **React** with **TypeScript**
- **Vite** for build tooling
- Modern CSS styling

## Project Structure

```
chapter-a-day/
├── server/          # Express API server
├── client/          # React frontend
└── README.md        # This file
```

## Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/BuyMeAnIcecream/chapter-a-day.git
cd chapter-a-day
```

2. **Set up the server**
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your PostgreSQL connection string
npx prisma migrate dev
npm run seed
# Import actual chapter content from KJV text file
npm run import:kjv
npm run dev
```

**Note:** The seed script creates placeholder chapters. Run `npm run import:kjv` to populate with actual Bible content from `book/kjv.txt`. The seed script is safe - it won't overwrite existing chapters with real content.

3. **Set up the client** (in a new terminal)
```bash
cd client
npm install
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

**Using Docker Compose (Recommended):**
```bash
# Start all services with persistent database
docker-compose -f docker-compose.dev.yml up -d

# Run migrations and seed (first time only)
docker-compose -f docker-compose.dev.yml exec server npx prisma migrate dev
docker-compose -f docker-compose.dev.yml exec server npm run seed
docker-compose -f docker-compose.dev.yml exec server npm run import:kjv

# Database data persists in Docker volume - survives container restarts
# To completely reset (⚠️ deletes all data): docker-compose -f docker-compose.dev.yml down -v
```

## Testing

### Server Tests

**First-time setup** (creates separate test database):
```bash
cd server
npm run test:setup    # Create and migrate test database
```

**Running tests:**
```bash
cd server
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

**Note:** Tests use a separate `chapteraday_test` database to avoid interfering with development data. See [server README](./server/README.md#testing) for details.

### Client Tests
```bash
cd client
npm test              # Run all tests
npm run test:ui       # UI mode
npm run test:coverage # With coverage
```

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login user
- `GET /api/me` - Get current user info

### Chapters
- `GET /api/today` - Get today's chapter
- `GET /api/progress` - Get user's reading progress

### Comments
- `POST /api/chapters/:chapterId/comments` - Create a comment or reply
- `GET /api/chapters/:chapterId/comments` - Get all comments for a chapter
- `DELETE /api/comments/:commentId` - Delete own comment

## Database Schema

- **User**: User accounts with email and hashed passwords
- **Progress**: Tracks each user's reading progress
- **Chapter**: Bible chapters with content
- **Comment**: User comments on chapters with nested reply support

## Development

See individual README files for more details:
- [Server README](./server/README.md)
- [Client README](./client/README.md)

## License

ISC
