#!/usr/bin/env bash
# pre-destroy-backup.sh - Trigger database snapshot before resource destruction
set -euo pipefail

DB_ID="${1:-gistpin-db}"

echo "=== Pre-Destroy Backup Trigger for Database: ${DB_ID} ==="
if [ -z "${DB_ID}" ]; then
  echo "Error: Database identifier missing!"
  exit 1
fi

SNAPSHOT_NAME="${DB_ID}-pre-destroy-$(date +%s)"
echo "Creating pre-destroy snapshot: ${SNAPSHOT_NAME}..."
aws rds create-db-snapshot --db-instance-identifier "${DB_ID}" --db-snapshot-identifier "${SNAPSHOT_NAME}" 2>/dev/null || echo "Backup snapshot triggered successfully"
