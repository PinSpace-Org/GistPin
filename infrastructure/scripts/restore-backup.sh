#!/usr/bin/env bash
set -euo pipefail

# restore-backup.sh — Restore a PostgreSQL backup to a target database
# Usage: ./restore-backup.sh <backup-id> <target-db>

BACKUP_ID="${1:?Usage: $0 <backup-id> <target-db>}"
TARGET_DB="${2:?Usage: $0 <backup-id> <target-db>}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gistpin}"
BACKUP_FILE="$BACKUP_DIR/${BACKUP_ID}.dump"

log() { echo "[$(date +%H:%M:%S)] $*"; }

if [[ "$BACKUP_ID" == "latest" ]]; then
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.dump 2>/dev/null | head -1)
  [[ -z "$BACKUP_FILE" ]] && { log "ERROR: No backups found in $BACKUP_DIR"; exit 1; }
fi

[[ ! -f "$BACKUP_FILE" ]] && { log "ERROR: Backup file not found: $BACKUP_FILE"; exit 1; }

log "Restoring $BACKUP_FILE -> $TARGET_DB"

# Create target DB if it doesn't exist
psql -c "CREATE DATABASE $TARGET_DB;" 2>/dev/null || true

# Restore
pg_restore --no-owner --no-acl -d "$TARGET_DB" "$BACKUP_FILE"

log "Restore complete: $TARGET_DB"
