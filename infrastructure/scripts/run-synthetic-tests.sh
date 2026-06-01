#!/usr/bin/env bash
# Run GistPin synthetic monitoring tests
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../monitoring/synthetic-config.yml"
TESTS_DIR="${SCRIPT_DIR}/../monitoring/synthetic-tests"
BASE_URL="${BASE_URL:-https://api.gistpin.io}"
FRONTEND_URL="${FRONTEND_URL:-https://gistpin.io}"
TIMEOUT="${TIMEOUT:-10}"
PASS=0
FAIL=0

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
pass() { log "✓ $*"; ((PASS++)); }
fail() { log "✗ $*"; ((FAIL++)); }

run_http_step() {
  local name="$1" method="$2" url="$3" expected_status="$4"
  url="${url//\{\{ base_url \}\}/$BASE_URL}"
  url="${url//\{\{ frontend_url \}\}/$FRONTEND_URL}"

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time "$TIMEOUT" -X "$method" "$url" 2>/dev/null || echo "000")

  if [[ "$status" == "$expected_status" ]]; then
    pass "$name → HTTP $status"
  else
    fail "$name → expected $expected_status, got $status (url: $url)"
  fi
}

log "Starting synthetic tests against $BASE_URL"
log "================================================"

# api-health suite
log "Suite: api-health"
run_http_step "health-check"    GET "$BASE_URL/health"       200
run_http_step "readiness-check" GET "$BASE_URL/health/ready" 200
run_http_step "api-version"     GET "$BASE_URL/api/v1"       200
run_http_step "frontend-home"   GET "$FRONTEND_URL"          200

# geo-query-flow suite
log "Suite: geo-query-flow"
run_http_step "geo-query-sf" \
  GET "$BASE_URL/api/v1/gists/nearby?lat=37.7749&lon=-122.4194&radius_km=5&limit=20" 200
run_http_step "geo-query-london" \
  GET "$BASE_URL/api/v1/gists/nearby?lat=51.5074&lon=-0.1278&radius_km=5&limit=20" 200
run_http_step "geo-query-singapore" \
  GET "$BASE_URL/api/v1/gists/nearby?lat=1.3521&lon=103.8198&radius_km=5&limit=20" 200
run_http_step "geo-query-invalid-coords" \
  GET "$BASE_URL/api/v1/gists/nearby?lat=999&lon=999&radius_km=5" 400

log "================================================"
log "Results: $PASS passed, $FAIL failed"

if [[ $FAIL -gt 0 ]]; then
  log "SYNTHETIC TESTS FAILED"
  exit 1
fi

log "All synthetic tests passed"
