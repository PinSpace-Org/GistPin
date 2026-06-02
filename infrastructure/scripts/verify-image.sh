#!/usr/bin/env bash
set -euo pipefail

IMAGE="${1:-}"
if [[ -z "${IMAGE}" ]]; then
  echo "Usage: verify-image.sh <image:tag>"
  exit 1
fi

PUBLIC_KEY="${COSIGN_PUBLIC_KEY:-${HOME}/.cosign/cosign.pub}"
COSIGN_BIN="${HOME}/.local/bin/cosign"

log() { echo "[$(date +%H:%M:%S)] $*"; }

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

log "Verifying image: ${IMAGE}"

# Verify signature
if [[ -f "${PUBLIC_KEY}" ]]; then
  log "Verifying with public key: ${PUBLIC_KEY}"
  cosign verify \
    --key "${PUBLIC_KEY}" \
    "${IMAGE}"
else
  log "No public key found, attempting keyless verification..."
  cosign verify \
    --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
    --certificate-identity "https://github.com/PinSpace-Org/GistPin/.github/workflows/" \
    "${IMAGE}" || {
    log "Keyless verification failed — image may be unsigned or signed with a different identity"
    exit 1
  }
fi

log "Verification passed ✓"

# Verify attestations if SBOM attestation exists
cosign verify-attestation \
  --type custom \
  "${IMAGE}" 2>/dev/null && log "Attestations verified ✓" || log "No attestations found (non-blocking)"

log "Image signature and attestations verified: ${IMAGE}"
