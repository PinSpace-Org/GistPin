#!/usr/bin/env bash
# generate-sbom.sh — Generate Software Bill of Materials for GistPin
# Produces SPDX and CycloneDX SBOMs for all project components.
set -euo pipefail

OUTPUT_DIR="${OUTPUT_DIR:-/tmp/sbom-output}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "${OUTPUT_DIR}"

log() { echo "[sbom] $*"; }

# ── Tool check ────────────────────────────────────────────────────────────────
require() {
  command -v "$1" &>/dev/null || { log "ERROR: '$1' not found. Install it first."; exit 1; }
}

if ! command -v syft &>/dev/null; then
  log "Installing Syft..."
  curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh \
    | sh -s -- -b /usr/local/bin v1.4.1
fi

require syft

# ── Generate SBOMs ────────────────────────────────────────────────────────────
generate_sbom() {
  local name="$1"
  local path="$2"

  log "Generating SBOM for ${name} (${path})..."

  syft "${path}" \
    --output "spdx-json=${OUTPUT_DIR}/${name}-sbom-${TIMESTAMP}.spdx.json" \
    --output "cyclonedx-json=${OUTPUT_DIR}/${name}-sbom-${TIMESTAMP}.cyclonedx.json"

  log "  → ${name}-sbom-${TIMESTAMP}.spdx.json"
  log "  → ${name}-sbom-${TIMESTAMP}.cyclonedx.json"
}

generate_sbom "backend"   "${PROJECT_ROOT}/Backend"
generate_sbom "frontend"  "${PROJECT_ROOT}/Frontend"
generate_sbom "contracts" "${PROJECT_ROOT}/contracts"

# ── Merge into a repo-wide SBOM ───────────────────────────────────────────────
log "Generating repository-wide SBOM..."
syft "${PROJECT_ROOT}" \
  --output "spdx-json=${OUTPUT_DIR}/gistpin-sbom-${TIMESTAMP}.spdx.json" \
  --output "cyclonedx-json=${OUTPUT_DIR}/gistpin-sbom-${TIMESTAMP}.cyclonedx.json"

# ── Checksum manifest ─────────────────────────────────────────────────────────
log "Computing checksums..."
(cd "${OUTPUT_DIR}" && sha256sum ./*.json > "SHA256SUMS-${TIMESTAMP}.txt")

log "SBOM generation complete. Output: ${OUTPUT_DIR}"
ls -lh "${OUTPUT_DIR}"
