#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

DOMAINS="${DOMAINS:-gistpin.io api.gistpin.io}"
WARN_DAYS="${WARN_DAYS:-30}"
CRITICAL_DAYS="${CRITICAL_DAYS:-7}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
EXIT_CODE=0

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

days_until_expiry() {
  local domain="$1"
  local port="${2:-443}"
  local expiry
  expiry="$(echo | openssl s_client -servername "${domain}" -connect "${domain}:${port}" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
  if [[ -z "${expiry}" ]]; then
    echo "-1"
    return
  fi
  local expiry_epoch now_epoch
  expiry_epoch="$(date -d "${expiry}" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "${expiry}" +%s)"
  now_epoch="$(date +%s)"
  echo $(( (expiry_epoch - now_epoch) / 86400 ))
}

send_alert() {
  local message="$1"
  log "ALERT: ${message}"
  if [[ -n "${SLACK_WEBHOOK}" ]]; then
    curl -s -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"[GistPin SSL Alert] ${message}\"}" >/dev/null
  fi
}

check_domain() {
  local domain="$1"
  local days
  days="$(days_until_expiry "${domain}")"

  if (( days < 0 )); then
    send_alert "Could not retrieve certificate for ${domain}."
    EXIT_CODE=2
    return
  fi

  log "Domain: ${domain} | Days until expiry: ${days}"

  if (( days <= CRITICAL_DAYS )); then
    send_alert "CRITICAL: Certificate for ${domain} expires in ${days} days!"
    EXIT_CODE=2
  elif (( days <= WARN_DAYS )); then
    send_alert "WARNING: Certificate for ${domain} expires in ${days} days."
    [[ ${EXIT_CODE} -lt 1 ]] && EXIT_CODE=1
  else
    log "OK: ${domain} certificate is valid for ${days} more days."
  fi
}

main() {
  log "Starting SSL/TLS certificate check..."
  for domain in ${DOMAINS}; do
    check_domain "${domain}"
  done
  log "Certificate check complete. Exit code: ${EXIT_CODE}"
  exit "${EXIT_CODE}"
}

main "$@"
