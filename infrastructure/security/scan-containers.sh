#!/usr/bin/env bash
set -euo pipefail

# scan-containers.sh — Scan Docker images for vulnerabilities
# Usage: ./scan-containers.sh [image-tag]

TAG="${1:-latest}"
IMAGES=(
  "gistpin-backend:$TAG"
  "gistpin-frontend:$TAG"
  "gistpin-postgres:$TAG"
)
REPORT_DIR="${REPORT_DIR:-/tmp/security-reports}"
mkdir -p "$REPORT_DIR"
FAILED=0

log() { echo "[$(date +%H:%M:%S)] $*"; }

for IMAGE in "${IMAGES[@]}"; do
  log "Scanning $IMAGE..."
  REPORT="$REPORT_DIR/container-$(echo "$IMAGE" | tr '/:' '--')-$(date +%Y%m%d).json"

  trivy image \
    --severity HIGH,CRITICAL \
    --format json \
    --output "$REPORT" \
    --exit-code 1 \
    "$IMAGE" 2>/dev/null || {
      log "VULNERABILITIES found in $IMAGE — see $REPORT"
      FAILED=1
    }
done

if [[ "$FAILED" -eq 1 ]]; then
  log "Container scan FAILED — fix vulnerabilities before deploying"
  exit 1
fi

log "All container scans passed. Reports in $REPORT_DIR"
