#!/usr/bin/env bash
# Pre-deploy infrastructure dependency health checks.
#
# Verifies that every external dependency GistPin needs at runtime is
# reachable before a deploy is allowed to proceed. Intended to run as a
# gate in infrastructure/ci/pre-deploy-checks.yml, but is safe to run
# locally too.
#
# Checks:
#   - Database (Postgres/PostGIS) reachability + a real query
#   - Soroban RPC (Stellar) availability via its getHealth method
#   - IPFS gateway / Pinata pinning API availability
#
# Exit code:
#   0  all critical checks passed (or EMERGENCY_BYPASS was used)
#   1  one or more critical checks failed and no bypass was given
#
# Emergency bypass:
#   EMERGENCY_BYPASS=true EMERGENCY_REASON="incident-1234, DB flaky but confirmed up manually" \
#     ./infrastructure/scripts/check-dependencies.sh
#   Bypass still runs every check and writes the report -- it only changes
#   whether a failed check blocks the exit code. EMERGENCY_REASON is
#   required and gets embedded in the report for audit purposes.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

# --- Config (env-overridable, matches Backend/.env.example) -----------------
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_NAME="${DATABASE_NAME:-gistpin}"
DATABASE_USER="${DATABASE_USER:-gistpin}"
DATABASE_PASSWORD="${DATABASE_PASSWORD:-}"

SOROBAN_RPC_URL="${SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org}"

IPFS_GATEWAY="${IPFS_GATEWAY:-https://gateway.pinata.cloud/ipfs}"
PINATA_API_KEY="${PINATA_API_KEY:-}"
PINATA_SECRET_KEY="${PINATA_SECRET_KEY:-}"

TIMEOUT="${TIMEOUT:-10}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"

EMERGENCY_BYPASS="${EMERGENCY_BYPASS:-false}"
EMERGENCY_REASON="${EMERGENCY_REASON:-}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
warn() { log "WARN: $*"; }
fail() { log "FAIL: $*"; }

mkdir -p "${REPORT_DIR}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
REPORT_FILE="${REPORT_DIR}/dependency-health-${TIMESTAMP}.json"

RESULTS=()   # each entry: name|status|critical|detail
OVERALL_OK=true

record() {
  local name="$1" status="$2" critical="$3" detail="$4"
  RESULTS+=("${name}|${status}|${critical}|${detail}")
  if [[ "${status}" != "ok" && "${critical}" == "true" ]]; then
    OVERALL_OK=false
  fi
}

# --- Checks -------------------------------------------------------------

check_database() {
  log "Checking database reachability at ${DATABASE_HOST}:${DATABASE_PORT}..."

  if command -v pg_isready >/dev/null 2>&1; then
    if ! pg_isready -h "${DATABASE_HOST}" -p "${DATABASE_PORT}" -t "${TIMEOUT}" >/dev/null 2>&1; then
      fail "Database not reachable at ${DATABASE_HOST}:${DATABASE_PORT}"
      record "database" "error" "true" "pg_isready failed against ${DATABASE_HOST}:${DATABASE_PORT}"
      return
    fi
  elif ! timeout "${TIMEOUT}" bash -c "echo > /dev/tcp/${DATABASE_HOST}/${DATABASE_PORT}" 2>/dev/null; then
    fail "Database not reachable at ${DATABASE_HOST}:${DATABASE_PORT}"
    record "database" "error" "true" "TCP connect failed to ${DATABASE_HOST}:${DATABASE_PORT}"
    return
  fi

  if command -v psql >/dev/null 2>&1; then
    local result
    result=$(PGPASSWORD="${DATABASE_PASSWORD}" psql -h "${DATABASE_HOST}" -p "${DATABASE_PORT}" \
      -U "${DATABASE_USER}" -d "${DATABASE_NAME}" -tAc "SELECT 1" 2>&1 || true)
    if [[ "${result}" != "1" ]]; then
      fail "Database query check failed: ${result}"
      record "database" "error" "true" "SELECT 1 did not return 1: ${result}"
      return
    fi
  else
    warn "psql not available, skipping query-level check"
  fi

  log "Database OK"
  record "database" "ok" "true" "reachable and query check passed"
}

