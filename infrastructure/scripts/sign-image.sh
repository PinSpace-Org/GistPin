#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

IMAGE="${1:-}"
if [[ -z "${IMAGE}" ]]; then
  echo "Usage: sign-image.sh <image:tag>"
  exit 1
fi

COSIGN_PASSWORD="${COSIGN_PASSWORD:-}"
KEY_FILE="${COSIGN_KEY_FILE:-${HOME}/.cosign/cosign.key}"
COSIGN_BIN="${HOME}/.local/bin/cosign"

log() { echo "[$(date +%H:%M:%S)] $*"; }

# Check dependencies
for cmd in jq curl; do
  if ! command -v "${cmd}" &>/dev/null; then
    log "ERROR: ${cmd} is required but not installed"
    exit 1
  fi
done

# Check if cosign is installed
if ! command -v cosign &>/dev/null; then
  log "cosign not found, installing to ${COSIGN_BIN}..."
  mkdir -p "$(dirname "${COSIGN_BIN}")"
  curl -sSfL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 \
    -o "${COSIGN_BIN}" 2>/dev/null || {
    log "Download failed, attempting go install..."
    if command -v go &>/dev/null; then
      go install github.com/sigstore/cosign/v2/cmd/cosign@latest
    else
      log "ERROR: Cannot install cosign — install manually"
      exit 1
    fi
  }
  chmod +x "${COSIGN_BIN}" 2>/dev/null || true
fi

log "Signing image: ${IMAGE}"

# Attempt keyless signing (OIDC + Fulcio)
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
  log "GitHub Actions detected — using keyless signing"
  cosign sign \
    --yes \
    --oidc-issuer "https://token.actions.githubusercontent.com" \
    --identity-token "$(curl -sH "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" "${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=sigstore" | jq -r .value)" \
    "${IMAGE}"
else
  # Key-based signing fallback
  if [[ ! -f "${KEY_FILE}" ]]; then
    log "Generating new Cosign key pair..."
    COSIGN_PASSWORD="${COSIGN_PASSWORD}" cosign generate-key-pair
  fi

  log "Signing with key: ${KEY_FILE}"
  COSIGN_PASSWORD="${COSIGN_PASSWORD}" cosign sign \
    --key "${KEY_FILE}" \
    --yes \
    "${IMAGE}"
fi

log "Attesting SBOM..."
cosign attest \
  --key "${KEY_FILE}" \
  --predicate <(echo '{"builder":"gistpin-ci","build_type":"docker"}') \
  --type custom \
  "${IMAGE}" 2>/dev/null || log "SBOM attestation skipped (optional)"

log "Image signed successfully: ${IMAGE}"

# Verify signature immediately
log "Verifying signature..."
if ! bash "${SCRIPT_DIR}/verify-image.sh" "${IMAGE}"; then
  log "ERROR: Signature verification failed immediately after signing"
  exit 1
fi

log "Signing complete ✓"
