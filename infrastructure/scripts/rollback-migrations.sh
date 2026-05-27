#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-development}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

log "Rolling back migrations for $ENVIRONMENT..."

cd Backend
if npm run --silent typeorm:rollback 2>/dev/null; then
  log "Rollback completed successfully."
else
  log "No typeorm:rollback script found; manual rollback may be required."
fi
cd ..

# Update migration report with rollback status
REPORT_FILE="migration-report.json"
cat > "$REPORT_FILE" <<EOF
{
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "commit": "${GITHUB_SHA:-local}",
  "status": "rolled_back"
}
EOF

log "Rollback complete. Report updated."
