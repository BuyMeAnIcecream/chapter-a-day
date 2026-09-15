# Server Dockerfile
# Build context must be the repository root, e.g.:
#   docker build -f server/Dockerfile .
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
COPY server/book ./book
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

# Run migrations, seed, and start the server (exits if migrations fail)
CMD ["sh", "scripts/start.sh"]
