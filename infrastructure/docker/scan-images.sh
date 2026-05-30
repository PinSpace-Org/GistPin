#!/usr/bin/env bash
set -euo pipefail

IMAGE="${1:?Usage: scan-images.sh <image> [report-dir]}"
REPORT_DIR="${2:-reports}"
mkdir -p "$REPORT_DIR"
REPORT="$REPORT_DIR/trivy-$(date +%Y%m%d-%H%M%S).json"

echo "Scanning $IMAGE for vulnerabilities..."

trivy image \
  --exit-code 1 \
  --severity CRITICAL,HIGH \
  --format json \
  --output "$REPORT" \
  "$IMAGE"

echo "Scan complete. Report: $REPORT"
