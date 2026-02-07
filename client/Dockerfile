# Client Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . ./

# Build arguments
ARG VITE_API_URL=http://localhost:4000
ARG VITE_GA_MEASUREMENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID

RUN npm run generate:favicons && npm run generate:og-image && npm run build

# Production image with nginx
FROM nginx:alpine AS runner
WORKDIR /app

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
