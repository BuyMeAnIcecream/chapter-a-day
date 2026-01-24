# Server Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY server/package*.json ./
RUN npm ci

# Generate Prisma Client
FROM base AS prisma
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server/prisma ./prisma
COPY server/package*.json ./
RUN npx prisma generate

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY server/package*.json ./
COPY server/tsconfig.json ./
COPY server/src ./src
# Copy book and scripts for KJV import
COPY book ./book
COPY server/scripts ./scripts
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy necessary files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY server/prisma ./prisma
# Copy book directory and scripts for KJV import (manual run)
COPY --from=builder /app/book ./book
COPY --from=builder /app/scripts ./scripts

# Set permissions
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

ENV PORT=4000

# Run migrations and start the server
CMD ["sh", "-c", "echo 'Running database migrations...' && npx prisma migrate deploy && echo 'Migrations completed successfully!' && echo 'Starting server...' && node dist/index.js"]
