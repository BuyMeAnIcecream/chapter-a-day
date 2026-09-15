#!/bin/sh
# Production entrypoint: migrate, seed, then start the server.
# A failed migration aborts startup; a failed seed does not.
set -e

echo "Running database migrations..."
npx prisma migrate deploy
echo "Migrations completed successfully!"

echo "Seeding database if empty..."
npm run seed || echo "Seeding failed; continuing startup."

echo "Starting server..."
exec node dist/index.js
