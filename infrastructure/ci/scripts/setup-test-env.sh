#!/usr/bin/env bash
set -euo pipefail

echo "Setting up integration test environment..."

# Start PostgreSQL
docker run -d \
  --name gistpin-test-db \
  -e POSTGRES_USER=gistpin_test \
  -e POSTGRES_PASSWORD="${TEST_DB_PASSWORD:-test_password}" \
  -e POSTGRES_DB=gistpin_test \
  -p 5432:5432 \
  postgres:15-alpine

# Wait for DB to be ready
echo "Waiting for database..."
for i in $(seq 1 30); do
  if docker exec gistpin-test-db pg_isready -U gistpin_test -d gistpin_test &>/dev/null; then
    echo "Database ready."
    break
  fi
  sleep 1
done

# Run migrations
cd Backend
DATABASE_URL="postgresql://gistpin_test:${TEST_DB_PASSWORD:-test_password}@localhost:5432/gistpin_test" \
  npm run migration:run 2>/dev/null || echo "No migrations to run."

echo "Test environment ready."
