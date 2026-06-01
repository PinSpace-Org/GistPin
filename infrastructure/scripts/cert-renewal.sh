#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

DOMAIN="${DOMAIN:-gistpin.io}"
EMAIL="${CERT_EMAIL:-admin@gistpin.io}"
CERT_DIR="${CERT_DIR:-/etc/letsencrypt/live/${DOMAIN}}"
RENEW_THRESHOLD_DAYS="${RENEW_THRESHOLD_DAYS:-30}"
WILDCARD="${WILDCARD:-false}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

check_certbot() {
  if ! command -v certbot >/dev/null 2>&1; then
    log "ERROR: certbot is not installed."
    exit 1
  fi
}

days_until_expiry() {
  local cert="$1"
  local expiry
  expiry="$(openssl x509 -enddate -noout -in "${cert}" | cut -d= -f2)"
  local expiry_epoch now_epoch
  expiry_epoch="$(date -d "${expiry}" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "${expiry}" +%s)"
  now_epoch="$(date +%s)"
  echo $(( (expiry_epoch - now_epoch) / 86400 ))
}

renew_cert() {
  local domain="$1"
  local wildcard="$2"

  if [[ "${wildcard}" == "true" ]]; then
    log "Requesting wildcard certificate for *.${domain}"
    certbot certonly \
      --dns-route53 \
      --agree-tos \
      --non-interactive \
      --email "${EMAIL}" \
      -d "${domain}" \
      -d "*.${domain}"
  else
    log "Renewing certificate for ${domain}"
    certbot renew \
      --cert-name "${domain}" \
      --non-interactive \
      --agree-tos
  fi
}

reload_services() {
  log "Reloading nginx if running..."
  if systemctl is-active --quiet nginx 2>/dev/null; then
    systemctl reload nginx
    log "nginx reloaded."
  fi
}

main() {
  check_certbot

  local cert_file="${CERT_DIR}/cert.pem"

  if [[ ! -f "${cert_file}" ]]; then
    log "No existing certificate found at ${cert_file}. Issuing new certificate."
    renew_cert "${DOMAIN}" "${WILDCARD}"
    reload_services
    log "Certificate issued successfully."
    exit 0
  fi

  local days_left
  days_left="$(days_until_expiry "${cert_file}")"
  log "Certificate for ${DOMAIN} expires in ${days_left} days."

  if (( days_left <= RENEW_THRESHOLD_DAYS )); then
    log "Renewal threshold (${RENEW_THRESHOLD_DAYS} days) reached. Renewing..."
    renew_cert "${DOMAIN}" "${WILDCARD}"
    reload_services
    log "Certificate renewed successfully."
  else
    log "Certificate is valid. No renewal needed."
  fi
}

main "$@"
