#!/usr/bin/env bash
set -euo pipefail

MIGRATION_DIR="Backend/src/database/migrations"
ROLLBACK_MODE=false

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
fail() { log "FAIL: $*"; exit_code=1; }

exit_code=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --files)
      shift
      MIGRATION_FILES=($@)
      break
      ;;
    --rollback)
      ROLLBACK_MODE=true
      shift
      ;;
    *)
      echo "Usage: $0 [--files <file1 file2 ...>] [--rollback]"
      exit 1
      ;;
  esac
done

if [[ "$ROLLBACK_MODE" == true ]]; then
  log "Running rollback validation..."
  if [[ -d "$MIGRATION_DIR" ]]; then
    for f in "$MIGRATION_DIR"/*.ts; do
      if grep -qE 'down\s*:\s*Promise\.resolve' "$f"; then
        log "Rollback exists for $(basename "$f")"
      elif grep -qE '##down' "$f" 2>/dev/null; then
        log "Rollback exists for $(basename "$f")"
      else
        fail "Migration $(basename "$f") has no rollback implementation"
      fi
    done
  fi
  if [[ $exit_code -eq 0 ]]; then
    log "Rollback validation passed."
  fi
  exit $exit_code
fi

log "Checking migration files for breaking changes..."

for file in "${MIGRATION_FILES[@]}"; do
  log "Checking $file..."

  if grep -qiE 'DROP\s+COLUMN' "$file"; then
    fail "$file contains DROP COLUMN — breaking change"
  fi

  if grep -qiE 'ALTER\s+.*\s+TYPE\s+' "$file"; then
    fail "$file contains ALTER COLUMN TYPE — potential breaking change"
  fi

  if grep -qiE 'ALTER\s+.*\s+SET\s+NOT\s+NULL' "$file" && ! grep -qiE 'DEFAULT' "$file"; then
    fail "$file adds NOT NULL without DEFAULT — breaking change"
  fi

  if grep -qiE 'DROP\s+TABLE' "$file"; then
    fail "$file contains DROP TABLE — breaking change"
  fi

  if grep -qiE 'RENAME\s+(COLUMN|TABLE)' "$file"; then
    fail "$file contains RENAME — breaking change for running applications"
  fi

  if grep -qiE 'ALTER\s+COLUMN.*DROP\s+DEFAULT' "$file"; then
    fail "$file drops column DEFAULT — may cause application errors"
  fi

  log "$file — no breaking changes detected"
done

if [[ $exit_code -eq 0 ]]; then
  log "All migration safety checks passed."
else
  log "Some migration safety checks failed."
fi

exit $exit_code
