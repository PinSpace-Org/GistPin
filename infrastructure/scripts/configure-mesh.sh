#!/usr/bin/env bash
# Automated Istio service mesh configuration
# Applies sidecar injection, traffic routing, circuit breakers, retries, and timeouts
set -euo pipefail

MESH_CONFIG_DIR="${MESH_CONFIG_DIR:-infrastructure/k8s/mesh-config}"
NAMESPACE="${NAMESPACE:-gistpin}"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

require_kubectl() {
  if ! command -v kubectl &>/dev/null; then
    echo "kubectl is required" >&2; exit 1
  fi
}

# ── Sidecar injection ─────────────────────────────────────────────────────────
enable_sidecar_injection() {
  log "Enabling automatic sidecar injection for namespace: ${NAMESPACE}..."
  kubectl label namespace "${NAMESPACE}" istio-injection=enabled --overwrite 2>/dev/null \
    || log "Namespace ${NAMESPACE} not found; skipping label"
}

# ── Apply mesh config manifests ───────────────────────────────────────────────
apply_mesh_configs() {
  log "Applying mesh configuration from ${MESH_CONFIG_DIR}..."
  if [[ ! -d "${MESH_CONFIG_DIR}" ]]; then
    log "Mesh config directory not found: ${MESH_CONFIG_DIR}"
    return
  fi
  for manifest in "${MESH_CONFIG_DIR}"/*.yaml; do
    [[ -f "${manifest}" ]] || continue
    log "  Applying ${manifest}..."
    kubectl apply -f "${manifest}" 2>/dev/null || log "  WARNING: failed to apply ${manifest}"
  done
}

# ── Verify mesh components ────────────────────────────────────────────────────
verify_mesh() {
  log "Verifying Istio control-plane components..."
  kubectl get pods -n istio-system --no-headers 2>/dev/null \
    | awk '{print $1, $3}' \
    | while read -r name status; do
        if [[ "${status}" != "Running" ]]; then
          log "  WARNING: ${name} is ${status}"
        else
          log "  OK: ${name}"
        fi
      done || log "istio-system namespace not found; is Istio installed?"
}

require_kubectl
enable_sidecar_injection
apply_mesh_configs
verify_mesh

log "Service mesh configuration complete."
