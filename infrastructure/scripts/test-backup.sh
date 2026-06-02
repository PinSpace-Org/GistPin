#!/usr/bin/env bash
set -euo pipefail

# test-backup.sh — Verify backup integrity by restoring to a test environment
# Usage: ./test-backup.sh [backup-id]

BACKUP_ID="${1:-latest}"
TEST_DB="gistpin_backup_test"
LOG_FILE="/tmp/backup-test-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

log "Starting backup test for: $BACKUP_ID"

# 1. Restore backup to test environment
log "Restoring backup..."
./restore-backup.sh "$BACKUP_ID" "$TEST_DB"

# 2. Validate data integrity
log "Validating data integrity..."
RECORD_COUNT=$(psql "$TEST_DB" -tAc "SELECT COUNT(*) FROM gists;" 2>/dev/null || echo 0)
if [[ "$RECORD_COUNT" -eq 0 ]]; then
  log "ERROR: No records found after restore"
  exit 1
fi
log "Record count: $RECORD_COUNT"

# 3. Performance test — basic query latency
log "Running performance check..."
START=$(date +%s%N)
psql "$TEST_DB" -c "SELECT id, lat, lng FROM gists LIMIT 100;" > /dev/null
END=$(date +%s%N)
LATENCY=$(( (END - START) / 1000000 ))
log "Query latency: ${LATENCY}ms"

# 4. Cleanup test DB
log "Cleaning up test environment..."
psql -c "DROP DATABASE IF EXISTS $TEST_DB;" > /dev/null

log "Backup test PASSED. Log: $LOG_FILE"
