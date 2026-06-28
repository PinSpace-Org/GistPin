#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${REPO_ROOT}"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-gistpin}"
DB_USER="${DB_USER:-gistpin}"
DB_PASSWORD="${DB_PASSWORD:-}"
TIMEOUT="${TIMEOUT:-10}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
fail() { log "FAIL: $*"; exit 1; }

check_db_connectivity() {
  log "Checking database connectivity to ${DB_HOST}:${DB_PORT}..."
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -t "${TIMEOUT}" 2>&1 || fail "pg_isready failed"
  else
    timeout "${TIMEOUT}" bash -c "echo > /dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null || fail "Cannot connect to ${DB_HOST}:${DB_PORT}"
  fi
  log "Database connectivity OK"
}

check_db_query() {
  log "Running test query..."
  if command -v psql >/dev/null 2>&1; then
    local result
    result=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1 as test" -t 2>&1)
    if echo "${result}" | grep -q "1"; then
      log "Database query OK"
    else
      fail "Database query failed: ${result}"
    fi
  else
    log "WARNING: psql not available, skipping query check"
  fi
}

main() {
  log "Starting database smoke test..."
  check_db_connectivity
  check_db_query
  log "Database smoke test PASSED"
}

main "$@"
