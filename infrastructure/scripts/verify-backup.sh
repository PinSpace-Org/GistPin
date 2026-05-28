#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
TEST_DB_URL="${TEST_DB_URL:-postgres://postgres:postgres@localhost:5432/gistpin_backup_test}"
SQL_CHECKS="infrastructure/ci/backup-tests/integrity-checks.sql"

if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Usage: verify-backup.sh <backup-file.sql>"
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

if [[ ! -f "${SQL_CHECKS}" ]]; then
  echo "SQL checks file not found: ${SQL_CHECKS}"
  exit 1
fi

createdb "${TEST_DB_URL##*/}" >/dev/null 2>&1 || true
psql "${TEST_DB_URL}" -f "${BACKUP_FILE}" >/tmp/backup-restore.log
psql "${TEST_DB_URL}" -f "${SQL_CHECKS}" >/tmp/backup-integrity.log

if ! grep -q "user_count" /tmp/backup-integrity.log; then
  echo "Integrity check failed: users count missing"
  exit 1
fi

if ! grep -q "gist_count" /tmp/backup-integrity.log; then
  echo "Integrity check failed: gists count missing"
  exit 1
fi

if ! grep -q "comment_count" /tmp/backup-integrity.log; then
  echo "Integrity check failed: comments count missing"
  exit 1
fi

echo "Backup verification passed"
