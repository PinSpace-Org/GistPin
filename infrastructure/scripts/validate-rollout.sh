#!/usr/bin/env bash
# validate-rollout.sh — K8s Rolling Update Health Validation (#1132)
#
# Usage:
#   ./validate-rollout.sh <DEPLOYMENT> <NAMESPACE> [ERROR_THRESHOLD]
#
# Arguments:
#   DEPLOYMENT       Name of the Kubernetes deployment to validate
#   NAMESPACE        Kubernetes namespace (default: default)
#   ERROR_THRESHOLD  Max acceptable error log count before rollback (default: 5)
#
# The script:
#   1. Waits for rollout to complete (kubectl rollout status)
#   2. Checks pod error rate via kubectl logs
#   3. Triggers automatic rollback if errors exceed threshold

set -euo pipefail

# ─── Arguments ─────────────────────────────────────────────────────────────
DEPLOYMENT="${1:-}"
NAMESPACE="${2:-default}"
ERROR_THRESHOLD="${3:-5}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-300s}"
LOG_LINES="${LOG_LINES:-200}"

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >&2; }

# ─── Validation ─────────────────────────────────────────────────────────────
if [[ -z "${DEPLOYMENT}" ]]; then
  log_error "DEPLOYMENT name is required."
  echo "Usage: $0 <DEPLOYMENT> [NAMESPACE] [ERROR_THRESHOLD]"
  exit 1
fi

if ! command -v kubectl &>/dev/null; then
  log_error "kubectl is not installed or not in PATH."
  exit 1
fi

# ─── Functions ───────────────────────────────────────────────────────────────

check_deployment_exists() {
  log_info "Checking deployment '${DEPLOYMENT}' in namespace '${NAMESPACE}'..."
  if ! kubectl get deployment "${DEPLOYMENT}" -n "${NAMESPACE}" &>/dev/null; then
    log_error "Deployment '${DEPLOYMENT}' not found in namespace '${NAMESPACE}'."
    exit 1
  fi
  log_success "Deployment '${DEPLOYMENT}' found."
}

wait_for_rollout() {
  log_info "Waiting for rollout to complete (timeout: ${ROLLOUT_TIMEOUT})..."
  if kubectl rollout status deployment/"${DEPLOYMENT}" \
      -n "${NAMESPACE}" \
      --timeout="${ROLLOUT_TIMEOUT}"; then
    log_success "Rollout of '${DEPLOYMENT}' completed successfully."
  else
    log_error "Rollout of '${DEPLOYMENT}' timed out or failed."
    trigger_rollback "Rollout did not complete within ${ROLLOUT_TIMEOUT}."
  fi
}

check_pod_health() {
  log_info "Checking pod readiness for '${DEPLOYMENT}'..."
  local ready
  ready=$(kubectl get deployment "${DEPLOYMENT}" -n "${NAMESPACE}" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
  local desired
  desired=$(kubectl get deployment "${DEPLOYMENT}" -n "${NAMESPACE}" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")

  if [[ "${ready}" -ge "${desired}" ]]; then
    log_success "All ${ready}/${desired} replicas are ready."
  else
    log_warn "Only ${ready}/${desired} replicas ready. Proceeding with error rate check."
  fi
}

check_error_rate() {
  log_info "Scanning last ${LOG_LINES} log lines for errors in '${DEPLOYMENT}' pods..."

  local pods
  pods=$(kubectl get pods -n "${NAMESPACE}" \
    -l "app=${DEPLOYMENT}" \
    --field-selector=status.phase=Running \
    -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || true)

  if [[ -z "${pods}" ]]; then
    log_warn "No running pods found for deployment '${DEPLOYMENT}'. Skipping log check."
    return
  fi

  local total_errors=0
  for pod in ${pods}; do
    log_info "Checking logs for pod: ${pod}"
    local pod_errors
    pod_errors=$(kubectl logs "${pod}" \
        -n "${NAMESPACE}" \
        --tail="${LOG_LINES}" \
        --all-containers=true \
        2>/dev/null \
      | grep -ciE "(error|exception|fatal|panic|SIGTERM|OOMKilled)" || true)

    log_info "  Pod '${pod}': ${pod_errors} error(s) found."
    total_errors=$((total_errors + pod_errors))
  done

  log_info "Total errors across all pods: ${total_errors} (threshold: ${ERROR_THRESHOLD})"

  if [[ "${total_errors}" -gt "${ERROR_THRESHOLD}" ]]; then
    log_error "Error count (${total_errors}) exceeds threshold (${ERROR_THRESHOLD})."
    trigger_rollback "Error rate too high: ${total_errors} errors > threshold ${ERROR_THRESHOLD}"
  else
    log_success "Error rate within acceptable threshold (${total_errors} <= ${ERROR_THRESHOLD})."
  fi
}

trigger_rollback() {
  local reason="${1:-Unknown reason}"
  log_error "🔄 Triggering automatic rollback for '${DEPLOYMENT}' in '${NAMESPACE}'."
  log_error "   Reason: ${reason}"

  if kubectl rollout undo deployment/"${DEPLOYMENT}" -n "${NAMESPACE}"; then
    log_warn "Rollback initiated. Waiting for rollback to complete..."
    if kubectl rollout status deployment/"${DEPLOYMENT}" \
        -n "${NAMESPACE}" \
        --timeout="${ROLLOUT_TIMEOUT}"; then
      log_warn "✅ Rollback completed successfully."
    else
      log_error "Rollback also failed to complete within timeout. Manual intervention required."
    fi
  else
    log_error "kubectl rollout undo failed. Manual intervention required."
  fi

  exit 2
}

print_summary() {
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  Rollout Validation Summary"
  echo "  Deployment : ${DEPLOYMENT}"
  echo "  Namespace  : ${NAMESPACE}"
  echo "  Threshold  : ${ERROR_THRESHOLD} errors"
  echo "  Status     : ✅ PASSED"
  echo "═══════════════════════════════════════════════════════"
}

# ─── Main ────────────────────────────────────────────────────────────────────
main() {
  log_info "Starting K8s rollout validation..."
  log_info "Deployment: ${DEPLOYMENT} | Namespace: ${NAMESPACE} | Error threshold: ${ERROR_THRESHOLD}"

  check_deployment_exists
  wait_for_rollout
  check_pod_health
  check_error_rate
  print_summary
}

main "$@"
