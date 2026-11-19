#!/usr/bin/env bash
set -euo pipefail

# Monitor Certificate Transparency logs for unauthorized certificates
# issued against domains managed by GistPin.
#
# Usage:
#   ./monitor-ct-logs.sh
#
# Environment variables:
#   DOMAIN_ALLOWLIST_FILE  — Path to a file of allowed domains (one per line)
#   SLACK_WEBHOOK          — Slack incoming webhook URL for alerts
#   CT_API_BASE            — crt.sh API base URL (default: https://crt.sh)
#   CHECK_INTERVAL         — Seconds between checks (default: 3600)
#   STATE_FILE             — Path to state tracking file (default: /tmp/ct-state.json)
#   LOOKBACK_HOURS         — Hours of CT log to scan (default: 24)
#   REPORT_DIR             — Directory for weekly reports (default: /tmp/ct-reports)

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN_ALLOWLIST_FILE="${DOMAIN_ALLOWLIST_FILE:-${REPO_ROOT}/security/ct-allowlist.txt}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
CT_API_BASE="${CT_API_BASE:-https://crt.sh}"
CHECK_INTERVAL="${CHECK_INTERVAL:-3600}"
STATE_FILE="${STATE_FILE:-/tmp/ct-state.json}"
LOOKBACK_HOURS="${LOOKBACK_HOURS:-24}"
REPORT_DIR="${REPORT_DIR:-/tmp/ct-reports}"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

err() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: $*" >&2
}

send_alert() {
  local title="$1"
  local message="$2"

  if [[ -z "${SLACK_WEBHOOK}" ]]; then
    log "ALERT (no webhook): ${title} — ${message}"
    return
  fi

  curl -sS -X POST -H 'Content-Type: application/json' \
    -d "{\"text\": \"*:shield: CT Alert: ${title}*\n${message}\"}" \
    "${SLACK_WEBHOOK}" >/dev/null 2>&1 || err "Failed to send Slack alert"
}

load_allowlist() {
  if [[ ! -f "${DOMAIN_ALLOWLIST_FILE}" ]]; then
    err "Allowlist not found: ${DOMAIN_ALLOWLIST_FILE}"
    exit 1
  fi
  grep -v '^\s*#' "${DOMAIN_ALLOWLIST_FILE}" | grep -v '^\s*$'
}

query_crtsh() {
  local domain="$1"
  local lookback="$2"

  local since_date
  since_date=$(date -u -d "${lookback} hours ago" +%Y-%m-%dT%H:%M:%S 2>/dev/null || \
               date -u -v-"${lookback}"H +%Y-%m-%dT%H:%M:%S 2>/dev/null)

  local url="${CT_API_BASE}/?q=${domain}&output=json"

  local response
  response=$(curl -sS --max-time 30 "${url}" 2>/dev/null) || {
    err "Failed to query crt.sh for ${domain}"
    return 1
  }

  echo "${response}"
}

check_domain() {
  local domain="$1"
  local lookback="$2"
  local allowlist_file="$3"

  log "Checking CT logs for: ${domain}"

  local response
  response=$(query_crtsh "${domain}" "${lookback}") || return 1

  local cert_count
  cert_count=$(echo "${response}" | jq 'length' 2>/dev/null || echo "0")

  if [[ "${cert_count}" -eq 0 ]]; then
    log "  No new certificates for ${domain}"
    return
  fi

  log "  Found ${cert_count} certificate(s) for ${domain}"

  local new_certs
  new_certs=$(echo "${response}" | jq -r --argfile allow <(cat "${allowlist_file}" | jq -R . | jq -s .) '
    [.[] | select(
      .issuer_name != null and
      (.issuer_name | test("Let.s Encrypt|Google Trust|DigiCert|Cloudflare") | not) and
      (.name_value // .common_name // "" | IN($allow[]) | not)
    )] | length
  ' 2>/dev/null || echo "0")

  if [[ "${new_certs}" -gt 0 ]]; then
    local domains
    domains=$(echo "${response}" | jq -r '
      [.[] | .name_value // .common_name // ""]
      | unique | .[]
    ' 2>/dev/null | head -20)

    send_alert \
      "Unexpected certificate for ${domain}" \
      "Found ${new_certs} certificate(s) not matching the allowlist.\nDomains: ${domains}\nReview: https://crt.sh/?q=${domain}"

    return 1
  fi

  log "  All certificates match allowlist for ${domain}"
  return 0
}

generate_report() {
  local report_file="${REPORT_DIR}/ct-report-$(date +%Y-%m-%d).md"
  mkdir -p "${REPORT_DIR}"

  {
    echo "# Certificate Transparency Report — $(date +%Y-%m-%d)"
    echo ""
    echo "| Domain | Certs Checked | Status |"
    echo "|--------|---------------|--------|"

    local exit_code=0
    while IFS= read -r domain; do
      [[ -z "${domain}" ]] && continue
      local response
      response=$(query_crtsh "${domain}" "${LOOKBACK_HOURS}" 2>/dev/null) || continue
      local count
      count=$(echo "${response}" | jq 'length' 2>/dev/null || echo "0")
      echo "| ${domain} | ${count} | OK |"
    done < <(load_allowlist)

    echo ""
    echo "Generated at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "${report_file}"

  log "Report written to ${report_file}"
}

main() {
  local exit_code=0

  if [[ "${1:-}" == "--report" ]]; then
    generate_report
    exit 0
  fi

  log "Starting CT log monitoring (interval: ${CHECK_INTERVAL}s, lookback: ${LOOKBACK_HOURS}h)"

  while true; do
    while IFS= read -r domain; do
      [[ -z "${domain}" ]] && continue
      check_domain "${domain}" "${LOOKBACK_HOURS}" "${DOMAIN_ALLOWLIST_FILE}" || exit_code=1
    done < <(load_allowlist)

    if [[ ${exit_code} -ne 0 ]]; then
      log "Alerts generated this cycle"
    else
      log "All domains clean"
    fi

    exit_code=0
    log "Sleeping ${CHECK_INTERVAL}s until next check"
    sleep "${CHECK_INTERVAL}"
  done
}

main "$@"
