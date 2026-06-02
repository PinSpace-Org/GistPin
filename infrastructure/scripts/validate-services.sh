#!/usr/bin/env bash
# Validate that all expected k8s services and deployments are healthy
set -euo pipefail

NAMESPACE="${NAMESPACE:-gistpin}"
PASS=0; FAIL=0

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
pass() { log "  PASS: $*"; ((PASS++)) || true; }
fail() { log "  FAIL: $*"; ((FAIL++)) || true; }

require_kubectl() {
  if ! command -v kubectl &>/dev/null; then
    echo "kubectl is required" >&2; exit 1
  fi
}

# ── Deployment readiness ──────────────────────────────────────────────────────
check_deployments() {
  log "=== Deployment Readiness (namespace: ${NAMESPACE}) ==="
  while IFS= read -r line; do
    name="$(echo "${line}" | awk '{print $1}')"
    ready="$(echo "${line}" | awk '{print $2}')"
    desired="$(echo "${line}" | awk '{print $3}')"
    if [[ "${ready}" == "${desired}" && "${desired}" != "0" ]]; then
      pass "Deployment ${name} (${ready}/${desired})"
    else
      fail "Deployment ${name} (${ready}/${desired})"
    fi
  done < <(kubectl get deployments -n "${NAMESPACE}" --no-headers \
    --output=custom-columns='NAME:.metadata.name,READY:.status.readyReplicas,DESIRED:.spec.replicas' \
    2>/dev/null || true)
}

# ── Service endpoints ─────────────────────────────────────────────────────────
check_services() {
  log "=== Service Endpoints (namespace: ${NAMESPACE}) ==="
  while IFS= read -r svc; do
    ep_count="$(kubectl get endpoints "${svc}" -n "${NAMESPACE}" \
      -o jsonpath='{.subsets[*].addresses}' 2>/dev/null | wc -w || echo 0)"
    if [[ "${ep_count}" -gt 0 ]]; then
      pass "Service ${svc} has endpoints"
    else
      fail "Service ${svc} has no endpoints"
    fi
  done < <(kubectl get services -n "${NAMESPACE}" --no-headers -o custom-columns='NAME:.metadata.name' \
    2>/dev/null | grep -v kubernetes || true)
}

# ── Pod status ────────────────────────────────────────────────────────────────
check_pods() {
  log "=== Pod Status (namespace: ${NAMESPACE}) ==="
  while IFS= read -r line; do
    name="$(echo "${line}" | awk '{print $1}')"
    status="$(echo "${line}" | awk '{print $3}')"
    if [[ "${status}" == "Running" || "${status}" == "Completed" ]]; then
      pass "Pod ${name} (${status})"
    else
      fail "Pod ${name} (${status})"
    fi
  done < <(kubectl get pods -n "${NAMESPACE}" --no-headers 2>/dev/null || true)
}

require_kubectl
check_deployments
check_services
check_pods

log ""
log "Results: ${PASS} passed, ${FAIL} failed"
[[ "${FAIL}" -eq 0 ]] || { log "Service validation FAILED"; exit 1; }
log "All services validated."