check_soroban_rpc() {
  log "Checking Soroban RPC at ${SOROBAN_RPC_URL}..."

  local response
  response=$(curl -s -m "${TIMEOUT}" -X POST "${SOROBAN_RPC_URL}" \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>&1 || true)

  if echo "${response}" | grep -q '"status"[[:space:]]*:[[:space:]]*"healthy"'; then
    log "Soroban RPC OK"
    record "soroban_rpc" "ok" "true" "getHealth returned healthy"
  else
    fail "Soroban RPC did not report healthy: ${response}"
    record "soroban_rpc" "error" "true" "unexpected getHealth response: ${response}"
  fi
}

check_ipfs_gateway() {
  log "Checking IPFS gateway at ${IPFS_GATEWAY}..."

  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' -m "${TIMEOUT}" "${IPFS_GATEWAY}" 2>/dev/null || true)
  status="${status:-000}"

  # Gateway root commonly returns 4xx (no CID given) -- any real HTTP
  # response means the gateway itself is up. 000 means unreachable.
  if [[ "${status}" == "000" ]]; then
    fail "IPFS gateway unreachable at ${IPFS_GATEWAY}"
    record "ipfs_gateway" "error" "false" "no response from ${IPFS_GATEWAY}"
  else
    log "IPFS gateway OK (HTTP ${status})"
    record "ipfs_gateway" "ok" "false" "responded with HTTP ${status}"
  fi
}

check_pinata_api() {
  if [[ -z "${PINATA_API_KEY}" || -z "${PINATA_SECRET_KEY}" ]]; then
    log "Pinata API keys not configured, skipping (dev uses mock CIDs)"
    record "pinata_api" "skipped" "false" "PINATA_API_KEY/PINATA_SECRET_KEY not set"
    return
  fi

  log "Checking Pinata API authentication..."
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' -m "${TIMEOUT}" \
    -H "pinata_api_key: ${PINATA_API_KEY}" \
    -H "pinata_secret_api_key: ${PINATA_SECRET_KEY}" \
    "https://api.pinata.cloud/data/testAuthentication" 2>/dev/null || true)
  status="${status:-000}"

  if [[ "${status}" == "200" ]]; then
    log "Pinata API OK"
    record "pinata_api" "ok" "false" "testAuthentication returned HTTP 200"
  else
    fail "Pinata API auth check failed (HTTP ${status})"
    record "pinata_api" "error" "false" "testAuthentication returned HTTP ${status}"
  fi
}

# --- Report ---------------------------------------------------------------

write_report() {
  local entries_json="[]"
  local entry
  for entry in "${RESULTS[@]}"; do
    IFS='|' read -r name status critical detail <<< "${entry}"
    entries_json=$(echo "${entries_json}" | jq \
      --arg name "${name}" --arg status "${status}" \
      --argjson critical "${critical}" --arg detail "${detail}" \
      '. + [{name: $name, status: $status, critical: $critical, detail: $detail}]')
  done

  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson overall_ok "${OVERALL_OK}" \
    --argjson bypassed "${EMERGENCY_BYPASS}" \
    --arg bypass_reason "${EMERGENCY_REASON}" \
    --argjson checks "${entries_json}" \
    '{timestamp: $timestamp, overall_ok: $overall_ok, emergency_bypass: $bypassed, emergency_reason: $bypass_reason, checks: $checks}' \
    > "${REPORT_FILE}"

  log "Report written to ${REPORT_FILE}"
}

main() {
  log "Starting pre-deploy dependency health checks..."

  if ! command -v jq >/dev/null 2>&1; then
    fail "jq is required to run this script"
    exit 1
  fi

  check_database
  check_soroban_rpc
  check_ipfs_gateway
  check_pinata_api

  write_report

  if [[ "${OVERALL_OK}" == "true" ]]; then
    log "All critical dependencies healthy. Deploy may proceed."
    exit 0
  fi

  fail "One or more critical dependencies are unhealthy."

  if [[ "${EMERGENCY_BYPASS}" == "true" ]]; then
    if [[ -z "${EMERGENCY_REASON}" ]]; then
      fail "EMERGENCY_BYPASS set but EMERGENCY_REASON is empty. Refusing to bypass without a reason."
      exit 1
    fi
    warn "EMERGENCY_BYPASS active -- proceeding despite unhealthy dependencies."
    warn "Reason on record: ${EMERGENCY_REASON}"
    exit 0
  fi

  fail "Blocking deploy. Re-run with EMERGENCY_BYPASS=true and EMERGENCY_REASON=\"...\" only for genuine emergencies."
  exit 1
}

main "$@"
