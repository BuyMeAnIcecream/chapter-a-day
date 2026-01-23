# Docker Setup

This project can be run using Docker Compose for both development and production.

## Prerequisites

- Docker and Docker Compose installed
- Environment variables configured (see below)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=chapteraday
POSTGRES_PORT=5432

# Server
SERVER_PORT=4000
JWT_SECRET=your-secret-key-here

# Client
CLIENT_PORT=80
```

## Production

Build and run the production containers:

```bash
docker-compose up -d
```

This will:
- Start PostgreSQL database
- Build and start the server
- Build and start the client (served via nginx)
- Run database migrations automatically

Access the application at:
- Client: http://localhost (or http://localhost:80)
- Server API: http://localhost:4000

## Development

For development with hot reload:

```bash
docker-compose -f docker-compose.dev.yml up
```

This will:
- Start PostgreSQL database
- Mount source code as volumes for hot reload
- Run development servers with file watching

## Database Migrations

Migrations run automatically on server startup in production. For manual migration:

```bash
# Production
docker-compose exec server npx prisma migrate deploy

# Development
docker-compose -f docker-compose.dev.yml exec server npx prisma migrate deploy
```

## Seeding Database

To seed the database with initial chapters:

```bash
# Production
docker-compose exec server npm run seed

# Development
docker-compose -f docker-compose.dev.yml exec server npm run seed
```

## Importing KJV Text

To import chapter content from the KJV text file:

```bash
# Production
docker-compose exec server npm run import:kjv

# Development
docker-compose -f docker-compose.dev.yml exec server npm run import:kjv
```

Note: The `book/kjv.txt` file needs to be available in the container. You may need to copy it or mount it as a volume.

## Stopping Containers

```bash
# Production
docker-compose down

# Development
docker-compose -f docker-compose.dev.yml down
```

## Viewing Logs

```bash
# Production
docker-compose logs -f

# Development
docker-compose -f docker-compose.dev.yml logs -f
```

## Building Images

To rebuild images after changes:

```bash
# Production
docker-compose build

# Development
docker-compose -f docker-compose.dev.yml build
```
