#!/usr/bin/env bash
set -euo pipefail

# scan-dependencies.sh — Scan project dependencies for known vulnerabilities
# Usage: ./scan-dependencies.sh [--fail-on high|critical]

FAIL_ON="${2:-critical}"
REPORT_DIR="${REPORT_DIR:-/tmp/security-reports}"
mkdir -p "$REPORT_DIR"
REPORT="$REPORT_DIR/dep-scan-$(date +%Y%m%d-%H%M%S).json"

log() { echo "[$(date +%H:%M:%S)] $*"; }

log "Scanning dependencies (fail-on: $FAIL_ON)..."

# Node.js — npm audit
if [[ -f "package.json" ]]; then
  log "Running npm audit..."
  npm audit --json > "$REPORT_DIR/npm-audit.json" 2>/dev/null || true
fi

# Rust — cargo audit
if [[ -f "contracts/Cargo.toml" ]]; then
  log "Running cargo audit..."
  cargo audit --json > "$REPORT_DIR/cargo-audit.json" 2>/dev/null || true
fi

# Trivy filesystem scan (covers all ecosystems)
log "Running Trivy filesystem scan..."
trivy fs . \
  --severity "$(echo "$FAIL_ON" | tr '[:lower:]' '[:upper:]'),HIGH" \
  --format json \
  --output "$REPORT" \
  --exit-code 1 2>/dev/null || {
    log "VULNERABILITIES FOUND — review $REPORT"
    exit 1
  }

log "No $FAIL_ON vulnerabilities found. Report: $REPORT"
