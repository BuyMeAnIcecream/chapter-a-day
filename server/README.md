# Chapter a Day - Server

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

## Database Management

- **View database**: `npx prisma studio`
- **Reset database**: `npx prisma migrate reset`
- **Create migration**: `npx prisma migrate dev --name migration_name`
- **Apply migrations**: `npx prisma migrate deploy` (for production)
