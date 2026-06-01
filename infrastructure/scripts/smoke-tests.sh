#!/usr/bin/env bash
# Infrastructure smoke test suite
# Covers: service health, DB connectivity, external API reachability, DNS, SSL
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS=0; FAIL=0

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
pass() { log "  PASS: $*"; ((PASS++)) || true; }
fail() { log "  FAIL: $*"; ((FAIL++)) || true; }

# ── Service health checks ─────────────────────────────────────────────────────
check_health() {
  log "=== Service Health ==="
  local endpoints=("/health" "/health/db" "/health/liveness" "/health/readiness")
  for ep in "${endpoints[@]}"; do
    local url="${BASE_URL}${ep}"
    local code
    code="$(curl -sf -o /dev/null -w "%{http_code}" --max-time 5 "${url}" 2>/dev/null || echo "000")"
    if [[ "${code}" == "200" ]]; then
      pass "${url} → ${code}"
    else
      fail "${url} → ${code}"
    fi
  done
}

# ── Database connectivity ─────────────────────────────────────────────────────
check_db() {
  log "=== Database Connectivity ==="
  local db_url="${DATABASE_URL:-}"
  if [[ -z "${db_url}" ]]; then
    log "  SKIP: DATABASE_URL not set"
    return
  fi
  if command -v psql &>/dev/null; then
    if psql "${db_url}" -c "SELECT 1" &>/dev/null; then
      pass "PostgreSQL connection"
    else
      fail "PostgreSQL connection"
    fi
  else
    log "  SKIP: psql not available"
  fi
}

# ── External API reachability ─────────────────────────────────────────────────
check_external_apis() {
  log "=== External API Reachability ==="
  local apis=(
    "https://horizon.stellar.org"
    "https://api.ipify.org"
  )
  for api in "${apis[@]}"; do
    local code
    code="$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 "${api}" 2>/dev/null || echo "000")"
    if [[ "${code}" =~ ^2 ]]; then
      pass "${api} → ${code}"
    else
      fail "${api} → ${code}"
    fi
  done
}

# ── DNS resolution ────────────────────────────────────────────────────────────
check_dns() {
  log "=== DNS Resolution ==="
  local hosts=("horizon.stellar.org" "api.ipify.org")
  for host in "${hosts[@]}"; do
    if command -v dig &>/dev/null; then
      if dig +short "${host}" | grep -qE '^[0-9]'; then
        pass "DNS ${host}"
      else
        fail "DNS ${host}"
      fi
    elif getent hosts "${host}" &>/dev/null; then
      pass "DNS ${host}"
    else
      fail "DNS ${host}"
    fi
  done
}

# ── SSL validation ────────────────────────────────────────────────────────────
check_ssl() {
  log "=== SSL Validation ==="
  local tls_hosts=("horizon.stellar.org" "api.ipify.org")
  for host in "${tls_hosts[@]}"; do
    if echo | openssl s_client -connect "${host}:443" -servername "${host}" \
        -verify_return_error 2>/dev/null | grep -q "Verify return code: 0"; then
      pass "SSL ${host}"
    else
      fail "SSL ${host} (cert invalid or openssl unavailable)"
    fi
  done
}

# ── Run all checks ────────────────────────────────────────────────────────────
check_health
check_db
check_external_apis
check_dns
check_ssl

log ""
log "Results: ${PASS} passed, ${FAIL} failed"
[[ "${FAIL}" -eq 0 ]] || { log "Smoke tests FAILED"; exit 1; }
log "All smoke tests passed."
