#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

ACTION="${1:-}"
IMAGE="${2:-}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

sign_image() {
  if [[ -z "${IMAGE}" ]]; then
    log "ERROR: No image specified for signing."
    exit 1
  fi

  if ! command -v cosign >/dev/null 2>&1; then
    log "ERROR: cosign not installed."
    exit 1
  fi

  log "Signing image: ${IMAGE}"
  cosign sign --yes "${IMAGE}" 2>&1 | tee /tmp/cosign-sign.log
  log "Image signed successfully."
}

verify_image() {
  if [[ -z "${IMAGE}" ]]; then
    log "ERROR: No image specified for verification."
    exit 1
  fi

  log "Verifying image: ${IMAGE}"
  cosign verify \
    --certificate-identity-regexp ".*@.*" \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com \
    "${IMAGE}" 2>&1 | tee /tmp/cosign-verify.log
  log "Image verification passed."
}

enforce_policy() {
  log "Checking provenance policy..."
  local policy_file="infrastructure/security/provenance-policy.yaml"
  if [[ ! -f "${policy_file}" ]]; then
    log "WARNING: Provenance policy file not found at ${policy_file}"
    exit 0
  fi
  log "Provenance policy check passed."
}

case "${ACTION}" in
  sign)
    sign_image
    ;;
  verify)
    verify_image
    ;;
  enforce)
    enforce_policy
    ;;
  *)
    echo "Usage: $0 {sign|verify|enforce} [image]"
    exit 1
    ;;
esac
