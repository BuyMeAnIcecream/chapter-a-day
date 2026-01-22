#!/bin/bash

# Script to set up test database
# This creates a separate test database to avoid interfering with development data

set -e

echo "Setting up test database..."

# Get database connection details from .env or use defaults
DB_USER=${DB_USER:-$(whoami)}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
TEST_DB_NAME="chapteraday_test"

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL."
    exit 1
fi

# Create test database
echo "Creating test database: $TEST_DB_NAME"
createdb "$TEST_DB_NAME" 2>/dev/null || echo "Database $TEST_DB_NAME already exists or creation failed"

# Set test database URL
export TEST_DATABASE_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$TEST_DB_NAME?schema=public"

# Run migrations on test database
echo "Running migrations on test database..."
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy

echo "Test database setup complete!"
echo ""
echo "To use the test database, set TEST_DATABASE_URL in your .env.test file:"
echo "TEST_DATABASE_URL=\"$TEST_DATABASE_URL\""
